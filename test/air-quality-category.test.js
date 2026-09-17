'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, waitFor } = require('./dom-stub');
const { mockFetch } = require('./mock-fetch');
const { makeWeatherResponse, makeAirQualityResponse } = require('./fixtures');

async function renderWithAqi(europeanAqi) {
  const fetchImpl = mockFetch([
    ['v1/forecast', makeWeatherResponse()],
    ['v1/air-quality', makeAirQualityResponse({ current: { european_aqi: europeanAqi } })],
  ]);
  const { elements } = loadApp({ fetchImpl });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));
  return elements.mainPanel.innerHTML;
}

test('a Good AQI (<=20) renders green with a "Good" tooltip', async () => {
  const html = await renderWithAqi(10);
  assert.match(html, /color:#6fbf8b/);
  assert.match(html, /title="Good"/);
});

test('a Moderate AQI (40-60) renders amber with a "Moderate" tooltip', async () => {
  const html = await renderWithAqi(50);
  assert.match(html, /color:var\(--amber\)/);
  assert.match(html, /title="Moderate"/);
});

test('a Very Poor AQI (>80) renders red with the right tooltip', async () => {
  const html = await renderWithAqi(90);
  assert.match(html, /color:#d64545/);
  assert.match(html, /title="Very Poor"/);
});

test('an Extremely Poor AQI (>100) also renders red, with its own tooltip', async () => {
  const html = await renderWithAqi(150);
  assert.match(html, /color:#d64545/);
  assert.match(html, /title="Extremely Poor"/);
});
