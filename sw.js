// Minimal "app shell" cache. Not required for the game to work, but lets it
// keep running if a player loses signal after the first load (handy for a
// quick mobile play session).
const CACHE_NAME = 'merge-orchard-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/game.js',
  './js/physics.js',
  './js/items.js',
  './js/config.js',
  './js/particles.js',
  './js/screenshake.js',
  './js/ui.js',
  './js/input.js',
  './js/audio.js',
  './js/utils.js',
  './manifest.json',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
