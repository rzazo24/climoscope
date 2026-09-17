'use strict';

const path = require('node:path');

const APP_JS_PATH = path.join(__dirname, '..', 'js', 'app.js');

// js/app.js is a plain script (no exports, no ES modules — see CLAUDE.md
// conventions), so it can only be exercised by giving it a fake `document`/
// `window`/`localStorage`/`fetch` and observing what it does to them, the
// same way a real browser tab would host it. This is necessarily an
// integration-style test, not a unit test of individual functions.
function makeElement(name) {
  return {
    _name: name,
    innerHTML: '',
    textContent: '',
    value: '',
    style: { setProperty() {}, removeProperty() {} },
    classList: {
      _classes: new Set(),
      add(c) { this._classes.add(c); },
      remove(c) { this._classes.delete(c); },
      toggle(c, force) {
        const has = force === undefined ? this._classes.has(c) : !force;
        if (has) this._classes.delete(c); else this._classes.add(c);
      },
      contains(c) { return this._classes.has(c); },
    },
    dataset: {},
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return makeElement(name + '>querySelector'); },
    querySelectorAll() { return []; },
    contains() { return false; },
    setAttribute() {},
    getAttribute() { return null; },
    removeAttribute() {},
  };
}

// Sets up a fresh global document/window/localStorage/navigator/fetch, then
// requires js/app.js into it. Returns the tracked elements plus the
// in-memory localStorage backing store for assertions.
function loadApp({ fetchImpl, localStorageSeed = {}, urlSearch = '' } = {}) {
  const elements = {};
  function getElementById(id) {
    if (!elements[id]) elements[id] = makeElement(id);
    return elements[id];
  }

  global.document = {
    getElementById,
    querySelector: () => makeElement('anon'),
    querySelectorAll: () => [],
    addEventListener() {},
    documentElement: makeElement('documentElement'),
    visibilityState: 'visible',
  };

  global.window = {
    addEventListener() {},
    location: {
      pathname: '/',
      search: urlSearch,
      origin: 'https://climoscope-drab.vercel.app',
    },
    history: { replaceState() {} },
  };

  const store = { ...localStorageSeed };
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };

  // Node defines a read-only global `navigator`, so it can't be plain-assigned.
  Object.defineProperty(global, 'navigator', {
    value: {}, // no geolocation/serviceWorker/share/clipboard by default
    configurable: true,
    writable: true,
  });
  global.fetch = fetchImpl;

  // app.js schedules a 30s clock tick and a 5min update check; neither is
  // relevant to these tests and both would otherwise keep the process alive.
  global.setInterval = () => 0;

  // requestAnimationFrame exists in every real browser but not in Node.
  global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

  delete require.cache[require.resolve(APP_JS_PATH)];
  require(APP_JS_PATH);

  return { elements, store };
}

async function waitFor(predicate, { timeout = 3000, interval = 20 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, interval));
  }
  return false;
}

module.exports = { loadApp, waitFor };
