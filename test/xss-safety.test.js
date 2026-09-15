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
