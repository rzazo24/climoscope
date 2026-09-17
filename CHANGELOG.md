# Changelog

All notable changes to this project are documented in this file, generated
from the git history. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [SemVer](https://semver.org/).

## [1.0.0] - 2026-09-15

First feature-complete, tested release.

### Added
- °C/°F unit and EN/ES language preferences, persisted in `localStorage` and applied from the first render
- Remembers the last viewed city and reopens on it (falls back to Madrid on first visit)
- Share a city via URL (`?lat=&lon=&name=&country=`): the address bar always reflects the current city, plus a share button that uses the Web Share API or copies the link
- "New version available" reload banner for the installed PWA
- Automated test suite (Node's built-in test runner, no dependencies)

### Changed
- Hourly forecast's horizontal scrollbar restyled to match the app
- More breathing room above the footer

### Fixed
- Favorite chips truncate instead of overflowing when a city name is too long
- Update-banner detection: was tied to the service worker's own version (which almost never changes, since it's network-first), so it never fired; now compares `js/app.js`'s ETag instead

## [0.3.0] - 2026-09-10

### Added
- PWA support: manifest, service worker, install icons
- UV index and air quality (European AQI) metrics
- Sunrise/sunset, and rain probability in both the hourly and 7-day forecasts
- Wind gusts and atmospheric pressure metrics
- Favorites section for cities
- Browser geolocation ("use my location"), reverse-geocoded to a place name via Nominatim

### Changed
- Service worker switched from cache-first to network-first, so app-shell updates always reach installed PWAs
- Removed the recent-cities section (redundant once favorites existed)
- Desktop layout now widens fluidly with the viewport instead of a single fixed breakpoint
- Hourly temperature bars use a cool-to-amber gradient instead of a flat color

### Fixed
- Search row and daily-forecast row overflowing on narrow (mobile/PWA) screens

## [0.2.0] - 2026-09-03

### Changed
- Widened the app container on desktop viewports

## [0.1.0] - 2026-08-28

Initial release.

### Added
- climoscope: a minimalist weather app in vanilla HTML/CSS/JS, using the Open-Meteo API for geocoding and forecasts
- English-by-default UI with an EN/ES language toggle
- Vercel deployment and Vercel Analytics
- MIT license and inline SVG favicon
- Footer author credit and a README screenshot

### Changed
- Richer dynamic background (per-condition glow accent and a night starfield)

### Fixed
- Bottom page padding being ignored on tall pages (root cause: `body` had a fixed rather than minimum height), then tuned down to a moderate value once fixed
