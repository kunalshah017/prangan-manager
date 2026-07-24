// Service worker for PWA functionality with proper cache management
const CACHE_VERSION = "v4";
const STATIC_CACHE = `prangan-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `prangan-runtime-${CACHE_VERSION}`;
const PDF_CACHE = "prangan-pdfs-v2"; // Incremented version for new caching strategy
const PDF_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB max for caching

// Essential files to cache for offline functionality
const urlsToCache = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/icon.png",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/pwa-maskable-192.png",
  "/pwa-maskable-512.png",
  "/apple-touch-icon.png",
];

// Install event - cache essential resources
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker");
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching essential resources");
        return cache.addAll(urlsToCache);
      }),
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
            const isPriorAppCache =
              cacheName !== STATIC_CACHE &&
              cacheName !== RUNTIME_CACHE &&
              cacheName !== PDF_CACHE &&
              (cacheName.startsWith("prangan-static") ||
                cacheName.startsWith("prangan-runtime"));

            if (isPriorAppCache) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      }),
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

  // Skip external requests (including external PDFs - now handled by IndexedDB)
  if (url.origin !== location.origin) {
    return;
  }

  // Skip PDF files - they are now cached in IndexedDB by the app
  if (url.pathname.endsWith(".pdf")) {
    return;
  }

  // API responses may contain authenticated or account-specific data.
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
    return;
  }

  // Vite development modules must always come from the dev server. Caching them
  // can combine an old React dispatcher with a newer renderer after HMR/restarts.
  if (
    url.pathname === "/@vite/client" ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/.vite/")
  ) {
    return;
  }

  // Never cache requests carrying credentials, regardless of path.
  if (request.headers.has("Authorization")) {
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
        }),
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
      }),
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
      }),
  );
});

// Handle service worker updates
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
