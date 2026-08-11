// Hand-written service worker (Next 16 has no built-in SW; Serwist needs
// webpack, which conflicts with Turbopack). Offline-first for the moments that
// matter — SOS, breathing, quick actions, lessons (§7).
const CACHE = "qt-v4";
// Only precache what is reachable WITHOUT a session. "/", "/dashboard", "/sos"
// and "/learn" are auth-gated now: precaching them stores whatever the install
// happened to see — often the /login redirect — under the wrong key.
// Signed-in pages are still cached at runtime by the network-first handler.
const CORE = ["/login", "/offline", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: network-first, fall back to cache, then the offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Never cache a redirect under the requested URL. fetch() follows
          // redirects, so signed-in /login returns the DESTINATION's html —
          // caching that would make /login serve the app page when offline.
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((r) => r || caches.match("/offline") || caches.match("/login")),
        ),
    );
    return;
  }

  // Assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
