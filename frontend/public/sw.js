/* eslint-disable no-restricted-globals */
const CACHE_NAME = 'linkedupro-v1';

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icone.png',
  '/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isSameOrigin(request) {
  try {
    return new URL(request.url).origin === self.location.origin;
  } catch (_) {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!request || request.method !== 'GET') return;
  if (!isSameOrigin(request)) return;

  // Avoid caching API calls.
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() => cached || Response.error());

      // For navigation, prefer fresh but fallback to cache.
      if (request.mode === 'navigate') return fetchPromise.catch(() => cached || caches.match('/'));

      // For assets, return cache fast then update in background.
      return cached || fetchPromise;
    })
  );
});

