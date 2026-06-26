import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/contexts/AuthContext";
import { setupFcmForUser } from "@/lib/fcm";

/**
 * Boots Firebase Cloud Messaging (Web Push) right after the user is authenticated.
 * Skipped on native Capacitor builds — those use @capacitor/push-notifications.
 */
export function FcmRegistrar() {
  const { user } = useAuth();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    if (!user?.id) return;
    if (Capacitor.isNativePlatform()) return;

    didRun.current = true;
    // Defer slightly so login UI is responsive.
    const t = setTimeout(() => {
      setupFcmForUser().catch(() => undefined);
    }, 1500);
    return () => clearTimeout(t);
  }, [user?.id]);

  return null;
}