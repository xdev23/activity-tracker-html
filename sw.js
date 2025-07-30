// Define a unique name for the cache. Bump this version number whenever you update the sw.js file.
const CACHE_NAME = 'activity-tracker-cache-v2';

// List the files that the browser should cache for offline use.
// Since all your CSS and JS are inside index.html, we only need that one file.
// We cache both './' (the root) and './index.html' to handle both ways the page can be accessed.
const ASSETS_TO_CACHE = [
  './',
  './index.html'
];

// INSTALL: This event runs when the service worker is first installed.
self.addEventListener('install', event => {
  event.waitUntil(
    // Open the cache and add all our specified assets to it.
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching App Shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // Force the new service worker to become active immediately.
        // This prevents the "waiting" state and makes updates smoother.
        return self.skipWaiting();
      })
  );
});

// ACTIVATE: This event runs when the service worker becomes active.
self.addEventListener('activate', event => {
  event.waitUntil(
    // Get all existing cache names.
    caches.keys().then(cacheNames => {
      return Promise.all(
        // Map over all cache names and delete any that are not our current CACHE_NAME.
        // This cleans up old, outdated caches.
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        // Take control of all open clients (pages) immediately.
        return self.clients.claim();
    })
  );
});

// FETCH: This event runs for every network request made by the page.
self.addEventListener('fetch', event => {
  // We only want to cache GET requests for http/https resources.
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
      return;
  }

  // This is the "stale-while-revalidate" strategy.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request)
            .then(cachedResponse => {
                // 1. Try to get the response from the cache.
                const fetchPromise = fetch(event.request).then(
                    networkResponse => {
                        // 2. While serving the cached version (if any), also go to the network.
                        if (networkResponse.ok) {
                            // 3. If the network request is successful, update the cache with the new version.
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }
                );

                // Return the cached response immediately if it exists, otherwise wait for the network.
                return cachedResponse || fetchPromise;
            });
    })
  );
});
