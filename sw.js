// A new version number for our cache. Change this when you update the sw.js file itself.
const CACHE_NAME = 'activity-tracker-cache-v4'; // Incremented version

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
      return self.skipWaiting();
    })
  );
});

// --- ACTIVATE: Fired when the service worker becomes active. ---
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName !== CACHE_NAME).map(cacheName => {
          console.log('Service Worker: Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// --- FETCH: Intercepts all network requests. ---
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
      return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
         console.error('SW: Fetch failed. User is likely offline and resource is not in cache.');
         return new Response(null, { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});

// --- MESSAGE: Listens for commands from the main page. ---
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'FORCE_UPDATE') {
    console.log('Service Worker: Force update command received.');
    
    // This is the core logic: fetch the latest version from the server
    // and store it in the cache, overwriting the old version.
    const updatePromise = caches.open(CACHE_NAME).then(cache => {
      return fetch('./index.html', { cache: 'no-store' }).then(networkResponse => {
        if (networkResponse.ok) {
          console.log('Service Worker: Updating cache with new index.html');
          cache.put('./', networkResponse.clone());
          cache.put('./index.html', networkResponse);
          // After updating, notify the page that it's done.
          self.clients.clients().then(clients => {
              clients.forEach(client => client.postMessage({ type: 'UPDATE_COMPLETE' }));
          });
        }
        return networkResponse;
      }).catch(err => {
          console.error('SW: Force update fetch failed:', err);
      });
    });

    event.waitUntil(updatePromise);
  }
});
