import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isPushSupported, requestNotificationPermission } from "@/lib/pwa";

export function EnableNotificationsButton() {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );

  useEffect(() => {
    if (!isPushSupported()) setPerm("unsupported");
  }, []);

  if (perm === "granted") return null;

  const handle = async () => {
    if (!isPushSupported()) {
      toast.info("Seu navegador não suporta notificações push. Use o app instalado ou um navegador compatível.");
      return;
    }
    const result = await requestNotificationPermission();
    setPerm(result);
    if (result === "granted") {
      toast.success("Notificações ativadas!");
      try {
        const reg = await navigator.serviceWorker.ready;
        // Best effort: save endpoint as push token placeholder if subscription exists later
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await supabase.rpc("save_my_push_token" as any, { p_token: sub.endpoint } as any);
        }
      } catch {
        /* noop */
      }
    } else if (result === "denied") {
      toast.error("Permissão negada. Você pode ativar nas configurações do navegador.");
    }
  };

  return (
    <button
      onClick={handle}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#119CFF]/10 text-[#119CFF] text-[13px] font-semibold active:scale-95 transition"
    >
      {perm === "unsupported" ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
      Ativar notificações
    </button>
  );
}