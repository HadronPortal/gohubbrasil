/* GoHub Service Worker - push + safe updates */
const CACHE = "gohub-shell-v3";
const SHELL = ["/manifest.webmanifest", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("gohub-") && name !== CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/~oauth") || url.pathname.startsWith("/auth")) return;

  // Fresh HTML on every app open. This prevents the installed PWA from keeping
  // an old Vercel build after new deploys.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req, { cache: "no-store" }).catch(() => caches.match(req)));
    return;
  }

  // Hashed assets usually cache safely, but NetworkFirst avoids stale bundles
  // when the PWA is already installed on Android.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined);
            return res;
          }),
      ),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "GoHub", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "GoHub";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { path: data.path || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.path) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(path).catch(() => undefined);
          return client.focus();
        }
      }
      return self.clients.openWindow(path);
    }),
  );
});
