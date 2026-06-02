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
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price_charged: number | null;
  client_id: string;
  barber_id: string;
  service_id: string;
  clientName?: string;
  barberName?: string;
  serviceName?: string;
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
    try {
      const today = new Date();
      const start = startOfDay(today).toISOString();
      const end = endOfDay(today).toISOString();

      // 1. Fetch Appointments
      const { data: appts, error } = await supabase
        .from("appointments")
        .select("id, client_id, barber_id, service_id, starts_at, ends_at, status, price_charged")
        .eq("barbershop_id", barbershopId)
        .gte("starts_at", start)
        .lte("starts_at", end)
        .order("starts_at", { ascending: true });

      if (error) {
        console.error("DASHBOARD APPOINTMENTS ERROR", error);
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      console.log("DASHBOARD DEBUG", { barbershopId, start, end, appts });

      if (appts) {
        const clientIds = [...new Set(appts.map(a => a.client_id))].filter(Boolean);
        const barberIds = [...new Set(appts.map(a => a.barber_id))].filter(Boolean);
        const serviceIds = [...new Set(appts.map(a => a.service_id))].filter(Boolean);

        // 2. Fetch related data separately
        const [clientsRes, barbersRes, servicesRes] = await Promise.all([
          supabase.from("users").select("id, name").in("id", clientIds),
          supabase.from("barbers").select("id, user_id").in("id", barberIds),
          supabase.from("services").select("id, name, price").in("id", serviceIds)
        ]);

        // For barbers, we need another step to get their user names
        const barberUserIds = (barbersRes.data || []).map(b => b.user_id).filter(Boolean);
        const barberUsersRes = await supabase.from("users").select("id, name").in("id", barberUserIds);

        const clientsMap = Object.fromEntries((clientsRes.data || []).map(c => [c.id, c.name]));
        const barberConfigMap = Object.fromEntries((barbersRes.data || []).map(b => [b.id, b.user_id]));
        const barberUsersMap = Object.fromEntries((barberUsersRes.data || []).map(u => [u.id, u.name]));
        const servicesMap = Object.fromEntries((servicesRes.data || []).map(s => [s.id, s.name]));
        const servicePriceMap = Object.fromEntries((servicesRes.data || []).map(s => [s.id, s.price]));

        const mappedAppts: Appointment[] = appts.map(a => ({
          ...a,
          clientName: clientsMap[a.client_id] || "Cliente",
          barberName: barberUsersMap[barberConfigMap[a.barber_id]] || "Barbeiro",
          serviceName: servicesMap[a.service_id] || "Serviço"
        }));

        setAppointments(mappedAppts);
        
        const revenue = appts
          .filter(a => a.status !== 'cancelled')
          .reduce((acc, a) => acc + (a.price_charged || servicePriceMap[a.service_id] || 0), 0);
        
        // 3. Active Barbers (Total in shop for now)
        const { count: barberCount } = await supabase
          .from("barbers")
          .select("id", { count: "exact", head: true })
          .eq("barbershop_id", barbershopId);

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
            appointments.map((appt) => (
              <div key={appt.id} className="bg-[#141b2a] border border-[#2a3347] p-4 rounded-[4px] space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-[#c8d4e8] font-oswald uppercase tracking-wider">
                      {appt.clientName}
                    </h4>
                    <p className="text-[10px] text-[#8a9ab5] uppercase tracking-widest mt-0.5">
                      {appt.serviceName} • {appt.barberName}
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
