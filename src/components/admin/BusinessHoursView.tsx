import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { TimePicker } from "@/components/ui/TimePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  barbershopId: string;
  onBack: () => void;
}

export default function BusinessHoursView({ barbershopId, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Seg–Sex compartilha o mesmo horário (por regra do produto)
  const [weekOpen, setWeekOpen] = useState("09:00");
  const [weekClose, setWeekClose] = useState("18:00");
  const [satOpen, setSatOpen] = useState("09:00");
  const [satClose, setSatClose] = useState("13:00");
  const [sunEnabled, setSunEnabled] = useState(false);
  const [sunOpen, setSunOpen] = useState("09:00");
  const [sunClose, setSunClose] = useState("13:00");
  const [slotInterval, setSlotInterval] = useState("30");

  useEffect(() => {
    load();
  }, [barbershopId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc(
        "get_barbershop_schedule_settings" as any,
        { p_barbershop_id: barbershopId }
      );
      if (error) throw error;
      const s: any = data || {};
      setWeekOpen((s.mon_open || "09:00").substring(0, 5));
      setWeekClose((s.mon_close || "18:00").substring(0, 5));
      setSatOpen((s.sat_open || "09:00").substring(0, 5));
      setSatClose((s.sat_close || "13:00").substring(0, 5));
      setSunEnabled(Boolean(s.sun_enabled));
      setSunOpen((s.sun_open || "09:00").substring(0, 5));
      setSunClose((s.sun_close || "13:00").substring(0, 5));
      setSlotInterval(String(s.slot_interval_minutes || 30));
    } catch (e: any) {
      toast.error("Erro ao carregar horários: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (weekClose <= weekOpen) return toast.error("Fechamento de segunda a sexta deve ser após a abertura");
    if (satClose <= satOpen) return toast.error("Fechamento de sábado deve ser após a abertura");
    if (sunEnabled && sunClose <= sunOpen) return toast.error("Fechamento de domingo deve ser após a abertura");
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc(
        "update_barbershop_schedule_settings" as any,
        {
          p_barbershop_id: barbershopId,
          p_slot_interval_minutes: parseInt(slotInterval),
          p_mon_open: weekOpen, p_mon_close: weekClose,
          p_tue_open: weekOpen, p_tue_close: weekClose,
          p_wed_open: weekOpen, p_wed_close: weekClose,
          p_thu_open: weekOpen, p_thu_close: weekClose,
          p_fri_open: weekOpen, p_fri_close: weekClose,
          p_sat_open: satOpen, p_sat_close: satClose,
          p_sun_enabled: sunEnabled,
          p_sun_open: sunOpen, p_sun_close: sunClose,
        }
      );
      if (error) throw error;
      const res: any = data;
      if (res && res.success === false) throw new Error(res.error);
      toast.success("Horários de funcionamento salvos!");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-10" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-[#64748B] hover:text-[#3157D5]">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h3 className="text-xs font-bold text-[#3157D5]">Horários de funcionamento</h3>
      </div>

      {loading ? (
        <div className="text-center py-10 text-[#64748B] text-xs">Carregando...</div>
      ) : (
        <div className="space-y-4">
          <section className="bg-white border border-[#DDE3EE] rounded-[8px] p-4 space-y-4">
            <div className="flex items-center gap-2 text-[#172033]">
              <Clock className="w-4 h-4 text-[#3157D5]" />
              <h4 className="text-sm font-semibold">Segunda a sexta</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TimePicker label="Abertura" value={weekOpen} onChange={setWeekOpen} />
              <TimePicker label="Fechamento" value={weekClose} onChange={setWeekClose} />
            </div>
          </section>

          <section className="bg-white border border-[#DDE3EE] rounded-[8px] p-4 space-y-4">
            <div className="flex items-center gap-2 text-[#172033]">
              <Clock className="w-4 h-4 text-[#3157D5]" />
              <h4 className="text-sm font-semibold">Sábado</h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <TimePicker label="Abertura" value={satOpen} onChange={setSatOpen} />
              <TimePicker label="Fechamento" value={satClose} onChange={setSatClose} />
            </div>
          </section>

          <section className="bg-white border border-[#DDE3EE] rounded-[8px] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#172033]">
                <Clock className="w-4 h-4 text-[#3157D5]" />
                <h4 className="text-sm font-semibold">Domingo</h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#64748B]">{sunEnabled ? "Aberto" : "Fechado"}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={sunEnabled}
                  onClick={() => setSunEnabled(!sunEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    sunEnabled ? "bg-[#3157D5]" : "bg-[#DDE3EE]"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      sunEnabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
            {sunEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <TimePicker label="Abertura" value={sunOpen} onChange={setSunOpen} />
                <TimePicker label="Fechamento" value={sunClose} onChange={setSunClose} />
              </div>
            )}
          </section>

          <section className="bg-white border border-[#DDE3EE] rounded-[8px] p-4 space-y-2">
            <label className="text-xs font-medium text-[#64748B]">Intervalo entre horários</label>
            <Select value={slotInterval} onValueChange={setSlotInterval}>
              <SelectTrigger className="bg-white border-[#DDE3EE]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#DDE3EE] text-[#172033]">
                {[15, 30, 45, 60].map((v) => (
                  <SelectItem key={v} value={String(v)}>{v} minutos</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>

          <Button
            onClick={save}
            disabled={saving}
            className="w-full bg-[#3157D5] text-white hover:bg-[#274ac0] font-semibold rounded-[8px] h-11"
          >
            {saving ? "Salvando..." : "Salvar horários"}
          </Button>
        </div>
      )}
    </div>
  );
}