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
      <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ fontFamily: "Poppins, sans-serif" }}>
        <TrendingUp className="h-7 w-7 text-[#3157D5] animate-pulse" />
        <p className="text-sm text-[#64748B]">Carregando financeiro...</p>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-5" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-[#172033]">Relatórios financeiros</h3>

        <div className="flex flex-wrap gap-2">
          {(["today", "yesterday", "this_month", "last_3_months", "custom"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "h-9 px-3 text-xs font-medium rounded-[8px] border transition",
                period === p
                  ? "bg-[#3157D5] border-[#3157D5] text-white"
                  : "bg-white border-[#DDE3EE] text-[#64748B] hover:border-[#3157D5]/40 hover:text-[#172033]"
              )}
            >
              {p === "today" && "Hoje"}
              {p === "yesterday" && "Ontem"}
              {p === "this_month" && "Este mês"}
              {p === "last_3_months" && "3 meses"}
              {p === "custom" && "Personalizado"}
            </button>
          ))}
        </div>

        {period === "custom" && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#172033]">Início</label>
              <input
                type="date"
                value={customDates.start}
                onChange={(e) => setCustomDates(prev => ({ ...prev, start: e.target.value }))}
                className="w-full h-11 rounded-[8px] border border-[#DDE3EE] bg-white px-3 text-sm text-[#172033]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#172033]">Fim</label>
              <input
                type="date"
                value={customDates.end}
                onChange={(e) => setCustomDates(prev => ({ ...prev, end: e.target.value }))}
                className="w-full h-11 rounded-[8px] border border-[#DDE3EE] bg-white px-3 text-sm text-[#172033]"
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Faturamento bruto" value={money(summary?.gross_revenue || 0)} icon={<TrendingUp className="h-4 w-4" />} accent="#3157D5" />
        <StatCard label="Comissão profissionais" value={money(summary?.total_commission || 0)} icon={<Users className="h-4 w-4" />} accent="#DC2626" />
        <StatCard label="Líquido estabelecimento" value={money(summary?.net_revenue || 0)} icon={<TrendingUp className="h-4 w-4" />} accent="#15803D" />
        <StatCard label="Atendimentos" value={summary?.completed_count || 0} icon={<Scissors className="h-4 w-4" />} accent="#0EA5E9" />
        <StatCard label="Ticket médio" value={money(summary?.average_ticket || 0)} icon={<Ticket className="h-4 w-4" />} accent="#7C3AED" />
        <StatCard label="Cancelamentos" value={summary?.cancelled_count || 0} icon={<XCircle className="h-4 w-4" />} accent="#B45309" />
      </div>

      <div className="space-y-5 pb-6">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-[#172033]">Desempenho por profissional</h4>
          <div className="space-y-2">
            {data?.barber_ranking && data.barber_ranking.length > 0 ? (
              data.barber_ranking.map((barber, idx) => (
                <div key={idx} className="rounded-[8px] border border-[#DDE3EE] bg-white p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#172033] truncate">{barber.name}</span>
                    <span className="text-xs text-[#64748B]">{barber.completed_count} atend.</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-[#DDE3EE] pt-2">
                    <div><p className="text-[10px] text-[#64748B]">Bruto</p><p className="text-xs font-semibold text-[#172033]">{money(barber.gross_revenue)}</p></div>
                    <div><p className="text-[10px] text-[#64748B]">Comissão</p><p className="text-xs font-semibold text-[#DC2626]">{money(barber.commission_total)}</p></div>
                    <div><p className="text-[10px] text-[#64748B]">Líquido</p><p className="text-xs font-semibold text-[#15803D]">{money(barber.net_revenue)}</p></div>
                  </div>
                </div>
              ))
            ) : (<EmptyState />)}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-[#172033]">Serviços mais vendidos</h4>
          <div className="space-y-2">
            {data?.service_ranking && data.service_ranking.length > 0 ? (
              data.service_ranking.map((service, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-[8px] border border-[#DDE3EE] bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#172033]">{service.name}</p>
                    <p className="text-xs text-[#64748B]">{service.quantity} unidades</p>
                  </div>
                  <span className="text-sm font-semibold text-[#3157D5]">{money(service.total_revenue)}</span>
                </div>
              ))
            ) : (<EmptyState />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent: string }) {
  return (
    <div className="rounded-[8px] border border-[#DDE3EE] bg-white p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="rounded-[6px] p-1.5" style={{ backgroundColor: `${accent}15`, color: accent }}>
          {icon}
        </div>
        <span className="text-[11px] font-medium text-[#64748B] leading-tight">{label}</span>
      </div>
      <p className="text-base font-semibold text-[#172033]">{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[8px] border border-dashed border-[#DDE3EE] bg-white py-8 text-center">
      <p className="text-sm text-[#64748B]">Nenhum dado neste período.</p>
    </div>
  );
}
