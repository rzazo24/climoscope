# climoscope

A minimalist weather app in plain HTML/CSS/JS — no frameworks, no build tools, no API key. Uses the [Open-Meteo API](https://open-meteo.com/) for geocoding and forecasts, and [OpenStreetMap Nominatim](https://nominatim.org/) to name your current location.

🔗 **[climoscope-drab.vercel.app](https://climoscope-drab.vercel.app/)**

![climoscope screenshot](docs/screenshot.png)

## Features

- City search with autocomplete, or use your current location (browser geolocation, reverse-geocoded to a place name via Nominatim)
- Favorite cities (star a city, persisted in `localStorage`), accessible from a star button/dropdown next to the search bar, with a blurred backdrop while it's open and up/down buttons to reorder them
- Remembers the last city you viewed and reopens on it (falls back to Madrid on first visit)
- Share a city via URL (`?lat=...&lon=...&name=...&country=...`) — the address bar always reflects the current city, and a share button next to the city name copies/shares the link
- Current weather: temperature, feels-like, humidity, wind + gusts (with SVG compass), pressure, UV index, air quality (European AQI, color-coded by category — click for a detail panel with US AQI, pollutants, and pollen), and today's precipitation total (click for a rain/showers/snow breakdown)
- Sunrise and sunset
- Hourly forecast (next 24h), with rain probability
- 7-day forecast, with daily max rain probability
- °C/°F toggle, persisted in `localStorage`
- EN/ES language toggle, persisted in `localStorage` (defaults to English on first visit)
- Dynamic background based on weather and time of day, layered over a random landscape photo (picked on each load from a curated list, via [Picsum Photos](https://picsum.photos/) — no API key)
- A random robot avatar next to the logo, just for fun (via [RoboHash](https://robohash.org/) — no API key)
- Installable as a PWA (works offline for the app shell; weather data always comes from the network), with an update banner when a new version is available

## Running it locally

No build step or dependencies to install. Since the files use `fetch` and relative paths, they need to be served over HTTP (opening `index.html` directly via `file://` can fail due to CORS in some browsers). Any static server works, for example:

```bash
python3 -m http.server 8000
```

then open `http://localhost:8000` in your browser.

## Structure

```
index.html       page structure
css/style.css     styles
js/app.js         logic: geocoding, weather fetch, render, state
sw.js             service worker (caches the app shell)
manifest.json     PWA manifest
icons/            PWA icons
test/             automated tests (see Testing below)
```

## Testing

The app itself still has no dependencies, but the test suite runs on Node's
built-in test runner (Node 18+):

```bash
npm test
```

Since `js/app.js` is a plain script with no exports (by design — no build
step, no modules), tests work by giving it a fake `document`/`window`/
`localStorage`/`fetch` (see `test/dom-stub.js`) and asserting on what it
renders, the same way a real browser tab would host it. No network calls are
made — `test/fixtures.js` has canned Open-Meteo/Nominatim-shaped responses.

## Deployment

Published on [Vercel](https://vercel.com/) as a static site, imported directly from this repo (no custom build command or output directory — Vercel serves `index.html` from the root as-is). Every push to `main` deploys automatically to https://climoscope-drab.vercel.app/.
