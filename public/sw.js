/// <reference lib="webworker" />

// OpenRouter Radar — Service Worker
// Caches the app shell for offline use and serves API data from cache when offline.

const CACHE_VERSION = "or-radar-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

// App shell routes — anything that returns HTML
const SHELL_ROUTES = ["/", "/setup"];

// Static assets to precache
const PRECACHE_URLS = [
  "/",
  "/setup",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== "GET") return;

  // OpenRouter API — stale-while-revalidate
  if (url.hostname === "openrouter.ai" && url.pathname.includes("/api/v1/models")) {
    event.respondWith(staleWhileRevalidate(req, DATA_CACHE));
    return;
  }

  // Arena AI leaderboard API — stale-while-revalidate
  if (url.hostname === "api.wulong.dev") {
    event.respondWith(staleWhileRevalidate(req, DATA_CACHE));
    return;
  }

  // Same-origin navigation requests — serve from shell cache (SPA fallback)
  if (url.origin === self.location.origin && req.mode === "navigate") {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return caches.match("/");
      })
    );
    return;
  }

  // Same-origin static assets — cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        }).catch(() => caches.match("/"));
      })
    );
    return;
  }
});

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
