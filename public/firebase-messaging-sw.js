/* GoHub Firebase Cloud Messaging Service Worker
 * Handles background web push for the PWA.
 * Lives at the origin root so FCM uses it automatically.
 * Version: 2026-07-06-6
 */
/* eslint-disable */
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBh1U1LzKEwDb2C0OdDrsKUPHkL2yPzTxw",
  authDomain: "gohub-brasil.firebaseapp.com",
  projectId: "gohub-brasil",
  storageBucket: "gohub-brasil.firebasestorage.app",
  messagingSenderId: "137475846487",
  appId: "1:137475846487:web:dadebe7e7a220e18b68e12",
});

const messaging = firebase.messaging();

// Force this SW to take control ASAP so icon/badge updates apply immediately.
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Background messages — backend sends DATA-ONLY payloads, so the SW must
// always render the notification manually. Guard against double-binding.
if (!self.__gohubOnBgBound) {
  self.__gohubOnBgBound = true;
  messaging.onBackgroundMessage((payload) => {
    const data = (payload && payload.data) || {};
    const title = data.title || "GoHub";
    const body = data.body || "";
    const path = data.path || "/";
    const type = data.type || "gohub";
    const uniqueId = data.appointment_id || data.id || Date.now();

    self.registration.showNotification(title, {
      body,
      icon: "/icons/notification-icon-192.png",
      badge: "/icons/notification-badge-72.png",
      image: undefined,
      tag: `${type}-${uniqueId}`,
      renotify: true,
      requireInteraction: false,
      silent: false,
      timestamp: Date.now(),
      vibrate: [120, 60, 120],
      data: {
        url: path,
        ...data,
      },
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const path = d.url || d.path || "/";
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