import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";

interface Stats {
  appointmentsToday: number;
  freeSlots: number;
  activeBarbers: number;
  revenueToday: number;
}

interface Appointment {
  client_name: string;
  barber_name: string;
  service_name: string;
  starts_at: string;
  price_charged: number | null;
  status: string;
}

export default function AdminDashboard({ 
  barbershopId, 
  profile 
}: { 
  barbershopId: string | null;
  profile: any;
}) {
  const [stats, setStats] = useState<Stats>({
    appointmentsToday: 0,
    freeSlots: 0,
    activeBarbers: 0,
    revenueToday: 0,
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (barbershopId) fetchDashboardData();
  }, [barbershopId]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().slice(0, 10);

      const { data, error } = await supabase.rpc("get_owner_dashboard_appointments", {
        p_day: today
      });

      console.log("OWNER DASHBOARD RPC", { data, error });

      if (error) {
        console.error("OWNER DASHBOARD ERROR", error);
        toast.error("Erro ao carregar agendamentos");
        setIsLoading(false);
        return;
      }

      if (data) {
        const appts = data as Appointment[];
        setAppointments(appts);
        
        const revenue = appts.reduce((acc, a) => acc + (Number(a.price_charged) || 0), 0);
        
        // Mantendo busca de barbeiros para o card de estatísticas
        const { count: barberCount } = await supabase
          .from("barbers")
          .select("id", { count: "exact", head: true })
          .eq("barbershop_id", barbershopId)
          .eq("active", true);

        // Estimativa simples de slots (considerando 18 slots por barbeiro)
        const totalPossibleSlots = (barberCount || 0) * 18;
        const freeSlots = Math.max(0, totalPossibleSlots - appts.length);

        setStats({
          appointmentsToday: appts.length,
          freeSlots,
          activeBarbers: barberCount || 0,
          revenueToday: revenue,
        });
      }
    } catch (err: any) {
      console.error("DASHBOARD FATAL ERROR", err);
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
      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "AGENDAMENTOS HOJE", value: stats.appointmentsToday },
          { label: "HORÁRIOS LIVRES", value: stats.freeSlots },
          { label: "BARBEIROS", value: stats.activeBarbers },
          { label: "FATURAMENTO", value: `R$ ${stats.revenueToday.toFixed(2)}` },
        ].map((item, idx) => (
          <div key={idx} className="bg-[#141b2a] border border-[#2a3347] p-4 rounded-[4px] space-y-2">
            <span className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider block">
              {item.label}
            </span>
            <span className="text-xl font-bold text-[#f0c040] font-oswald">
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Appointments List */}
      <div className="space-y-6">
        <h3 className="text-xs font-bold tracking-[0.25em] text-[#f0c040] font-oswald uppercase">
          AGENDAMENTOS DE HOJE
        </h3>
        
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <p className="text-sm text-[#8a9ab5] text-center py-10 border border-dashed border-[#2a3347] rounded-[4px]">
              NENHUM AGENDAMENTO PARA HOJE
            </p>
          ) : (
            appointments.map((appt, idx) => (
              <div key={`${appt.starts_at}-${idx}`} className="bg-[#141b2a] border border-[#2a3347] p-4 rounded-[4px] space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-[#c8d4e8] font-oswald uppercase tracking-wider">
                      {appt.client_name}
                    </h4>
                    <p className="text-[10px] text-[#8a9ab5] uppercase tracking-widest mt-0.5">
                      {appt.service_name} • {appt.barber_name}
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
                  {appt.price_charged !== null && (
                    <span className="text-[10px] font-bold text-[#8a9ab5]">
                      R$ {Number(appt.price_charged).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
