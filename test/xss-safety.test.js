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

test('a malicious city/country name (e.g. from a hand-crafted share URL) is HTML-escaped, not injected raw', async () => {
  const maliciousName = '<img src=x onerror=alert(1)>';
  const { elements } = loadApp({
    fetchImpl,
    urlSearch: `?lat=1&lon=1&name=${encodeURIComponent(maliciousName)}&country=${encodeURIComponent('</span><b>hi</b>')}`,
  });

  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.doesNotMatch(elements.mainPanel.innerHTML, /<img/);
  assert.doesNotMatch(elements.mainPanel.innerHTML, /<b>hi<\/b>/);
  assert.match(elements.mainPanel.innerHTML, /&lt;img/);
});

// The same escaping has to hold for the favorites dropdown, whose contents
// come back out of localStorage (i.e. from a previous session, not from the
// API call that's in flight right now).
test('a malicious favorite saved in localStorage is HTML-escaped in the favorites menu too', async () => {
  const { elements } = loadApp({
    fetchImpl,
    localStorageSeed: {
      'climoscope:favorites': JSON.stringify([
        { name: '<img src=x onerror=alert(1)>', country: '</span><script>alert(1)</script>', lat: 1, lon: 2 },
      ]),
    },
  });

  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  const menu = elements.favoritesMenu.innerHTML;
  assert.doesNotMatch(menu, /<img/);
  assert.doesNotMatch(menu, /<script>/);
  assert.match(menu, /&lt;img/);
  assert.doesNotMatch(menu, /No favorites yet/); // sanity: the list rendered, not the empty state
});

