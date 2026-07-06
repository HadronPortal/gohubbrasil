/* GoHub Firebase Cloud Messaging Service Worker
 * Handles background web push for the PWA.
 * Lives at the origin root so FCM uses it automatically.
 * Version: 2026-07-06-4
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

// Background messages.
// If payload.notification is present, the browser/FCM already shows the
// system notification automatically — do NOT call showNotification again,
// otherwise Android displays two identical notifications.
// Only render manually for data-only messages.
if (!self.__gohubOnBgBound) {
  self.__gohubOnBgBound = true;
  messaging.onBackgroundMessage((payload) => {
    if (payload && payload.notification) return;

    const data = (payload && payload.data) || {};
    const title = data.title || "GoHub";
    const body = data.body || "";
    const path = data.path || "/";

    self.registration.showNotification(title, {
      body,
      icon: "/icons/notification-icon-192.png",
      badge: "/icons/notification-badge-96.png",
      tag: data.type || "gohub",
      data: { path },
      vibrate: [120, 60, 120],
    });
  });
}

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