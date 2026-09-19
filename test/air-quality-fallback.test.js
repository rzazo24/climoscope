'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, waitFor } = require('./dom-stub');
const { mockFetch } = require('./mock-fetch');
const { makeWeatherResponse } = require('./fixtures');

// Air quality is a bonus endpoint: app.js fetches it alongside the forecast and
// must never let it fail the rest of the render (see the comment above the
// Promise.all in loadWeather). error-handling.test.js already covers a 500
// response; these cover the other ways it can come back unusable.
async function renderWithAirQuality(responder) {
  const fetchImpl = mockFetch([
    ['v1/forecast', makeWeatherResponse()],
    ['v1/air-quality', responder],
  ]);
  const { elements } = loadApp({ fetchImpl });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));
  return elements.mainPanel.innerHTML;
}

test('an air-quality request that rejects (offline/DNS failure) still renders the weather, with a dash for AQI', async () => {
  const html = await renderWithAirQuality(() => { throw new Error('simulated network failure'); });

  assert.match(html, /Madrid/); // the rest of the panel still rendered
  assert.match(html, /class="val aqi-val clickable-metric">—</); // no color/tooltip either
});

test('an air-quality response carrying Open-Meteo\'s error body is treated as missing, not rendered', async () => {
  const html = await renderWithAirQuality({ error: true, reason: 'Invalid parameter' });

  assert.match(html, /Madrid/);
  assert.match(html, /class="val aqi-val clickable-metric">—</);
});

test('an air-quality response with no current block at all is treated as missing', async () => {
  const html = await renderWithAirQuality({ latitude: 40.42, longitude: -3.70 });

  assert.match(html, /Madrid/);
  assert.match(html, /class="val aqi-val clickable-metric">—</);
});
