import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Search, UserPlus, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  barbershopId: string;
  onCreated?: () => void;
  // If provided (barber role), restrict barber selection
  lockedBarberId?: string | null;
}

interface ClientRow { id: string; name: string; phone: string | null; }
interface Barber { barber_id: string; name: string; }
interface Service { id: string; name: string; price: number; duration_minutes: number; }

export default function ManualBookingModal({ open, onOpenChange, barbershopId, onCreated, lockedBarberId }: Props) {
  const [step, setStep] = useState<"client" | "details">("client");

  // client state
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [searching, setSearching] = useState(false);

  // details state
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [serviceId, setServiceId] = useState<string>("");
  const [barberId, setBarberId] = useState<string>(lockedBarberId || "");
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      // reset when closed
      setStep("client");
      setClientQuery(""); setClientResults([]); setSelectedClient(null);
      setCreatingNew(false); setNewName(""); setNewPhone("");
      setServiceId(""); setBarberId(lockedBarberId || "");
      setSelectedDate(startOfDay(new Date())); setSlots([]); setSelectedSlot(null);
    }
  }, [open, lockedBarberId]);

  useEffect(() => {
    if (!open || !barbershopId) return;
    (async () => {
      const [{ data: svcs }, { data: brs }] = await Promise.all([
        supabase.from("services").select("id,name,price,duration_minutes").eq("barbershop_id", barbershopId).order("name"),
        supabase.from("barbers").select("id,name,active").eq("barbershop_id", barbershopId).eq("active", true).order("name"),
      ]);
      setServices((svcs as any) || []);
      setBarbers(((brs as any) || []).map((b: any) => ({ barber_id: b.id, name: b.name })));
    })();
  }, [open, barbershopId]);

  // search clients (debounced)
  useEffect(() => {
    if (!open || step !== "client" || creatingNew) return;
    const t = setTimeout(async () => {
      if (clientQuery.trim().length < 2) { setClientResults([]); return; }
      setSearching(true);
      const { data, error } = await supabase.rpc("search_clients_for_manual_booking" as any, { p_query: clientQuery.trim() });
      setSearching(false);
      if (error) { toast.error(error.message); return; }
      if ((data as any)?.success) setClientResults((data as any).clients || []);
    }, 250);
    return () => clearTimeout(t);
  }, [clientQuery, open, step, creatingNew]);

  const selectedService = useMemo(() => services.find(s => s.id === serviceId), [services, serviceId]);

  const loadSlots = async () => {
    if (!barberId || !selectedService) { setSlots([]); return; }
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const { data, error } = await supabase.rpc("get_barbershop_available_slots", {
        p_day: format(selectedDate, "yyyy-MM-dd"),
        p_barber_id: barberId,
        p_barbershop_id: barbershopId,
        p_duration_minutes: selectedService.duration_minutes ?? null,
      });
      if (error) throw error;
      if ((data as any)?.success === false) throw new Error((data as any).error);
      setSlots((data as any)?.slots || []);
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar horários");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (step === "details") loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberId, serviceId, selectedDate, step]);

  const goToDetails = () => {
    if (creatingNew) {
      if (!newName.trim() || !newPhone.trim()) { toast.error("Informe nome e WhatsApp"); return; }
    } else if (!selectedClient) {
      toast.error("Selecione um cliente"); return;
    }
    setStep("details");
  };

  const handleSubmit = async () => {
    if (!serviceId || !barberId || !selectedSlot) {
      toast.error("Selecione serviço, profissional e horário");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        p_barbershop_id: barbershopId,
        p_barber_id: barberId,
        p_service_id: serviceId,
        p_starts_at: selectedSlot.starts_at,
      };
      if (creatingNew) {
        payload.p_client_name = newName.trim();
        payload.p_client_phone = newPhone.trim();
      } else {
        payload.p_client_id = selectedClient!.id;
      }
      const { data, error } = await supabase.rpc("create_manual_appointment" as any, payload);
      if (error) throw error;
      if ((data as any)?.success === false) throw new Error((data as any).error);
      toast.success("Agendamento criado!");
      onCreated?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar agendamento");
    } finally {
      setSubmitting(false);
    }
  };

  const days = Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-[#DDE3EE] text-[#172033] max-w-[380px] p-0 overflow-hidden rounded-[12px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="p-5 border-b border-[#DDE3EE]">
          <DialogTitle className="text-[#3157D5] text-base font-semibold">
            {step === "client" ? "Novo agendamento — Cliente" : "Novo agendamento — Detalhes"}
          </DialogTitle>
        </DialogHeader>

        {step === "client" ? (
          <div className="p-5 space-y-4">
            {!creatingNew && (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
                  <Input
                    placeholder="Buscar por nome ou WhatsApp"
                    value={clientQuery}
                    onChange={(e) => { setClientQuery(e.target.value); setSelectedClient(null); }}
                    className="pl-9 bg-white border-[#DDE3EE] h-11 text-sm"
                  />
                </div>
                <div className="max-h-[220px] overflow-y-auto space-y-1">
                  {searching && <p className="text-xs text-[#64748B] px-2 py-3">Buscando...</p>}
                  {!searching && clientQuery.trim().length >= 2 && clientResults.length === 0 && (
                    <p className="text-xs text-[#64748B] px-2 py-3">Nenhum cliente encontrado.</p>
                  )}
                  {clientResults.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClient(c)}
                      className={cn(
                        "w-full text-left p-3 rounded-[8px] border transition",
                        selectedClient?.id === c.id ? "border-[#3157D5] bg-[#EAF0FF]" : "border-[#DDE3EE] bg-white hover:border-[#3157D5]/40"
                      )}
                    >
                      <div className="text-sm font-semibold text-[#172033]">{c.name}</div>
                      <div className="text-xs text-[#64748B]">{c.phone || "sem telefone"}</div>
                    </button>
                  ))}
                </div>
                <Button variant="outline" onClick={() => setCreatingNew(true)} className="w-full border-dashed border-[#DDE3EE] text-[#3157D5]">
                  <UserPlus className="w-4 h-4 mr-2" /> Cadastrar novo cliente
                </Button>
              </>
            )}
            {creatingNew && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#64748B]">Nome</label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome do cliente" className="bg-white border-[#DDE3EE] h-11 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#64748B]">WhatsApp</label>
                  <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Ex: 5511999999999" className="bg-white border-[#DDE3EE] h-11 text-sm" />
                </div>
                <button className="text-xs text-[#3157D5] font-semibold" onClick={() => setCreatingNew(false)}>← Buscar cliente existente</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#DDE3EE] text-[#64748B] h-11">Cancelar</Button>
              <Button onClick={goToDetails} className="bg-[#3157D5] text-white hover:bg-[#274ac0] h-11">Continuar</Button>
            </div>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#64748B]">Serviço</label>
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger className="bg-white border-[#DDE3EE] h-11 text-sm"><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                <SelectContent className="bg-white border-[#DDE3EE] text-[#172033]">
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} — {s.duration_minutes}min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#64748B]">Profissional</label>
              <Select value={barberId} onValueChange={setBarberId} disabled={!!lockedBarberId}>
                <SelectTrigger className="bg-white border-[#DDE3EE] h-11 text-sm"><SelectValue placeholder="Selecione o profissional" /></SelectTrigger>
                <SelectContent className="bg-white border-[#DDE3EE] text-[#172033]">
                  {barbers.map(b => (
                    <SelectItem key={b.barber_id} value={b.barber_id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#64748B]">Data</label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {days.map(d => {
                  const selected = format(d, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                  return (
                    <button key={d.toISOString()} onClick={() => setSelectedDate(d)}
                      className={cn(
                        "shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-[8px] border transition",
                        selected ? "bg-[#3157D5] border-[#3157D5] text-white" : "bg-white border-[#DDE3EE] text-[#172033]"
                      )}>
                      <span className={cn("text-[10px] uppercase font-bold", selected ? "text-white/75" : "text-[#64748B]")}>{format(d, "EEE", { locale: ptBR })}</span>
                      <span className="text-base font-bold">{format(d, "d")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#64748B]">Horário</label>
              {loadingSlots ? (
                <div className="text-center text-xs text-[#64748B] py-4 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</div>
              ) : slots.length === 0 ? (
                <div className="text-center text-xs text-[#64748B] py-4 border border-dashed border-[#DDE3EE] rounded-[8px]">
                  {barberId && serviceId ? "Nenhum horário disponível." : "Selecione serviço e profissional."}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-[180px] overflow-y-auto">
                  {slots.map(sl => {
                    const sel = selectedSlot?.starts_at === sl.starts_at;
                    return (
                      <button key={sl.starts_at} onClick={() => setSelectedSlot(sl)}
                        className={cn(
                          "h-10 rounded-[8px] border text-xs font-bold transition",
                          sel ? "bg-[#EAF0FF] border-[#3157D5] text-[#3157D5]" : "bg-white border-[#DDE3EE] text-[#172033]"
                        )}>
                        {sl.time_label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep("client")} className="border-[#DDE3EE] text-[#64748B] h-11">Voltar</Button>
              <Button onClick={handleSubmit} disabled={submitting || !selectedSlot} className="bg-[#3157D5] text-white hover:bg-[#274ac0] h-11">
                {submitting ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}