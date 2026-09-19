'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, waitFor, dispatch } = require('./dom-stub.js');
const { mockFetch } = require('./mock-fetch.js');
const { makeWeatherResponse, makeAirQualityResponse } = require('./fixtures.js');

const good = () => mockFetch([
  ['v1/forecast', makeWeatherResponse()],
  ['v1/air-quality', makeAirQualityResponse()],
]);

test('the air quality detail is a real <button>, openable with a click and closable with Escape, with focus managed', async () => {
  const { elements } = loadApp({ fetchImpl: good() });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  const trigger = elements.mainPanel.querySelector('.aqi-val');
  assert.ok(trigger, 'expected an .aqi-val element to render');
  assert.equal(trigger._name.startsWith('<button'), true, 'must be a real <button>, not a div, to be keyboard-operable');

  trigger.click();
  assert.equal(elements.aqiModal.style.display, 'flex', 'clicking the metric should open the modal');
  assert.equal(elements.aqiModalClose._focused, true, 'opening the modal should move focus into it (the close button)');

  dispatch(elements.aqiModal, 'keydown', { key: 'Escape' });
  assert.equal(elements.aqiModal.style.display, 'none', 'Escape should close the modal');
  assert.equal(trigger._focused, true, 'closing should return focus to whatever opened the modal');
});

test('the precipitation detail is a real <button>, openable with a click and closable with Escape, with focus managed', async () => {
  const { elements } = loadApp({ fetchImpl: good() });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  const trigger = elements.mainPanel.querySelector('.precip-val');
  assert.ok(trigger, 'expected a .precip-val element to render');
  assert.equal(trigger._name.startsWith('<button'), true, 'must be a real <button>, not a div, to be keyboard-operable');

  trigger.click();
  assert.equal(elements.precipModal.style.display, 'flex', 'clicking the metric should open the modal');
  assert.equal(elements.precipModalClose._focused, true, 'opening the modal should move focus into it (the close button)');

  dispatch(elements.precipModal, 'keydown', { key: 'Escape' });
  assert.equal(elements.precipModal.style.display, 'none', 'Escape should close the modal');
  assert.equal(trigger._focused, true, 'closing should return focus to whatever opened the modal');
});
