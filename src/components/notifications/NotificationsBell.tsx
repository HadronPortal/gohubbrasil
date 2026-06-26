import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Calendar, AlertTriangle, Star, X, Store, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  user_id?: string | null;
  title: string;
  body?: string | null;
  type?: string | null;
  read_at?: string | null;
  action_url?: string | null;
  created_at: string;
  barbershop_id?: string | null;
  appointment_id?: string | null;
  data?: any;
};

type Variant = "light" | "dark";

interface Props {
  variant?: Variant;
  className?: string;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "agora";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "ontem";
  if (day < 7) return `${day} d`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk} sem`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} mês`;
  return `${Math.floor(day / 365)} a`;
}

function iconFor(type?: string | null) {
  const t = String(type || "").toLowerCase();
  if (t.includes("whatsapp") || t.includes("message") || t.includes("mensag"))
    return { node: <WhatsAppIcon size={20} />, bg: "bg-transparent" };
  if (t.includes("cancel") || t.includes("alert") || t.includes("warn"))
    return { node: <AlertTriangle className="w-5 h-5 text-[#DC2626]" />, bg: "bg-red-50" };
  if (t.includes("promo") || t.includes("offer") || t.includes("oferta") || t.includes("favorite") || t.includes("fav"))
    return { node: <Star className="w-5 h-5 text-[#F59E0B]" />, bg: "bg-amber-50" };
  if (t.includes("shop") || t.includes("business") || t.includes("estab"))
    return { node: <Store className="w-5 h-5 text-[#3157D5]" />, bg: "bg-[#EAF0FF]" };
  if (t.includes("profile") || t.includes("perfil") || t.includes("user"))
    return { node: <UserRound className="w-5 h-5 text-[#3157D5]" />, bg: "bg-[#EAF0FF]" };
  // default: appointment
  return { node: <Calendar className="w-5 h-5 text-[#3157D5]" />, bg: "bg-[#EAF0FF]" };
}

function destinationFor(n: NotificationItem): string | null {
  if (n.action_url) return n.action_url;
  const t = String(n.type || "").toLowerCase();
  if (t.includes("appointment") || t.includes("agendamento") || t.includes("booking"))
    return "/client-agenda";
  if (t.includes("profile") || t.includes("perfil")) return "/client-home#perfil";
  if (t.includes("shop") || t.includes("business") || t.includes("estab")) return "/client-home";
  return null;
}

export function NotificationsBell({ variant = "light", className }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }
    try {
      const { data, error } = await (supabase as any).rpc("get_my_unread_notifications_count");
      if (error) return;
      setUnreadCount(Number(data ?? 0));
    } catch {
      /* silent */
    }
  }, [user?.id]);

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("get_my_notifications", {
        p_limit: 50,
      });
      if (error) {
        setItems([]);
      } else {
        setItems((data || []) as NotificationItem[]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadUnreadCount();
    const t = setInterval(loadUnreadCount, 60000);
    const onPush = () => {
      loadUnreadCount();
      if (open) load();
    };
    window.addEventListener("gohub:push", onPush as EventListener);
    return () => {
      clearInterval(t);
      window.removeEventListener("gohub:push", onPush as EventListener);
    };
  }, [loadUnreadCount, load, open]);

  useEffect(() => {
    if (!open) return;
    load();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, load]);

  const markAllRead = async () => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
    setUnreadCount(0);
    try {
      await (supabase as any).rpc("mark_my_notifications_read", { p_ids: null });
    } catch {
      /* silent */
    }
    loadUnreadCount();
  };

  const onItemClick = async (n: NotificationItem) => {
    if (!n.read_at) {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      try {
        await (supabase as any).rpc("mark_my_notifications_read", { p_ids: [n.id] });
      } catch {
        /* silent */
      }
    }
    const dest = destinationFor(n);
    setOpen(false);
    if (dest) {
      if (dest.startsWith("http")) window.location.href = dest;
      else navigate(dest);
    }
  };

  const btnClass =
    variant === "dark"
      ? "bg-slate-100 text-[#172033]"
      : "bg-slate-100 text-[#172033]";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Notificações"
        className={cn(
          "select-none relative w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition",
          btnClass,
          className,
        )}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200"
            style={{
              maxHeight: "85dvh",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-1 rounded-full bg-slate-200 absolute left-1/2 -translate-x-1/2 top-2" />
              <h2 className="text-[16px] font-bold text-[#172033] mt-2">Notificações</h2>
              <div className="flex items-center gap-1 mt-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-[12px] font-semibold text-[#3157D5] px-2 py-1 rounded-md hover:bg-[#EAF0FF] active:scale-95 transition"
                  >
                    Marcar todas como lidas
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && items.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-500">Carregando...</div>
              ) : items.length === 0 ? (
                <div className="py-16 px-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-[15px] font-semibold text-[#172033]">
                    Você está em dia
                  </p>
                  <p className="text-[13px] text-slate-500 mt-1">
                    Nenhuma notificação por enquanto.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((n) => {
                    const ic = iconFor(n.type);
                    const unread = !n.read_at;
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => onItemClick(n)}
                          className={cn(
                            "w-full text-left px-4 py-3 flex items-start gap-3 active:bg-slate-100 transition",
                            unread ? "bg-[#EEF1FF]" : "bg-white",
                          )}
                        >
                          <div
                            className={cn(
                              "shrink-0 w-10 h-10 rounded-full flex items-center justify-center overflow-hidden",
                              ic.bg,
                            )}
                          >
                            {ic.node}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={cn(
                                  "text-[14px] leading-tight text-[#172033] truncate",
                                  unread ? "font-bold" : "font-semibold",
                                )}
                              >
                                {n.title}
                              </p>
                              <span className="text-[11px] text-slate-500 shrink-0 mt-0.5">
                                {formatRelative(n.created_at)}
                              </span>
                            </div>
                            {n.body && (
                              <p className="text-[13px] text-slate-600 mt-0.5 line-clamp-2">
                                {n.body}
                              </p>
                            )}
                          </div>
                          {unread && (
                            <span className="mt-2 shrink-0 w-2 h-2 rounded-full bg-[#3157D5]" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NotificationsBell;