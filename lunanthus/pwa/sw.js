let CURRENT_VERSION = "0.0.0";
let CACHE_NAME = "app-cache-" + CURRENT_VERSION;

async function loadVersion() {
    const res = await fetch("/lunanthus/pwa/manifest.json");
    const manifest = await res.json();
    CURRENT_VERSION = manifest.version;
    CACHE_NAME = "app-cache-" + CURRENT_VERSION;
}

self.addEventListener("install", (/** @type {ExtendableEvent} */ event) => {
    event.waitUntil(
        (async () => {
            await loadVersion();
            self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", (/** @type {ExtendableEvent} */ event) => {
    event.waitUntil(
        (async () => {
            clients.claim();

            const keys = await caches.keys();
            await Promise.all(
                keys.map((key) => {
                    if (!key.includes(CURRENT_VERSION)) {
                        return caches.delete(key);
                    }
                })
            );
        })()
    );
});

self.addEventListener("fetch", (/** @type {FetchEvent} */ event) => {
    event.respondWith(fetch(event.request));
});
