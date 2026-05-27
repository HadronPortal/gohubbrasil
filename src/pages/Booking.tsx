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
    <div className="min-h-screen bg-black text-white p-6 pb-12">
      <div className="flex items-center mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2 text-zinc-400">
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">Agendar Horário</h1>
      </div>

      <div className="space-y-8">
        {/* Serviços */}
        <section>
          <div className="flex items-center mb-4 text-amber-500">
            <ScissorsIcon className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-bold uppercase tracking-wider">Escolha o Serviço</h2>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedService(s.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedService === s.id 
                    ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20" 
                    : "bg-zinc-900 border-zinc-800 text-white"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold">{s.name}</span>
                  <span className="font-bold">R$ {s.price}</span>
                </div>
                <div className={`text-xs mt-1 ${selectedService === s.id ? "text-black/70" : "text-zinc-500"}`}>
                  {s.duration_minutes} min
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Barbeiros */}
        <section>
          <div className="flex items-center mb-4 text-amber-500">
            <User className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-bold uppercase tracking-wider">Escolha o Barbeiro</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {barbers.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBarber(b.id)}
                className={`flex-shrink-0 px-6 py-3 rounded-xl border font-bold transition-all ${
                  selectedBarber === b.id 
                    ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20" 
                    : "bg-zinc-900 border-zinc-800 text-white"
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </section>

        {/* Calendário */}
        <section>
          <div className="flex items-center mb-4 text-amber-500">
            <Clock className="w-5 h-5 mr-2" />
            <h2 className="text-lg font-bold uppercase tracking-wider">Data e Hora</h2>
          </div>
          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              className="text-white bg-zinc-900"
              classNames={{
                selected: "bg-amber-500 text-black hover:bg-amber-600",
                today: "text-amber-500 font-bold underline",
              }}
            />
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4">
            {timeSlots.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={`py-2 text-sm rounded-lg border font-medium transition-all ${
                  selectedTime === time
                    ? "bg-amber-500 border-amber-500 text-black"
                    : "bg-zinc-900 border-zinc-800 text-white"
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </section>

        <Button
          onClick={handleBooking}
          disabled={isSubmitting}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-black py-7 text-lg rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? "Confirmando..." : "CONFIRMAR AGENDAMENTO"}
        </Button>
      </div>
    </div>
  );
}
