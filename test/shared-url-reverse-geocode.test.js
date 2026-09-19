'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, waitFor } = require('./dom-stub');
const { mockFetch } = require('./mock-fetch');
const { makeWeatherResponse, makeAirQualityResponse } = require('./fixtures');

// Records every requested URL so a test can assert *which* endpoints were hit,
// while still serving canned responses through mockFetch.
function recordingFetch(handlers) {
  const urls = [];
  const inner = mockFetch(handlers);
  return {
    urls,
    fetchImpl: async (url) => { urls.push(String(url)); return inner(url); },
  };
}

// share-url.test.js covers a fully-formed ?lat&lon&name&country link. A link
// without a name is the other branch of the init logic: it has to be named
// through Nominatim, and still has to work when Nominatim says no.
test('a shared ?lat&lon URL without a name is reverse-geocoded via Nominatim', async () => {
  const { urls, fetchImpl } = recordingFetch([
    ['v1/forecast', makeWeatherResponse()],
    ['v1/air-quality', makeAirQualityResponse()],
    ['nominatim', { name: 'Bilbao', address: { city: 'Bilbao', country: 'Spain' } }],
  ]);
  const { elements } = loadApp({ fetchImpl, urlSearch: '?lat=43.2630&lon=-2.9350' });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  const reverseUrl = urls.find((u) => u.includes('nominatim.openstreetmap.org/reverse'));
  assert.ok(reverseUrl, 'expected a reverse-geocoding request');
  assert.match(reverseUrl, /lat=43\.263/);
  assert.match(reverseUrl, /lon=-2\.935/);
  assert.match(elements.mainPanel.innerHTML, /Bilbao/);
  assert.match(elements.mainPanel.innerHTML, /Spain/);
});

test('a shared ?lat&lon URL without a name falls back to "My location" when Nominatim is unavailable', async () => {
  const { fetchImpl } = recordingFetch([
    ['v1/forecast', makeWeatherResponse()],
    ['v1/air-quality', makeAirQualityResponse()],
    ['nominatim', () => new Response('blocked', { status: 403 })],
  ]);
  const { elements } = loadApp({ fetchImpl, urlSearch: '?lat=43.2630&lon=-2.9350' });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.match(elements.mainPanel.innerHTML, /My location/);
});
