const CACHE = "lala-v7";
const PRECACHE = [
  "/",
  "/static/assistant/app.js",
  "/static/assistant/manifest.json",
  "/static/assistant/icons/icon-192.png",
  "/static/assistant/icons/icon-512.png",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(PRECACHE.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).pathname.startsWith("/ask")) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          const key = req.mode === "navigate" ? "/" : req;
          caches.open(CACHE).then((c) => c.put(key, copy));
        }
        return res;
      })
      .catch(() => caches.match(req.mode === "navigate" ? "/" : req))
  );
});

  // Everything else: cached copy first, refreshed in the background
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});