// Mizuna Service Worker - Offline Fallback
const CACHE_NAME = 'mizuna-offline-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE_ASSETS = [
  OFFLINE_URL,
  '/icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // ナビゲーション要求（HTMLページの読み込み・遷移）を対象にオフラインフォールバックを提供
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(OFFLINE_URL);
        return cachedResponse || Response.error();
      })
    );
    return;
  }

  // オフライン画面で使用される事前キャッシュ済みアセット（icon.png 等）のフォールバック
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && PRECACHE_ASSETS.includes(url.pathname)) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedResponse = await caches.match(event.request);
        return cachedResponse || Response.error();
      })
    );
  }
});
