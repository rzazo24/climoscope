'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, waitFor } = require('./dom-stub');
const { mockFetch } = require('./mock-fetch');
const { makeWeatherResponse } = require('./fixtures');

test('a failing air-quality request falls back to a dash, without breaking the rest of the render', async () => {
  const fetchImpl = mockFetch([
    ['v1/forecast', makeWeatherResponse()],
    ['v1/air-quality', () => new Response('server error', { status: 500 })],
  ]);
  const { elements } = loadApp({ fetchImpl });

  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.match(elements.mainPanel.innerHTML, /Madrid/); // the rest of the panel still rendered
  assert.match(elements.mainPanel.innerHTML, /—/); // air-quality metric's fallback value
});

test('a failing forecast request shows the weather error message instead of crashing', async () => {
  const fetchImpl = mockFetch([
    ['v1/forecast', { error: true, reason: 'Simulated failure' }],
    ['v1/air-quality', () => new Response('server error', { status: 500 })],
  ]);
  const { elements } = loadApp({ fetchImpl });

  await waitFor(() => elements.mainPanel.innerHTML.includes('status-line error'));

  assert.match(elements.mainPanel.innerHTML, /status-line error/);
  assert.match(elements.mainPanel.innerHTML, /Could not load the weather/);
});
