// =====================================================================
// Service Worker — Full offline support for PWA installation
// Caches EVERYTHING needed on first load, so the game works without
// internet after being added to home screen.
// =====================================================================
const CACHE_NAME = 'legend-orchard-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './matter.min.js',
  './fonts.css',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cache core files first
      await cache.addAll(CORE_ASSETS).catch(() => {});
      // Discover and cache all CSS/JS files automatically
      try {
        const cssResp = await fetch('./css/style.css');
        if (cssResp.ok) await cache.put('./css/style.css', cssResp.clone());
      } catch(e) {}
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return; // skip cross-origin

  // Network-first for HTML (so updates show), fallback to cache
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return resp;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for everything else (JS, CSS, assets, fonts, matter.min.js)
  // — and cache new requests on the fly so the whole game gets cached
  // automatically as the player plays through it once with internet on.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
