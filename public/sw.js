// Mizuna Service Worker - App Cache & Controlled Update
const CACHE_NAME = 'mizuna-cache-v3.12.0';
const OFFLINE_URL = '/offline.html';

// 事前キャッシュするコアアセット
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest-canary.json',
  '/icon.png',
  OFFLINE_URL,
];

// インストール: コアアセットをキャッシュ。
// ※ユーザーが選択するまでアップデートを適用しないため、自動での self.skipWaiting() は行わない
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// クライアントからのメッセージを受信
// ユーザーが「今すぐアップデート」を選択した時のみ SKIP_WAITING を実行
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// アクティベーション: 古いキャッシュの削除
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

// フェッチ制御: キャッシュ戦略
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // HTTP/HTTPS 以外のスキーム（chrome-extension等）は無視
  if (!request.url.startsWith('http')) return;

  // GET メソッド以外（POST/PUT/DELETE等）はネットワーク直通
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 外部オリジン（Misskey APIサーバーや外部画像など）はキャッシュせずネットワーク直通
  if (url.origin !== self.location.origin) {
    return;
  }

  // 1. ナビゲーションリクエスト（HTMLページの表示・遷移）
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // ネットワークから最新のHTMLを取得
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // オフライン時: キャッシュされた最新HTML、またはオフライン専用画面を返却
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const offlineFallback = await caches.match(OFFLINE_URL);
          return offlineFallback || Response.error();
        }
      })()
    );
    return;
  }

  // 2. 同一オリジンの静的アセット（JS, CSS, アイコン, フォント等）
  // Cache First with Network Fallback & Runtime Caching
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(async () => {
        // オフライン時の事前キャッシュフォールバック（例: /icon.png）
        if (PRECACHE_ASSETS.includes(url.pathname)) {
          const fallback = await caches.match(url.pathname);
          if (fallback) return fallback;
        }
        return Response.error();
      });
    })
  );
});
