/* Caché exclusiva del aviso sin conexión. Las páginas y la API usan la red. */
const CACHE_PUBLICA = "zontes-offline-v1";
const AVISO_OFFLINE = "/pwa/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_PUBLICA)
      .then((cache) => cache.addAll([AVISO_OFFLINE, "/pwa/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("zontes-offline-") && key !== CACHE_PUBLICA,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await caches.match(AVISO_OFFLINE)) ||
          new Response(
            "Sin conexión. Vuelve a intentarlo cuando tengas internet.",
            {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            },
          ),
      ),
    );
  } else if (url.pathname === "/pwa/icon-192.png") {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
  }
});
