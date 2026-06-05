import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { money } from "@/utils/format";
import { TrendingUp, Users, Scissors, Ticket, XCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  subMonths,
  format
} from "date-fns";
import { ptBR } from "date-fns/locale";

type Period = "today" | "yesterday" | "this_month" | "last_3_months" | "custom";

interface FinancialSummary {
  gross_revenue: number;
  total_commission: number;
  net_revenue: number;
  completed_count: number;
  cancelled_count: number;
  average_ticket: number;
}

interface BarberRanking {
  name: string;
  completed_count: number;
  gross_revenue: number;
  commission_total: number;
  net_revenue: number;
}

interface ServiceRanking {
  name: string;
  quantity: number;
  total_revenue: number;
}

interface FinancialData {
  summary: FinancialSummary;
  barber_ranking: BarberRanking[];
  service_ranking: ServiceRanking[];
}

export default function AdminFinancial({ barbershopId }: { barbershopId: string | null }) {
  const [period, setPeriod] = useState<Period>("this_month");
  const [customDates, setCustomDates] = useState<{ start: string; end: string }>({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd"),
  });
  const [data, setData] = useState<FinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (barbershopId) {
      fetchFinancialData();
    }
  }, [barbershopId, period, customDates]);

  const getPeriodDates = () => {
    const now = new Date();
    // Use Sao Paulo timezone logic roughly by using local Date if the user is in Brazil
    // The database uses TIMESTAMPTZ so it handles UTC conversion
    
    switch (period) {
      case "today":
        return {
          start: startOfDay(now).toISOString(),
          end: endOfDay(now).toISOString()
        };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return {
          start: startOfDay(yesterday).toISOString(),
          end: endOfDay(yesterday).toISOString()
        };
      case "this_month":
        return {
          start: startOfMonth(now).toISOString(),
          end: endOfMonth(now).toISOString()
        };
      case "last_3_months":
        return {
          start: startOfMonth(subMonths(now, 2)).toISOString(),
          end: endOfMonth(now).toISOString()
        };
      case "custom":
        return {
          start: startOfDay(new Date(customDates.start)).toISOString(),
          end: endOfDay(new Date(customDates.end)).toISOString()
        };
      default:
        return {
          start: startOfMonth(now).toISOString(),
          end: endOfMonth(now).toISOString()
        };
    }
  };

  const fetchFinancialData = async () => {
    setIsLoading(true);
    try {
      const { start, end } = getPeriodDates();
      
      // Conforme solicitado pelo usuário, usamos a RPC get_owner_financial_report
      // p_start_date e p_end_date no formato YYYY-MM-DD
      const formattedStart = format(new Date(start), "yyyy-MM-dd");
      const formattedEnd = format(new Date(end), "yyyy-MM-dd");

      const { data: res, error } = await supabase.rpc("get_owner_financial_report", {
        p_start_date: formattedStart,
        p_end_date: formattedEnd,
        p_barbershop_id: null // nulo para pegar a barbearia do dono logado (conforme política/função)
      });

      if (error) throw error;
      
      if (res && res.success === false) {
        toast.error(res.error || "Erro ao carregar dados financeiros");
        return;
      }

      // Adaptando os dados retornados pela nova RPC para o estado local
      // A RPC retorna summary.gross, summary.commission, summary.net etc.
      if (res && res.summary) {
        const adaptedData: FinancialData = {
          summary: {
            gross_revenue: Number(res.summary.gross || 0),
            total_commission: Number(res.summary.commission || 0),
            net_revenue: Number(res.summary.net || 0),
            completed_count: Number(res.summary.completed_count || 0),
            cancelled_count: Number(res.summary.cancelled_count || 0),
            average_ticket: Number(res.summary.average_ticket || 0)
          },
          barber_ranking: (res.barbers || []).map((b: any) => ({
            name: b.name,
            completed_count: Number(b.completed_count || 0),
            gross_revenue: Number(b.gross || 0),
            commission_total: Number(b.commission || 0),
            net_revenue: Number(b.net || 0)
          })),
          service_ranking: (res.services || []).map((s: any) => ({
            name: s.name,
            quantity: Number(s.quantity || 0),
            total_revenue: Number(s.total_revenue || 0)
          }))
        };
        setData(adaptedData);
      }
    } catch (err: any) {
      console.error("FINANCIAL ERROR", err);
      toast.error("Erro ao carregar relatório financeiro");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#8a9ab5] font-oswald uppercase tracking-widest text-xs">
        <TrendingUp className="w-8 h-8 mb-4 animate-pulse text-[#f0c040]" />
        CARREGANDO FINANCEIRO...
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="space-y-4">
        <h3 className="text-xs font-bold tracking-[0.25em] text-[#f0c040] font-oswald uppercase">Relatórios Financeiros</h3>
        
        {/* Period Filter */}
        <div className="flex flex-wrap gap-2">
          {(["today", "yesterday", "this_month", "last_3_months", "custom"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-2 text-[9px] font-bold uppercase tracking-widest border rounded-[2px] transition-all",
                period === p 
                  ? "bg-[#f0c040] border-[#f0c040] text-[#1c2333]" 
                  : "bg-[#141b2a] border-[#2a3347] text-[#8a9ab5] hover:border-[#f0c040]/50"
              )}
            >
              {p === "today" && "Hoje"}
              {p === "yesterday" && "Ontem"}
              {p === "this_month" && "Este Mês"}
              {p === "last_3_months" && "3 Meses"}
              {p === "custom" && "Personalizado"}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="grid grid-cols-2 gap-4 pt-2 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-1">
              <label className="text-[9px] text-[#8a9ab5] uppercase font-bold tracking-widest">Início</label>
              <input 
                type="date" 
                value={customDates.start}
                onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                className="w-full bg-[#141b2a] border border-[#2a3347] text-[#c8d4e8] text-[10px] p-2 rounded-[2px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] text-[#8a9ab5] uppercase font-bold tracking-widest">Fim</label>
              <input 
                type="date" 
                value={customDates.end}
                onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                className="w-full bg-[#141b2a] border border-[#2a3347] text-[#c8d4e8] text-[10px] p-2 rounded-[2px]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          label="FATURAMENTO BRUTO" 
          value={money(summary?.gross_revenue || 0)} 
          icon={<TrendingUp className="w-4 h-4" />} 
          color="text-[#f0c040]"
        />
        <StatCard 
          label="COMISSÃO BARBEIROS" 
          value={money(summary?.total_commission || 0)} 
          icon={<Users className="w-4 h-4" />} 
          color="text-red-400"
        />
        <StatCard 
          label="LÍQUIDO BARBEARIA" 
          value={money(summary?.net_revenue || 0)} 
          icon={<TrendingUp className="w-4 h-4" />} 
          color="text-green-400"
        />
        <StatCard 
          label="ATENDIMENTOS" 
          value={summary?.completed_count || 0} 
          icon={<Scissors className="w-4 h-4" />} 
          color="text-blue-400"
        />
        <StatCard 
          label="TICKET MÉDIO" 
          value={money(summary?.average_ticket || 0)} 
          icon={<Ticket className="w-4 h-4" />} 
          color="text-purple-400"
        />
        <StatCard 
          label="CANCELAMENTOS" 
          value={summary?.cancelled_count || 0} 
          icon={<XCircle className="w-4 h-4" />} 
          color="text-orange-400"
        />
      </div>

      {/* Rankings */}
      <div className="space-y-10 pb-10">
        {/* Barber Ranking */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold tracking-widest text-[#8a9ab5] uppercase border-l-2 border-[#f0c040] pl-2">Desempenho por Barbeiro</h4>
          <div className="space-y-3">
            {data?.barber_ranking && data.barber_ranking.length > 0 ? (
              data.barber_ranking.map((barber, idx) => (
                <div key={idx} className="bg-[#141b2a] border border-[#2a3347] p-4 rounded-[4px] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-[#f0c040] font-oswald uppercase tracking-wider">{barber.name}</span>
                    <span className="text-[9px] font-bold text-[#8a9ab5] uppercase tracking-widest">{barber.completed_count} ATENDIMENTOS</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#2a3347]/50">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-[#8a9ab5] uppercase font-bold">BRUTO</span>
                      <span className="text-[10px] font-bold text-[#c8d4e8]">{money(barber.gross_revenue)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-[#8a9ab5] uppercase font-bold">COMISSÃO</span>
                      <span className="text-[10px] font-bold text-red-400/80">{money(barber.commission_total)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[8px] text-[#8a9ab5] uppercase font-bold">LÍQUIDO</span>
                      <span className="text-[10px] font-bold text-green-400/80">{money(barber.net_revenue)}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState />
            )}
          </div>
        </div>

        {/* Service Ranking */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold tracking-widest text-[#8a9ab5] uppercase border-l-2 border-[#f0c040] pl-2">Serviços mais Vendidos</h4>
          <div className="space-y-2">
            {data?.service_ranking && data.service_ranking.length > 0 ? (
              data.service_ranking.map((service, idx) => (
                <div key={idx} className="bg-[#141b2a] border border-[#2a3347] px-4 py-3 rounded-[4px] flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#c8d4e8] font-oswald uppercase tracking-wider">{service.name}</span>
                    <span className="text-[9px] text-[#8a9ab5] font-bold uppercase tracking-widest">{service.quantity} UNIDADES</span>
                  </div>
                  <span className="text-xs font-bold text-[#f0c040]">{money(service.total_revenue)}</span>
                </div>
              ))
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-[#141b2a] border border-[#2a3347] p-4 rounded-[4px] space-y-2">
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-[2px] bg-[#1c2333] border border-[#2a3347]", color)}>
          {icon}
        </div>
        <span className="text-[8px] font-bold text-[#8a9ab5] uppercase tracking-wider leading-tight">
          {label}
        </span>
      </div>
      <span className={cn("text-lg font-bold font-oswald block", color)}>
        {value}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-10 border border-dashed border-[#2a3347] rounded-[4px]">
      <p className="text-[10px] text-[#8a9ab5] uppercase font-bold tracking-widest">NENHUM DADO NESTE PERÍODO</p>
    </div>
  );
}
