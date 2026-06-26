/* Firebase Cloud Messaging (Web Push) for GoHub PWA. */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";
import { isPushSupported, requestNotificationPermission } from "@/lib/pwa";

const firebaseConfig = {
  apiKey: "AIzaSyBh1U1LzKEwDb2C0OdDrsKUPHkL2yPzTxw",
  authDomain: "gohub-brasil.firebaseapp.com",
  projectId: "gohub-brasil",
  storageBucket: "gohub-brasil.firebasestorage.app",
  messagingSenderId: "137475846487",
  appId: "1:137475846487:web:dadebe7e7a220e18b68e12",
};

const VAPID_KEY =
  "BLGYHq8n7p3MdY2QuhyDZPVIfDxwNE4prHs1raHitMf95vWmAqwxRS79KkK9aOrNFCSCzeYEpNI9hIIC5Hhc6M8";

const FCM_SW_URL = "/firebase-messaging-sw.js";

function isPreviewHost(): boolean {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  return false;
}

function canUseFcm(): boolean {
  if (typeof window === "undefined") return false;
  if (!isPushSupported()) return false;
  if (window.self !== window.top) return false;
  if (isPreviewHost()) return false;
  return true;
}

let appInstance: FirebaseApp | null = null;
let messagingInstance: Messaging | null = null;
let foregroundBound = false;

function getFirebase(): FirebaseApp {
  if (appInstance) return appInstance;
  appInstance = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return appInstance;
}

async function getMessagingSafe(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isSupported();
    if (!supported) return null;
    messagingInstance = getMessaging(getFirebase());
    return messagingInstance;
  } catch {
    return null;
  }
}

async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const scope = "/firebase-cloud-messaging-push-scope";
    const existing = await navigator.serviceWorker.getRegistration(scope);
    if (existing && existing.active?.scriptURL.endsWith(FCM_SW_URL)) return existing;
    return await navigator.serviceWorker.register(FCM_SW_URL, { scope });
  } catch (err) {
    console.warn("FCM SW registration failed", err);
    return null;
  }
}

async function saveToken(token: string): Promise<void> {
  try {
    const { error } = await (supabase as any).rpc("save_my_push_token", { p_token: token });
    if (!error) return;
    console.warn("save_my_push_token RPC failed, falling back:", error.message);
  } catch (err) {
    console.warn("save_my_push_token RPC threw, falling back:", err);
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    await supabase
      .from("users")
      .update({ push_token: token } as any)
      .eq("id", user.id);
  } catch (err) {
    console.warn("Fallback push_token update failed:", err);
  }
}

function bindForegroundHandler(messaging: Messaging) {
  if (foregroundBound) return;
  foregroundBound = true;
  onMessage(messaging, (payload) => {
    const data: any = payload.data || {};
    const n: any = payload.notification || {};
    const title = n.title || data.title || "GoHub";
    const body = n.body || data.body || "";
    const path = data.path || "/";

    // Notify the bell to refresh its unread count immediately.
    window.dispatchEvent(
      new CustomEvent("gohub:push", { detail: { title, body, path, type: data.type } }),
    );
  });
}

/** Call after the user is authenticated. Requests permission and registers the token. */
export async function setupFcmForUser(): Promise<void> {
  if (!canUseFcm()) return;

  const perm = await requestNotificationPermission();
  if (perm !== "granted") return;

  const reg = await registerFcmServiceWorker();
  if (!reg) return;

  const messaging = await getMessagingSafe();
  if (!messaging) return;

  try {
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: reg,
    });
    if (token) {
      await saveToken(token);
      try {
        localStorage.setItem("gohub.fcm.token", token);
      } catch {
        /* noop */
      }
    }
    bindForegroundHandler(messaging);
  } catch (err) {
    console.warn("FCM getToken failed:", err);
  }
}