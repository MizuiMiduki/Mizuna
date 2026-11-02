// Mizuna Service Worker - App Cache & Controlled Update
const SW_VERSION = '3.14.0';
const CACHE_NAME = 'mizuna-cache-v3.14.0';
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
// ※最新のファイルを確実にキャッシュするため cache: 'reload' でフェッチ
// ※ユーザーが選択するまでアップデートを適用しないため、自動での self.skipWaiting() は行わない
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of PRECACHE_ASSETS) {
        try {
          const res = await fetch(asset, { cache: 'reload' });
          if (res.ok) {
            await cache.put(asset, res);
          }
        } catch (e) {
          console.warn('Failed to precache asset:', asset, e);
        }
      }
    })
  );
});

// クライアントからのメッセージを受信
self.addEventListener('message', (event) => {
  // バージョン照会に応答
  if (event.data && event.data.type === 'GET_VERSION') {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ version: SW_VERSION });
    }
  }
  // ユーザーが「今すぐアップデート」を選択した時のみ SKIP_WAITING を実行
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => {
        return Promise.all(names.map((n) => caches.delete(n)));
      })
    );
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

  // バージョン自動確認用エンドポイント（/version.json）はキャッシュせずネットワーク直通
  if (url.pathname === '/version.json') {
    return;
  }

  // 1. ナビゲーションリクエスト（HTMLページの表示・遷移）
  // Cache First: ユーザーが更新を適用するまでは既存のキャッシュから即座に返し、通信量を削減する
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        // まず現在のバージョンキャッシュから HTML を探す（通信量 0 で即座に表示）
        const cachedResponse =
          (await cache.match(request)) ||
          (await cache.match('/index.html')) ||
          (await cache.match('/'));

        if (cachedResponse) {
          return cachedResponse;
        }

        // キャッシュにない場合（初回インストール時など）のみネットワークから取得
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // オフライン時: キャッシュされた最新HTML、またはオフライン専用画面を返却
          const offlineFallback =
            (await cache.match(OFFLINE_URL)) ||
            (await caches.match(OFFLINE_URL));
          return offlineFallback || Response.error();
        }
      })()
    );
    return;
  }

  // 2. 同一オリジンの静的アセット（JS, CSS, アイコン, フォント等）
  // Cache First with Network Fallback & Runtime Caching
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          cache.put(request, responseToCache);
        }
        return networkResponse;
      } catch (error) {
        // オフライン時の事前キャッシュフォールバック（例: /icon.png）
        if (PRECACHE_ASSETS.includes(url.pathname)) {
          const fallback = await cache.match(url.pathname);
          if (fallback) return fallback;
        }
        return Response.error();
      }
    })()
  );
});
