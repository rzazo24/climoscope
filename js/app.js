const cityInput = document.getElementById('cityInput');
const suggestionsEl = document.getElementById('suggestions');
const recentRow = document.getElementById('recentRow');
const mainPanel = document.getElementById('mainPanel');
const hourlyPanel = document.getElementById('hourlyPanel');
const hourlyScroll = document.getElementById('hourlyScroll');
const dailyPanel = document.getElementById('dailyPanel');
const dailyList = document.getElementById('dailyList');
const unitToggle = document.getElementById('unitToggle');
const clockNow = document.getElementById('clockNow');

const RECENT_KEY = 'climoscope:recent';
const RECENT_MAX = 5;

let unit = 'C'; // C or F
let lastData = null; // cache of last fetched raw data for unit re-render
let recentCities = loadRecent();
let searchDebounce = null;
let searchRequestId = 0; // guards against out-of-order autocomplete responses
let weatherRequestId = 0; // guards against out-of-order weather responses

const WEATHER = {
  0: ['☀️', 'Despejado'], 1: ['🌤️', 'Mayormente despejado'], 2: ['⛅', 'Parcialmente nublado'],
  3: ['☁️', 'Nublado'], 45: ['🌫️', 'Niebla'], 48: ['🌫️', 'Niebla helada'],
  51: ['🌦️', 'Llovizna ligera'], 53: ['🌦️', 'Llovizna'], 55: ['🌧️', 'Llovizna intensa'],
  56: ['🌧️', 'Llovizna helada'], 57: ['🌧️', 'Llovizna helada intensa'],
  61: ['🌧️', 'Lluvia ligera'], 63: ['🌧️', 'Lluvia'], 65: ['🌧️', 'Lluvia intensa'],
  66: ['🌧️', 'Lluvia helada'], 67: ['🌧️', 'Lluvia helada intensa'],
  71: ['🌨️', 'Nevada ligera'], 73: ['🌨️', 'Nevada'], 75: ['❄️', 'Nevada intensa'],
  77: ['❄️', 'Granos de nieve'],
  80: ['🌦️', 'Chubascos ligeros'], 81: ['🌧️', 'Chubascos'], 82: ['⛈️', 'Chubascos violentos'],
  85: ['🌨️', 'Chubascos de nieve'], 86: ['❄️', 'Chubascos de nieve intensos'],
  95: ['⛈️', 'Tormenta'], 96: ['⛈️', 'Tormenta con granizo'], 99: ['⛈️', 'Tormenta fuerte con granizo'],
};

function wx(code) { return WEATHER[code] || ['🌡️', 'Variable']; }

function cToF(c) { return (c * 9/5) + 32; }
function fmtTemp(c) {
  const v = unit === 'C' ? c : cToF(c);
  return Math.round(v) + '°';
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
    clockNow.textContent = now.toLocaleTimeString('es-ES', opts);
  } catch (e) {
    clockNow.textContent = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
}

function setSky(code, isDay) {
  let a = '#16233b', b = '#0b1220';
  if (isDay) {
    if (code === 0 || code === 1) { a = '#2f5f8f'; b = '#0d1a2b'; }
    else if (code === 2 || code === 3) { a = '#33465e'; b = '#101826'; }
    else if (code >= 61 && code <= 86) { a = '#2b3b4d'; b = '#0d1420'; }
    else if (code >= 95) { a = '#241f33'; b = '#0a0a12'; }
    else { a = '#2f4a63'; b = '#0d1a2b'; }
  } else {
    a = '#0e1626'; b = '#05080f';
  }
  document.documentElement.style.setProperty('--sky-a', a);
  document.documentElement.style.setProperty('--sky-b', b);
}

// ---------- Geocoding autocomplete ----------
cityInput.addEventListener('input', () => {
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
});

async function fetchSuggestions(q) {
  const requestId = ++searchRequestId;
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=es&format=json`;
    const res = await fetch(url);
    if (requestId !== searchRequestId) return; // a newer keystroke already superseded this request
    if (!res.ok) throw new Error(`Geocoding API respondió ${res.status}`);
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
    suggestionsEl.innerHTML = `<div class="suggestion-item empty">Sin resultados</div>`;
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
  suggestionsEl.innerHTML = `<div class="suggestion-item empty">No se pudo buscar. Revisa tu conexión.</div>`;
  suggestionsEl.classList.add('open');
}

// ---------- Recent cities (persisted in localStorage) ----------
function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('No se pudo leer las ciudades recientes de localStorage', e);
    return [];
  }
}

function saveRecent() {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentCities));
  } catch (e) {
    console.warn('No se pudo guardar las ciudades recientes en localStorage', e);
  }
}

function addRecent(name, country, lat, lon) {
  recentCities = recentCities.filter(c => c.lat !== lat || c.lon !== lon);
  recentCities.unshift({ name, country, lat, lon });
  recentCities = recentCities.slice(0, RECENT_MAX);
  saveRecent();
  renderRecent();
}

function renderRecent() {
  recentRow.innerHTML = recentCities.map(c =>
    `<div class="recent-chip" data-lat="${c.lat}" data-lon="${c.lon}" data-name="${escapeHtml(c.name)}" data-country="${escapeHtml(c.country || '')}">${escapeHtml(c.name)}</div>`
  ).join('');
  recentRow.querySelectorAll('.recent-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const { lat, lon, name, country } = chip.dataset;
      loadWeather(parseFloat(lat), parseFloat(lon), name, country);
    });
  });
}

// ---------- Unit toggle ----------
unitToggle.addEventListener('click', () => {
  unit = unit === 'C' ? 'F' : 'C';
  unitToggle.textContent = '°' + unit;
  if (lastData) renderAll(lastData);
});

// ---------- Main fetch + render ----------
async function loadWeather(lat, lon, name, country) {
  const requestId = ++weatherRequestId;
  mainPanel.innerHTML = '<div class="status-line">Cargando...</div>';
  hourlyPanel.style.display = 'none';
  dailyPanel.style.display = 'none';

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weathercode,is_day,relative_humidity_2m,wind_speed_10m,wind_direction_10m,apparent_temperature` +
      `&hourly=temperature_2m,weathercode,precipitation_probability` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
      `&timezone=auto&forecast_days=7`;
    const res = await fetch(url);
    if (requestId !== weatherRequestId) return; // a newer city selection already superseded this request

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.reason || `Forecast API respondió ${res.status}`);
    }

    lastData = { data, name, country, lat, lon };
    addRecent(name, country, lat, lon);
    renderAll(lastData);
  } catch (e) {
    if (requestId !== weatherRequestId) return;
    console.error(e);
    mainPanel.innerHTML = '<div class="status-line error">No se pudo cargar el clima. Revisa tu conexión e inténtalo de nuevo.</div>';
  }
}

function renderAll({ data, name, country }) {
  const cur = data.current;
  const daily = data.daily;
  const hourly = data.hourly;
  const [icon, desc] = wx(cur.weathercode);

  setSky(cur.weathercode, cur.is_day === 1);
  updateClock(data.timezone);

  // Compass rotation for wind direction
  const windDeg = cur.wind_direction_10m || 0;

  mainPanel.innerHTML = `
    <div class="primary">
      <div class="place">${escapeHtml(name)}<span class="country">${escapeHtml(country || '')}</span></div>
      <div class="temp-block">
        <div class="temp">${fmtTemp(cur.temperature_2m)}</div>
        <div class="desc">${desc}</div>
      </div>
    </div>
    <div class="metrics">
      <div class="metric">
        <div class="val">${fmtTemp(cur.apparent_temperature)}</div>
        <div class="lbl">Sensación</div>
      </div>
      <div class="metric">
        <div class="val">${cur.relative_humidity_2m}%</div>
        <div class="lbl">Humedad</div>
      </div>
      <div class="metric">
        <div class="val">${Math.round(cur.wind_speed_10m)} km/h</div>
        <div class="lbl">Viento</div>
      </div>
      <div class="metric compass-wrap">
        <svg width="34" height="34" viewBox="0 0 34 34">
          <circle cx="17" cy="17" r="15" fill="none" stroke="var(--panel-line)" stroke-width="1.5"/>
          <g transform="rotate(${windDeg} 17 17)">
            <path d="M17 5 L21 17 L17 14 L13 17 Z" fill="var(--amber)"/>
          </g>
        </svg>
      </div>
    </div>
  `;

  // Hourly: next 24h starting from current hour
  const now = new Date();
  const currentHourIdx = hourly.time.findIndex(t => new Date(t) >= now);
  const startIdx = currentHourIdx >= 0 ? currentHourIdx : 0;
  const hoursSlice = hourly.time.slice(startIdx, startIdx + 24);
  const temps = hourly.temperature_2m.slice(startIdx, startIdx + 24);
  const codes = hourly.weathercode.slice(startIdx, startIdx + 24);

  const maxT = Math.max(...temps);
  const minT = Math.min(...temps);
  const range = Math.max(maxT - minT, 1);

  hourlyScroll.innerHTML = hoursSlice.map((t, i) => {
    const d = new Date(t);
    const timeLabel = i === 0 ? 'Ahora' : d.toLocaleTimeString('es-ES', { hour: '2-digit' });
    const [hIcon] = wx(codes[i]);
    const pct = ((temps[i] - minT) / range) * 100;
    return `
      <div class="hour-col">
        <div class="h-time">${timeLabel}</div>
        <div class="h-icon">${hIcon}</div>
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

  dailyList.innerHTML = daily.time.map((t, i) => {
    const d = new Date(t + 'T00:00:00');
    const dayLabel = i === 0 ? 'Hoy' : d.toLocaleDateString('es-ES', { weekday: 'short' });
    const [dIcon] = wx(daily.weathercode[i]);
    const left = ((daily.temperature_2m_min[i] - weekMinT) / weekRange) * 100;
    const width = ((daily.temperature_2m_max[i] - daily.temperature_2m_min[i]) / weekRange) * 100;
    return `
      <div class="day-row">
        <div class="d-name">${dayLabel}</div>
        <div class="d-icon">${dIcon}</div>
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
renderRecent();
loadWeather(40.4168, -3.7038, 'Madrid', 'España');
setInterval(() => { if (lastData) updateClock(lastData.data.timezone); }, 30000);
