import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, User } from "lucide-react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { AdminGear } from "@/components/AdminGear";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function Booking() {
  const { id: barbershopId } = useParams();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get("serviceId");
  const barberIdFromUrl = searchParams.get("barberId");
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(barberIdFromUrl);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [service, setService] = useState<any>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i));

  useEffect(() => {
    if (profile) {
      if (profile.role !== 'client') {
        const target = profile.isSuperAdmin ? "/super-admin" : "/admin";
        navigate(target, { replace: true });
        return;
      }
    }

    if (!serviceId || !barbershopId) {
      navigate("/", { replace: true });
      return;
    }
  }, [serviceId, barbershopId, navigate, profile]);

  useEffect(() => {
    fetchServiceDetails();
  }, [serviceId]);

  useEffect(() => {
    if (selectedBarberId && selectedDate && serviceId) {
      fetchAvailableSlots();
    }
  }, [selectedBarberId, selectedDate, serviceId]);

  const fetchServiceDetails = async () => {
    if (!serviceId) return;
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .single();
    if (data) setService(data);
  };

  const fetchAvailableSlots = async () => {
    setIsLoadingSlots(true);
    try {
      const { data, error } = await supabase.rpc('get_barbershop_available_slots', {
        p_day: format(selectedDate, "yyyy-MM-dd"),
        p_barber_id: selectedBarberId,
        p_barbershop_id: barbershopId,
        p_duration_minutes: service?.duration_minutes ?? null
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.success) {
        setAvailableSlots(data.slots || []);
      } else {
        toast.error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleBooking = async () => {
    console.log("BOOKING PARAMS", { barbershopId, serviceId, barberIdFromUrl, selectedBarberId });

    if (!selectedBarberId || !selectedDate || !selectedTime) {
      toast.error("Por favor, selecione um barbeiro e horário");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!user) throw new Error("Usuário não autenticado");
      if (!serviceId) throw new Error("Serviço não selecionado");
      if (!barberIdFromUrl && !selectedBarberId) throw new Error("Barbeiro não selecionado");

      // Use already fetched service data
      if (!service) throw new Error("Serviço não encontrado");

      const selectedSlot = availableSlots.find(s => s.time_label === selectedTime);
      if (!selectedSlot) throw new Error("Horário não selecionado corretamente");

      const { error } = await supabase.from("appointments").insert({
        client_id: user.id,
        barbershop_id: barbershopId,
        service_id: serviceId,
        barber_id: selectedBarberId,
        starts_at: selectedSlot.starts_at,
        ends_at: selectedSlot.ends_at,
        status: "pending",
        whatsapp_sent: false,
        confirmed_via_whatsapp: false,
        price_charged: service.price
      });

      if (error) throw error;

      toast.success("Agendamento realizado com sucesso!");
      navigate("/", { replace: true });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const firstName = profile?.name?.split(" ")[0] || user?.user_metadata?.name?.split(" ")[0] || "USUÁRIO";
  const currentMonth = format(selectedDate, "MMMM", { locale: ptBR });

  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center font-light pb-24">
      <div className="w-full max-w-[390px] p-6 space-y-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-[#8a9ab5] hover:text-[#f0c040]">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <AdminGear />
          </div>
          <div className="w-10 h-10 rounded-full bg-[#141b2a] border border-[#2a3347] flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-[#8a9ab5]" />
            )}
          </div>
        </div>


        {/* Appointment Header */}
        <div>
          <h3 className="text-xs font-bold tracking-[0.25em] text-[#f0c040] font-oswald uppercase mb-6">
            MARCAR UM HORÁRIO
          </h3>
          
          <div className="flex justify-between items-center mb-4">
            <span className="text-[10px] font-bold tracking-widest text-[#8a9ab5] uppercase">{currentMonth}</span>
          </div>

          {/* Calendar Horizontal */}
          <div className="flex justify-between gap-1">
            {days.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const dayName = format(day, "EEEEEE", { locale: ptBR }).toUpperCase();
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center py-3 px-1 rounded-[4px] min-w-[44px] transition-all border ${
                    isSelected 
                    ? "bg-[#f0c040] border-[#f0c040] text-[#1c2333]" 
                    : "bg-[#141b2a] border-[#2a3347] text-[#c8d4e8]"
                  }`}
                >
                  <span className={`text-[10px] font-bold tracking-wider mb-1 ${isSelected ? "text-[#1c2333]" : "text-[#8a9ab5]"}`}>
                    {dayName}
                  </span>
                  <span className={`text-sm font-oswald font-bold ${isSelected ? "text-[#1c2333]" : "text-[#c8d4e8]"}`}>
                    {format(day, "d")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Grid */}
        <div className="space-y-4">
          <h3 className="text-[11px] font-bold tracking-[0.2em] text-[#f0c040] font-oswald uppercase">
            HORÁRIOS DISPONÍVEIS
          </h3>
          
          {isLoadingSlots ? (
            <div className="text-center py-6 text-xs text-[#8a9ab5] uppercase tracking-widest">
              Carregando horários...
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-[#2a3347] rounded-[4px] text-sm text-[#8a9ab5]">
              Nenhum horário disponível para esta data.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot) => {
                const isSelected = selectedTime === slot.time_label;
                
                return (
                  <button
                    key={slot.starts_at}
                    onClick={() => setSelectedTime(slot.time_label)}
                    className={`py-3 rounded-[4px] text-xs font-oswald tracking-widest border transition-all ${
                      isSelected
                        ? "bg-[#f0c040] border-[#f0c040] text-[#1c2333]"
                        : "bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] hover:border-[#f0c040]/50"
                    }`}
                  >
                    {slot.time_label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Footer Button */}
      <div className="fixed bottom-0 w-full max-w-[390px] p-6 bg-[#1c2333]/90 backdrop-blur-sm">
        <Button
          onClick={handleBooking}
          disabled={isSubmitting || !selectedTime}
          className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-7 text-lg rounded-[4px] border-none shadow-none transition-all font-oswald uppercase tracking-[3px]"
        >
          {isSubmitting ? <div className="flex items-center gap-2 justify-center w-full"><img src="/tesouras.png" className="w-5 h-5" alt="" style={{ filter: 'brightness(0)' }} /> PROCESSANDO...</div> : "CONTINUAR"}
        </Button>
      </div>
    </div>
  );
}
