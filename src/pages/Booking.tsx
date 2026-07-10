import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarDays, Check, Clock3 } from "lucide-react";
import { format, addDays, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ClientFlowLayout } from "@/components/client/ClientFlowLayout";


export default function Booking() {
  const { id: barbershopId } = useParams();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get("serviceId");
  const barberIdFromUrl = searchParams.get("barberId");
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(barberIdFromUrl);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [dayClosed, setDayClosed] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [service, setService] = useState<any>(null);
  const [isLoadingService, setIsLoadingService] = useState(true);
  const [scheduleSettings, setScheduleSettings] = useState<any | null>(null);

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
  }, [serviceId, barbershopId]);

  useEffect(() => {
    if (!barbershopId) return;
    (async () => {
      const { data, error } = await supabase.rpc(
        "get_barbershop_schedule_settings" as any,
        { p_barbershop_id: barbershopId }
      );
      if (error) {
        toast.error("Erro ao carregar horários: " + error.message);
        setScheduleSettings(null);
        return;
      }
      setScheduleSettings(data || null);
    })();
  }, [barbershopId]);

  useEffect(() => {
    if (selectedBarberId && selectedDate && serviceId && service && scheduleSettings) {
      fetchAvailableSlots();
    }
  }, [selectedBarberId, selectedDate, serviceId, service, scheduleSettings]);

  const fetchServiceDetails = async () => {
    setIsLoadingService(true);
    setService(null);
    if (!serviceId) {
      setIsLoadingService(false);
      return;
    }
    let { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .eq("barbershop_id", barbershopId)
      .maybeSingle();
    if (error) {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
      ({ data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", serviceId)
        .eq("barbershop_id", barbershopId)
        .maybeSingle());
    }
    if (data) setService(data);
    if (!data && !error) toast.error("Serviço não encontrado neste estabelecimento.");
    if (error) toast.error("Não foi possível carregar o serviço.");
    setIsLoadingService(false);
  };

  const fetchAvailableSlots = async () => {
    setIsLoadingSlots(true);
    try {
      if (!scheduleSettings) {
        setAvailableSlots([]);
        setDayClosed(false);
        toast.error("Horários do estabelecimento indisponíveis. Tente novamente.");
        return;
      }

      const dow = selectedDate.getDay();
      const s: any = scheduleSettings;
      let dayOpen: string | null = null;
      let dayClose: string | null = null;
      let dayEnabled = true;
      switch (dow) {
        case 0: dayEnabled = Boolean(s.sun_enabled); dayOpen = s.sun_open; dayClose = s.sun_close; break;
        case 1: dayOpen = s.mon_open; dayClose = s.mon_close; break;
        case 2: dayOpen = s.tue_open; dayClose = s.tue_close; break;
        case 3: dayOpen = s.wed_open; dayClose = s.wed_close; break;
        case 4: dayOpen = s.thu_open; dayClose = s.thu_close; break;
        case 5: dayOpen = s.fri_open; dayClose = s.fri_close; break;
        case 6: dayOpen = s.sat_open; dayClose = s.sat_close; break;
      }

      if (!dayEnabled || !dayOpen || !dayClose) {
        setAvailableSlots([]);
        setDayClosed(true);
        return;
      }

      // Auto complete past appointments
      await supabase.rpc('auto_complete_past_appointments');

      // Check if barbershop is blocked by payment
      const { data: isBlocked, error: blockError } = await supabase.rpc('barbershop_is_payment_blocked', {
        p_barbershop_id: barbershopId
      });

      if (blockError) {
        console.error("Error checking payment block:", blockError);
      } else if (isBlocked) {
        toast.error("Estabelecimento bloqueado por falta de pagamento. Agendamento não permitido.");
        setIsLoadingSlots(false);
        return;
      }

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
        const openHM = String(dayOpen).substring(0, 5);
        const closeHM = String(dayClose).substring(0, 5);
        const filtered = (data.slots || []).filter((slot: any) => {
          const label = String(slot.time_label || "").substring(0, 5);
          return label >= openHM && label < closeHM;
        });
        setAvailableSlots(filtered);
        setDayClosed(false);
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

    if (!service) {
      toast.error("Serviço não encontrado");
      navigate(-1);
      return;
    }

    if (!selectedSlot) {
      toast.error("Selecione um horário");
      return;
    }

    if (!selectedBarberId || !selectedDate) {
      toast.error("Por favor, selecione um profissional e data");
      return;
    }

    setIsSubmitting(true);
    try {
      if (!user) throw new Error("Usuário não autenticado");
      
      const { data: appointment, error: insertError } = await supabase
        .from("appointments")
        .insert({
          client_id: user.id,
          barbershop_id: barbershopId,
          service_id: serviceId,
          barber_id: selectedSlot.barber_id,
          starts_at: selectedSlot.starts_at,
          ends_at: selectedSlot.ends_at,
          status: "pending",
          price_charged: Number(service?.price ?? 0)
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      if (appointment) {
        await supabase.rpc('enqueue_whatsapp_for_appointment', {
          p_appointment_id: appointment.id
        });
      }

      toast.success("Agendamento realizado com sucesso!");
      navigate("/client-home", { replace: true });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingService) return <LoadingScreen />;

  const currentMonth = format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <ClientFlowLayout
      title="Escolha data e horário"
      subtitle={service?.name || "Agendamento GoHub"}
      footer={<button type="button" onClick={handleBooking} disabled={isSubmitting || isLoadingService || !service || !selectedSlot} className="h-12 w-full rounded-[8px] bg-[#3157D5] text-sm font-bold text-white transition disabled:opacity-40">{isSubmitting ? "Confirmando..." : "Confirmar agendamento"}</button>}
    >
      <div className="mb-6 rounded-[8px] border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs text-slate-500">Serviço escolhido</p><p className="mt-1 text-sm font-extrabold">{service?.name}</p></div><p className="text-sm font-extrabold text-[#3157D5]">R$ {Number(service?.price || 0).toFixed(2).replace(".", ",")}</p></div>
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#3157D5]" /><h2 className="text-base font-extrabold capitalize">{currentMonth}</h2></div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
          {days.map((day) => {
            const selected = isSameDay(day, selectedDate);
            return <button key={day.toISOString()} type="button" onClick={() => { setSelectedDate(day); setSelectedSlot(null); }} className={`flex h-[74px] w-[54px] shrink-0 flex-col items-center justify-center rounded-[8px] border transition ${selected ? "border-[#3157D5] bg-[#3157D5] text-white shadow" : "border-slate-200 bg-white"}`}><span className={`text-[10px] font-bold uppercase ${selected ? "text-white/75" : "text-slate-400"}`}>{format(day, "EEE", { locale: ptBR })}</span><span className="mt-1 text-lg font-extrabold">{format(day, "d")}</span></button>;
          })}
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center gap-2"><Clock3 className="h-5 w-5 text-[#3157D5]" /><h2 className="text-base font-extrabold">Horários disponíveis</h2></div>
        {isLoadingSlots ? (
          <div className="rounded-[8px] bg-white py-10 text-center text-sm text-slate-500">Buscando os melhores horários...</div>
        ) : availableSlots.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">{dayClosed ? "Estabelecimento fechado neste dia." : "Nenhum horário disponível nesta data."}</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {availableSlots.map((slot) => {
              const selected = selectedSlot?.starts_at === slot.starts_at;
              return <button key={slot.starts_at} type="button" onClick={() => setSelectedSlot(slot)} className={`relative h-12 rounded-[8px] border text-sm font-bold transition ${selected ? "border-[#3157D5] bg-[#EAF0FF] text-[#3157D5] ring-2 ring-[#3157D5]/10" : "border-slate-200 bg-white text-slate-700"}`}>{slot.time_label}{selected && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />}</button>;
            })}
          </div>
        )}
      </section>
    </ClientFlowLayout>
  );
}
