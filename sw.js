/**
 * Advanced Activity Tracker - Service Worker
 *
 * This script enables the web page to work offline by caching its essential files.
 * It's designed specifically for a GitHub Pages repository setup.
 */

// A unique name for your cache.
// IMPORTANT: If you make any changes to your HTML, CSS, or this file,
// you MUST increment this version number (e.g., 'v2', 'v3', etc.).
// This tells the browser to install the new service worker and cache the new files.
const CACHE_NAME = 'activity-tracker-cache-v1';

// The name of your GitHub repository. This is crucial for creating the correct paths.
const REPO_NAME = '/activity-tracker-html';

// A list of all the files that make up your application's "shell".
// These paths MUST be absolute, starting from the domain root (e.g., /repository-name/file).
const URLS_TO_CACHE = [
  `${REPO_NAME}/`,
  `${REPO_NAME}/index.html`
];

/**
 * INSTALLATION:
 * This event fires when the browser first downloads the service worker.
 * Its job is to open the cache and add all the essential files to it.
 */
self.addEventListener('install', event => {
  // waitUntil() ensures that the installation doesn't complete until the caching is done.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell...');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache app shell.', error);
      })
  );
});

/**
 * ACTIVATION:
 * This event fires after the service worker has been installed and is ready to take control.
 * Its main job is to clean up any old, unused caches from previous versions.
 */
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // If a cache is found that is NOT in our whitelist, delete it.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

/**
 * FETCH:
 * This event fires every time the web page requests a resource (like the main page, an image, etc.).
 * The service worker acts as a proxy, intercepting the request.
 */
self.addEventListener('fetch', event => {
  event.respondWith(
    // First, try to find a matching response in the cache.
    caches.match(event.request)
      .then(response => {
        // If a cached version is found, return it immediately, skipping the network.
        if (response) {
          // console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }

        // If the resource is not in the cache, fetch it from the network as usual.
        // console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request);
      })
  );
});
