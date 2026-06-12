import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import {
  ActionPerformed,
  PushNotificationSchema,
  PushNotifications,
  Token,
} from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function PushNotificationRegistrar() {
  const { user } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user?.id) {
      return;
    }

    let mounted = true;
    const handles: Array<{ remove: () => Promise<void> }> = [];

    const savePushToken = async (token: Token) => {
      const { error: rpcError } = await supabase.rpc(
        "save_my_push_token" as any,
        { p_token: token.value } as any
      );

      if (!rpcError) {
        return;
      }

      const { error } = await supabase
        .from("users")
        .update({ push_token: token.value } as any)
        .eq("id", user.id);

      if (error) {
        console.error("Erro ao salvar push token:", { rpcError, error });
      }
    };

    const setupPushNotifications = async () => {
      try {
        await LocalNotifications.createChannel({
          id: "gohub_alerts_v2",
          name: "GoHub",
          description: "Avisos importantes do GoHub",
          importance: 5,
          visibility: 1,
          sound: "default",
          vibration: true,
          lights: true,
          lightColor: "#119CFF",
        }).catch(() => undefined);

        handles.push(
          await PushNotifications.addListener("registration", savePushToken)
        );

        handles.push(
          await PushNotifications.addListener("registrationError", (error) => {
            console.error("Erro ao registrar notificacoes push:", error);
          })
        );

        handles.push(
          await PushNotifications.addListener(
            "pushNotificationReceived",
            async (notification: PushNotificationSchema) => {
              const title = notification.title || "GoHub";
              const description = notification.body || "Voce recebeu uma nova notificacao.";

              toast(title, { description });

              await LocalNotifications.schedule({
                notifications: [
                  {
                    id: Date.now() % 2147483647,
                    title,
                    body: description,
                    channelId: "gohub_alerts_v2",
                    smallIcon: "ic_stat_gohub",
                    largeIcon: "ic_notification_gohub",
                    iconColor: "#119CFF",
                    extra: notification.data || {},
                  },
                ],
              }).catch((error) => {
                console.error("Erro ao mostrar notificacao local:", error);
              });
            }
          )
        );

        handles.push(
          await LocalNotifications.addListener(
            "localNotificationActionPerformed",
            (notification) => {
              const path = notification.notification.extra?.path;

              if (typeof path === "string" && path.startsWith("/")) {
                window.location.href = path;
              }
            }
          )
        );

        handles.push(
          await PushNotifications.addListener(
            "pushNotificationActionPerformed",
            (notification: ActionPerformed) => {
              const path = notification.notification.data?.path;

              if (typeof path === "string" && path.startsWith("/")) {
                window.location.href = path;
              }
            }
          )
        );

        const permission = await PushNotifications.requestPermissions();
        await LocalNotifications.requestPermissions().catch(() => undefined);

        if (!mounted || permission.receive !== "granted") {
          return;
        }

        await PushNotifications.register();
      } catch (error) {
        console.error("Erro ao configurar notificacoes push:", error);
      }
    };

    setupPushNotifications();

    return () => {
      mounted = false;
      handles.forEach((handle) => {
        handle.remove().catch(() => undefined);
      });
    };
  }, [user?.id]);

  return null;
}
