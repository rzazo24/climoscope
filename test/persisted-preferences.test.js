'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, waitFor } = require('./dom-stub');
const { mockFetch } = require('./mock-fetch');
const { makeWeatherResponse, makeAirQualityResponse } = require('./fixtures');

const fetchImpl = mockFetch([
  ['v1/forecast', makeWeatherResponse()],
  ['v1/air-quality', makeAirQualityResponse()],
]);

test('a saved unit preference is applied from the very first render', async () => {
  const { elements } = loadApp({
    fetchImpl,
    localStorageSeed: { 'climoscope:unit': 'F' },
  });

  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.strictEqual(elements.unitToggle.textContent, '°F');
  // fixture current.temperature_2m is 19°C -> 66°F
  assert.match(elements.mainPanel.innerHTML, /66°/);
});

test('a saved language preference is applied from the very first render', async () => {
  const { elements } = loadApp({
    fetchImpl,
    localStorageSeed: { 'climoscope:lang': 'es' },
  });

  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.strictEqual(elements.langToggle.textContent, 'ES');
  assert.match(elements.mainPanel.innerHTML, /Mayormente despejado/); // weathercode 1 in Spanish
});

test('a saved last city is loaded instead of the Madrid default', async () => {
  const { elements } = loadApp({
    fetchImpl,
    localStorageSeed: {
      'climoscope:lastCity': JSON.stringify({ name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 }),
    },
  });

  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.match(elements.mainPanel.innerHTML, /London/);
  assert.match(elements.mainPanel.innerHTML, /United Kingdom/);
});
