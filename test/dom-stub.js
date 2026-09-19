'use strict';

const path = require('node:path');

const APP_JS_PATH = path.join(__dirname, '..', 'js', 'app.js');

// js/app.js is a plain script (no exports, no ES modules — see CLAUDE.md
// conventions), so it can only be exercised by giving it a fake `document`/
// `window`/`localStorage`/`fetch` and observing what it does to them, the
// same way a real browser tab would host it. This is necessarily an
// integration-style test, not a unit test of individual functions.
// Reads `class="..."`-style attributes out of a raw opening-tag string
// (everything between the tag name and its closing `>`).
function parseAttrs(tagInner) {
  const attrs = {};
  const re = /([a-zA-Z-]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(tagInner))) {
    attrs[m[1]] = m[2]
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }
  return attrs;
}

function attrsToDataset(attrs) {
  const dataset = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('data-')) dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return dataset;
}

// Selectors this codebase actually uses are plain classes, optionally
// compound (`.a.b`) or with a single `:not(.c)` (see js/app.js). Not a real
// CSS selector engine — just enough of one for that fixed vocabulary.
function selectorMatches(classAttr, selector) {
  const notMatch = selector.match(/:not\(\.([\w-]+)\)/);
  const base = selector.replace(/:not\([^)]*\)/, '');
  const required = base.split('.').filter(Boolean);
  const classes = new Set((classAttr || '').trim().split(/\s+/).filter(Boolean));
  if (!required.every((c) => classes.has(c))) return false;
  if (notMatch && classes.has(notMatch[1])) return false;
  return true;
}

// Scans a rendered innerHTML string and returns one synthetic element per
// opening tag found, tag-name-agnostic (app.js never queries by tag). Reads
// each match's own attributes and its inner content up to the *first*
// closing tag of the same name — correct for every element this codebase
// actually queries (suggestion/favorite items, the fav/share buttons, the
// aqi/precip metric buttons), none of which nest a same-named tag inside
// themselves, but not a real parser: a genuinely nested case would grab the
// wrong closing tag. Parsed once per distinct innerHTML string and then
// filtered per selector (see querySelectorAll below) — parsing directly per
// selector would mint a *different* element for, say, `.suggestion-item` and
// `.suggestion-item:not(.empty)` even though they're the same rendered node,
// losing whatever listener app.js had attached to the first one.
function parseRenderedElements(html) {
  const results = [];
  const tagRe = /<(\w+)\b([^>]*)>/g;
  let m;
  while ((m = tagRe.exec(html))) {
    const tag = m[1];
    const attrs = parseAttrs(m[2]);
    const openEnd = m.index + m[0].length;
    const closeIdx = html.indexOf(`</${tag}>`, openEnd);
    const el = makeElement(`<${tag} class="${attrs.class || ''}">`);
    el.classList._classes = new Set((attrs.class || '').trim().split(/\s+/).filter(Boolean));
    el.dataset = attrsToDataset(attrs);
    el.innerHTML = closeIdx >= 0 ? html.slice(openEnd, closeIdx) : '';
    results.push({ classAttr: attrs.class, el });
  }
  return results;
}

function makeElement(name) {
  const el = {
    _name: name,
    _listeners: {},
    _queryCache: { html: undefined, all: [] },
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
    addEventListener(type, fn) { (el._listeners[type] = el._listeners[type] || []).push(fn); },
    removeEventListener(type, fn) {
      if (el._listeners[type]) el._listeners[type] = el._listeners[type].filter((f) => f !== fn);
    },
    dispatchEvent(event) {
      (el._listeners[event.type] || []).slice().forEach((fn) => fn(event));
    },
    click() {
      el.dispatchEvent({ type: 'click', target: el, currentTarget: el, stopPropagation() {}, preventDefault() {} });
    },
    focus() { el._focused = true; },
    querySelectorAll(selector) {
      // Parse once per distinct innerHTML, then filter per selector — so a
      // render's querySelectorAll (attaching listeners) and a later
      // querySelector for the same content (e.g. the Enter-key handler) see
      // the *same* element/listener for a given rendered node, the same
      // identity a real DOM would give as long as nothing re-rendered.
      if (el._queryCache.html !== el.innerHTML) {
        el._queryCache.html = el.innerHTML;
        el._queryCache.all = parseRenderedElements(el.innerHTML);
      }
      return el._queryCache.all.filter((e) => selectorMatches(e.classAttr, selector)).map((e) => e.el);
    },
    querySelector(selector) { return el.querySelectorAll(selector)[0] || null; },
    contains() { return false; },
    setAttribute(k, v) { el._attrs = el._attrs || {}; el._attrs[k] = String(v); },
    getAttribute(k) { return (el._attrs && k in el._attrs) ? el._attrs[k] : null; },
    removeAttribute(k) { if (el._attrs) delete el._attrs[k]; },
  };
  return el;
}

// Fires `type` on `el` as if the browser had (see makeElement.dispatchEvent —
// this is not real event dispatch/bubbling, just enough to invoke the
// listeners app.js itself attached to this exact element).
function dispatch(el, type, extra = {}) {
  el.dispatchEvent({ type, target: el, currentTarget: el, stopPropagation() {}, preventDefault() {}, ...extra });
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

module.exports = { loadApp, waitFor, dispatch };
