'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadApp, waitFor, dispatch } = require('./dom-stub.js');
const { mockFetch } = require('./mock-fetch.js');
const { makeWeatherResponse, makeAirQualityResponse } = require('./fixtures.js');

function deferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

// Builds a fetch impl that answers weather/air-quality with canned fixtures
// (so the app's own startup fetch doesn't reject) but holds any
// geocoding-api request open until the test resolves it, so a slow
// suggestions response can be simulated deterministically. `calls` is
// mutated in place so the test can tell a *new* forecast request apart from
// the identically-shaped one a redundant reload of the same city would
// produce (comparing rendered HTML can't tell those apart).
function fetchWithControllableGeocoding(pending, calls, results) {
  const baseFetch = mockFetch([
    ['v1/forecast', makeWeatherResponse()],
    ['v1/air-quality', makeAirQualityResponse()],
  ]);
  return async (url) => {
    if (String(url).includes('geocoding-api')) {
      calls.geocode.push(url);
      await pending.promise;
      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (String(url).includes('v1/forecast')) calls.forecast++;
    return baseFetch(url);
  };
}

test('shrinking the query below 2 chars discards an in-flight suggestions request instead of letting it reopen the dropdown', async () => {
  const pending = deferred();
  const calls = { forecast: 0, geocode: [] };
  const fetchImpl = fetchWithControllableGeocoding(pending, calls, [
    { name: 'Paris', country: 'France', latitude: 48.85, longitude: 2.35 },
  ]);
  const { elements } = loadApp({ fetchImpl });

  elements.cityInput.value = 'Pa';
  dispatch(elements.cityInput, 'input');
  await waitFor(() => calls.geocode.length > 0);

  // The query shrinks back below the 2-char threshold while "Pa"'s request
  // is still in flight — this used to leave searchRequestId unchanged, so
  // the guard in fetchSuggestions couldn't tell the response was stale.
  elements.cityInput.value = 'P';
  dispatch(elements.cityInput, 'input');

  // Resolve the now-superseded "Pa" request and give its .then chain a
  // couple of ticks to run (there's nothing to poll for on the "bug still
  // there" path: it never touches the DOM again, so waitFor would just
  // spin to its own timeout).
  pending.resolve();
  await new Promise((r) => setTimeout(r, 20));

  assert.equal(
    elements.suggestions.classList.contains('open'),
    false,
    'a response for an abandoned query must not reopen the dropdown'
  );
});

test('pressing Enter after selecting a city does not reload a stale suggestion left over in the closed dropdown', async () => {
  const pending = deferred();
  const calls = { forecast: 0, geocode: [] };
  const fetchImpl = fetchWithControllableGeocoding(pending, calls, [
    { name: 'Paris', country: 'France', latitude: 48.85, longitude: 2.35 },
  ]);
  const { elements } = loadApp({ fetchImpl });

  elements.cityInput.value = 'Par';
  dispatch(elements.cityInput, 'input');
  await waitFor(() => calls.geocode.length > 0);
  pending.resolve();
  await waitFor(() => elements.suggestions.classList.contains('open'));

  // Select the suggestion, exactly like a click would: closes the dropdown
  // and clears the input, but (today) leaves the old markup in innerHTML.
  const item = elements.suggestions.querySelector('.suggestion-item:not(.empty)');
  assert.ok(item, 'expected the Paris suggestion to have rendered');
  item.click();
  assert.equal(elements.cityInput.value, '');
  assert.equal(elements.suggestions.classList.contains('open'), false);

  // Let the legitimate load triggered by the click finish before taking the
  // forecast-call count as a baseline.
  await waitFor(() => elements.mainPanel.innerHTML.includes('Paris'));
  const forecastCallsBeforeEnter = calls.forecast;

  dispatch(elements.cityInput, 'keydown', { key: 'Enter' });
  await new Promise((r) => setTimeout(r, 20));

  // A second, spurious loadWeather() for the stale suggestion would fire
  // another v1/forecast request — even though the user pressed Enter on an
  // empty, already-closed search box. Comparing rendered HTML wouldn't catch
  // this (reloading the same city renders identically); the request count
  // does.
  assert.equal(
    calls.forecast,
    forecastCallsBeforeEnter,
    'Enter on a closed dropdown must not reload the last (stale) suggestion'
  );
});
