import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, getDateKeyBR, isTodayBR, isAfterTodayBR, isFinished, isCanceled } from "@/lib/utils";
import { money } from "@/utils/format";
import { getInitial } from "@/lib/utils";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Lock, Trash2 } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";
import FreeSlotsView from "./FreeSlotsView";


interface Stats {
  appointmentsToday: number;
  upcomingAppointments: number;
  activeBarbers: number;
  revenueToday: number;
}

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string | null;
  barber_name: string;
  barber_avatar_url: string | null;
  service_name: string;
  starts_at: string;
  price: number;
  status: string;
}

interface RPCResponse {
  success: boolean;
  error?: string;
  summary: {
    appointments_today: number;
    upcoming_appointments: number;
    active_barbers: number;
    revenue_today: number;
  };
  today: Appointment[];
  upcoming: Appointment[];
  history: Appointment[];
}

export default function AdminDashboard({ 
  barbershopId, 
  profile 
}: { 
  barbershopId: string | null;
  profile?: any;
}) {
  const [stats, setStats] = useState<Stats>({
    appointmentsToday: 0,
    upcomingAppointments: 0,
    activeBarbers: 0,
    revenueToday: 0,
  });
  const [appointments, setAppointments] = useState<{
    today: Appointment[];
    upcoming: Appointment[];
    history: Appointment[];
  }>({
    today: [],
    upcoming: [],
    history: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showFreeSlots, setShowFreeSlots] = useState(false);
  const [activeTab, setActiveTab] = useState<"today" | "upcoming" | "history">("today");

  useEffect(() => {
    if (barbershopId) fetchDashboardData();
  }, [barbershopId]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Auto complete past appointments before fetching data
      await supabase.rpc('auto_complete_past_appointments');

      const { data, error } = await supabase.rpc("get_owner_dashboard_appointments", {
        p_day: null
      }) as { data: RPCResponse | null, error: any };


      console.log("OWNER DASHBOARD RPC", { data, error });

      if (error) {
        console.error("OWNER DASHBOARD ERROR", error);
        toast.error(error.message || "Erro ao carregar agendamentos");
        setIsLoading(false);
        return;
      }

      if (data) {
        if (!data.success) {
          toast.error(data.error || "Erro ao carregar dados do painel");
          setIsLoading(false);
          return;
        }

        setStats({
          appointmentsToday: data.summary.appointments_today,
          upcomingAppointments: data.summary.upcoming_appointments,
          activeBarbers: data.summary.active_barbers,
          revenueToday: data.summary.revenue_today,
        });

        // Nova separação conforme solicitado:
        // Aba Hoje: dia atual, diferente de completed, no_show, canceled, attended não false
        // Aba Próximos: futuro, diferente de completed, no_show, canceled, attended não false
        // Aba Histórico: completed, no_show, canceled ou attended false
        const allCombined = [
          ...(data.today || []),
          ...(data.upcoming || []),
          ...(data.history || [])
        ];
        
        // Remove duplicates by ID
        const unique = Array.from(new Map(allCombined.map(appt => [appt.id, appt])).values());

        const isToday = (date: string) => isTodayBR(date);
        const isFuture = (date: string) => isAfterTodayBR(date);
        const isHistorical = (appt: Appointment) => {
          const status = appt.status.toLowerCase();
          const canceledStatuses = ['cancelled', 'canceled', 'cancelado'];
          return status === 'completed' || 
                 status === 'no_show' || 
                 canceledStatuses.includes(status) || 
                 (appt as any).client_attended === false;
        };

        setAppointments({
          today: unique.filter(appt => isToday(appt.starts_at) && !isHistorical(appt))
            .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
          upcoming: unique.filter(appt => isFuture(appt.starts_at) && !isHistorical(appt))
            .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
          history: unique.filter(appt => isHistorical(appt))
            .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()),
        });

      }
    } catch (err: any) {
      console.error("DASHBOARD FATAL ERROR", err);
      toast.error("Ocorreu um erro inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading)
    return (
      <div className="space-y-3" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="h-20 animate-pulse rounded-[8px] bg-white border border-[#DDE3EE]" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-[8px] bg-white border border-[#DDE3EE]" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-[8px] bg-white border border-[#DDE3EE]" />
      </div>
    );

  if (showFreeSlots && barbershopId) {
    return <FreeSlotsView barbershopId={barbershopId} onBack={() => setShowFreeSlots(false)} profile={profile} />;
  }

  return (
    <div className="space-y-5" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Horários Livres */}
      <button
        type="button"
        onClick={() => setShowFreeSlots(true)}
        className="w-full flex items-center justify-between gap-3 rounded-[8px] border border-[#DDE3EE] bg-white p-4 text-left hover:border-[#3157D5]/40 hover:shadow-sm transition"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-[8px] bg-[#EAF0FF] p-2.5">
            <Lock className="w-5 h-5 text-[#3157D5]" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#172033]">Meus horários livres</h4>
            <p className="text-xs text-[#64748B]">Ver e bloquear horários</p>
          </div>
        </div>
      </button>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Agendamentos hoje", value: stats.appointmentsToday, accent: "#3157D5" },
          { label: "Próximos", value: stats.upcomingAppointments, accent: "#0EA5E9" },
          { label: "Profissionais ativos", value: stats.activeBarbers, accent: "#7C3AED" },
          { label: "Faturamento hoje", value: money(stats.revenueToday), accent: "#15803D" },
        ].map((item, idx) => (
          <div
            key={idx}
            className="rounded-[8px] border border-[#DDE3EE] bg-white p-3"
          >
            <div className="flex items-center gap-2">
              <span className="h-7 w-1 rounded-full" style={{ backgroundColor: item.accent }} />
              <span className="text-[11px] font-medium text-[#64748B] leading-tight">{item.label}</span>
            </div>
            <p className="mt-1.5 text-xl font-semibold text-[#172033]">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Appointments */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full h-11 grid-cols-3 rounded-[8px] border border-[#DDE3EE] bg-white p-1">
          <TabsTrigger
            value="today"
            className="text-xs font-medium rounded-[6px] text-[#64748B] data-[state=active]:bg-[#3157D5] data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            Hoje
          </TabsTrigger>
          <TabsTrigger
            value="upcoming"
            className="text-xs font-medium rounded-[6px] text-[#64748B] data-[state=active]:bg-[#3157D5] data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            Próximos
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="text-xs font-medium rounded-[6px] text-[#64748B] data-[state=active]:bg-[#3157D5] data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4 space-y-3">
          {appointments.today.length === 0 ? (
            <EmptyHint text="Nenhum agendamento para hoje" />
          ) : (
            appointments.today.map((appt, idx) => (
              <AppointmentCard key={`today-${idx}`} appt={appt} onCancelSuccess={fetchDashboardData} />
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {appointments.upcoming.length === 0 ? (
            <EmptyHint text="Nenhum agendamento próximo" />
          ) : (
            appointments.upcoming.map((appt, idx) => (
              <AppointmentCard key={`up-${idx}`} appt={appt} onCancelSuccess={fetchDashboardData} />
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {appointments.history.length === 0 ? (
            <EmptyHint text="Nenhum histórico encontrado" />
          ) : (
            appointments.history.map((appt, idx) => (
              <AppointmentCard key={`h-${idx}`} appt={appt} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-[8px] border border-dashed border-[#DDE3EE] bg-white py-8 text-center">
      <p className="text-sm text-[#64748B]">{text}</p>
    </div>
  );
}

function AppointmentCard({ appt, onCancelSuccess }: { appt: Appointment, onCancelSuccess?: () => void }) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const getStatusInfo = (status: string, client_attended?: boolean) => {
    const s = status.toLowerCase();
    if (s === "no_show" || (s === "completed" && client_attended === false)) {
      return { label: "Não compareceu", color: "text-[#B45309] border-[#FEF3E2] bg-[#FEF3E2]" };
    }
    switch (s) {
      case "pending": 
        return { label: "Pendente", color: "text-[#B45309] border-[#FEF3E2] bg-[#FEF3E2]" };
      case "confirmed": 
        return { label: "Confirmado", color: "text-[#15803D] border-[#E7F7EE] bg-[#E7F7EE]" };
      case "cancelled": 
      case "canceled":
      case "cancelado":
        return { label: "Cancelado", color: "text-[#B91C1C] border-[#FDECEC] bg-[#FDECEC]" };
      case "completed":
      case "finalizado":
        return { label: "Finalizado", color: "text-[#3157D5] border-[#E8EEFD] bg-[#E8EEFD]" };
      default: 
        return { label: status, color: "text-[#475569] border-[#EEF1F6] bg-[#EEF1F6]" };
    }
  };

  const handleFinish = async (attended: boolean) => {
    try {
      setIsFinishing(true);
      const { data, error } = await supabase.rpc("finish_appointment_by_owner", {
        p_appointment_id: appt.id,
        p_attended: attended
      });

      if (error) throw error;

      if (data && (data as any).success === false) {
        toast.error((data as any).error || "Erro ao finalizar agendamento");
        return;
      }

      toast.success(attended ? "Atendimento finalizado com sucesso!" : "Registrado como não comparecimento");
      setIsFinishModalOpen(false);
      onCancelSuccess?.();
    } catch (err: any) {
      console.error("FINISH ERROR", err);
      toast.error(err.message || "Erro ao finalizar atendimento");
    } finally {
      setIsFinishing(false);
    }
  };

  const handleCancel = async () => {
    try {
      setIsCancelling(true);
      const { data, error } = await supabase.rpc("cancel_appointment_by_owner", {
        p_appointment_id: appt.id,
        p_reason: cancelReason || null
      });

      if (error) throw error;

      if (data && (data as any).success === false) {
        toast.error((data as any).error || "Erro ao cancelar agendamento");
        return;
      }

      toast.success("Agendamento cancelado. O cliente será avisado pelo WhatsApp.");
      setIsCancelModalOpen(false);
      onCancelSuccess?.();
    } catch (err: any) {
      console.error("CANCEL ERROR", err);
      toast.error(err.message || "Erro ao cancelar agendamento");
    } finally {
      setIsCancelling(false);
    }
  };

  const isCancelable = !isFinished(appt.status) && !isCanceled(appt.status) && appt.status.toLowerCase() !== 'no_show' && new Date(appt.starts_at).getTime() > Date.now();
  const canBeFinished = ["pending", "confirmed"].includes(appt.status.toLowerCase());

  return (
    <div className="rounded-[8px] border border-[#DDE3EE] bg-white p-4 space-y-3" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar name={appt.client_name} avatarUrl={null} size="sm" className="border-[#DDE3EE]" />
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-[#172033]">{appt.client_name}</h4>
            {appt.client_phone && (
              <p className="text-xs text-[#64748B]">{appt.client_phone}</p>
            )}
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getStatusInfo(appt.status, (appt as any).client_attended).color}`}>
          {getStatusInfo(appt.status, (appt as any).client_attended).label}
        </span>
      </div>

      <div className="rounded-[8px] bg-[#F6F7FB] px-3 py-2 flex items-center justify-between text-xs">
        <span className="text-[#172033] font-medium truncate">{appt.service_name}</span>
        <span className="text-[#64748B] truncate ml-2">{appt.barber_name}</span>
      </div>

      <div className="flex items-center justify-between border-t border-[#DDE3EE] pt-3">
        <div>
          <p className="text-base font-semibold text-[#172033] leading-none">
            {format(new Date(appt.starts_at), "HH:mm")}
          </p>
          <p className="text-[11px] text-[#64748B] mt-1">
            {format(new Date(appt.starts_at), "dd/MM/yyyy")}
          </p>
        </div>
        <span className="text-sm font-semibold text-[#172033]">{money(appt.price)}</span>
      </div>

      {(isCancelable || canBeFinished) && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {isCancelable ? (
            <Button
              onClick={() => setIsCancelModalOpen(true)}
              className="min-h-[40px] rounded-[8px] bg-[#DC2626] text-sm font-semibold text-white shadow-sm hover:bg-[#B91C1C]"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Cancelar
            </Button>
          ) : <div />}
          {canBeFinished ? (
            <Button
              onClick={() => setIsFinishModalOpen(true)}
              className="h-10 rounded-[8px] bg-[#15803D] text-sm font-semibold text-white hover:bg-[#126b34]"
            >
              Finalizar
            </Button>
          ) : <div />}
        </div>
      )}

      <AlertDialog open={isFinishModalOpen} onOpenChange={setIsFinishModalOpen}>
        <AlertDialogContent className="rounded-[8px] border-[#DDE3EE] bg-white text-[#172033]" style={{ fontFamily: "Poppins, sans-serif" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-[#172033]">O cliente compareceu?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#64748B]">
              Selecione se o cliente realizou o atendimento ou se não compareceu ao horário agendado.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="h-11 rounded-[8px] border-[#DDE3EE] bg-white text-[#172033] hover:bg-[#F6F7FB]">
              Voltar
            </AlertDialogCancel>
            <Button
              onClick={() => handleFinish(false)}
              disabled={isFinishing}
              variant="outline"
              className="h-11 rounded-[8px] border-[#DC2626]/40 text-[#DC2626] hover:bg-[#FDECEC]"
            >
              Não compareceu
            </Button>
            <Button
              onClick={() => handleFinish(true)}
              disabled={isFinishing}
              className="h-11 rounded-[8px] bg-[#15803D] text-white hover:bg-[#126b34]"
            >
              {isFinishing ? "Processando..." : "Sim, compareceu"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <AlertDialogContent className="rounded-[8px] border-[#DDE3EE] bg-white text-[#172033]" style={{ fontFamily: "Poppins, sans-serif" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-[#172033]">Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#64748B]">
              O cliente receberá uma notificação automática no WhatsApp informando sobre o cancelamento.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-[#172033]">Motivo (opcional)</label>
            <Input
              placeholder="Ex: imprevisto no estabelecimento"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="h-11 rounded-[8px] border-[#DDE3EE] text-sm focus-visible:border-[#3157D5] focus-visible:ring-2 focus-visible:ring-[#3157D5]/15 focus-visible:ring-offset-0"
            />
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-11 rounded-[8px] border border-[#CBD5E1] bg-white text-[#172033] font-medium hover:bg-[#F6F7FB]">
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="h-11 rounded-[8px] bg-[#DC2626] font-semibold text-white shadow-sm hover:bg-[#B91C1C]"
            >
              {isCancelling ? "Cancelando..." : "Confirmar cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
