# Changelog

All notable changes to this project are documented in this file, generated
from the git history. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [SemVer](https://semver.org/).

## [1.3.1] - 2026-09-18

### Fixed
- Pollen unit ("grains/m³") in the air quality modal now translates to Spanish ("granos/m³")

## [1.3.0] - 2026-09-18

### Added
- Precipitation card (today's total) with a detail modal breaking it down into rain, showers, snow, and hours with precipitation

### Changed
- Air quality modal's CSS generalized into shared, reusable "detail modal" styles (used by both it and the new precipitation modal)
- Updated README screenshot to reflect the current app (background photo, redesigned metrics grid, favorites/geolocation controls)

## [1.2.1] - 2026-09-18

### Added
- Version number shown in the footer, linking to this changelog on GitHub

### Changed
- Smaller footer font size on mobile
- Footer text simplified (dropped "no sign-up, no API key")

## [1.2.0] - 2026-09-18

### Added
- Favorites menu redesigned: a star button next to the search bar opens a dropdown (replacing the always-visible row below it), with a blurred backdrop while it's open
- Up/down buttons to reorder favorites
- Air quality detail modal: click the air quality number for the exact category, European AQI, US AQI, pollutant levels (PM2.5, PM10, NO₂, O₃, SO₂, CO), and pollen counts (Europe only, hidden elsewhere)
- Date shown next to the clock

### Changed
- Clock/date text sharpened (brighter color, layered shadow) for legibility over the background photo

### Fixed
- iOS Safari zooming the whole page in when tapping the search input (its font-size was under the 16px threshold that triggers it)

## [1.1.1] - 2026-09-18

### Fixed
- Favorite, share, and geolocation icons replaced with inline SVGs instead of emoji: emoji render with their own fixed colors regardless of CSS, so the hover-to-amber styling every other button gets had no visible effect on them, and they could look inconsistent across OS emoji fonts
- Star icon appearing vertically misaligned next to the share icon (optical-centering nudge — a 5-point star's visual weight sits lower than its bounding box's geometric center)

## [1.1.0] - 2026-09-18

### Added
- Air quality metric color-coded by European AQI category (Good/Fair/Moderate/Poor/Very Poor/Extremely Poor), with the exact category shown as a tooltip
- Random landscape background photo, from a curated no-people photo set via Picsum Photos (no API key) — reshuffled on page load and whenever the PWA regains visibility from the background

### Changed
- Background photo starts loading earlier (DNS preconnect, reordered init) so it appears sooner

### Fixed
- Background photo (and the night starfield) leaving a gap at the bottom on mobile, caused by `100vh` not tracking the browser's dynamic address bar — switched to `100dvh`

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
