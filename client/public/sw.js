// Service worker for PWA functionality with proper cache management
const CACHE_NAME = `prangan-manager-v${Date.now()}`;
const STATIC_CACHE = "prangan-static";
const RUNTIME_CACHE = "prangan-runtime";

// Essential files to cache for offline functionality
const urlsToCache = ["/", "/manifest.json", "/favicon.ico", "/icon.png"];

// Install event - cache essential resources
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker");
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching essential resources");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match current version
            if (cacheName !== STATIC_CACHE && cacheName !== RUNTIME_CACHE) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - network first strategy for HTML, cache first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip external requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches
              .open(RUNTIME_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cached version or offline page
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match("/");
          });
        })
    );
    return;
  }

  // Handle asset requests (JS, CSS, images, etc.)
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version but also update cache in background
          fetch(request)
            .then((response) => {
              if (response.status === 200) {
                const responseClone = response.clone();
                caches
                  .open(RUNTIME_CACHE)
                  .then((cache) => cache.put(request, responseClone));
              }
            })
            .catch(() => {
              /* Ignore network errors */
            });
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches
              .open(RUNTIME_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        });
      })
    );
    return;
  }

  // For all other requests, try network first, then cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches
            .open(RUNTIME_CACHE)
            .then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Handle service worker updates
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
