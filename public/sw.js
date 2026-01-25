/**
 * PhotoVault Service Worker
 * Provides offline app shell caching for PWA functionality
 */

const CACHE_NAME = "photovault-v1";
const STATIC_CACHE_NAME = "photovault-static-v1";

// Static assets to cache for offline app shell
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  // Icons
  "/icons/icon-32x32.png",
  "/icons/icon-72x72.png",
  "/icons/icon-96x96.png",
  "/icons/icon-128x128.png",
  "/icons/icon-144x144.png",
  "/icons/icon-152x152.png",
  "/icons/icon-192x192.png",
  "/icons/icon-384x384.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
  "/icons/shortcut-gallery.png",
  "/icons/shortcut-backup.png",
  // Splash screens
  "/splash/apple-splash-2048-2732.png",
  "/splash/apple-splash-1170-2532.png",
  "/splash/apple-splash-1284-2778.png",
  // Fonts
  "/fonts/SF-Pro-Display-Regular.woff2",
  "/fonts/SF-Pro-Display-Bold.woff2",
  // UI Assets
  "/key.svg",
  "/cloud.svg",
  "/shield.svg",
  "/lock.svg",
  "/upload.svg",
  "/image.svg",
  "/search.svg",
  "/smartphone.svg",
  "/clock.svg",
  "/RefreshCw.svg",
  "/Openfolder.svg",
  "/ChevronRight.svg",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Some assets failed to cache:", err);
      });
    }),
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          }),
      );
    }),
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip API requests (Better Auth, Supabase, etc.)
  if (url.pathname.startsWith("/api/")) return;

  // Skip external requests (IPFS, Pinata, etc.)
  if (url.origin !== self.location.origin) return;

  // For navigation requests, use network-first strategy
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the response for offline use
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline - return cached response
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // Fallback to root page
            return caches.match("/");
          });
        }),
    );
    return;
  }

  // For static assets, use cache-first strategy
  if (
    request.destination === "image" ||
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then((response) => {
          // Cache the response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      }),
    );
    return;
  }
});

// Handle push notifications (future use)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || "PhotoVault Update",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [100, 50, 100],
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "PhotoVault", options),
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});

console.log("[SW] Service Worker loaded");
