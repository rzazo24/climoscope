'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, waitFor, dispatch } = require('./dom-stub.js');
const { mockFetch } = require('./mock-fetch.js');
const { makeWeatherResponse, makeAirQualityResponse } = require('./fixtures.js');

test('sharing via clipboard (no navigator.share) shows a checkmark and restores the share icon afterwards', async () => {
  const { elements } = loadApp({
    fetchImpl: mockFetch([
      ['v1/forecast', makeWeatherResponse()],
      ['v1/air-quality', makeAirQualityResponse()],
    ]),
  });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  // No navigator.share (desktop Firefox/Chrome on Linux), but clipboard
  // support — the branch that used to wipe the icon (see A1).
  global.navigator = { clipboard: { writeText: async () => {} } };

  const btn = elements.mainPanel.querySelector('.share-btn');
  assert.ok(btn, 'expected a .share-btn to render');
  const originalIcon = btn.innerHTML;
  assert.match(originalIcon, /<svg/, 'expected the share button to start out with its SVG icon');

  btn.click();
  // navigator.clipboard.writeText() is async; let its .then() run.
  await waitFor(() => btn.innerHTML !== originalIcon);
  assert.match(btn.innerHTML, /<svg/, 'the checkmark shown right after copying must also be an SVG (no emoji/text glyph), and — the actual bug — must not be empty');

  await new Promise((r) => setTimeout(r, 1250));
  assert.equal(btn.innerHTML, originalIcon, 'after the timeout, the original share icon must be restored, not left blank');
});

test('navigator.share failing for a real reason (not a user cancel) falls back to the clipboard', async () => {
  const { elements } = loadApp({
    fetchImpl: mockFetch([
      ['v1/forecast', makeWeatherResponse()],
      ['v1/air-quality', makeAirQualityResponse()],
    ]),
  });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  let clipboardWrites = 0;
  global.navigator = {
    share: () => Promise.reject(new DOMException('no data to share', 'DataError')),
    clipboard: { writeText: async () => { clipboardWrites++; } },
  };

  const btn = elements.mainPanel.querySelector('.share-btn');
  const originalIcon = btn.innerHTML;
  btn.click();

  await waitFor(() => clipboardWrites > 0);
  await waitFor(() => btn.innerHTML !== originalIcon);
  assert.equal(clipboardWrites, 1, 'a genuine share failure should fall back to copying the link');
});

test('the user cancelling the native share sheet (AbortError) does not fall back to the clipboard', async () => {
  const { elements } = loadApp({
    fetchImpl: mockFetch([
      ['v1/forecast', makeWeatherResponse()],
      ['v1/air-quality', makeAirQualityResponse()],
    ]),
  });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  let clipboardWrites = 0;
  global.navigator = {
    share: () => Promise.reject(new DOMException('share canceled', 'AbortError')),
    clipboard: { writeText: async () => { clipboardWrites++; } },
  };

  const btn = elements.mainPanel.querySelector('.share-btn');
  btn.click();

  await new Promise((r) => setTimeout(r, 30));
  assert.equal(clipboardWrites, 0, 'the user explicitly cancelling the share sheet must not silently copy the link instead');
});
