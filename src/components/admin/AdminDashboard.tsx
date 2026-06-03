import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { money } from "@/utils/format";
import FreeSlotsView from "./FreeSlotsView";

interface Stats {
  appointmentsToday: number;
  freeSlots: number;
  activeBarbers: number;
  revenueToday: number;
}

interface Appointment {
  client_name: string;
  barber_name: string;
  service_name: string;
  starts_at: string;
  price_charged: number | null;
  status: string;
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
    freeSlots: 0,
    activeBarbers: 0,
    revenueToday: 0,
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
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
      });

      console.log("OWNER DASHBOARD RPC", { data, error });

      if (error) {
        console.error("OWNER DASHBOARD ERROR", error);
        toast.error("Erro ao carregar agendamentos");
        setIsLoading(false);
        return;
      }

      if (data) {
        const appts = data as Appointment[];
        setAppointments(appts);
        
        const revenue = appts.reduce((acc, a) => acc + (Number(a.price_charged) || 0), 0);
        
        // Mantendo busca de barbeiros para o card de estatísticas
        const { count: barberCount } = await supabase
          .from("barbers")
          .select("id", { count: "exact", head: true })
          .eq("barbershop_id", barbershopId)
          .eq("active", true);

        // Estimativa simples de slots (considerando 18 slots por barbeiro)
        const totalPossibleSlots = (barberCount || 0) * 18;
        const freeSlots = Math.max(0, totalPossibleSlots - appts.length);

        setStats({
          appointmentsToday: appts.length,
          freeSlots,
          activeBarbers: barberCount || 0,
          revenueToday: revenue,
        });
      }
    } catch (err: any) {
      console.error("DASHBOARD FATAL ERROR", err);
      toast.error("Ocorreu um erro inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  const isFinished = (status: string) => ['completed', 'finalizado'].includes(String(status).toLowerCase());
  const isCanceled = (status: string) => ['cancelled', 'canceled', 'cancelado'].includes(String(status).toLowerCase());
  
  const isToday = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };

  const isFutureAfterToday = (date: string) => {
    const d = new Date(date);
    const endToday = new Date();
    endToday.setHours(23, 59, 59, 999);
    return d.getTime() > endToday.getTime();
  };

  const activeAppointments = appointments.filter(a =>
    !isFinished(a.status) && !isCanceled(a.status)
  );

  const todayAppointments = activeAppointments
    .filter(a => isToday(a.starts_at))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const upcomingAppointments = activeAppointments
    .filter(a => isFutureAfterToday(a.starts_at))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const historyAppointments = appointments
    .filter(a => isFinished(a.status) || isCanceled(a.status) || (new Date(a.starts_at).getTime() < Date.now() && !isToday(a.starts_at)))
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  if (isLoading) return <div className="text-[#8a9ab5] font-oswald text-xs tracking-widest uppercase">CARREGANDO...</div>;

  if (showFreeSlots && barbershopId) {
    return <FreeSlotsView barbershopId={barbershopId} onBack={() => setShowFreeSlots(false)} />;
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "AGENDAMENTOS HOJE", value: stats.appointmentsToday, onClick: null },
          { label: "HORÁRIOS LIVRES", value: stats.freeSlots, onClick: () => setShowFreeSlots(true) },
          { label: "BARBEIROS", value: stats.activeBarbers, onClick: null },
          { label: "FATURAMENTO", value: money(stats.revenueToday), onClick: null },
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
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-[#8a9ab5] text-center py-10 border border-dashed border-[#2a3347] rounded-[4px]">
                NENHUM AGENDAMENTO PARA HOJE
              </p>
            ) : (
              todayAppointments.map((appt, idx) => (
                <AppointmentCard key={`today-${idx}`} appt={appt} />
              ))
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-6 space-y-4">
            {upcomingAppointments.length === 0 ? (
              <p className="text-sm text-[#8a9ab5] text-center py-10 border border-dashed border-[#2a3347] rounded-[4px]">
                NENHUM AGENDAMENTO PRÓXIMO
              </p>
            ) : (
              upcomingAppointments.map((appt, idx) => (
                <AppointmentCard key={`upcoming-${idx}`} appt={appt} />
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6 space-y-4">
            {historyAppointments.length === 0 ? (
              <p className="text-sm text-[#8a9ab5] text-center py-10 border border-dashed border-[#2a3347] rounded-[4px]">
                NENHUM HISTÓRICO ENCONTRADO
              </p>
            ) : (
              historyAppointments.map((appt, idx) => (
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
        <div>
          <h4 className="text-sm font-bold text-[#c8d4e8] font-oswald uppercase tracking-wider">
            {appt.client_name}
          </h4>
          <p className="text-[10px] text-[#8a9ab5] uppercase tracking-widest mt-0.5">
            {appt.service_name} • {appt.barber_name}
          </p>
        </div>
        <span className={`text-[9px] font-bold px-2 py-1 rounded-[2px] border uppercase tracking-widest ${getStatusInfo(appt.status).color}`}>
          {getStatusInfo(appt.status).label}
        </span>
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
        {appt.price_charged !== null && (
          <span className="text-[10px] font-bold text-[#c8d4e8]">
            {money(appt.price_charged)}
          </span>
        )}
      </div>
    </div>
  );
}

