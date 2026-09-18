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

test('with no favorites, the button is inactive and the menu shows an empty state', async () => {
  const { elements } = loadApp({ fetchImpl });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.strictEqual(elements.favoritesBtn.classList.contains('active'), false);
  assert.match(elements.favoritesMenu.innerHTML, /suggestion-item empty/);
  assert.match(elements.favoritesMenu.innerHTML, /No favorites yet/);
});

test('with favorites saved, the button is active and the menu lists them', async () => {
  const { elements } = loadApp({
    fetchImpl,
    localStorageSeed: {
      'climoscope:favorites': JSON.stringify([
        { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
        { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
      ]),
    },
  });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.strictEqual(elements.favoritesBtn.classList.contains('active'), true);
  assert.match(elements.favoritesMenu.innerHTML, /London/);
  assert.match(elements.favoritesMenu.innerHTML, /Paris/);
  assert.doesNotMatch(elements.favoritesMenu.innerHTML, /No favorites yet/);
});

test('reorder buttons are disabled at the ends of the list, enabled in the middle', async () => {
  const { elements } = loadApp({
    fetchImpl,
    localStorageSeed: {
      'climoscope:favorites': JSON.stringify([
        { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
        { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
        { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
      ]),
    },
  });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  const items = elements.favoritesMenu.innerHTML.split('suggestion-item"').slice(1);
  assert.match(items[0], /data-dir="-1"[^>]*disabled/); // London: can't move up
  assert.doesNotMatch(items[0], /data-dir="1"[^>]*disabled/); // but can move down
  assert.doesNotMatch(items[1], /disabled/); // Paris: both enabled
  assert.match(items[2], /data-dir="1"[^>]*disabled/); // Tokyo: can't move down
  assert.doesNotMatch(items[2], /data-dir="-1"[^>]*disabled/); // but can move up
});
