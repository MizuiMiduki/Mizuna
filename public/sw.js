// Mizuna Service Worker - App Cache & Controlled Update
const SW_VERSION = '3.15.0';
const CACHE_NAME = 'mizuna-cache-v3.15.0';
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

// インストール: コアアセットをキャッシュ
// ※ユーザーが選択するまでアップデートを適用しないため、自動での self.skipWaiting() は行わない
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache partial fallback warning:', err);
      });
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

        // 1. まず現在のバージョンキャッシュから HTML を探す（クエリ付きでも ignoreSearch で確実にヒット）
        let cachedResponse =
          (await cache.match(request, { ignoreSearch: true })) ||
          (await cache.match('/index.html')) ||
          (await cache.match('/'));

        if (cachedResponse) {
          return cachedResponse;
        }

        // 2. なければ過去バージョンのキャッシュも含めて全キャッシュを検索（真っ白画面を絶対に防止）
        cachedResponse =
          (await caches.match(request, { ignoreSearch: true })) ||
          (await caches.match('/index.html')) ||
          (await caches.match('/'));

        if (cachedResponse) {
          return cachedResponse;
        }

        // 3. キャッシュにない場合（初回インストール時など）のみネットワークから取得
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // オフライン時: キャッシュされたオフライン画面を返却
          const offlineFallback =
            (await cache.match(OFFLINE_URL)) ||
            (await caches.match(OFFLINE_URL));
          if (offlineFallback) return offlineFallback;

          // 最後の安全策: 空画面/エラー画面にならず、即時再読み込みできる軽量HTMLを返す
          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mizuna</title><style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafe;color:#181c20;text-align:center;padding:20px;}button{padding:12px 24px;border-radius:999px;border:none;background:#2b8cbe;color:#fff;font-weight:bold;cursor:pointer;margin-top:16px;}</style></head><body><h2>Mizuna</h2><p>接続を確認して再読み込みしてください</p><button onclick="location.reload()">再読み込み</button></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
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

      // 1. まず現在のバージョンキャッシュから探す
      let cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. 全キャッシュを検索（アップデート直後などで別バージョンのキャッシュにある場合も活用）
      cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        // オフライン時の事前キャッシュフォールバック（例: /icon.png）
        const fallback =
          (await cache.match(url.pathname)) ||
          (await caches.match(url.pathname));
        if (fallback) return fallback;

        return new Response('', { status: 408, statusText: 'Request Timed Out' });
      }
    })()
  );
});
