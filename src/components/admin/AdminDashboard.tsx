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

        // Ordenação garantida conforme solicitado:
        // Hoje e Próximos: starts_at ASC
        // Histórico: starts_at DESC
        const allCombined = [
          ...(data.today || []),
          ...(data.upcoming || []),
          ...(data.history || [])
        ];
        
        // Remove duplicates by ID
        const unique = Array.from(new Map(allCombined.map(a => [(a as any).id || Math.random(), a])).values());

        setAppointments({
          today: unique.filter(a => isTodayBR(a.starts_at) && !isFinished(a.status) && !isCanceled(a.status))
            .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
          upcoming: unique.filter(a => isAfterTodayBR(a.starts_at) && !isFinished(a.status) && !isCanceled(a.status))
            .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
          history: unique.filter(a => isFinished(a.status) || isCanceled(a.status) || new Date(a.starts_at).getTime() < Date.now())
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

  if (isLoading) return <div className="text-[#8a9ab5] font-oswald text-xs tracking-widest uppercase">CARREGANDO...</div>;

  if (showFreeSlots && barbershopId) {
    return <FreeSlotsView barbershopId={barbershopId} onBack={() => setShowFreeSlots(false)} profile={profile} />;
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">

      {/* Summary Grid */}

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "AGENDAMENTOS HOJE", value: stats.appointmentsToday, onClick: null },
          { label: "PRÓXIMOS", value: stats.upcomingAppointments, onClick: null },
          { label: "BARBEIROS ATIVOS", value: stats.activeBarbers, onClick: null },
          { label: "FATURAMENTO HOJE", value: money(stats.revenueToday), onClick: null },
        ].map((item, idx) => (
          <div 
            key={idx} 
            onClick={item.onClick || undefined}
            className={cn(
              "bg-[#141b2a] border border-[#2a3347] p-4 rounded-[4px] space-y-2",
              item.onClick && "cursor-pointer hover:border-[#f0c040] transition-colors"
            )}
          >
            <span className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider block">
              {item.label}
            </span>
            <span className="text-xl font-bold text-[#f0c040] font-oswald">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Appointments Sections */}
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="w-full bg-[#141b2a] border border-[#2a3347] grid grid-cols-3 h-12 p-1">
            <TabsTrigger 
              value="today" 
              className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-[#f0c040] data-[state=active]:text-[#1c2333]"
            >
              HOJE
            </TabsTrigger>
            <TabsTrigger 
              value="upcoming" 
              className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-[#f0c040] data-[state=active]:text-[#1c2333]"
            >
              PRÓXIMOS
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-[#f0c040] data-[state=active]:text-[#1c2333]"
            >
              HISTÓRICO
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-6 space-y-4">
            {appointments.today.length === 0 ? (
              <p className="text-sm text-[#8a9ab5] text-center py-10 border border-dashed border-[#2a3347] rounded-[4px]">
                NENHUM AGENDAMENTO PARA HOJE
              </p>
            ) : (
              appointments.today.map((appt, idx) => (
                <AppointmentCard key={`today-${idx}`} appt={appt} onCancelSuccess={fetchDashboardData} />
              ))
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6 space-y-4">
            {appointments.upcoming.length === 0 ? (
              <p className="text-sm text-[#8a9ab5] text-center py-10 border border-dashed border-[#2a3347] rounded-[4px]">
                NENHUM AGENDAMENTO PRÓXIMO
              </p>
            ) : (
              appointments.upcoming.map((appt, idx) => (
                <AppointmentCard key={`upcoming-${idx}`} appt={appt} onCancelSuccess={fetchDashboardData} />
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6 space-y-4">
            {appointments.history.length === 0 ? (
              <p className="text-sm text-[#8a9ab5] text-center py-10 border border-dashed border-[#2a3347] rounded-[4px]">
                NENHUM HISTÓRICO ENCONTRADO
              </p>
            ) : (
              appointments.history.map((appt, idx) => (
                <AppointmentCard key={`history-${idx}`} appt={appt} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}


function AppointmentCard({ appt, onCancelSuccess }: { appt: Appointment, onCancelSuccess?: () => void }) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const getStatusInfo = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": 
        return { label: "PENDENTE", color: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10" };
      case "confirmed": 
        return { label: "CONFIRMADO", color: "text-green-500 border-green-500/30 bg-green-500/10" };
      case "cancelled": 
      case "canceled":
      case "cancelado":
        return { label: "CANCELADO", color: "text-red-500 border-red-500/30 bg-red-500/10" };
      case "completed":
      case "finalizado":
        return { label: "FINALIZADO", color: "text-blue-500 border-blue-500/30 bg-blue-500/10" };
      default: 
        return { label: status.toUpperCase(), color: "text-gray-500 border-gray-500/30 bg-gray-500/10" };
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

  const isCancelable = !isFinished(appt.status) && !isCanceled(appt.status) && new Date(appt.starts_at).getTime() > Date.now();

  return (
    <div className="bg-[#141b2a] border border-[#2a3347] p-4 rounded-[4px] space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex gap-3 items-center">
          <UserAvatar 
            name={appt.client_name} 
            avatarUrl={null} 
            size="sm" 
            className="border-[#f0c040]/30" 
          />
          <div>
            <h4 className="text-sm font-bold text-[#c8d4e8] font-oswald uppercase tracking-wider">
              {appt.client_name}
            </h4>

            {appt.client_phone && (
              <p className="text-[10px] text-[#8a9ab5] tracking-widest">
                {appt.client_phone}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-[9px] font-bold px-2 py-1 rounded-[2px] border uppercase tracking-widest ${getStatusInfo(appt.status).color}`}>
            {getStatusInfo(appt.status).label}
          </span>
          {isCancelable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              className="h-7 text-[8px] text-red-500 hover:text-white hover:bg-red-500/20 font-bold uppercase tracking-widest border border-red-500/20 px-2 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              CANCELAR
            </Button>
          )}
        </div>
      </div>
      
      <div className="py-2 px-3 bg-[#1c2333] rounded-[4px] border border-[#2a3347]/30">
        <p className="text-[10px] text-[#8a9ab5] uppercase tracking-widest flex justify-between">
          <span>{appt.service_name}</span>
          <span className="text-[#c8d4e8] font-bold">{appt.barber_name}</span>
        </p>
      </div>

      <div className="pt-2 border-t border-[#2a3347]/50 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-lg font-bold text-[#f0c040] font-oswald">
            {format(new Date(appt.starts_at), "HH:mm")}
          </span>
          <span className="text-[9px] text-[#8a9ab5] uppercase tracking-widest">
            {format(new Date(appt.starts_at), "dd/MM/yyyy")}
          </span>
        </div>
        <span className="text-[10px] font-bold text-[#c8d4e8]">
          {money(appt.price)}
        </span>
      </div>

      <AlertDialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <AlertDialogContent className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-oswald uppercase text-[#f0c040] tracking-widest">
              CANCELAR AGENDAMENTO?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8a9ab5] text-[10px] uppercase tracking-widest leading-relaxed">
              O cliente receberá uma notificação automática no WhatsApp informando sobre o cancelamento.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-2">
            <label className="text-[9px] font-bold text-[#8a9ab5] uppercase tracking-widest">
              MOTIVO (OPCIONAL)
            </label>
            <Input
              placeholder="EX: IMPREVISTO NO ESTABELECIMENTO"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8] placeholder:text-[#2a3347] text-xs uppercase font-oswald tracking-widest rounded-none h-12 focus-visible:ring-[#f0c040]"
            />
          </div>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-transparent border-[#2a3347] text-[#8a9ab5] hover:bg-[#1c2333] hover:text-white font-oswald uppercase text-xs tracking-widest rounded-none h-12">
              VOLTAR
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-red-500 hover:bg-red-600 text-white font-oswald uppercase text-xs tracking-widest rounded-none h-12 border-none"
            >
              {isCancelling ? "CANCELANDO..." : "CONFIRMAR CANCELAMENTO"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
