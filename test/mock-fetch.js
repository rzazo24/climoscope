'use strict';

// Dispatches on a distinguishing substring of the request URL (the actual
// endpoints app.js calls never overlap: v1/forecast, v1/air-quality,
// geocoding-api, nominatim). `responder` is either a plain object (serialized
// as a 200 JSON response) or a function `(url) => object | Response`.
function mockFetch(handlers) {
  return async function fetchImpl(url) {
    for (const [pattern, responder] of handlers) {
      if (String(url).includes(pattern)) {
        const result = typeof responder === 'function' ? responder(url) : responder;
        if (result instanceof Response) return result;
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
    }
    return new Response('not found', { status: 404 });
  };
}

module.exports = { mockFetch };
