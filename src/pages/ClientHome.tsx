import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  MapPin, 
  Clock, 
  User, 
  LogOut, 
  RefreshCcw, 
  Trash2,
  X,
  Store,
  Scissors
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

interface Appointment {
  id: string;
  client_id: string;
  barbershop_id: string;
  barber_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price_charged: number;
  created_at: string;
  barbershop?: {
    name: string;
    logo_url: string | null;
  };
  barber_name?: string;
  service_name?: string;
}

function AppointmentCard({ 
  appt, 
  onCancel, 
  isPast 
}: { 
  appt: Appointment; 
  onCancel: () => void; 
  isPast: boolean;
}) {
  return (
    <div className={`bg-[#141b2a] border border-[#2a3347] rounded-[4px] p-5 space-y-4 relative overflow-hidden group ${isPast ? 'opacity-70' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {!isPast && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
            <h4 className="text-xs font-bold text-[#f0c040] uppercase tracking-widest font-oswald">
              {appt.service_name}
            </h4>
          </div>
          <p className="text-[10px] text-[#8a9ab5] uppercase tracking-wider font-medium">
            {appt.barbershop?.name}
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-[#c8d4e8] font-oswald leading-none">
            R$ {appt.price_charged.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1c2333]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1c2333] border border-[#2a3347] flex items-center justify-center">
            <User className="w-4 h-4 text-[#8a9ab5]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-[#8a9ab5] uppercase tracking-tighter">BARBEIRO</span>
            <span className="text-[10px] font-bold text-[#c8d4e8] uppercase truncate max-w-[80px]">
              {appt.barber_name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1c2333] border border-[#2a3347] flex items-center justify-center">
            <Clock className="w-4 h-4 text-[#f0c040]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-[#8a9ab5] uppercase tracking-tighter">DATA E HORA</span>
            <span className="text-[10px] font-bold text-[#c8d4e8] uppercase">
              {format(new Date(appt.starts_at), "dd/MM 'ÀS' HH:mm", { locale: ptBR })}
            </span>
          </div>
        </div>
      </div>

      {isPast ? (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = `/barbers?barbershopId=${appt.barbershop_id}`}
            className="w-full text-[10px] text-[#f0c040] border-[#f0c040]/30 hover:bg-[#f0c040] hover:text-[#1c2333] uppercase tracking-widest font-bold flex items-center gap-2 transition-all"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            AGENDAR NOVAMENTE
          </Button>
          <p className="text-[8px] text-[#8a9ab5] uppercase tracking-widest mt-2 text-center">Agendamento finalizado</p>
        </div>
      ) : (
        <div className="pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="w-full text-[10px] text-red-500 hover:text-white hover:bg-red-900/50 uppercase tracking-widest font-bold flex items-center gap-2 transition-all border border-red-900/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            CANCELAR AGENDAMENTO
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ClientHome() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const barbershopId = user ? localStorage.getItem(`selectedBarbershopId:${user.id}`) : null;
  const barbershopName = user ? localStorage.getItem(`selectedBarbershopName:${user.id}`) : null;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    } else if (user && profile) {
      if (profile.role !== 'client') {
        const target = profile.isSuperAdmin ? "/super-admin" : "/admin";
        navigate(target);
        return;
      }

      if (!barbershopId) {
        navigate("/");
        return;
      }

      fetchAppointments();
    }
  }, [user, profile, authLoading, navigate, barbershopId]);

  const fetchAppointments = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      console.log("MY APPOINTMENTS USER", { userId: user?.id });
      // 1. Fetch appointments
      const { data: appts, error } = await supabase
        .from("appointments")
        .select("id, client_id, barbershop_id, barber_id, service_id, starts_at, ends_at, status, price_charged, created_at")
        .eq("client_id", user.id)
        .neq("status", "cancelled")
        .order("starts_at", { ascending: false }); // Show most recent first (especially for history)

      console.log("MY APPOINTMENTS QUERY", { appointments: appts, error });

      if (error) {
        toast.error(`Erro RLS ou Banco: ${error.message}`);
        throw error;
      }

      if (!appts || appts.length === 0) {
        setAppointments([]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch complementary data
      const barbershopIds = [...new Set(appts.map(a => a.barbershop_id))];
      const barberIds = [...new Set(appts.map(a => a.barber_id))];
      const serviceIds = [...new Set(appts.map(a => a.service_id))];

      const [
        { data: shops },
        { data: barbersData },
        { data: services }
      ] = await Promise.all([
        supabase.from("barbershops").select("id, name, logo_url").in("id", barbershopIds),
        supabase.from("barbers").select("id, user_id").in("id", barberIds),
        supabase.from("services").select("id, name").in("id", serviceIds)
      ]);

      // Fetch user names for barbers
      const barberUserIds = barbersData?.map(b => b.user_id).filter(Boolean) || [];
      const { data: barberUsers } = await supabase.from("users").select("id, name").in("id", barberUserIds);

      // 3. Map everything
      const mapped: Appointment[] = appts.map(a => {
        const shop = shops?.find(s => s.id === a.barbershop_id);
        const barber = barbersData?.find(b => b.id === a.barber_id);
        const barberUser = barberUsers?.find(u => u.id === barber?.user_id);
        const service = services?.find(s => s.id === a.service_id);

        return {
          ...a,
          barbershop: shop,
          barber_name: barberUser?.name || "Barbeiro",
          service_name: service?.name || "Serviço"
        };
      });

      setAppointments(mapped);
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!cancellingId) return;
    setIsCancelling(true);
    try {
      const { data, error } = await supabase.rpc("cancel_my_appointment", { 
        p_appointment_id: cancellingId 
      });

      if (error) throw error;
      
      if (data && data.success === false) {
        toast.error(data.error || "Erro ao cancelar agendamento");
        return;
      }

      toast.success("Agendamento cancelado");
      setAppointments(prev => prev.filter(a => a.id !== cancellingId));
    } catch (error: any) {
      console.error("Error cancelling:", error);
      toast.error(error.message || "Erro ao cancelar agendamento");
    } finally {
      setIsCancelling(false);
      setCancellingId(null);
    }
  };

  const switchBarbershop = () => {
    if (user) {
      localStorage.removeItem(`selectedBarbershopId:${user.id}`);
      localStorage.removeItem(`selectedBarbershopName:${user.id}`);
    }
    navigate("/");
  };

  const signOut = async () => {
    if (user) {
      // Don't clear on logout per requirement: "A barbearia escolhida deve ficar salva até ele clicar em 'Trocar estabelecimento'"
      // BUT if the user wants it to be session based it would be different.
      // The requirement says "Não limpar essa escolha quando: ... recarrega a página". 
      // It doesn't explicitly say about logout, but "até ele clicar em 'Trocar estabelecimento'" suggests persistence across logins.
      // So I will NOT remove it on signOut to maintain the persistence requirement.
    }
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (authLoading || isLoading) {
    return <LoadingScreen />;
  }

  const firstName = profile?.name?.split(" ")[0] || user?.user_metadata?.name?.split(" ")[0] || "USUÁRIO";
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "BOM DIA";
    if (hour >= 12 && hour < 18) return "BOA TARDE";
    return "BOA NOITE";
  };
  
  const now = new Date();
  const upcomingAppointments = appointments.filter(a => new Date(a.starts_at) >= now);
  const pastAppointments = appointments.filter(a => new Date(a.starts_at) < now);

  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center font-light pb-24 overflow-x-hidden">
      <div className="w-full max-w-[390px] p-6 space-y-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[#f0c040]" />
            <span className="text-[10px] font-bold tracking-widest text-[#f0c040] uppercase truncate max-w-[150px]">
              {barbershopName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#141b2a] border border-[#2a3347] flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-[#8a9ab5]" />
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={signOut} 
              className="text-[#8a9ab5] hover:text-[#f0c040]"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Welcome Section */}
        <div className="space-y-1">
          <h1 className="text-[11px] font-light uppercase tracking-[0.2em] text-[#8a9ab5] m-0">
            {getGreeting()},
          </h1>
          <h2 className="text-4xl font-bold uppercase text-[#f0c040] font-oswald tracking-tight m-0 leading-tight pt-1">
            {firstName.toUpperCase()}!
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={() => navigate(`/barbers?barbershopId=${barbershopId}`)}
            className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-8 text-lg rounded-[4px] border-none shadow-none transition-all font-oswald uppercase tracking-[2px] flex flex-col items-center gap-1"
          >
            <Calendar className="w-6 h-6 mb-1" />
            AGENDAR HORÁRIO
          </Button>

          <Button
            onClick={switchBarbershop}
            variant="outline"
            className="w-full bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] hover:border-[#f0c040] hover:bg-[#141b2a] py-6 text-xs rounded-[4px] transition-all font-oswald uppercase tracking-[1px] flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            TROCAR ESTABELECIMENTO
          </Button>
        </div>

        {/* Appointments Section */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-[0.25em] text-[#f0c040] font-oswald uppercase">
              MEUS AGENDAMENTOS
            </h3>
            {appointments.length > 0 && (
              <span className="text-[10px] text-[#8a9ab5] uppercase tracking-widest">{upcomingAppointments.length} PRÓXIMO(S)</span>
            )}
          </div>

          <div className="space-y-8">
            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 bg-[#141b2a] border border-[#2a3347] rounded-[4px] text-center space-y-4">
                <Scissors className="w-10 h-10 text-[#2a3347]" />
                <p className="text-xs text-[#8a9ab5] uppercase tracking-widest">Você não possui agendamentos.</p>
                <Button 
                  variant="link" 
                  onClick={() => navigate(`/barbers?barbershopId=${barbershopId}`)}
                  className="text-[#f0c040] font-bold p-0 uppercase text-[10px] tracking-widest"
                >
                  Agendar agora
                </Button>
              </div>
            ) : (
              <>
                {/* Upcoming */}
                {upcomingAppointments.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-[9px] font-bold text-[#8a9ab5] uppercase tracking-[0.2em] mb-2">Próximos</h4>
                    {upcomingAppointments.map((appt) => (
                      <AppointmentCard 
                        key={appt.id} 
                        appt={appt} 
                        onCancel={() => setCancellingId(appt.id)} 
                        isPast={false}
                      />
                    ))}
                  </div>
                )}

                {/* History */}
                {pastAppointments.length > 0 && (
                  <div className="space-y-4 opacity-60">
                    <h4 className="text-[9px] font-bold text-[#8a9ab5] uppercase tracking-[0.2em] mb-2">Histórico</h4>
                    {pastAppointments.map((appt) => (
                      <AppointmentCard 
                        key={appt.id} 
                        appt={appt} 
                        onCancel={() => setCancellingId(appt.id)} 
                        isPast={true}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancellingId} onOpenChange={(open) => !open && setCancellingId(null)}>
        <AlertDialogContent className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-oswald uppercase text-[#f0c040] tracking-widest">
              Cancelar agendamento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#8a9ab5] text-xs uppercase tracking-wider">
              Esse horário ficará disponível novamente para outros clientes. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-transparent border-[#2a3347] text-[#8a9ab5] hover:bg-[#1c2333] hover:text-white font-oswald uppercase text-xs tracking-widest rounded-none">
              VOLTAR
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAppointment}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700 text-white font-oswald uppercase text-xs tracking-widest rounded-none"
            >
              {isCancelling ? "CANCELANDO..." : "CANCELAR AGENDAMENTO"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
