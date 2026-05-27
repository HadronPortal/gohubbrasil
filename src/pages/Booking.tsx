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
    "09:00 AM", "10:00 AM", "11:00 AM", 
    "12:00 AM", "01:00 PM", "02:00 PM", 
    "03:00 PM", "04:00 PM", "05:00 PM", 
    "06:00 PM", "07:00 PM", "08:00 PM",
    "09:00 PM"
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
        let hours = date.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        const strTime = hours.toString().padStart(2, '0') + ':00 ' + ampm;
        return strTime;
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

      const [timePart, ampm] = selectedTime.split(" ");
      let [hours] = timePart.split(":").map(Number);
      if (ampm === "PM" && hours !== 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      const appointmentTime = new Date(selectedDate);
      appointmentTime.setHours(hours, 0, 0, 0);

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

  const firstName = userProfile?.full_name?.split(" ")[0] || "USER";

  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center font-light pb-24">
      <div className="w-full max-w-[390px] p-6 space-y-10">
        {/* Header */}
        <div className="flex justify-between items-center w-full">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
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
            {firstName.toUpperCase()}!
          </h2>
          <p className="text-[10px] text-[#8a9ab5] mt-1 max-w-[200px] leading-tight font-sans">Lorem ipsum dolor sit amet consectetur adipiscing elit</p>
        </div>

        {/* Appointment Header */}
        <div>
          <h3 className="text-xs font-bold tracking-[0.1em] text-[#f0c040] font-oswald uppercase mb-10 text-center">
            BOOK AN APPOINTMENT
          </h3>
          
          <div className="flex justify-center items-center mb-6">
            <span className="text-[12px] font-bold tracking-[0.4em] text-[#8a9ab5] uppercase">JULY</span>
          </div>

          {/* Calendar Horizontal */}
          <div className="flex justify-between items-center px-2">
            {days.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const dayNum = format(day, "d");
              const dayName = format(day, "EEEEEE").toUpperCase().substring(0, 2);
              const isMO = dayNum === "14"; // In image, 14 is red

              return (
                <div key={day.toISOString()} className="flex flex-col items-center gap-2 relative">
                  <span className={`text-[12px] font-bold font-oswald z-10 transition-all ${
                    isSelected ? "text-[#1c2333]" : isMO ? "text-red-500" : "text-white"
                  }`}>
                    {dayNum}
                  </span>
                  <span className={`text-[8px] font-bold tracking-tighter z-10 transition-all ${
                    isSelected ? "text-[#1c2333]" : "text-[#8a9ab5]"
                  }`}>
                    {dayName}
                  </span>
                  {isSelected && (
                    <div className="absolute top-[-5px] w-8 h-12 bg-[#f0c040] rounded-full z-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Time Grid */}
        <div className="space-y-4 pt-4">
          <h3 className="text-[11px] font-bold tracking-[0.1em] text-[#f0c040] font-oswald uppercase text-center">
            AVAILABLE TIMES
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((time) => {
              const isBooked = bookedSlots.includes(time) || time === "12:00 AM" || time === "07:00 PM"; 
              const isSelected = selectedTime === time;
              
              return (
                <button
                  key={time}
                  disabled={isBooked}
                  onClick={() => setSelectedTime(time)}
                  className={`py-3 rounded-[4px] text-[10px] font-bold font-oswald tracking-widest transition-all ${
                    isSelected
                      ? "bg-[#f0c040] text-[#1c2333]"
                      : isBooked
                        ? "bg-[#8b0000]/20 text-[#8b0000] border border-[#8b0000]/30"
                        : "bg-[#141b2a] border border-white/5 text-[#8a9ab5]"
                  }`}
                >
                  {isBooked ? "BOOKED" : time}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Button */}
      <div className="fixed bottom-0 w-full max-w-[390px] p-6 bg-[#1c2333]/95">
        <Button
          onClick={handleBooking}
          disabled={isSubmitting || !selectedTime}
          className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-7 text-lg rounded-[4px] transition-all font-oswald uppercase tracking-[3px]"
        >
          {isSubmitting ? "PROCESSING..." : "CONTINUE"}
        </Button>
      </div>
    </div>
  );
}