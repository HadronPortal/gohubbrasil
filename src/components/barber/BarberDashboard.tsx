import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";

interface Appointment {
  id: string;
  starts_at: string;
  status: string;
  price_charged: number | null;
  client_name?: string;
  service_name?: string;
}

export default function BarberDashboard({ profile }: { profile: any }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [barber, setBarber] = useState<any>(null);

  useEffect(() => {
    if (profile) fetchBarberData();
  }, [profile]);

  const fetchBarberData = async () => {
    try {
      setIsLoading(true);
      
      // 1. Buscar o registro do barbeiro para obter o barber_id correto
      const { data: barberData, error: barberError } = await supabase
        .from("barbers")
        .select("id")
        .eq("user_id", profile.id)
        .eq("active", true)
        .single();

      if (barberError || !barberData) {
        console.error("BARBER FETCH ERROR", barberError);
        toast.error("Erro ao identificar registro de barbeiro");
        setIsLoading(false);
        return;
      }

      setBarber(barberData);
      
      // 2. Buscar agendamentos do dia
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      // Buscamos diretamente da tabela de appointments com joins para nomes
      // Já que não temos uma view específica para barbeiros que facilite isso
      const { data: appts, error: apptsError } = await supabase
        .from("appointments")
        .select(`
          id,
          starts_at,
          status,
          price_charged,
          client:users!client_id(name),
          service:services(name)
        `)
        .eq("barber_id", barberData.id)
        .eq("barbershop_id", profile.barbershop_id)
        .gte("starts_at", todayStart)
        .lte("starts_at", todayEnd)
        .neq("status", "cancelled")
        .order("starts_at", { ascending: true });

      if (apptsError) {
        console.error("APPOINTMENTS FETCH ERROR", apptsError);
        toast.error("Erro ao carregar agendamentos");
      } else {
        const formattedAppts = (appts || []).map((a: any) => ({
          id: a.id,
          starts_at: a.starts_at,
          status: a.status,
          price_charged: a.price_charged,
          client_name: a.client?.name || "Cliente",
          service_name: a.service?.name || "Serviço"
        }));
        setAppointments(formattedAppts);
      }
    } catch (err: any) {
      console.error("BARBER DASHBOARD FATAL ERROR", err);
      toast.error("Ocorreu um erro inesperado");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending": 
        return { label: "PENDENTE", color: "text-yellow-500 border-yellow-500/30 bg-yellow-500/10" };
      case "confirmed": 
        return { label: "CONFIRMADO", color: "text-green-500 border-green-500/30 bg-green-500/10" };
      case "cancelled": 
        return { label: "CANCELADO", color: "text-red-500 border-red-500/30 bg-red-500/10" };
      default: 
        return { label: status.toUpperCase(), color: "text-gray-500 border-gray-500/30 bg-gray-500/10" };
    }
  };

  if (isLoading) return <div className="text-[#8a9ab5] font-oswald text-xs tracking-widest uppercase">CARREGANDO...</div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Summary */}
      <div className="bg-[#141b2a] border border-[#2a3347] p-4 rounded-[4px] space-y-2 text-center">
        <span className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider block">
          MEUS AGENDAMENTOS HOJE
        </span>
        <span className="text-3xl font-bold text-[#f0c040] font-oswald">
          {appointments.length}
        </span>
      </div>

      {/* Appointments List */}
      <div className="space-y-6">
        <h3 className="text-xs font-bold tracking-[0.25em] text-[#f0c040] font-oswald uppercase">
          MINHA AGENDA DE HOJE
        </h3>
        
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <p className="text-sm text-[#8a9ab5] text-center py-10 border border-dashed border-[#2a3347] rounded-[4px]">
              NENHUM AGENDAMENTO PARA HOJE
            </p>
          ) : (
            appointments.map((appt) => (
              <div key={appt.id} className="bg-[#141b2a] border border-[#2a3347] p-4 rounded-[4px] space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-[#c8d4e8] font-oswald uppercase tracking-wider">
                      {appt.client_name}
                    </h4>
                    <p className="text-[10px] text-[#8a9ab5] uppercase tracking-widest mt-0.5">
                      {appt.service_name}
                    </p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-[2px] border uppercase tracking-widest ${getStatusInfo(appt.status).color}`}>
                    {getStatusInfo(appt.status).label}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#2a3347]/50 flex justify-between items-center">
                  <span className="text-lg font-bold text-[#f0c040] font-oswald">
                    {format(new Date(appt.starts_at), "HH:mm")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
