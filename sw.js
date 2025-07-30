// A new version number for our cache. Change this when you update the sw.js file itself.
const CACHE_NAME = 'activity-tracker-cache-v3';

// The files to cache. Since CSS and JS are inline, we only need the main HTML file.
const ASSETS_TO_CACHE = [
  './',
  './index.html'
];

// --- INSTALL: Fired when the service worker is first installed. ---
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      // Force the new service worker to become active immediately.
      return self.skipWaiting();
    })
  );
});

// --- ACTIVATE: Fired when the service worker becomes active. ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        // Clean up old caches that don't match the current CACHE_NAME.
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME).map(cacheName => {
          console.log('Service Worker: Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Take control of all open pages.
      return self.clients.claim();
    })
  );
});

// --- FETCH: Intercepts all network requests. (FIX for OFFLINE ERROR) ---
self.addEventListener('fetch', event => {
  // We only handle GET requests for our assets.
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
      return;
  }

  event.respondWith(
    // Strategy: Cache, falling back to Network.
    caches.match(event.request).then(cachedResponse => {
      // If the response is in the cache, return it immediately.
      if (cachedResponse) {
        return cachedResponse;
      }
      // If not in cache, try to fetch it from the network.
      // The .catch() handles the case where the network request fails (e.g., offline).
      return fetch(event.request).catch(() => {
         console.error('SW: Fetch failed. User is likely offline and resource is not in cache.');
         // This prevents the "TypeError: Failed to fetch" by returning an empty error response.
         return new Response(null, { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});


// --- MESSAGE: Listens for commands from the main page. (NEW FEATURE) ---
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'FORCE_UPDATE') {
    console.log('Service Worker: Force update command received.');
    swStatus.textContent = 'Forcing update from network...';
    // When the page sends this message, we force a re-fetch of the main page
    // and update the cache with the new version.
    const updatePromise = caches.open(CACHE_NAME).then(cache => {
      // Fetch with 'no-cache' to bypass the browser's regular HTTP cache.
      return fetch('./index.html', { cache: 'no-store' }).then(networkResponse => {
        if (networkResponse.ok) {
          console.log('Service Worker: Updating cache with new index.html');
          // We must cache for both './' and './index.html' keys.
          cache.put('./', networkResponse.clone());
          cache.put('./index.html', networkResponse);
        }
        return networkResponse;
      });
    });
    event.waitUntil(updatePromise);
  }
});
