// A new version number for our cache. Change this when you update the sw.js file itself.
const CACHE_NAME = 'activity-tracker-cache-v6';

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

// --- FETCH: Intercepts all network requests. (CORRECTED OFFLINE LOGIC) ---
self.addEventListener('fetch', event => {
  // We only handle GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategy: Network first, falling back to cache.
  // This is ideal for the main HTML file to ensure users get updates when online.
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // If the network request is successful, update the cache with the new version.
        // This keeps the offline version fresh.
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // If the network request fails (user is offline), serve the content from the cache.
        console.log('SW: Network fetch failed, serving from cache.');
        return caches.match(event.request);
      })
  );
});


// --- MESSAGE: Listens for commands from the main page. (CORRECTED) ---
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'FORCE_UPDATE') {
    console.log('Service Worker: Force update command received.');
    
    const updatePromise = caches.open(CACHE_NAME).then(cache => {
      // Fetch with 'no-store' to bypass the browser's regular HTTP cache.
      return fetch('./index.html', { cache: 'no-store' }).then(networkResponse => {
        if (networkResponse.ok) {
          console.log('Service Worker: Updating cache with new index.html');
          cache.put('./', networkResponse.clone());
          cache.put('./index.html', networkResponse);
          
          // Use the CORRECT method: self.clients.matchAll()
          self.clients.matchAll().then(clients => {
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
