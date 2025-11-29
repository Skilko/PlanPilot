/**
 * PlanPilot Service Worker
 * Enables offline capabilities and installation
 */

const CACHE_NAME = 'planpilot-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/main.css',
  '/css/components.css',
  '/css/map.css',
  '/css/responsive.css',
  '/js/app.js',
  '/js/api.js',
  '/js/config.js',
  '/js/connections.js',
  '/js/filters.js',
  '/js/locations.js',
  '/js/map.js',
  '/js/markers.js',
  '/js/modals.js',
  '/js/storage.js',
  '/js/trip-summary.js',
  '/js/ui.js',
  '/planpilot.png',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Service Worker: Cache failed', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, could return a custom offline page
        console.log('Service Worker: Fetch failed for', event.request.url);
      })
  );
});


