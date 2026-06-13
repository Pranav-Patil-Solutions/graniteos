/**
 * GraniteOS service worker — minimal passthrough.
 *
 * Chrome requires a registered service worker for the PWA install prompt to
 * fire.  This worker does NOT cache anything; it just intercepts fetch events
 * and immediately falls back to the network.  GraniteOS is an online-only
 * app — no offline mode is needed.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass every request straight through to the network.
  event.respondWith(fetch(event.request));
});
