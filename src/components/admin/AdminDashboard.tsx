import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, endOfDay } from "date-fns";

interface Stats {
  appointmentsToday: number;
  freeSlots: number;
  activeBarbers: number;
  revenueToday: number;
}

interface Appointment {
  id: string;
  starts_at: string;
  status: string;
  users: { name: string };
  services: { name: string };
  barbers: { name: string };
}

export default function AdminDashboard({ barbershopId }: { barbershopId: string | null }) {
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
    const today = new Date();
    const start = startOfDay(today).toISOString();
    const end = endOfDay(today).toISOString();

    // Fetch Appointments
    const { data: appts } = await supabase
      .from("appointments")
      .select(`
        id, 
        starts_at, 
        status, 
        users:client_id (name),
        services:service_id (name, price),
        barbers:barber_id (name)
      `)
      .eq("barbershop_id", barbershopId)
      .gte("starts_at", start)
      .lte("starts_at", end)
      .order("starts_at", { ascending: true });

    if (appts) {
      setAppointments(appts as any);
      
      const revenue = appts
        .filter(a => a.status === 'confirmed')
        .reduce((acc, a: any) => acc + (a.services?.price || 0), 0);
      
      // Fetch Active Barbers
      const { count: barberCount } = await supabase
        .from("barbers")
        .select("*", { count: "exact", head: true })
        .eq("barbershop_id", barbershopId)
        .eq("active", true);

      // Rough calculation for free slots (total slots - appointments)
      const totalPossibleSlots = (barberCount || 0) * 18; // 18 slots per day per barber
      const freeSlots = Math.max(0, totalPossibleSlots - appts.length);

      setStats({
        appointmentsToday: appts.length,
        freeSlots,
        activeBarbers: barberCount || 0,
        revenueToday: revenue,
      });
    }
    setIsLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";
      case "confirmed": return "text-green-500 border-green-500/30 bg-green-500/10";
      case "cancelled": return "text-red-500 border-red-500/30 bg-red-500/10";
      default: return "text-gray-500 border-gray-500/30 bg-gray-500/10";
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
          { label: "BARBEIROS ATIVOS", value: stats.activeBarbers },
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
            appointments.map((appt) => (
              <div key={appt.id} className="bg-[#141b2a] border border-[#2a3347] p-4 rounded-[4px] space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-[#c8d4e8] font-oswald uppercase tracking-wider">
                      {appt.users?.name || "CLIENTE"}
                    </h4>
                    <p className="text-[10px] text-[#8a9ab5] uppercase tracking-widest mt-0.5">
                      {appt.services?.name} • {appt.barbers?.name}
                    </p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-[2px] border uppercase tracking-widest ${getStatusColor(appt.status)}`}>
                    {appt.status}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#2a3347]/50 flex justify-between items-center">
                  <span className="text-lg font-bold text-[#f0c040] font-oswald">
                    {format(new Date(appt.appointment_time), "HH:mm")}
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
