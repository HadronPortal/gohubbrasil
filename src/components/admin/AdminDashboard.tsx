import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, toSaoPauloDateKey, isFinished, isCanceled } from "@/lib/utils";
import { money } from "@/utils/format";
import { getInitial, isFinished as isFinishedOld, isCanceled as isCanceledOld } from "@/lib/utils";
import { Lock } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";
import FreeSlotsView from "./FreeSlotsView";


interface Stats {
  appointmentsToday: number;
  upcomingAppointments: number;
  activeBarbers: number;
  revenueToday: number;
}

interface Appointment {
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
  profile: any;
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
      const todayStr = new Date().toISOString().slice(0, 10);

      const { data, error } = await supabase.rpc("get_owner_dashboard_appointments", {
        p_day: todayStr
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
        setAppointments({
          today: (data.today || []).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
          upcoming: (data.upcoming || []).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
          history: (data.history || []).sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime()),
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
    return <FreeSlotsView barbershopId={barbershopId} onBack={() => setShowFreeSlots(false)} />;
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">

      {/* Horários Livres Card */}
      <div 
        onClick={() => setShowFreeSlots(true)}
        className="bg-[#141b2a] border border-[#f0c040]/30 p-4 rounded-[4px] cursor-pointer hover:border-[#f0c040] transition-all flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <div className="bg-[#f0c040]/10 p-2 rounded group-hover:bg-[#f0c040]/20 transition-colors">
            <Lock className="w-5 h-5 text-[#f0c040]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#f0c040] font-oswald tracking-widest uppercase">HORÁRIOS LIVRES / BLOQUEIOS</h4>
            <p className="text-[10px] text-[#8a9ab5] uppercase tracking-widest">Configurar disponibilidade da barbearia</p>
          </div>
        </div>
      </div>

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
                <AppointmentCard key={`today-${idx}`} appt={appt} />
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
                <AppointmentCard key={`upcoming-${idx}`} appt={appt} />
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


function AppointmentCard({ appt }: { appt: Appointment }) {
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
        <span className={`text-[9px] font-bold px-2 py-1 rounded-[2px] border uppercase tracking-widest ${getStatusInfo(appt.status).color}`}>
          {getStatusInfo(appt.status).label}
        </span>
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
    </div>
  );
}
