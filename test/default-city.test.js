'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, waitFor } = require('./dom-stub');
const { mockFetch } = require('./mock-fetch');
const { makeWeatherResponse, makeAirQualityResponse } = require('./fixtures');

test('with nothing in localStorage, starts on Madrid in English/Celsius', async () => {
  const { elements } = loadApp({
    fetchImpl: mockFetch([
      ['v1/forecast', makeWeatherResponse()],
      ['v1/air-quality', makeAirQualityResponse()],
    ]),
  });

  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.match(elements.mainPanel.innerHTML, /Madrid/);
  assert.match(elements.mainPanel.innerHTML, /Spain/);
  assert.match(elements.mainPanel.innerHTML, /19°/); // fixture's current.temperature_2m, in °C
  assert.strictEqual(elements.unitToggle.textContent, '°C');
  assert.strictEqual(elements.langToggle.textContent, 'EN');
});
