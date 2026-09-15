'use strict';

// Canned Open-Meteo / Nominatim response shapes, trimmed to just the fields
// js/app.js actually reads. Dates are fixed in the past on purpose: app.js
// looks for the first hourly.time >= "now" and falls back to index 0 when
// none matches, so a fixed fixture behaves the same run after run regardless
// of when the tests execute.

function makeWeatherResponse(overrides = {}) {
  const hours = Array.from({ length: 24 }, (_, i) => `2024-01-01T${String(i).padStart(2, '0')}:00`);
  return {
    timezone: 'Europe/Madrid',
    current: {
      temperature_2m: 19,
      weathercode: 1,
      is_day: 1,
      relative_humidity_2m: 40,
      wind_speed_10m: 12,
      wind_direction_10m: 220,
      wind_gusts_10m: 20,
      pressure_msl: 1018,
      apparent_temperature: 18,
    },
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, i) => 15 + i),
      weathercode: hours.map(() => 1),
      precipitation_probability: hours.map(() => 0),
      uv_index: hours.map(() => 3),
    },
    daily: {
      time: ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07'],
      temperature_2m_max: [20, 21, 22, 23, 24, 25, 26],
      temperature_2m_min: [10, 11, 12, 13, 14, 15, 16],
      weathercode: [1, 1, 1, 1, 1, 1, 1],
      sunrise: ['2024-01-01T08:00', '2024-01-02T08:00', '2024-01-03T08:00', '2024-01-04T08:00', '2024-01-05T08:00', '2024-01-06T08:00', '2024-01-07T08:00'],
      sunset: ['2024-01-01T18:00', '2024-01-02T18:00', '2024-01-03T18:00', '2024-01-04T18:00', '2024-01-05T18:00', '2024-01-06T18:00', '2024-01-07T18:00'],
      precipitation_probability_max: [0, 0, 0, 0, 0, 0, 0],
    },
    ...overrides,
  };
}

function makeAirQualityResponse(overrides = {}) {
  return {
    current: { european_aqi: 25 },
    ...overrides,
  };
}

module.exports = { makeWeatherResponse, makeAirQualityResponse };
