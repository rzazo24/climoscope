'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, waitFor } = require('./dom-stub.js');
const { mockFetch } = require('./mock-fetch.js');
const { makeWeatherResponse, makeAirQualityResponse } = require('./fixtures.js');

const good = () => mockFetch([
  ['v1/forecast', makeWeatherResponse()],
  ['v1/air-quality', makeAirQualityResponse()],
]);

test('the unit and language toggles expose their label and pressed state, and update both on click', async () => {
  const { elements } = loadApp({ fetchImpl: good() });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.equal(elements.unitToggle.getAttribute('aria-label'), 'Switch temperature unit');
  assert.equal(elements.unitToggle.getAttribute('aria-pressed'), 'false');
  elements.unitToggle.click();
  assert.equal(elements.unitToggle.getAttribute('aria-pressed'), 'true');

  assert.equal(elements.langToggle.getAttribute('aria-label'), 'Switch language');
  assert.equal(elements.langToggle.getAttribute('aria-pressed'), 'false');
  elements.langToggle.click();
  assert.equal(elements.langToggle.getAttribute('aria-pressed'), 'true');
  assert.equal(elements.langToggle.getAttribute('aria-label'), 'Cambiar idioma', 'the label must translate too, not just the button text');
});

test('the favorites button exposes aria-expanded, in sync with the dropdown', async () => {
  const { elements } = loadApp({ fetchImpl: good() });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  elements.favoritesBtn.click();
  assert.equal(elements.favoritesBtn.getAttribute('aria-expanded'), 'true');
  elements.favoritesBtn.click();
  assert.equal(elements.favoritesBtn.getAttribute('aria-expanded'), 'false');
});
