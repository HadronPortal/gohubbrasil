import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { ChevronLeft, Clock, User, Scissors as ScissorsIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface Barber {
  id: string;
  name: string;
}

export default function Booking() {
  const { id: barbershopId } = useParams();
  const navigate = useNavigate();
  
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (barbershopId) {
      fetchData();
    }
  }, [barbershopId]);

  const fetchData = async () => {
    const [servicesRes, barbersRes] = await Promise.all([
      supabase.from("services").select("*").eq("barbershop_id", barbershopId),
      supabase.from("barbers").select("*").eq("barbershop_id", barbershopId)
    ]);

    if (servicesRes.data) setServices(servicesRes.data);
    if (barbersRes.data) setBarbers(barbersRes.data);
  };

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", 
    "16:00", "16:30", "17:00", "17:30"
  ];

  const handleBooking = async () => {
    if (!selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      toast.error("Preencha todos os campos");
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
        service_id: selectedService,
        barber_id: selectedBarber,
        appointment_time: appointmentTime.toISOString(),
      });

      if (error) throw error;

      toast.success("Agendamento confirmado!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1E212B] text-white p-6 pb-12">
      <div className="flex justify-between items-center mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="w-10 h-10 rounded-full bg-[#EAB308] flex items-center justify-center">
          <User className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Welcome</h1>
          <h2 className="text-3xl font-black uppercase text-white tracking-tighter">STEVE!</h2>
          <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">Lorem ipsum dolor sit amet consectetur adipiscing elit</p>
        </div>

        {/* Tabs style */}
        <div className="flex gap-4 border-b border-zinc-800 pb-2">
          <button className="text-[10px] font-black uppercase tracking-widest text-[#EAB308] border-b-2 border-[#EAB308] pb-2 px-1">Services</button>
          <button className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pb-2 px-1">Barbers</button>
          <button className="text-[10px] font-black uppercase tracking-widest text-zinc-500 pb-2 px-1">Promo</button>
        </div>

        {/* Serviços Icons */}
        <div className="flex justify-between items-start py-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-zinc-800/50">
              <ScissorsIcon className="w-6 h-6 text-[#EAB308]" />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Haircut</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-[#EAB308]">
              <div className="w-6 h-6 border-2 border-white rotate-45 flex items-center justify-center">
                <div className="w-3 h-3 bg-white" />
              </div>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-[#EAB308]">Shaving</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-zinc-800/50">
              <div className="w-6 h-4 border-t-2 border-zinc-600 flex justify-between">
                {[1,2,3,4].map(i => <div key={i} className="w-[1px] h-full bg-zinc-600" />)}
              </div>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Hair Style</span>
          </div>
        </div>

        {/* Serviços List */}
        <div className="space-y-4">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedService(s.id)}
              className="w-full group flex items-start gap-4 text-left"
            >
              <div className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center transition-all ${
                selectedService === s.id ? "border-[#EAB308] bg-[#EAB308]" : "border-zinc-700"
              }`}>
                {selectedService === s.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-white">{s.name}</h3>
                <p className="text-[9px] text-zinc-500 mt-0.5 leading-relaxed">Lorem ipsum dolor sit amet consectetur adipiscing elit</p>
              </div>
            </button>
          ))}
        </div>

        {/* Date/Time Section Header */}
        <div className="pt-4">
           <h2 className="text-xs font-black uppercase tracking-widest text-[#EAB308] mb-6">Book an Appointment</h2>
           <div className="flex justify-between items-center mb-6">
             <span className="text-xs font-black uppercase tracking-widest text-zinc-400">July</span>
             <div className="flex gap-4">
               {[13, 14, 15, 16, 17, 18, 19].map((day) => (
                 <div key={day} className="flex flex-col items-center gap-1">
                   <span className={`text-[10px] font-black ${day === 16 ? "text-[#EAB308]" : day === 14 ? "text-red-500" : "text-white"}`}>{day}</span>
                   <span className="text-[7px] font-black uppercase tracking-tighter text-zinc-600">
                     {day === 13 ? "SU" : day === 14 ? "MO" : day === 15 ? "TU" : day === 16 ? "WE" : day === 17 ? "TH" : day === 18 ? "FR" : "SA"}
                   </span>
                   {day === 16 && <div className="w-6 h-6 absolute -z-10 bg-[#EAB308]/20 rounded-full" />}
                 </div>
               ))}
             </div>
           </div>

           <h3 className="text-[10px] font-black uppercase tracking-widest text-[#EAB308] mb-4">Available Times</h3>
           <div className="grid grid-cols-3 gap-2">
             {timeSlots.map((time) => (
               <button
                 key={time}
                 onClick={() => setSelectedTime(time)}
                 className={`py-2 text-[9px] font-black rounded-md border transition-all ${
                   selectedTime === time
                     ? "bg-[#EAB308] border-[#EAB308] text-white"
                     : time === "12:00" || time === "17:00" 
                       ? "bg-red-500/20 border-red-500/40 text-red-500 cursor-not-allowed"
                       : "bg-[#2D323E] border-none text-zinc-400"
                 }`}
               >
                 {time} { (time === "12:00" || time === "17:00") && "BOOKED"}
               </button>
             ))}
           </div>
        </div>

        <Button
          onClick={handleBooking}
          disabled={isSubmitting}
          className="w-full bg-[#EAB308] hover:bg-yellow-500 text-white font-black py-7 text-sm rounded-xl transition-all uppercase tracking-widest mt-8"
        >
          {isSubmitting ? "CONTINUING..." : "CONTINUE"}
        </Button>
      </div>
    </div>

  );
}
