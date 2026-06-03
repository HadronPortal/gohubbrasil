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
import { LogoutButton } from "@/components/LogoutButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { money } from "@/utils/format";
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
  barbershop_name?: string;
  barber_name?: string;
  barber_avatar_url?: string | null;
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
            {appt.barbershop_name}
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-[#c8d4e8] font-oswald leading-none">
            {money(appt.price_charged)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#1c2333]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1c2333] border border-[#2a3347] flex items-center justify-center overflow-hidden">
            {appt.barber_avatar_url ? (
              <img src={appt.barber_avatar_url} alt={appt.barber_name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-[#8a9ab5]" />
            )}
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

  const barbershopId = profile?.barbershop_id;
  const barbershopName = user ? localStorage.getItem(`selectedBarbershopName:${user.id}`) : null;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    } else if (user && profile) {
      // Prioritize primary panels if roles are owner/admin/barber
      // unless they are specifically in client mode (no force flag)
      const role = String(profile.role || 'client').toLowerCase();
      const hasForceBarber = localStorage.getItem('force_barber_panel') === 'true';

      if (!hasForceBarber) {
        if (role === 'superadmin') {
          navigate("/super-admin", { replace: true });
          return;
        } else if (role === 'owner' || role === 'admin') {
          navigate("/admin", { replace: true });
          return;
        } else if (role === 'barber') {
          navigate("/barber-dashboard", { replace: true });
          return;
        }
      }

      if (!profile.barbershop_id) {
        navigate("/", { replace: true });
        return;
      }

      fetchAppointments();

      // Recarregar quando a janela ganha foco para refletir finalizações do barbeiro
      const handleFocus = () => {
        if (!authLoading && user && profile) {
          fetchAppointments();
        }
      };
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [user, profile, authLoading, navigate, barbershopId]);


  const fetchAppointments = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_my_appointments');

      if (error) {
        toast.error(`Erro: ${error.message}`);
        throw error;
      }

      const active = (data?.active || []) as any[];
      const history = (data?.history || []) as any[];
      
      // Combine active and history into a single list for the existing component logic if necessary
      // or adapt the logic. The existing code uses setAppointments(mapped).
      setAppointments([...active, ...history]);
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
    navigate("/", { replace: true, state: { select: true } });
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
  
  const isFinished = (status: string) => ['completed', 'finalizado'].includes(String(status).toLowerCase());
  const isCanceled = (status: string) => ['cancelled', 'canceled', 'cancelado'].includes(String(status).toLowerCase());
  const isPast = (appt: Appointment) => new Date(appt.starts_at).getTime() < Date.now();
  const isHistory = (appt: Appointment) => isFinished(appt.status) || isCanceled(appt.status) || isPast(appt);

  const sortActive = (items: Appointment[]) =>
    [...items].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const sortHistory = (items: Appointment[]) =>
    [...items].sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  const upcomingAppointments = sortActive(appointments.filter(a => !isHistory(a)));
  const historyAppointments = sortHistory(appointments.filter(a => isHistory(a)));


  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center font-light pb-24 overflow-x-hidden">
      <div className="w-full max-w-[390px] p-6 space-y-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[#f0c040]" />
            <span className="text-[10px] font-bold tracking-widest text-[#f0c040] uppercase truncate max-w-[150px]">
              {appointments.find(a => a.barbershop_id === barbershopId)?.barbershop_name || barbershopName || "Sua Barbearia"}
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
            <LogoutButton showText />
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
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="w-full bg-[#141b2a] border border-[#2a3347] grid grid-cols-2 h-12 p-1">
              <TabsTrigger 
                value="active" 
                className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-[#f0c040] data-[state=active]:text-[#1c2333]"
              >
                MEUS AGENDAMENTOS
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="text-[10px] uppercase font-bold tracking-wider data-[state=active]:bg-[#f0c040] data-[state=active]:text-[#1c2333]"
              >
                HISTÓRICO
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-6 space-y-4">
              {upcomingAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 bg-[#141b2a] border border-[#2a3347] rounded-[4px] text-center space-y-4">
                  <Scissors className="w-10 h-10 text-[#2a3347]" />
                  <p className="text-xs text-[#8a9ab5] uppercase tracking-widest">Você não possui agendamentos ativos.</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate(`/barbers?barbershopId=${barbershopId}`)}
                    className="text-[#f0c040] font-bold p-0 uppercase text-[10px] tracking-widest"
                  >
                    Agendar agora
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
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
            </TabsContent>

            <TabsContent value="history" className="mt-6 space-y-4">
              {historyAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 bg-[#141b2a] border border-[#2a3347] rounded-[4px] text-center space-y-4">
                  <Scissors className="w-10 h-10 text-[#2a3347]" />
                  <p className="text-xs text-[#8a9ab5] uppercase tracking-widest">Nenhum histórico encontrado.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyAppointments.map((appt) => (
                    <AppointmentCard 
                      key={appt.id} 
                      appt={appt} 
                      onCancel={() => setCancellingId(appt.id)} 
                      isPast={true}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
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
