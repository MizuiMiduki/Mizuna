// Cache name
const CACHE_NAME = 'mizuna-chash-R1.1.2';
// Cache targets
const urlsToCache = [
  './',
  './index.html',
  './index.css',
  './index.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        return response ? response : fetch(event.request);
      })
  );
});
