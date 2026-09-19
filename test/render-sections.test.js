'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, waitFor } = require('./dom-stub');
const { mockFetch } = require('./mock-fetch');
const { makeWeatherResponse, makeAirQualityResponse } = require('./fixtures');

// The other test files assert on #mainPanel (or localStorage). The hourly
// strip, the 7-day list, the day/night sky switch and the clock are separate
// render targets that nothing exercised.
function weatherFetch(weather) {
  return mockFetch([
    ['v1/forecast', weather],
    ['v1/air-quality', makeAirQualityResponse()],
  ]);
}

test('the hourly strip renders 24 columns, labelling the first one "Now"', async () => {
  const { elements } = loadApp({ fetchImpl: weatherFetch(makeWeatherResponse()) });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  const cols = elements.hourlyScroll.innerHTML.match(/class="hour-col"/g) || [];
  assert.strictEqual(cols.length, 24);
  assert.match(elements.hourlyScroll.innerHTML, /class="h-time">Now</);
  assert.strictEqual(elements.hourlyPanel.style.display, 'block');
});

test('the daily list renders one row per forecast day', async () => {
  const { elements } = loadApp({ fetchImpl: weatherFetch(makeWeatherResponse()) });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  const rows = elements.dailyList.innerHTML.match(/class="day-row"/g) || [];
  assert.strictEqual(rows.length, 7);
  assert.match(elements.dailyList.innerHTML, /class="d-name">Today</);
  assert.strictEqual(elements.dailyPanel.style.display, 'block');
});

test('a clear night shows the stars layer; a clear day hides it', async () => {
  const base = makeWeatherResponse();
  const clearNight = makeWeatherResponse({ current: { ...base.current, weathercode: 0, is_day: 0 } });
  const clearDay = makeWeatherResponse({ current: { ...base.current, weathercode: 0, is_day: 1 } });

  const night = loadApp({ fetchImpl: weatherFetch(clearNight) });
  await waitFor(() => night.elements.mainPanel.innerHTML.includes('metric'));
  assert.strictEqual(night.elements.starsLayer.classList.contains('visible'), true);

  const day = loadApp({ fetchImpl: weatherFetch(clearDay) });
  await waitFor(() => day.elements.mainPanel.innerHTML.includes('metric'));
  assert.strictEqual(day.elements.starsLayer.classList.contains('visible'), false);
});

test('an unknown timezone in the forecast falls back to the device clock instead of breaking the render', async () => {
  const { elements } = loadApp({ fetchImpl: weatherFetch(makeWeatherResponse({ timezone: 'Not/AZone' })) });
  await waitFor(() => elements.mainPanel.innerHTML.includes('metric'));

  assert.match(elements.mainPanel.innerHTML, /Madrid/); // updateClock's throw didn't abort renderAll
  assert.match(elements.clockNow.textContent, /·/); // "HH:MM · D Mon" fallback format
});
