// fcved service worker — leagues/PLAN.md §13 L8.
//
// This file is the TEMPLATE. `public/` is copied verbatim by Vite, so the two
// build-injected values below still carry their sentinels here; the `fcved-sw`
// plugin in vite.config.ts overwrites dist/sw.js with the real list after the
// bundle is written. The list is therefore always what the build actually
// emitted — hashed filenames included — never a hand-kept guess.
//
// Unreplaced (i.e. `npm run dev`), PRECACHE is empty and every handler below
// falls through to the network, so the dev server behaves exactly as if no
// worker were installed.
//
// Scope: the worker is served from the app root (/tinker/fcved/sw.js under the
// Pages base), so its default scope is /tinker/fcved/ — the whole app and
// nothing above it. Paths in PRECACHE are absolute and base-prefixed by the
// plugin; nothing here assumes the site root.

const VERSION = "e3dcc07c78074024";
const PRECACHE = [
  "/tinker/fcved/",
  "/tinker/fcved/assets/index-B3axo2Is.css",
  "/tinker/fcved/assets/index-CRqCySFe.js",
  "/tinker/fcved/data/players.json",
  "/tinker/fcved/data/teams.json",
  "/tinker/fcved/fonts/OFL.txt",
  "/tinker/fcved/fonts/PressStart2P-Regular.ttf",
  "/tinker/fcved/icons/icon-192.png",
  "/tinker/fcved/icons/icon-512.png",
  "/tinker/fcved/index.html",
  "/tinker/fcved/manifest.webmanifest"
];

// PRECACHE[0] is the app's start URL (the base itself). A navigation that
// cannot reach the network falls back to it.
const START_URL = PRECACHE[0];
const CACHE_NAME = `fcved-${VERSION}`;
const PRECACHED = new Set(PRECACHE);

// A new deploy changes at least one precached byte, so VERSION changes, so the
// cache name changes: the new worker installs into a fresh cache, skips
// waiting, deletes every older cache and claims the open pages. Nothing is ever
// served out of a previous build's cache.
self.addEventListener('install', (event) => {
  if (PRECACHE.length === 0) return;
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => (key === CACHE_NAME ? undefined : caches.delete(key)))))
      .then(() => self.clients.claim()),
  );
});

/** Network first, cache second. Used for the HTML document only. */
async function freshFirst(request) {
  try {
    const response = await fetch(request);
    // A redirected response cannot be put in a cache; GitHub Pages redirects
    // the base without its trailing slash, so guard rather than reject.
    if (response.ok && !response.redirected) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(START_URL, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(START_URL, { cacheName: CACHE_NAME });
    return cached || Response.error();
  }
}

/** Cache first. Used for precached assets, which are content-versioned. */
async function cacheFirst(request) {
  const cached = await caches.match(request, { cacheName: CACHE_NAME });
  if (cached) return cached;
  return fetch(request);
}

self.addEventListener('fetch', (event) => {
  if (PRECACHE.length === 0) return;

  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The document is always fetched from the network when the network is there,
  // so the reload after a deploy shows the new build immediately rather than a
  // build later. It references hashed assets the old cache does not hold, which
  // miss and fall through to the network while the new worker installs.
  if (request.mode === 'navigate') {
    event.respondWith(freshFirst(request));
    return;
  }

  if (PRECACHED.has(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
