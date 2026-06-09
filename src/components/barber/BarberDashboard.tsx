import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { MessageCircle, Calendar as CalendarIcon, DollarSign, Percent, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { money } from "@/utils/format";
import { Lock } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { getDateKeyBR, isTodayBR, isAfterTodayBR, isFinished, isCanceled } from "@/lib/utils";
import FreeSlotsView from "../admin/FreeSlotsView";


interface DashboardSummary {
  appointments_today: number;
  gross_today: number;
  commission_today: number;
  commission_pct: number;
}

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  service_name: string;
  starts_at: string;
  price?: number;
  price_charged?: number;
  service_price?: number;
  commission_amount?: number;
  commission_value?: number;
  status: string;
}

interface DashboardData {
  success: boolean;
  error?: string;
  summary: DashboardSummary;
  today: Appointment[];
  upcoming: Appointment[];
  history: Appointment[];
}

// Removido money local, usando importado

export default function BarberDashboard({ profile }: { profile: any }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const [showFreeSlots, setShowFreeSlots] = useState(false);

  useEffect(() => {

    if (profile) fetchDashboardData();
  }, [profile, selectedDate]);


  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_barber_dashboard', {
        p_day: null
      });


      console.log("BARBER DASHBOARD RPC", { data: rpcData, error: rpcError });

      if (rpcError) {
        toast.error(rpcError.message);
        return;
      }

      if (rpcData.success === false) {
        toast.error(rpcData.error || "Erro ao carregar dados do dashboard");
        return;
      }

      setData(rpcData);
    } catch (err: any) {
      console.error("BARBER DASHBOARD FATAL ERROR", err);
      toast.error("Ocorreu um erro inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  const allAppointments = [
    ...(data?.today || []),
    ...(data?.upcoming || []),
    ...(data?.history || [])
  ];

  // Remover duplicatas por ID caso existam
  const uniqueAppointments = Array.from(new Map(allAppointments.map(a => [a.id, a])).values());

  const todayAppointments = uniqueAppointments
    .filter(a => isTodayBR(a.starts_at) && !isFinished(a.status) && !isCanceled(a.status))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const nextAppointments = uniqueAppointments
    .filter(a => isAfterTodayBR(a.starts_at) && !isFinished(a.status) && !isCanceled(a.status))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const historyAppointments = uniqueAppointments
    .filter(a => isFinished(a.status) || isCanceled(a.status) || new Date(a.starts_at).getTime() < Date.now())
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());



  const openWhatsApp = (phone: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`);
  };

  if (isLoading && !data) return <div className="text-[#8a9ab5] font-oswald text-xs tracking-widest uppercase p-6">CARREGANDO...</div>;

  if (showFreeSlots) {
    return <FreeSlotsView barbershopId={profile.barbershop_id} onBack={() => setShowFreeSlots(false)} profile={profile} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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
            <h4 className="text-sm font-bold text-[#f0c040] font-oswald tracking-widest uppercase">MEUS HORÁRIOS LIVRES</h4>
            <p className="text-[10px] text-[#8a9ab5] uppercase tracking-widest">Ver e bloquear sua agenda</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}

      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-[#141b2a] border-[#2a3347]">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
            <CalendarIcon className="w-4 h-4 text-[#8a9ab5] mb-1" />
            <span className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">Agendamentos hoje</span>
            <span className="text-2xl font-bold text-[#f0c040] font-oswald">{data?.summary.appointments_today || 0}</span>
          </CardContent>
        </Card>

        <Card className="bg-[#141b2a] border-[#2a3347]">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
            <TrendingUp className="w-4 h-4 text-[#8a9ab5] mb-1" />
            <span className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">Faturamento hoje</span>
            <span className="text-2xl font-bold text-[#f0c040] font-oswald">
              {money(data?.summary.gross_today)}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-[#141b2a] border-[#2a3347]">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
            <DollarSign className="w-4 h-4 text-[#8a9ab5] mb-1" />
            <span className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">Minha comissão hoje</span>
            <span className="text-2xl font-bold text-green-500 font-oswald">
              {money(data?.summary.commission_today)}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-[#141b2a] border-[#2a3347]">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
            <Percent className="w-4 h-4 text-[#8a9ab5] mb-1" />
            <span className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">Comissão</span>
            <span className="text-2xl font-bold text-[#c8d4e8] font-oswald">{data?.summary.commission_pct || 0}%</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="w-full bg-[#141b2a] border border-[#2a3347] grid grid-cols-3 h-12 p-1">
          <TabsTrigger 
            value="active" 
            className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-[#f0c040] data-[state=active]:text-[#1c2333]"
          >
            Hoje
          </TabsTrigger>
          <TabsTrigger 
            value="upcoming" 
            className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-[#f0c040] data-[state=active]:text-[#1c2333]"
          >
            Próximos
          </TabsTrigger>
          <TabsTrigger 
            value="history" 
            className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-[#f0c040] data-[state=active]:text-[#1c2333]"
          >
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6 space-y-4">
          <AppointmentList 
            appointments={todayAppointments} 
            onWhatsApp={openWhatsApp} 
            emptyMessage="Nenhum agendamento para hoje" 
            onRefresh={fetchDashboardData} 
          />
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6 space-y-4">
          <AppointmentList 
            appointments={nextAppointments} 
            onWhatsApp={openWhatsApp} 
            emptyMessage="Nenhum agendamento futuro" 
            onRefresh={fetchDashboardData} 
          />
        </TabsContent>


        <TabsContent value="history" className="mt-6 space-y-4">
          <AppointmentList 
            appointments={historyAppointments} 
            onWhatsApp={openWhatsApp} 
            emptyMessage="Nenhum histórico encontrado" 
            onRefresh={fetchDashboardData} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AppointmentList({ appointments, onWhatsApp, emptyMessage, onRefresh }: { appointments: Appointment[], onWhatsApp: (phone: string) => void, emptyMessage: string, onRefresh: () => void }) {
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


// Removido money local, usando importado

  const handleFinishAppointment = async (appt: Appointment) => {
    try {
      const { data, error } = await supabase.rpc('finish_barber_appointment', {
        p_appointment_id: appt.id
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.success === false) {
        toast.error(data.error || "Erro ao finalizar atendimento");
        return;
      }

      toast.success("Atendimento finalizado");
      onRefresh();
    } catch (err: any) {
      toast.error("Ocorreu um erro ao finalizar o atendimento");
    }
  };

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-[#2a3347] rounded-[4px]">
        <p className="text-xs text-[#8a9ab5] uppercase tracking-widest">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appt, i) => {
        const isFinished = ["completed", "finalizado", "cancelled", "canceled", "cancelado"].includes(appt.status.toLowerCase()) || new Date(appt.starts_at) < new Date(new Date().getTime() - 60 * 60 * 1000);
        const price = appt.price ?? appt.price_charged ?? appt.service_price ?? 0;
        const commission = appt.commission_amount ?? appt.commission_value ?? 0;


        return (
          <div key={i} className="bg-[#141b2a] border border-[#2a3347] p-4 rounded-[4px] space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <UserAvatar 
                  name={appt.client_name} 
                  avatarUrl={null} 
                  size="sm" 
                  className="border-[#f0c040]/30" 
                />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#c8d4e8] font-oswald uppercase tracking-wider">{appt.client_name}</h4>
                  <p className="text-[10px] text-[#8a9ab5] uppercase tracking-widest">{appt.service_name}</p>
                </div>
              </div>

              <span className={`text-[9px] font-bold px-2 py-1 rounded-[2px] border uppercase tracking-widest ${getStatusInfo(appt.status).color}`}>
                {getStatusInfo(appt.status).label}
              </span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#2a3347]/50">
              <div className="space-y-1">
                <div className="text-lg font-bold text-[#f0c040] font-oswald">
                  {format(new Date(appt.starts_at), "HH:mm")}
                </div>
                <div className="text-[9px] text-[#8a9ab5] uppercase tracking-widest">
                  {format(new Date(appt.starts_at), "dd/MM/yyyy")}
                </div>
              </div>

              <div className="text-right space-y-1">
                <div className="text-sm font-bold text-[#c8d4e8]">
                  {money(price)}
                </div>
                <div className="text-[9px] text-green-500 font-bold uppercase tracking-widest">
                  Comissão: {money(commission)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {!isFinished && (
                <Button 
                  className="w-full h-10 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 text-[10px] uppercase font-bold tracking-widest"
                  onClick={() => handleFinishAppointment(appt)}
                >
                  Finalizar atendimento
                </Button>
              )}
              
              {appt.client_phone && (
                <Button 
                  variant="outline" 
                  className="w-full h-10 border-[#25d366]/30 text-[#25d366] hover:bg-[#25d366]/10 flex items-center justify-center gap-2 text-[10px] uppercase font-bold tracking-widest"
                  onClick={() => onWhatsApp(appt.client_phone)}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
