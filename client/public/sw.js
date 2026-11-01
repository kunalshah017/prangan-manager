// Service worker for PWA functionality with proper cache management
const CACHE_VERSION = "v12";
const STATIC_CACHE = `prangan-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `prangan-runtime-${CACHE_VERSION}`;
const PDF_CACHE = "prangan-pdfs-v3";
const PDF_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days, as the old public book links allowed
// Registered as /sw.js?dev by the dev server: push only, no caching, so local
// changes always load fresh.
const DEV_MODE = /[?&]dev\b/.test(location.search || "");

// Coursebooks come from the private Blob store through links that expire, so the
// browser cache (keyed by the whole link) would download them on every opening.
// Keep each book under its link without the signature instead: streamed the
// first time, read from the device after that, fetched again after 30 days.
const isBookRequest = (request, url) =>
  url.hostname.endsWith(".private.blob.vercel-storage.com") &&
  url.pathname.startsWith("/books/") &&
  !request.headers.has("Range");

const serveBook = (event, url) => {
  const key = `${url.origin}${url.pathname}`;
  event.respondWith(
    caches.open(PDF_CACHE).then(async (cache) => {
      const cached = await cache.match(key);
      const savedAt = Number(cached?.headers.get("sw-cached-at"));
      if (cached && Date.now() - savedAt < PDF_CACHE_MAX_AGE) return cached;

      const response = await fetch(event.request).catch(() => undefined);
      if (!response) return cached ?? Response.error();
      if (response.status !== 200 || !response.body) return response;

      const headers = { "Content-Type": "application/pdf" };
      const length = response.headers.get("Content-Length");
      if (length) headers["Content-Length"] = length;
      const [forReader, forCache] = response.body.tee();
      // Finish saving even if the reader closes early; a full disk only skips saving.
      event.waitUntil(
        cache
          .put(key, new Response(forCache, { headers: { ...headers, "sw-cached-at": String(Date.now()) } }))
          .catch(() => {}),
      );
      return new Response(forReader, { headers });
    }),
  );
};

const offlineResponse = () =>
  new Response("Temporarily unavailable while offline.", {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });

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
  if (DEV_MODE) return;
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
                cacheName.startsWith("prangan-runtime") ||
                cacheName.startsWith("prangan-pdfs"));

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
  if (DEV_MODE) return;
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  if (isBookRequest(request, url)) {
    serveBook(event, url);
    return;
  }

  // Skip other external requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip same-origin PDF files
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
          return caches
            .match(request)
            .then(
              async (cachedResponse) =>
                cachedResponse || (await caches.match("/")) || offlineResponse(),
            );
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
        return fetch(request)
          .then((response) => {
            if (response.status === 200) {
              const responseClone = response.clone();
              caches
                .open(RUNTIME_CACHE)
                .then((cache) => cache.put(request, responseClone));
            }
            return response;
          })
          .catch(offlineResponse);
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
      .catch(() =>
        caches
          .match(request)
          .then((cachedResponse) => cachedResponse || offlineResponse()),
      ),
  );
});

// Handle service worker updates
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Push: show the message, and tell open windows to refresh the bell.
self.addEventListener("push", (event) => {
  let message = { title: "Prangan Manager", body: "", href: "/" };
  try {
    message = { ...message, ...event.data.json() };
  } catch {
    // An empty or plain-text push still shows the default title.
  }
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(message.title, {
        body: message.body,
        icon: "/pwa-icon-192.png",
        // A newer reminder for the same to-do replaces the old one.
        tag: message.key || undefined,
        data: { href: message.href || "/", key: message.key || null },
        // Android shows a to-do's button under the message; tapping it opens href too.
        actions: message.actionLabel ? [{ action: "open", title: message.actionLabel }] : [],
      }),
      self.clients
        .matchAll({ type: "window" })
        .then((windows) => windows.forEach((client) => client.postMessage({ type: "notification" }))),
    ]),
  );
});

// Tapping a notification opens its page. The open app is brought forward and
// asked to move there itself (no reload). If nothing in it answers (signed out,
// or a full-screen page without the menu), the window is sent to the page
// directly; with no window open, a new one opens on it.
const askAppToOpen = (client, href) =>
  new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(false), 1500);
    channel.port1.onmessage = () => {
      clearTimeout(timer);
      resolve(true);
    };
    client.postMessage({ type: "notification-open", href }, [channel.port2]);
  });

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data?.href || "/";
  const url = new URL(href, location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const app = windows.find((client) => client.url.startsWith(location.origin));
      if (!app) return self.clients.openWindow(url);
      const focused = (await app.focus().catch(() => null)) || app;
      if (await askAppToOpen(focused, href)) return undefined;
      return focused.navigate ? focused.navigate(url).catch(() => self.clients.openWindow(url)) : self.clients.openWindow(url);
    })(),
  );
});
