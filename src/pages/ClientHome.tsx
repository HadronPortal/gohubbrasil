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

export default function ClientHome() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const barbershopId = localStorage.getItem("selectedBarbershopId");
  const barbershopName = localStorage.getItem("selectedBarbershopName");

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
      // 1. Fetch appointments (initially without date filter to diagnose)
      const { data: appts, error } = await supabase
        .from("appointments")
        .select("id, client_id, barbershop_id, barber_id, service_id, starts_at, ends_at, status, price_charged, created_at")
        .eq("client_id", user.id)
        .neq("status", "cancelled")
        .order("starts_at", { ascending: true });

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
    localStorage.removeItem("selectedBarbershopId");
    localStorage.removeItem("selectedBarbershopName");
    navigate("/");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("selectedBarbershopId");
    localStorage.removeItem("selectedBarbershopName");
    navigate("/login");
  };

  if (authLoading || isLoading) {
    return <LoadingScreen />;
  }

  const firstName = profile?.name?.split(" ")[0] || user?.user_metadata?.name?.split(" ")[0] || "USUÁRIO";

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
        <div>
          <h1 className="text-[11px] font-light uppercase tracking-[0.2em] text-[#8a9ab5] m-0">OLÁ,</h1>
          <h2 className="text-4xl font-bold uppercase text-[#f0c040] font-oswald tracking-tight m-0 leading-tight">
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
              <span className="text-[10px] text-[#8a9ab5] uppercase tracking-widest">{appointments.length} ATIVO(S)</span>
            )}
          </div>

          <div className="space-y-4">
            {appointments.length === 0 ? (
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
              appointments.map((appt) => (
                <div 
                  key={appt.id}
                  className="bg-[#141b2a] border border-[#2a3347] rounded-[4px] p-5 space-y-4 relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
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

                  <div className="pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCancellingId(appt.id)}
                      className="w-full text-[10px] text-red-500 hover:text-white hover:bg-red-900/50 uppercase tracking-widest font-bold flex items-center gap-2 transition-all border border-red-900/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      CANCELAR AGENDAMENTO
                    </Button>
                  </div>
                </div>
              ))
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
