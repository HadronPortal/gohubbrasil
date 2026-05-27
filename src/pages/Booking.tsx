import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronLeft, User } from "lucide-react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Barber {
  id: string;
  name: string;
}

export default function Booking() {
  const { id: barbershopId } = useParams();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get("serviceId");
  const navigate = useNavigate();
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(new Date()), i));
  
  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", 
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
  ];

  useEffect(() => {
    if (!serviceId) {
      navigate("/");
      return;
    }
    fetchInitialData();
  }, [barbershopId]);

  useEffect(() => {
    if (selectedBarberId && selectedDate) {
      fetchBookedSlots();
    }
  }, [selectedBarberId, selectedDate]);

  const fetchInitialData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (profile) setUserProfile(profile);

    const { data: barberData } = await supabase
      .from("barbers")
      .select("id, name")
      .eq("barbershop_id", barbershopId);
    
    if (barberData) {
      setBarbers(barberData as Barber[]);
      if (barberData.length > 0) setSelectedBarberId(barberData[0].id);
    }
  };

  const fetchBookedSlots = async () => {
    const start = selectedDate.toISOString();
    const end = addDays(selectedDate, 1).toISOString();

    const { data: appointments } = await supabase
      .from("appointments")
      .select("appointment_time")
      .eq("barber_id", selectedBarberId)
      .gte("appointment_time", start)
      .lt("appointment_time", end);

    if (appointments) {
      const slots = appointments.map(a => {
        const date = new Date(a.appointment_time);
        return format(date, "HH:mm");
      });
      setBookedSlots(slots);
    }
  };

  const handleBooking = async () => {
    if (!selectedBarberId || !selectedDate || !selectedTime) {
      toast.error("Por favor, selecione um barbeiro e horário");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const [hours, minutes] = selectedTime.split(":");
      const appointmentTime = new Date(selectedDate);
      appointmentTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const { error } = await supabase.from("appointments").insert({
        client_id: user.id,
        barbershop_id: barbershopId,
        service_id: serviceId,
        barber_id: selectedBarberId,
        appointment_time: appointmentTime.toISOString(),
        status: 'pending'
      });

      if (error) throw error;

      toast.success("Agendamento realizado com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const firstName = userProfile?.full_name?.split(" ")[0] || "USUÁRIO";
  const currentMonth = format(selectedDate, "MMMM", { locale: ptBR });

  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center font-light pb-24">
      <div className="w-full max-w-[390px] p-6 space-y-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-[#8a9ab5] hover:text-[#f0c040]">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-[#141b2a] border border-[#2a3347] flex items-center justify-center overflow-hidden">
            <User className="w-6 h-6 text-[#8a9ab5]" />
          </div>
        </div>

        {/* Header Section */}
        <div>
          <h1 className="text-[11px] font-light uppercase tracking-[0.2em] text-[#8a9ab5] m-0">THANKS</h1>
          <h2 className="text-4xl font-bold uppercase text-[#f0c040] font-oswald tracking-tight m-0 leading-tight">
            GUILHERME!
          </h2>
        </div>

        {/* Appointment Header */}
        <div>
          <h3 className="text-sm font-bold tracking-[0.3em] text-[#f0c040] font-oswald uppercase mb-8 text-center">
            BOOK AN APPOINTMENT
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
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((time) => {
              const isBooked = bookedSlots.includes(time);
              const isSelected = selectedTime === time;
              
              return (
                <button
                  key={time}
                  disabled={isBooked}
                  onClick={() => setSelectedTime(time)}
                  className={`py-3 rounded-[4px] text-xs font-oswald tracking-widest border transition-all ${
                    isSelected
                      ? "bg-[#f0c040] border-[#f0c040] text-[#1c2333]"
                      : isBooked
                        ? "bg-[#8b0000]/30 border-[#8b0000]/50 text-[#8b0000] cursor-not-allowed"
                        : "bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] hover:border-[#f0c040]/50"
                  }`}
                >
                  {isBooked ? "RESERVADO" : time}
                </button>
              );
            })}
          </div>
        </div>

        {/* Barber Selection */}
        {barbers.length > 1 && (
          <div className="space-y-3">
             <h3 className="text-[11px] font-bold tracking-[0.2em] text-[#f0c040] font-oswald uppercase">
              SELECIONAR BARBEIRO
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {barbers.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBarberId(b.id)}
                  className={`px-4 py-2 rounded-[4px] border whitespace-nowrap text-[10px] font-bold tracking-widest transition-all ${
                    selectedBarberId === b.id
                      ? "bg-[#f0c040] border-[#f0c040] text-[#1c2333]"
                      : "bg-[#141b2a] border-[#2a3347] text-[#8a9ab5]"
                  }`}
                >
                  {b.name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Button */}
      <div className="fixed bottom-0 w-full max-w-[390px] p-6 bg-[#1c2333]/90 backdrop-blur-sm">
        <Button
          onClick={handleBooking}
          disabled={isSubmitting || !selectedTime}
          className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-7 text-lg rounded-[4px] transition-all font-oswald uppercase tracking-[3px]"
        >
          {isSubmitting ? "PROCESSANDO..." : "CONTINUAR"}
        </Button>
      </div>
    </div>
  );
}