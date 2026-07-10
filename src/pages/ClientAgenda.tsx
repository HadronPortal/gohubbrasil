import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { translateAppointmentStatus, statusBadgeClasses } from "@/lib/appointmentStatus";
import {
  ArrowLeft,
  Calendar,
  CalendarCheck,
  CalendarX,
  Clock,
  Loader2,
  MapPin,
  Home,
  Search,
  User as UserIcon,
} from "lucide-react";
import { money } from "@/utils/format";

type AgendaAppointment = {
  id: string;
  status: string;
  starts_at: string;
  price: number | null;
  price_charged: number | null;
  barbershop_id: string | null;
  service_name: string;
  barber_name: string;
  barbershop_name: string;
  barbershop_address: string | null;
  barbershop_lat: number | null;
  barbershop_lng: number | null;
};

const CANCELLED_SET = new Set(["cancelled", "canceled", "cancelado", "no_show", "noshow", "nao_compareceu"]);
const FINISHED_SET = new Set(["completed", "finalizado", "finished", "done"]);

type Bucket = "upcoming" | "history" | "cancelled";

function getStatus(a: any): string {
  return String(a?.status || "").toLowerCase();
}

function getAppointmentDate(a: any): Date | null {
  const raw = a?.starts_at || a?.start_time || a?.appointment_time || a?.date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function bucketOf(a: AgendaAppointment): Bucket {
  const s = getStatus(a);
  if (CANCELLED_SET.has(s)) return "cancelled";
  if (FINISHED_SET.has(s)) return "history";
  return "upcoming";
}

function normalizeAppointments(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.appointments)) return result.appointments;
  if (Array.isArray(result?.active)) return result.active;
  if (Array.isArray(result?.upcoming)) return result.upcoming;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.items)) return result.items;
  if (result && result.success === false) {
    throw new Error(result?.error || "Erro ao carregar agendamentos");
  }
  const merged = [
    ...(Array.isArray(result?.today) ? result.today : []),
    ...(Array.isArray(result?.future) ? result.future : []),
    ...(Array.isArray(result?.history) ? result.history : []),
    ...(Array.isArray(result?.cancelled) ? result.cancelled : []),
  ];
  return merged;
}

function canCancel(a: AgendaAppointment): boolean {
  const b = bucketOf(a);
  return b === "upcoming";
}

function directionsUrl(a: AgendaAppointment): string | null {
  if (typeof a.barbershop_lat === "number" && typeof a.barbershop_lng === "number") {
    return `https://www.google.com/maps/dir/?api=1&destination=${a.barbershop_lat},${a.barbershop_lng}`;
  }
  if (a.barbershop_address && a.barbershop_address.trim()) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a.barbershop_address)}`;
  }
  return null;
}

function BottomNav({ onChange }: { onChange: (k: string) => void }) {
  const items = [
    { key: "home", label: "Início", icon: Home },
    { key: "search", label: "Busca", icon: Search },
    { key: "appts", label: "Agenda", icon: Calendar, active: true },
    { key: "profile", label: "Perfil", icon: UserIcon },
  ];
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-md mx-auto grid grid-cols-4">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = !!it.active;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={`select-none flex flex-col items-center justify-center py-2.5 gap-1 transition ${
                isActive ? "text-[#4338CA]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[11px] ${isActive ? "font-bold" : "font-medium"}`}>
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-[12px] p-8 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
        <Icon className="h-7 w-7 text-[#4338CA]" />
      </div>
      <p className="text-sm font-semibold text-[#172033]">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function AppointmentCard({
  a,
  onCancel,
}: {
  a: AgendaAppointment;
  onCancel: (a: AgendaAppointment) => void;
}) {
  const url = directionsUrl(a);
  const value = Number(a.price_charged ?? a.price ?? 0);
  return (
    <div className="w-full bg-white border border-slate-100 rounded-[12px] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-[#4338CA] font-semibold uppercase tracking-wide">
            {a.service_name}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[#172033] truncate">
            {a.barbershop_name}
          </p>
          <p className="mt-0.5 text-xs text-slate-500 truncate">com {a.barber_name}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-slate-500">
            {format(new Date(a.starts_at), "dd/MM/yyyy", { locale: ptBR })}
          </p>
          <p className="text-sm font-bold text-[#172033]">
            {format(new Date(a.starts_at), "HH:mm")}
          </p>
          <span
            className={`inline-block mt-1 text-[10px] font-semibold border px-2 py-0.5 rounded ${statusBadgeClasses(a.status)}`}
          >
            {translateAppointmentStatus(a.status)}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="text-sm font-bold text-[#172033]">{money(value)}</span>
        <div className="flex shrink-0 items-center gap-2">
          {canCancel(a) && (
            <button
              type="button"
              onClick={() => onCancel(a)}
              className="inline-flex min-h-[40px] items-center justify-center rounded-[8px] border border-red-700 bg-red-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-95"
            >
              Cancelar
            </button>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3157D5] px-3 text-xs font-bold text-white"
            >
              <MapPin className="h-4 w-4" /> Como chegar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return <div className="h-28 w-full animate-pulse rounded-[12px] bg-slate-200/70" />;
}

export default function ClientAgenda() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [items, setItems] = useState<AgendaAppointment[]>([]);
  const [rawData, setRawData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<Bucket>("upcoming");
  const [toCancel, setToCancel] = useState<AgendaAppointment | null>(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate("/login", { replace: true });
  }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await (supabase as any).rpc("get_my_appointments_safe");
      if (error) throw error;
      setRawData(data);
      if (import.meta.env.DEV) {
        console.log("get_my_appointments_safe retorno:", data);
      }
      const rows = normalizeAppointments(data);
      const mapped: AgendaAppointment[] = rows.map((row: any) => ({
        id: row.id,
        status: row.status,
        starts_at:
          row.starts_at || row.start_time || row.appointment_time || row.scheduled_at || row.date,
        price: row.price ?? row.service_price ?? null,
        price_charged: row.price_charged,
        barbershop_id: row.barbershop_id ?? null,
        service_name: row.service_name || row.service || row.service_title || "Serviço",
        barber_name:
          row.barber_name || row.professional_name || row.employee_name || "Profissional",
        barbershop_name:
          row.barbershop_name || row.business_name || row.shop_name || "Estabelecimento",
        barbershop_address: row.barbershop_address ?? null,
        barbershop_lat: row.barbershop_lat ?? null,
        barbershop_lng: row.barbershop_lng ?? null,
      }));
      if (import.meta.env.DEV) {
        console.log("Minha Agenda RPC raw:", data);
        console.log("Minha Agenda normalizado:", mapped);
      }
      setItems(mapped);
    } catch (e: any) {
      console.error("Agenda load error", e);
      setErrorMsg(e?.message || "Erro ao carregar agendamentos.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const { upcoming, history, cancelled } = useMemo(() => {
    const up: AgendaAppointment[] = [];
    const hi: AgendaAppointment[] = [];
    const ca: AgendaAppointment[] = [];
    for (const a of items) {
      const b = bucketOf(a);
      if (b === "upcoming") up.push(a);
      else if (b === "history") hi.push(a);
      else ca.push(a);
    }
    const ts = (x: AgendaAppointment) => {
      const d = getAppointmentDate(x);
      return d ? d.getTime() : 0;
    };
    up.sort((a, b) => ts(a) - ts(b));
    hi.sort((a, b) => ts(b) - ts(a));
    ca.sort((a, b) => ts(b) - ts(a));
    if (import.meta.env.DEV) {
      console.log("Minha Agenda próximos:", up);
    }
    return { upcoming: up, history: hi, cancelled: ca };
  }, [items]);

  const handleCancel = async () => {
    if (!toCancel || canceling) return;
    setCanceling(true);
    try {
      const { data, error } = await supabase.rpc("cancel_my_appointment", {
        p_appointment_id: toCancel.id,
      });
      if (error) {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("whatsapp_queue") || msg.includes("duplicate key")) {
          setToCancel(null);
          toast.success("Agendamento cancelado. A notificação será processada em instantes.");
          await load();
          return;
        }
        throw error;
      }
      if (data && typeof data === "object" && "success" in data && !(data as any).success) {
        const errMsg = String((data as any).error || "").toLowerCase();
        if (errMsg.includes("whatsapp_queue") || errMsg.includes("duplicate key")) {
          setToCancel(null);
          toast.success("Agendamento cancelado. A notificação será processada em instantes.");
          await load();
          return;
        }
        throw new Error((data as any).error || "Não foi possível cancelar o agendamento.");
      }
      setToCancel(null);
      toast.success("Agendamento cancelado.");
      try {
        await supabase.rpc("enqueue_appointment_cancelled_by_client" as any, {
          p_appointment_id: toCancel.id,
        });
      } catch (queueErr) {
        console.warn("enqueue_appointment_cancelled_by_client failed:", queueErr);
      }
      await load();
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase();
      if (msg.includes("whatsapp_queue") || msg.includes("duplicate key")) {
        setToCancel(null);
        toast.success("Agendamento cancelado. A notificação será processada em instantes.");
        await load();
      } else {
        toast.error(e?.message || "Erro ao cancelar agendamento.");
      }
    } finally {
      setCanceling(false);
    }
  };

  const onNav = (k: string) => {
    if (k === "home") navigate("/client-home");
    else if (k === "search") navigate("/client-category/todos");
    else if (k === "profile") navigate("/client-home#perfil");
  };

  if (authLoading) return <LoadingScreen />;

  const renderList = (list: AgendaAppointment[], empty: { icon: any; title: string; subtitle: string }) => {
    if (loading) {
      return (
        <div className="space-y-3">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      );
    }
    if (errorMsg) {
      return (
        <div className="rounded-[12px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      );
    }
    if (list.length === 0) {
      return <EmptyState icon={empty.icon} title={empty.title} subtitle={empty.subtitle} />;
    }
    return (
      <div className="space-y-3">
        {list.map((a) => (
          <AppointmentCard key={a.id} a={a} onCancel={setToCancel} />
        ))}
      </div>
    );
  };

  return (
    <div
      className="min-h-screen bg-[#F7F9FC] text-[#172033] pb-28 overflow-x-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-md mx-auto">
        <header className="px-4 pt-4 pb-3 bg-[#F7F9FC] sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/client-home")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold leading-tight">Minha agenda</h1>
              <p className="text-xs text-slate-500">Seus agendamentos em um só lugar</p>
            </div>
          </div>
        </header>

        <main className="px-4 mt-2">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Bucket)}>
            <TabsList className="grid w-full grid-cols-3 bg-white border border-slate-200 rounded-[10px] p-1 h-11">
              <TabsTrigger value="upcoming" className="rounded-[8px] data-[state=active]:bg-[#4338CA] data-[state=active]:text-white text-xs font-semibold">
                Próximos
                {upcoming.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-white/20 px-1.5 text-[10px]">
                    {upcoming.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-[8px] data-[state=active]:bg-[#4338CA] data-[state=active]:text-white text-xs font-semibold">
                Histórico
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="rounded-[8px] data-[state=active]:bg-[#4338CA] data-[state=active]:text-white text-xs font-semibold">
                Cancelados
              </TabsTrigger>
            </TabsList>

            {import.meta.env.DEV && (
              <pre
                className="mt-3 rounded-md border border-[#DDE3EE] bg-[#F6F7FB] p-2 text-[11px] text-[#172033]"
                style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
              >
                {JSON.stringify(
                  {
                    rawType: Array.isArray(rawData) ? "array" : typeof rawData,
                    rawKeys: rawData && typeof rawData === "object" && !Array.isArray(rawData)
                      ? Object.keys(rawData)
                      : undefined,
                    rawData,
                    normalizedCount: items.length,
                    first: items[0],
                    upcomingCount: upcoming.length,
                    historyCount: history.length,
                    cancelledCount: cancelled.length,
                    user_id: user?.id,
                    profile_id: profile?.id,
                    profile_role: profile?.role,
                    profile_barbershop_id: profile?.barbershop_id,
                  },
                  null,
                  2,
                )}
              </pre>
            )}

            {import.meta.env.DEV && (
              <div className="mt-3 rounded-md border border-slate-200 bg-white p-2">
                <p className="mb-2 text-[11px] font-bold text-slate-600">
                  Todos recebidos ({items.length})
                </p>
                <div className="space-y-2">
                  {items.map((a) => (
                    <AppointmentCard key={`all-${a.id}`} a={a} onCancel={setToCancel} />
                  ))}
                </div>
              </div>
            )}

            <TabsContent value="upcoming" className="mt-4">
              {renderList(upcoming, {
                icon: Calendar,
                title: "Nenhum agendamento próximo",
                subtitle: "Explore estabelecimentos e marque um horário.",
              })}
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              {renderList(history, {
                icon: CalendarCheck,
                title: "Sem histórico por aqui",
                subtitle: "Seus atendimentos finalizados aparecerão aqui.",
              })}
            </TabsContent>
            <TabsContent value="cancelled" className="mt-4">
              {renderList(cancelled, {
                icon: CalendarX,
                title: "Nenhum cancelamento",
                subtitle: "Cancelamentos e ausências aparecerão aqui.",
              })}
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <BottomNav onChange={onNav} />

      <AlertDialog
        open={Boolean(toCancel)}
        onOpenChange={(open) => {
          if (!open && !canceling) setToCancel(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100vw-32px)] max-w-sm rounded-[16px] border-0 bg-white p-5 text-[#172033]">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-lg font-extrabold">
              Cancelar agendamento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-slate-600">
              Seu horário será liberado para outros clientes e o estabelecimento receberá uma notificação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel
              disabled={canceling}
              className="mt-0 h-11 rounded-[8px] border border-slate-300 bg-white font-bold text-[#172033] hover:bg-slate-50"
            >
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={canceling}
              className="h-11 rounded-[8px] bg-red-600 font-bold text-white hover:bg-red-700"
            >
              {canceling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelando
                </>
              ) : (
                "Confirmar cancelamento"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}