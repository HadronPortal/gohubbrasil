/* PWA helpers: guarded SW registration, install prompt, push permission */

const SW_URL = "/sw.js?v=20260624-3";

function isPreviewHost(): boolean {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  return false;
}

function shouldRegister(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  if (isPreviewHost()) return false;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return false;
  return true;
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  if (!shouldRegister()) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs
          .filter((r) => r.active?.scriptURL.endsWith(SW_URL))
          .map((r) => r.unregister()),
      );
    } catch {
      /* noop */
    }
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
    await registration.update();
  } catch (err) {
    console.warn("SW registration failed", err);
  }
}

/* ===== Install / platform detection ===== */

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSLike = /iPad|iPhone|iPod/.test(ua);
  // iPadOS reports as Mac with touch
  const iPadOS = ua.includes("Mac") && "ontouchend" in document;
  return iOSLike || iPadOS;
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}
