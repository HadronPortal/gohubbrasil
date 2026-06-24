import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { MessageCircle, Calendar as CalendarIcon, DollarSign, Percent, TrendingUp, Lock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { money } from "@/utils/format";
import { UserAvatar } from "@/components/UserAvatar";
import { getDateKeyBR, isTodayBR, isAfterTodayBR, isFinished, isCanceled } from "@/lib/utils";
import FreeSlotsView from "../admin/FreeSlotsView";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


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
      
      // Auto complete past appointments before fetching data
      await supabase.rpc('auto_complete_past_appointments');

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

  const isHistorical = (appt: Appointment) => {
    const status = appt.status.toLowerCase();
    const canceledStatuses = ['cancelled', 'canceled', 'cancelado'];
    return status === 'completed' || 
           status === 'no_show' || 
           canceledStatuses.includes(status) || 
           (appt as any).client_attended === false;
  };

  const todayAppointments = uniqueAppointments
    .filter(a => isTodayBR(a.starts_at) && !isHistorical(a))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const nextAppointments = uniqueAppointments
    .filter(a => isAfterTodayBR(a.starts_at) && !isHistorical(a))
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const historyAppointments = uniqueAppointments
    .filter(a => isHistorical(a))
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());



  const openWhatsApp = (phone: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleanPhone}`);
  };

  if (isLoading && !data) {
    return (
      <div className="text-sm text-[#64748B] px-2 py-6" style={{ fontFamily: "Poppins, sans-serif" }}>
        Carregando...
      </div>
    );
  }

  if (showFreeSlots) {
    return <FreeSlotsView barbershopId={profile.barbershop_id} onBack={() => setShowFreeSlots(false)} profile={profile} />;
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Horários Livres Card */}
      <button
        type="button"
        onClick={() => setShowFreeSlots(true)}
        className="w-full flex items-center justify-between gap-3 rounded-[8px] border border-[#DDE3EE] bg-white p-4 text-left hover:border-[#3157D5]/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-[8px] bg-[#EAF0FF] p-2">
            <Lock className="w-5 h-5 text-[#3157D5]" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-[#0F1E3D] truncate">Meus horários livres</h4>
            <p className="text-xs text-[#64748B] truncate">Ver e bloquear sua agenda</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#94A3B8] shrink-0" />
      </button>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-white border border-[#DDE3EE] rounded-[8px] shadow-none">
          <CardContent className="p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[#64748B]">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Agendamentos hoje</span>
            </div>
            <span className="text-xl font-semibold text-[#0F1E3D]">{data?.summary.appointments_today || 0}</span>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#DDE3EE] rounded-[8px] shadow-none">
          <CardContent className="p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[#64748B]">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Faturamento hoje</span>
            </div>
            <span className="text-xl font-semibold text-[#0F1E3D] truncate">
              {money(data?.summary.gross_today)}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#DDE3EE] rounded-[8px] shadow-none">
          <CardContent className="p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[#64748B]">
              <DollarSign className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Minha comissão</span>
            </div>
            <span className="text-xl font-semibold text-[#16A34A] truncate">
              {money(data?.summary.commission_today)}
            </span>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#DDE3EE] rounded-[8px] shadow-none">
          <CardContent className="p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[#64748B]">
              <Percent className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium">Comissão</span>
            </div>
            <span className="text-xl font-semibold text-[#0F1E3D]">{data?.summary.commission_pct || 0}%</span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="w-full bg-white border border-[#DDE3EE] grid grid-cols-3 h-11 p-1 rounded-[8px]">
          <TabsTrigger
            value="active"
            className="text-xs font-medium rounded-[6px] data-[state=active]:bg-[#3157D5] data-[state=active]:text-white text-[#64748B]"
          >
            Hoje
          </TabsTrigger>
          <TabsTrigger
            value="upcoming"
            className="text-xs font-medium rounded-[6px] data-[state=active]:bg-[#3157D5] data-[state=active]:text-white text-[#64748B]"
          >
            Próximos
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="text-xs font-medium rounded-[6px] data-[state=active]:bg-[#3157D5] data-[state=active]:text-white text-[#64748B]"
          >
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 space-y-3">
          <AppointmentList 
            appointments={todayAppointments} 
            onWhatsApp={openWhatsApp} 
            emptyMessage="Nenhum agendamento para hoje" 
            onRefresh={fetchDashboardData} 
          />
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          <AppointmentList 
            appointments={nextAppointments} 
            onWhatsApp={openWhatsApp} 
            emptyMessage="Nenhum agendamento futuro" 
            onRefresh={fetchDashboardData} 
          />
        </TabsContent>


        <TabsContent value="history" className="mt-4 space-y-3">
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
  const getStatusInfo = (status: string, client_attended?: boolean) => {
    const s = status.toLowerCase();
    if (s === "no_show" || (s === "completed" && client_attended === false)) {
      return { label: "Não compareceu", color: "text-[#B45309] border-[#FCD34D] bg-[#FEF3C7]" };
    }
    switch (s) {
      case "pending": 
        return { label: "Pendente", color: "text-[#B45309] border-[#FCD34D] bg-[#FEF3C7]" };
      case "confirmed": 
        return { label: "Confirmado", color: "text-[#15803D] border-[#86EFAC] bg-[#DCFCE7]" };
      case "cancelled": 
      case "canceled":
      case "cancelado":
        return { label: "Cancelado", color: "text-[#B91C1C] border-[#FCA5A5] bg-[#FEE2E2]" };
      case "completed":
      case "finalizado":
        return { label: "Finalizado", color: "text-[#1D4ED8] border-[#93C5FD] bg-[#DBEAFE]" };
      default: {
        const raw = (status ?? "").toString().trim();
        const label = raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : "Agendado";
        return { label, color: "text-[#475569] border-[#CBD5E1] bg-[#F1F5F9]" };
      }
    }
  };


// Removido money local, usando importado

  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);

  const handleFinishAppointment = async (attended: boolean) => {
    if (!selectedAppt) return;
    try {
      setIsFinishing(true);
      const { data, error } = await supabase.rpc('finish_barber_appointment', {
        p_appointment_id: selectedAppt.id,
        p_attended: attended
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.success === false) {
        toast.error(data.error || "Erro ao finalizar atendimento");
        return;
      }

      toast.success(attended ? "Atendimento finalizado" : "Registrado como não comparecimento");
      setIsFinishModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error("Ocorreu um erro ao finalizar o atendimento");
    } finally {
      setIsFinishing(false);
    }
  };

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-[8px] border border-dashed border-[#DDE3EE] bg-white">
        <CalendarIcon className="w-6 h-6 text-[#94A3B8]" />
        <p className="text-sm text-[#64748B]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" style={{ fontFamily: "Poppins, sans-serif" }}>
      {appointments.map((appt, i) => {
        const isFinished = ["completed", "finalizado", "cancelled", "canceled", "cancelado", "no_show"].includes(appt.status.toLowerCase());
        const price = appt.price ?? appt.price_charged ?? appt.service_price ?? 0;
        const commission = appt.commission_amount ?? appt.commission_value ?? 0;


        return (
          <div key={i} className="bg-white border border-[#DDE3EE] p-3 rounded-[8px] space-y-3">
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar 
                  name={appt.client_name} 
                  avatarUrl={null} 
                  size="sm" 
                  className="border-[#DDE3EE]"
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-[#0F1E3D] truncate">{appt.client_name}</h4>
                  <p className="text-xs text-[#64748B] truncate">{appt.service_name}</p>
                </div>
              </div>

              <span className={`text-[10px] font-semibold px-2 py-1 rounded-[6px] border shrink-0 ${getStatusInfo(appt.status, (appt as any).client_attended).color}`}>
                {getStatusInfo(appt.status, (appt as any).client_attended).label}
              </span>
            </div>

            <div className="flex justify-between items-center gap-2 pt-3 border-t border-[#EEF2F8]">
              <div>
                <div className="text-base font-semibold text-[#3157D5]">
                  {format(new Date(appt.starts_at), "HH:mm")}
                </div>
                <div className="text-[11px] text-[#64748B]">
                  {format(new Date(appt.starts_at), "dd/MM/yyyy")}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-semibold text-[#0F1E3D]">
                  {money(price)}
                </div>
                <div className="text-[11px] text-[#16A34A] font-medium">
                  Comissão: {money(commission)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {!isFinished && (
                <Button 
                  className="w-full h-10 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-[8px] text-xs font-semibold"
                  onClick={() => {
                    setSelectedAppt(appt);
                    setIsFinishModalOpen(true);
                  }}
                >
                  Finalizar atendimento
                </Button>
              )}
              
              {appt.client_phone && (
                <Button 
                  variant="outline" 
                  className="w-full h-10 border-[#25d366]/40 text-[#15803D] hover:bg-[#25d366]/10 rounded-[8px] text-xs font-medium flex items-center justify-center gap-2"
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

      <AlertDialog open={isFinishModalOpen} onOpenChange={setIsFinishModalOpen}>
        <AlertDialogContent className="bg-white border border-[#DDE3EE] text-[#0F1E3D] rounded-[8px]" style={{ fontFamily: "Poppins, sans-serif" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-[#0F1E3D]">
              O cliente compareceu?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#64748B] leading-relaxed">
              Selecione se o cliente realizou o serviço ou se não compareceu ao horário agendado.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="bg-white border border-[#DDE3EE] text-[#172033] hover:bg-[#F6F7FB] rounded-[8px] h-11 text-sm font-medium w-full sm:w-auto">
              Voltar
            </AlertDialogCancel>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                onClick={() => handleFinishAppointment(false)}
                disabled={isFinishing}
                variant="outline"
                className="bg-white border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEE2E2] rounded-[8px] h-11 text-sm font-medium w-full"
              >
                Não compareceu
              </Button>
              <Button
                onClick={() => handleFinishAppointment(true)}
                disabled={isFinishing}
                className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-[8px] h-11 text-sm font-semibold w-full"
              >
                {isFinishing ? "Processando..." : "Sim, compareceu"}
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
