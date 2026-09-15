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

test('a ?lat&lon&name&country URL takes priority over a saved last city', async () => {
  const { elements } = loadApp({
    fetchImpl,
    urlSearch: '?lat=48.8566&lon=2.3522&name=Paris&country=France',
    localStorageSeed: {
      'climoscope:lastCity': JSON.stringify({ name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 }),
    },
  });

  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.match(elements.mainPanel.innerHTML, /Paris/);
  assert.match(elements.mainPanel.innerHTML, /France/);
  assert.doesNotMatch(elements.mainPanel.innerHTML, /London/);
});

test('an invalid ?lat/lon in the URL is ignored, falling back to the saved last city', async () => {
  const { elements } = loadApp({
    fetchImpl,
    urlSearch: '?lat=not-a-number&lon=2.3522',
    localStorageSeed: {
      'climoscope:lastCity': JSON.stringify({ name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 }),
    },
  });

  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.match(elements.mainPanel.innerHTML, /London/);
});
