const CACHE_NAME = 'crisora-static-v1';
const MAPS_CACHE = 'dms-maps-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Intentionally wrapped in try-catch to allow partial caching in dev
      return Promise.allSettled(STATIC_ASSETS.map(asset => cache.add(asset)));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache regions GeoJSON dynamically
  if (url.pathname.includes('/regions')) {
    event.respondWith(
      caches.open(MAPS_CACHE).then(async (cache) => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) return cachedResponse;
          throw error;
        }
      })
    );
    return;
  }

  // Fallback for AI Chat API (though UI handles it gracefully, SW ensures smooth fail)
  if (url.pathname.includes('/ai/chat')) {
    event.respondWith(
      fetch(event.request).catch(error => {
        return new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Default Network-First for dynamic / Cache-First for static
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
