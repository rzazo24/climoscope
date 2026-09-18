'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, waitFor } = require('./dom-stub');
const { mockFetch } = require('./mock-fetch');
const { makeWeatherResponse, makeAirQualityResponse } = require('./fixtures');

test('the precipitation card shows today\'s total, rounded to one decimal', async () => {
  const weather = makeWeatherResponse();
  weather.daily.precipitation_sum = [2.34, 0, 0, 0, 0, 0, 0];
  const fetchImpl = mockFetch([
    ['v1/forecast', weather],
    ['v1/air-quality', makeAirQualityResponse()],
  ]);
  const { elements } = loadApp({ fetchImpl });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.match(elements.mainPanel.innerHTML, /class="val precip-val clickable-metric">2\.3 mm</);
});

test('a zero precipitation total still renders (not treated as missing data)', async () => {
  const fetchImpl = mockFetch([
    ['v1/forecast', makeWeatherResponse()], // fixture default is all zeros
    ['v1/air-quality', makeAirQualityResponse()],
  ]);
  const { elements } = loadApp({ fetchImpl });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.match(elements.mainPanel.innerHTML, /class="val precip-val clickable-metric">0 mm</);
});
