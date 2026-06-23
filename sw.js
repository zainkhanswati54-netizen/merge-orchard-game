// Minimal "app shell" cache. Not required for the game to work, but lets it
// keep running if a player loses signal after the first load.
const CACHE_NAME = 'merge-orchard-v7';
const AUDIO_ASSETS = [
  './assets/sounds/drop.ogg',
  './assets/sounds/merge.ogg',
  './assets/sounds/gameover.ogg',
  './assets/sounds/click.ogg',
  './assets/sounds/land.ogg',
  './assets/sounds/levelup.ogg',
  './assets/sounds/combo.ogg',
  './assets/sounds/unlock.ogg',
  './assets/sounds/heartbeat.ogg',
  './assets/sounds/music_loop.ogg',
  './manifest.json',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(AUDIO_ASSETS)).catch(() => {})
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

  // JS, HTML, CSS — always fetch fresh from the network (so updates are instant).
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.css') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Audio and images — cache-first (heavy files that rarely change).
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((resp) => {
      if (resp.ok) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
      }
      return resp;
    }))
  );
});
