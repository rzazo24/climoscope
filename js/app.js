const cityInput = document.getElementById('cityInput');
const geoBtn = document.getElementById('geoBtn');
const suggestionsEl = document.getElementById('suggestions');
const favoritesBtn = document.getElementById('favoritesBtn');
const favoritesMenu = document.getElementById('favoritesMenu');
const mainPanel = document.getElementById('mainPanel');
const hourlyPanel = document.getElementById('hourlyPanel');
const hourlyScroll = document.getElementById('hourlyScroll');
const dailyPanel = document.getElementById('dailyPanel');
const dailyList = document.getElementById('dailyList');
const unitToggle = document.getElementById('unitToggle');
const langToggle = document.getElementById('langToggle');
const clockNow = document.getElementById('clockNow');
const starsLayer = document.getElementById('starsLayer');
const photoLayer = document.getElementById('photoLayer');
const updateBanner = document.getElementById('updateBanner');
const updateBannerText = document.getElementById('updateBannerText');
const updateBannerBtn = document.getElementById('updateBannerBtn');

const FAVORITES_KEY = 'climoscope:favorites';
const LAST_CITY_KEY = 'climoscope:lastCity';
const UNIT_KEY = 'climoscope:unit';
const LANG_KEY = 'climoscope:lang';

let unit = loadUnit(); // C or F, persisted across reloads
let lang = loadLang(); // 'en' or 'es', persisted across reloads
let lastData = null; // cache of last fetched raw data for unit re-render
let favoriteCities = loadFavorites();
let searchDebounce = null;
let searchRequestId = 0; // guards against out-of-order autocomplete responses
let weatherRequestId = 0; // guards against out-of-order weather responses

// Inline SVGs instead of emoji so these icons pick up currentColor (and
// therefore the same hover/active color transitions as everything else in
// the toggle-btn/fav-btn family) instead of rendering as fixed-color glyphs
// that look different per OS/font.
const STAR_SVG = '<svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>';
const SHARE_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/></svg>';

const WEATHER = {
  0: { icon: '☀️', en: 'Clear sky', es: 'Despejado' },
  1: { icon: '🌤️', en: 'Mostly clear', es: 'Mayormente despejado' },
  2: { icon: '⛅', en: 'Partly cloudy', es: 'Parcialmente nublado' },
  3: { icon: '☁️', en: 'Cloudy', es: 'Nublado' },
  45: { icon: '🌫️', en: 'Fog', es: 'Niebla' },
  48: { icon: '🌫️', en: 'Freezing fog', es: 'Niebla helada' },
  51: { icon: '🌦️', en: 'Light drizzle', es: 'Llovizna ligera' },
  53: { icon: '🌦️', en: 'Drizzle', es: 'Llovizna' },
  55: { icon: '🌧️', en: 'Heavy drizzle', es: 'Llovizna intensa' },
  56: { icon: '🌧️', en: 'Freezing drizzle', es: 'Llovizna helada' },
  57: { icon: '🌧️', en: 'Heavy freezing drizzle', es: 'Llovizna helada intensa' },
  61: { icon: '🌧️', en: 'Light rain', es: 'Lluvia ligera' },
  63: { icon: '🌧️', en: 'Rain', es: 'Lluvia' },
  65: { icon: '🌧️', en: 'Heavy rain', es: 'Lluvia intensa' },
  66: { icon: '🌧️', en: 'Freezing rain', es: 'Lluvia helada' },
  67: { icon: '🌧️', en: 'Heavy freezing rain', es: 'Lluvia helada intensa' },
  71: { icon: '🌨️', en: 'Light snow', es: 'Nevada ligera' },
  73: { icon: '🌨️', en: 'Snow', es: 'Nevada' },
  75: { icon: '❄️', en: 'Heavy snow', es: 'Nevada intensa' },
  77: { icon: '❄️', en: 'Snow grains', es: 'Granos de nieve' },
  80: { icon: '🌦️', en: 'Light showers', es: 'Chubascos ligeros' },
  81: { icon: '🌧️', en: 'Showers', es: 'Chubascos' },
  82: { icon: '⛈️', en: 'Violent showers', es: 'Chubascos violentos' },
  85: { icon: '🌨️', en: 'Snow showers', es: 'Chubascos de nieve' },
  86: { icon: '❄️', en: 'Heavy snow showers', es: 'Chubascos de nieve intensos' },
  95: { icon: '⛈️', en: 'Thunderstorm', es: 'Tormenta' },
  96: { icon: '⛈️', en: 'Thunderstorm with hail', es: 'Tormenta con granizo' },
  99: { icon: '⛈️', en: 'Severe thunderstorm with hail', es: 'Tormenta fuerte con granizo' },
};

const STRINGS = {
  en: {
    placeholder: 'Search city...',
    startMessage: 'Search a city to start',
    loading: 'Loading...',
    weatherError: 'Could not load the weather. Check your connection and try again.',
    noResults: 'No results',
    searchError: 'Could not search. Check your connection.',
    hoursTitle: 'Next hours',
    daysTitle: '7 days',
    feelsLike: 'Feels like',
    humidity: 'Humidity',
    wind: 'Wind',
    gusts: 'Gusts',
    pressure: 'Pressure',
    uvIndex: 'UV index',
    airQuality: 'Air quality',
    sunrise: 'Sunrise',
    sunset: 'Sunset',
    now: 'Now',
    today: 'Today',
    footer: 'Data from Open-Meteo & OpenStreetMap · no sign-up, no API key',
    locale: 'en-US',
    favoritesAria: 'Favorites',
    noFavorites: 'No favorites yet',
    favoriteAria: 'Toggle favorite',
    geoAria: 'Use my location',
    locating: 'Locating...',
    myLocation: 'My location',
    geoError: 'Could not get your location. Check permissions and try again.',
    updateAvailable: 'New version available',
    reloadBtn: 'Reload',
    shareAria: 'Share this city',
  },
  es: {
    placeholder: 'Buscar ciudad...',
    startMessage: 'Busca una ciudad para empezar',
    loading: 'Cargando...',
    weatherError: 'No se pudo cargar el clima. Revisa tu conexión e inténtalo de nuevo.',
    noResults: 'Sin resultados',
    searchError: 'No se pudo buscar. Revisa tu conexión.',
    hoursTitle: 'Próximas horas',
    daysTitle: '7 días',
    feelsLike: 'Sensación',
    humidity: 'Humedad',
    wind: 'Viento',
    gusts: 'Ráfagas',
    pressure: 'Presión',
    uvIndex: 'Índice UV',
    airQuality: 'Calidad del aire',
    sunrise: 'Amanecer',
    sunset: 'Atardecer',
    now: 'Ahora',
    today: 'Hoy',
    footer: 'Datos de Open-Meteo y OpenStreetMap · sin registro, sin clave de API',
    locale: 'es-ES',
    favoritesAria: 'Favoritos',
    noFavorites: 'Aún no tienes favoritos',
    favoriteAria: 'Marcar como favorito',
    geoAria: 'Usar mi ubicación',
    locating: 'Localizando...',
    myLocation: 'Mi ubicación',
    geoError: 'No se pudo obtener tu ubicación. Revisa los permisos e inténtalo de nuevo.',
    updateAvailable: 'Hay una versión nueva disponible',
    reloadBtn: 'Recargar',
    shareAria: 'Compartir esta ciudad',
  },
};

function t(key) { return STRINGS[lang][key]; }

function wx(code) {
  const w = WEATHER[code] || { icon: '🌡️', en: 'Variable', es: 'Variable' };
  return [w.icon, w[lang]];
}

// European AQI bands per Open-Meteo's docs (0-20 Good ... 100+ Extremely Poor).
// Colors are coarser than the 6 bands (Good/Fair share green, Very Poor/Extremely
// Poor share red) since that many distinct hues isn't legible at this size.
const AQI_LEVELS = [
  { max: 20, en: 'Good', es: 'Buena', color: '#6fbf8b' },
  { max: 40, en: 'Fair', es: 'Aceptable', color: '#6fbf8b' },
  { max: 60, en: 'Moderate', es: 'Moderada', color: 'var(--amber)' },
  { max: 80, en: 'Poor', es: 'Mala', color: '#e07a3f' },
  { max: 100, en: 'Very Poor', es: 'Muy mala', color: '#d64545' },
  { max: Infinity, en: 'Extremely Poor', es: 'Extremadamente mala', color: '#d64545' },
];

function aqiInfo(aqi) {
  const level = AQI_LEVELS.find((l) => aqi <= l.max) || AQI_LEVELS[AQI_LEVELS.length - 1];
  return { label: level[lang], color: level.color };
}

function cToF(c) { return (c * 9/5) + 32; }
function fmtTemp(c) {
  const v = unit === 'C' ? c : cToF(c);
  return Math.round(v) + '°';
}

// isoString has no timezone offset — it's already shifted to the location's
// local time by the API's timezone=auto, so it must be read back "as-is"
// (no explicit timeZone here), same convention as the hourly/daily labels below.
function fmtTime(isoString) {
  return new Date(isoString).toLocaleTimeString(t('locale'), { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function updateClock(tz) {
  try {
    const now = new Date();
    const opts = { hour: '2-digit', minute: '2-digit', timeZone: tz };
    clockNow.textContent = now.toLocaleTimeString(t('locale'), opts);
  } catch (e) {
    clockNow.textContent = new Date().toLocaleTimeString(t('locale'), { hour: '2-digit', minute: '2-digit' });
  }
}

function setSky(code, isDay) {
  const isFog = code === 45 || code === 48;
  const isDrizzleRain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
  const isSnow = (code >= 71 && code <= 77) || code === 85 || code === 86;
  const isStorm = code >= 95;
  const isCloudy = code === 2 || code === 3;
  const isClear = code === 0 || code === 1;

  let a, b, glow, stars = false;

  if (isDay) {
    if (isClear) { a = '#3a6ea8'; b = '#0d1a2b'; glow = 'var(--amber)'; }
    else if (isCloudy) { a = '#3d5068'; b = '#101826'; glow = '#9fb8d1'; }
    else if (isFog) { a = '#4a5568'; b = '#161d29'; glow = '#c9d3de'; }
    else if (isDrizzleRain) { a = '#314a5f'; b = '#0d1420'; glow = 'var(--cool)'; }
    else if (isSnow) { a = '#44576f'; b = '#141d2b'; glow = '#e3edf7'; }
    else if (isStorm) { a = '#2b2340'; b = '#0a0a12'; glow = '#9b7fe0'; }
    else { a = '#2f4a63'; b = '#0d1a2b'; glow = '#5a7ea0'; }
  } else {
    if (isClear) { a = '#141f36'; b = '#04060c'; glow = '#8fb3e0'; stars = true; }
    else if (isCloudy) { a = '#161e2c'; b = '#05070c'; glow = '#4a5568'; }
    else if (isFog) { a = '#1c2532'; b = '#070a0f'; glow = '#6b7889'; }
    else if (isDrizzleRain) { a = '#101a24'; b = '#04070b'; glow = '#3d6b80'; }
    else if (isSnow) { a = '#182234'; b = '#05080e'; glow = '#7c96b8'; }
    else if (isStorm) { a = '#1a1228'; b = '#040308'; glow = '#6c4fb0'; }
    else { a = '#0e1626'; b = '#04060b'; glow = '#3a4a5e'; }
  }

  const root = document.documentElement;
  root.style.setProperty('--sky-a', a);
  root.style.setProperty('--sky-b', b);
  root.style.setProperty('--sky-glow', glow);
  starsLayer.classList.toggle('visible', stars);
}

// Random background photo (picsum.photos — no API key/signup needed). Not
// tied to weather (the dynamic sky gradient from setSky above still tints on
// top of it) — reshuffled on page load and whenever the tab/PWA regains
// visibility (see the visibilitychange listener near the bottom), so it
// changes both on a full reload and on returning from the background.
// Restricted to a hand-picked set of landscape/nature photo IDs (checked
// individually for no people in frame), since Picsum's random endpoint has
// no theme/keyword filter and pulls from its whole mixed catalog otherwise.
const PHOTO_IDS = [
  10, 28, 29, 69, 81, 89, 110, 120, 130, 230,
  260, 270, 280, 300, 330, 350, 440, 450, 480, 510,
];

function setRandomBackgroundPhoto() {
  const id = PHOTO_IDS[Math.floor(Math.random() * PHOTO_IDS.length)];
  const url = `https://picsum.photos/id/${id}/1600/900`;
  photoLayer.style.backgroundImage = `url("${url}")`;
  requestAnimationFrame(() => photoLayer.classList.add('visible'));
}

// ---------- Geocoding autocomplete ----------
cityInput.addEventListener('input', () => {
  favoritesMenu.classList.remove('open');
  clearTimeout(searchDebounce);
  const q = cityInput.value.trim();
  if (q.length < 2) {
    suggestionsEl.classList.remove('open');
    return;
  }
  searchDebounce = setTimeout(() => fetchSuggestions(q), 350);
});

cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const first = suggestionsEl.querySelector('.suggestion-item:not(.empty)');
    if (first) first.click();
  }
});

document.addEventListener('click', (e) => {
  if (!suggestionsEl.contains(e.target) && e.target !== cityInput) {
    suggestionsEl.classList.remove('open');
  }
  if (!favoritesMenu.contains(e.target) && !favoritesBtn.contains(e.target)) {
    favoritesMenu.classList.remove('open');
  }
});

// ---------- Geolocation ----------
if (!('geolocation' in navigator)) {
  geoBtn.style.display = 'none';
}

// Best-effort reverse geocoding via Nominatim (OpenStreetMap) so "use my location"
// can show a real place name. No API key, but usage requires attribution (see
// the footer) and is only ever triggered by this one explicit user action.
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&accept-language=${lang}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;
    const name = data.name || data.address?.city || data.address?.town || data.address?.village;
    if (!name) return null;
    return { name, country: data.address?.country || '' };
  } catch (e) {
    console.warn('Reverse geocoding unavailable', e);
    return null;
  }
}

geoBtn.addEventListener('click', () => {
  geoBtn.disabled = true;
  mainPanel.innerHTML = `<div class="status-line">${t('locating')}</div>`;
  hourlyPanel.style.display = 'none';
  dailyPanel.style.display = 'none';

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      const place = await reverseGeocode(latitude, longitude);
      geoBtn.disabled = false;
      loadWeather(latitude, longitude, place ? place.name : t('myLocation'), place ? place.country : '');
    },
    (err) => {
      geoBtn.disabled = false;
      console.error(err);
      mainPanel.innerHTML = `<div class="status-line error">${t('geoError')}</div>`;
    },
    { timeout: 10000 }
  );
});

async function fetchSuggestions(q) {
  const requestId = ++searchRequestId;
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=${lang}&format=json`;
    const res = await fetch(url);
    if (requestId !== searchRequestId) return; // a newer keystroke already superseded this request
    if (!res.ok) throw new Error(`Geocoding API responded ${res.status}`);
    const data = await res.json();
    renderSuggestions(data.results || []);
  } catch (e) {
    if (requestId !== searchRequestId) return;
    console.error(e);
    renderSuggestionsError();
  }
}

function renderSuggestions(results) {
  if (results.length === 0) {
    suggestionsEl.innerHTML = `<div class="suggestion-item empty">${t('noResults')}</div>`;
    suggestionsEl.classList.add('open');
    return;
  }
  suggestionsEl.innerHTML = results.map(r => `
    <div class="suggestion-item" data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${escapeHtml(r.name)}" data-country="${escapeHtml(r.country || '')}">
      <span>${escapeHtml(r.name)}${r.admin1 ? ', ' + escapeHtml(r.admin1) : ''}</span>
      <span class="sub">${escapeHtml(r.country || '')}</span>
    </div>
  `).join('');
  suggestionsEl.classList.add('open');

  suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const { lat, lon, name, country } = item.dataset;
      suggestionsEl.classList.remove('open');
      cityInput.value = '';
      loadWeather(parseFloat(lat), parseFloat(lon), name, country);
    });
  });
}

function renderSuggestionsError() {
  suggestionsEl.innerHTML = `<div class="suggestion-item empty">${t('searchError')}</div>`;
  suggestionsEl.classList.add('open');
}

// ---------- Favorite cities (persisted in localStorage) ----------
function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Could not read favorite cities from localStorage', e);
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteCities));
  } catch (e) {
    console.warn('Could not save favorite cities to localStorage', e);
  }
}

function isFavorite(lat, lon) {
  return favoriteCities.some(c => c.lat === lat && c.lon === lon);
}

function toggleFavorite(name, country, lat, lon) {
  if (isFavorite(lat, lon)) {
    favoriteCities = favoriteCities.filter(c => c.lat !== lat || c.lon !== lon);
  } else {
    favoriteCities.unshift({ name, country, lat, lon });
  }
  saveFavorites();
  renderFavorites();
  const favBtn = mainPanel.querySelector('.fav-btn');
  if (favBtn) favBtn.classList.toggle('active', isFavorite(lat, lon));
}

function renderFavorites() {
  favoritesBtn.classList.toggle('active', favoriteCities.length > 0);

  if (favoriteCities.length === 0) {
    favoritesMenu.innerHTML = `<div class="suggestion-item empty">${t('noFavorites')}</div>`;
    return;
  }

  favoritesMenu.innerHTML = favoriteCities.map(c => `
    <div class="suggestion-item" data-lat="${c.lat}" data-lon="${c.lon}" data-name="${escapeHtml(c.name)}" data-country="${escapeHtml(c.country || '')}">
      <span>${escapeHtml(c.name)}</span>
      <span class="sub">${escapeHtml(c.country || '')}</span>
    </div>
  `).join('');
  favoritesMenu.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const { lat, lon, name, country } = item.dataset;
      favoritesMenu.classList.remove('open');
      loadWeather(parseFloat(lat), parseFloat(lon), name, country);
    });
  });
}

favoritesBtn.addEventListener('click', () => {
  suggestionsEl.classList.remove('open');
  favoritesMenu.classList.toggle('open');
});

// ---------- Last viewed city (persisted in localStorage, used as the start-up city) ----------
function loadLastCity() {
  try {
    const raw = localStorage.getItem(LAST_CITY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('Could not read last city from localStorage', e);
    return null;
  }
}

function saveLastCity(name, country, lat, lon) {
  try {
    localStorage.setItem(LAST_CITY_KEY, JSON.stringify({ name, country, lat, lon }));
  } catch (e) {
    console.warn('Could not save last city to localStorage', e);
  }
}

// ---------- Share city via URL ----------
function cityUrlParams(name, country, lat, lon) {
  const params = new URLSearchParams();
  params.set('lat', lat);
  params.set('lon', lon);
  if (name) params.set('name', name);
  if (country) params.set('country', country);
  return params;
}

function updateUrlForCity(name, country, lat, lon) {
  try {
    const newUrl = `${window.location.pathname}?${cityUrlParams(name, country, lat, lon).toString()}`;
    window.history.replaceState(null, '', newUrl);
  } catch (e) {
    console.warn('Could not update the URL', e);
  }
}

function getSharedCityFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const lat = parseFloat(params.get('lat'));
  const lon = parseFloat(params.get('lon'));
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { lat, lon, name: params.get('name') || '', country: params.get('country') || '' };
}

function shareCity(btn, name, country, lat, lon) {
  const shareUrl = `${window.location.origin}${window.location.pathname}?${cityUrlParams(name, country, lat, lon).toString()}`;

  if (navigator.share) {
    navigator.share({ title: 'climoscope', text: name, url: shareUrl }).catch(() => {});
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareUrl).then(() => {
      const original = btn.textContent;
      btn.textContent = '✓';
      setTimeout(() => { btn.textContent = original; }, 1200);
    }).catch(() => {});
  }
}

// ---------- Unit preference (persisted in localStorage) ----------
function loadUnit() {
  try {
    const raw = localStorage.getItem(UNIT_KEY);
    return raw === 'F' ? 'F' : 'C';
  } catch (e) {
    console.warn('Could not read unit preference from localStorage', e);
    return 'C';
  }
}

function saveUnit() {
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch (e) {
    console.warn('Could not save unit preference to localStorage', e);
  }
}

// ---------- Language preference (persisted in localStorage) ----------
function loadLang() {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    return raw === 'es' ? 'es' : 'en';
  } catch (e) {
    console.warn('Could not read language preference from localStorage', e);
    return 'en';
  }
}

function saveLang() {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (e) {
    console.warn('Could not save language preference to localStorage', e);
  }
}

// ---------- Unit toggle ----------
unitToggle.addEventListener('click', () => {
  unit = unit === 'C' ? 'F' : 'C';
  unitToggle.textContent = '°' + unit;
  saveUnit();
  if (lastData) renderAll(lastData);
});

// ---------- Language toggle ----------
function applyStaticText() {
  document.documentElement.lang = lang;
  langToggle.textContent = lang.toUpperCase();
  unitToggle.textContent = '°' + unit;
  cityInput.placeholder = t('placeholder');
  geoBtn.setAttribute('aria-label', t('geoAria'));
  document.querySelector('#hourlyPanel .section-title').textContent = t('hoursTitle');
  document.querySelector('#dailyPanel .section-title').textContent = t('daysTitle');
  favoritesBtn.setAttribute('aria-label', t('favoritesAria'));
  document.getElementById('footerText').textContent = t('footer');
  if (!lastData) {
    mainPanel.innerHTML = `<div class="status-line">${t('startMessage')}</div>`;
  }
}

langToggle.addEventListener('click', () => {
  lang = lang === 'en' ? 'es' : 'en';
  saveLang();
  applyStaticText();
  renderFavorites();
  if (lastData) renderAll(lastData);
});

// ---------- Main fetch + render ----------
async function loadWeather(lat, lon, name, country) {
  const requestId = ++weatherRequestId;
  mainPanel.innerHTML = `<div class="status-line">${t('loading')}</div>`;
  hourlyPanel.style.display = 'none';
  dailyPanel.style.display = 'none';

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weathercode,is_day,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,apparent_temperature` +
      `&hourly=temperature_2m,weathercode,precipitation_probability,uv_index` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode,sunrise,sunset,precipitation_probability_max` +
      `&timezone=auto&forecast_days=7`;
    const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
      `&current=european_aqi&timezone=auto`;

    // Air quality is a bonus metric: fetched alongside the forecast but never allowed
    // to fail the whole request — if it errors out we just show '—' for that metric.
    const [res, airRes] = await Promise.all([fetch(url), fetch(airQualityUrl).catch(() => null)]);
    if (requestId !== weatherRequestId) return; // a newer city selection already superseded this request

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.reason || `Forecast API responded ${res.status}`);
    }

    let airQuality = null;
    try {
      if (airRes && airRes.ok) {
        const airData = await airRes.json();
        if (!airData.error && airData.current) airQuality = airData.current.european_aqi;
      }
    } catch (e) {
      console.warn('Air quality unavailable', e);
    }

    lastData = { data, airQuality, name, country, lat, lon };
    saveLastCity(name, country, lat, lon);
    updateUrlForCity(name, country, lat, lon);
    renderAll(lastData);
  } catch (e) {
    if (requestId !== weatherRequestId) return;
    console.error(e);
    mainPanel.innerHTML = `<div class="status-line error">${t('weatherError')}</div>`;
  }
}

function renderAll({ data, airQuality, name, country, lat, lon }) {
  const cur = data.current;
  const daily = data.daily;
  const hourly = data.hourly;
  const [icon, desc] = wx(cur.weathercode);

  setSky(cur.weathercode, cur.is_day === 1);
  updateClock(data.timezone);

  // Compass rotation for wind direction
  const windDeg = cur.wind_direction_10m || 0;

  // Current-hour index, reused below both for the UV reading and the hourly strip
  const now = new Date();
  const currentHourIdx = Math.max(0, hourly.time.findIndex(time => new Date(time) >= now));
  const uvIndex = hourly.uv_index ? hourly.uv_index[currentHourIdx] : null;
  const aqi = airQuality != null ? aqiInfo(airQuality) : null;

  mainPanel.innerHTML = `
    <div class="primary">
      <div class="place">
        <span class="place-name-row">
          <span>${escapeHtml(name)}</span>
          <button class="fav-btn${isFavorite(lat, lon) ? ' active' : ''}" aria-label="${t('favoriteAria')}">${STAR_SVG}</button>
          <button class="share-btn" aria-label="${t('shareAria')}">${SHARE_SVG}</button>
        </span>
        <span class="country">${escapeHtml(country || '')}</span>
      </div>
      <div class="temp-block">
        <div class="temp">${fmtTemp(cur.temperature_2m)}</div>
        <div class="desc">${desc}</div>
      </div>
    </div>
    <div class="metrics">
      <div class="metric">
        <div class="val">${fmtTemp(cur.apparent_temperature)}</div>
        <div class="lbl">${t('feelsLike')}</div>
      </div>
      <div class="metric">
        <div class="val">${cur.relative_humidity_2m}%</div>
        <div class="lbl">${t('humidity')}</div>
      </div>
      <div class="metric">
        <div class="val">${Math.round(cur.wind_speed_10m)} km/h</div>
        <div class="lbl">${t('wind')}</div>
      </div>
      <div class="metric">
        <div class="val">${Math.round(cur.wind_gusts_10m)} km/h</div>
        <div class="lbl">${t('gusts')}</div>
      </div>
      <div class="metric compass-wrap">
        <svg width="34" height="34" viewBox="0 0 34 34">
          <circle cx="17" cy="17" r="15" fill="none" stroke="var(--panel-line)" stroke-width="1.5"/>
          <g transform="rotate(${windDeg} 17 17)">
            <path d="M17 5 L21 17 L17 14 L13 17 Z" fill="var(--amber)"/>
          </g>
        </svg>
      </div>
      <div class="metric">
        <div class="val">${uvIndex != null ? Math.round(uvIndex) : '—'}</div>
        <div class="lbl">${t('uvIndex')}</div>
      </div>
      <div class="metric">
        <div class="val"${aqi ? ` style="color:${aqi.color}" title="${aqi.label}"` : ''}>${airQuality != null ? Math.round(airQuality) : '—'}</div>
        <div class="lbl">${t('airQuality')}</div>
      </div>
      <div class="metric">
        <div class="val">${Math.round(cur.pressure_msl)} hPa</div>
        <div class="lbl">${t('pressure')}</div>
      </div>
    </div>
    <div class="sun-row">
      <div class="metric">
        <div class="val">${fmtTime(daily.sunrise[0])}</div>
        <div class="lbl">${t('sunrise')}</div>
      </div>
      <div class="metric">
        <div class="val">${fmtTime(daily.sunset[0])}</div>
        <div class="lbl">${t('sunset')}</div>
      </div>
    </div>
  `;
  mainPanel.querySelector('.fav-btn').addEventListener('click', () => toggleFavorite(name, country, lat, lon));
  mainPanel.querySelector('.share-btn').addEventListener('click', (e) => shareCity(e.currentTarget, name, country, lat, lon));

  // Hourly: next 24h starting from current hour
  const startIdx = currentHourIdx;
  const hoursSlice = hourly.time.slice(startIdx, startIdx + 24);
  const temps = hourly.temperature_2m.slice(startIdx, startIdx + 24);
  const codes = hourly.weathercode.slice(startIdx, startIdx + 24);
  const precipProbs = hourly.precipitation_probability.slice(startIdx, startIdx + 24);

  const maxT = Math.max(...temps);
  const minT = Math.min(...temps);
  const range = Math.max(maxT - minT, 1);

  hourlyScroll.innerHTML = hoursSlice.map((time, i) => {
    const d = new Date(time);
    const timeLabel = i === 0 ? t('now') : d.toLocaleTimeString(t('locale'), { hour: '2-digit' });
    const [hIcon] = wx(codes[i]);
    const pct = ((temps[i] - minT) / range) * 100;
    return `
      <div class="hour-col">
        <div class="h-time">${timeLabel}</div>
        <div class="h-icon">${hIcon}</div>
        <div class="h-precip">${precipProbs[i] > 0 ? precipProbs[i] + '%' : ''}</div>
        <div class="h-bar"><div class="fill" style="height:${Math.max(pct,8)}%"></div></div>
        <div class="h-temp">${fmtTemp(temps[i])}</div>
      </div>
    `;
  }).join('');
  hourlyPanel.style.display = 'block';

  // Daily 7-day
  const weekMaxT = Math.max(...daily.temperature_2m_max);
  const weekMinT = Math.min(...daily.temperature_2m_min);
  const weekRange = Math.max(weekMaxT - weekMinT, 1);

  dailyList.innerHTML = daily.time.map((day, i) => {
    const d = new Date(day + 'T00:00:00');
    const dayLabel = i === 0 ? t('today') : d.toLocaleDateString(t('locale'), { weekday: 'short' });
    const [dIcon] = wx(daily.weathercode[i]);
    const left = ((daily.temperature_2m_min[i] - weekMinT) / weekRange) * 100;
    const width = ((daily.temperature_2m_max[i] - daily.temperature_2m_min[i]) / weekRange) * 100;
    return `
      <div class="day-row">
        <div class="d-name">${dayLabel}</div>
        <div class="d-icon">${dIcon}</div>
        <div class="d-precip">${daily.precipitation_probability_max[i] > 0 ? daily.precipitation_probability_max[i] + '%' : ''}</div>
        <div class="d-range">
          <span class="d-min">${fmtTemp(daily.temperature_2m_min[i])}</span>
          <div class="bar-track"><div class="bar-fill" style="left:${left}%; width:${Math.max(width,6)}%"></div></div>
          <span>${fmtTemp(daily.temperature_2m_max[i])}</span>
        </div>
      </div>
    `;
  }).join('');
  dailyPanel.style.display = 'block';
}

// ---------- Init ----------
setRandomBackgroundPhoto(); // fire this first so the photo request starts as early as possible
applyStaticText();
renderFavorites();
const sharedCity = getSharedCityFromUrl();
if (sharedCity) {
  if (sharedCity.name) {
    loadWeather(sharedCity.lat, sharedCity.lon, sharedCity.name, sharedCity.country);
  } else {
    reverseGeocode(sharedCity.lat, sharedCity.lon).then((place) => {
      loadWeather(sharedCity.lat, sharedCity.lon, place ? place.name : t('myLocation'), place ? place.country : '');
    });
  }
} else {
  const lastCity = loadLastCity();
  if (lastCity) {
    loadWeather(lastCity.lat, lastCity.lon, lastCity.name, lastCity.country);
  } else {
    loadWeather(40.4168, -3.7038, 'Madrid', 'Spain');
  }
}
setInterval(() => { if (lastData) updateClock(lastData.data.timezone); }, 30000);

// ---------- PWA update banner ----------
function showUpdateBanner() {
  if (updateBanner.style.display === 'flex') return;
  updateBannerText.textContent = t('updateAvailable');
  updateBannerBtn.textContent = t('reloadBtn');
  updateBanner.style.display = 'flex';
}

updateBannerBtn.addEventListener('click', () => {
  window.location.reload();
});

// The service worker is network-first, so the app shell already refreshes
// itself on the network on every load — a new sw.js version is NOT what
// signals "there's an update", since sw.js itself rarely changes. What the
// user actually needs to know is that js/app.js changed on the server (true
// for virtually every real update) while this tab has been sitting open with
// the OLD code still running in memory. Detect that directly by comparing
// its ETag against what was live when the page loaded, instead of relying on
// service-worker versioning.
let appJsEtag = null;

async function checkForAppUpdate() {
  try {
    const res = await fetch('js/app.js', { cache: 'no-store' });
    const etag = res.headers.get('etag') || res.headers.get('last-modified');
    if (!etag) return;
    if (appJsEtag === null) {
      appJsEtag = etag;
    } else if (etag !== appJsEtag) {
      showUpdateBanner();
    }
  } catch (e) {
    // offline or blocked — silently skip this check, try again next time
  }
}

checkForAppUpdate();
setInterval(checkForAppUpdate, 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    checkForAppUpdate();
    setRandomBackgroundPhoto();
  }
});

if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });

  // Kept as a secondary signal: fires if sw.js itself is ever updated.
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) showUpdateBanner();
  });
}
