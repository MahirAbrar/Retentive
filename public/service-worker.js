const CACHE_NAME = 'retentive-v2'; // Updated to bust old cache
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip API requests (let them fail naturally for offline handling)
  if (url.pathname.startsWith('/api') || 
      url.hostname.includes('supabase') ||
      url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached response if found
        if (cachedResponse) {
          return cachedResponse;
        }

        // Clone the request because it can only be used once
        const fetchRequest = request.clone();

        return fetch(fetchRequest).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response because it can only be used once
          const responseToCache = response.clone();

          // Cache the fetched response for future use
          caches.open(CACHE_NAME).then((cache) => {
            // Only cache successful responses
            if (request.url.startsWith('http')) {
              cache.put(request, responseToCache);
            }
          });

          return response;
        }).catch(() => {
          // Return offline page if available
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
          // For other resources, just fail
          return new Response('Offline', { status: 503 });
        });
      })
  );
});