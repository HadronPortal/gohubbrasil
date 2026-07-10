import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, addMinutes, isBefore, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/TimePicker";
import { ArrowLeft, Calendar as CalendarIcon, Clock, Lock, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface FreeSlotsViewProps {
  barbershopId: string;
  onBack: () => void;
  profile?: any;
}

interface Barber {
  barber_id: string;
  name: string;
}

interface TimeBlock {
  id: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  barber_id: string | null;
  barber_name?: string;
}

interface AvailableSlot {
  barber_id: string;
  barber_name: string;
  barber_avatar_url: string | null;
  starts_at: string;
  ends_at: string;
  time_label: string;
}

export default function FreeSlotsView({ barbershopId, onBack, profile }: FreeSlotsViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBarberId, setSelectedBarberId] = useState<string>("all");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  
  // Config form state
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("19:00");
  const [slotInterval, setSlotInterval] = useState("30");

  // Block form state
  const [blockBarberId, setBlockBarberId] = useState<string>("all");
  const [blockStartTime, setBlockStartTime] = useState("");
  const [blockEndTime, setBlockEndTime] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockStartDate, setBlockStartDate] = useState<Date | undefined>(new Date());
  const [blockEndDate, setBlockEndDate] = useState<Date | undefined>(new Date());
  const [repeatDaily, setRepeatDaily] = useState(true);
  const [onlyOpenDays, setOnlyOpenDays] = useState(true);

  useEffect(() => {
    fetchSlotsAndBlocks();
  }, [selectedDate, selectedBarberId]);

  const fetchSlotsAndBlocks = async () => {
    setIsLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      const { data, error } = await supabase.rpc('get_barbershop_available_slots', {
        p_day: dateStr,
        p_barber_id: selectedBarberId === "all" ? null : selectedBarberId,
        p_barbershop_id: null,
        p_duration_minutes: null
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (data.success === false) {
        toast.error(data.error);
        setIsLoading(false);
        return;
      }

      // Update settings from RPC response
      if (data.settings) {
        if (data.settings.opening_time) setOpeningTime(data.settings.opening_time.substring(0, 5));
        if (data.settings.closing_time) setClosingTime(data.settings.closing_time.substring(0, 5));
        if (data.settings.slot_interval_minutes) setSlotInterval(data.settings.slot_interval_minutes.toString());
      }

      setBarbers(data.barbers || []);
      setAvailableSlots((data.slots || []).sort((a: any, b: any) => a.starts_at.localeCompare(b.starts_at)));

      await fetchTimeBlocks(data.barbers || []);
    } catch (error: any) {
      toast.error("Erro ao carregar horários: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTimeBlocks = async (barbersList?: Barber[]) => {
    const currentBarbershopId = barbershopId || profile?.barbershop_id || null;
    if (!currentBarbershopId) {
      setTimeBlocks([]);
      return;
    }
    const { data, error } = await supabase.rpc('get_barbershop_time_blocks' as any, {
      p_barbershop_id: currentBarbershopId,
      p_day: null,
    });
    if (error) {
      console.error("Erro ao carregar bloqueios:", error);
      setTimeBlocks([]);
      return;
    }
    const list: any[] = Array.isArray(data) ? data : [];
    const source = barbersList && barbersList.length ? barbersList : barbers;
    const enriched = list.map((b: any) => ({
      id: b.id,
      start_date: b.start_date,
      end_date: b.end_date,
      start_time: String(b.start_time || "").substring(0, 5),
      end_time: String(b.end_time || "").substring(0, 5),
      reason: b.reason,
      barber_id: b.barber_id,
      barber_name: b.barber_id
        ? (b.barber_name || source.find(x => x.barber_id === b.barber_id)?.name || "Profissional")
        : "Todos os profissionais",
    }));
    setTimeBlocks(enriched);
  };

  const generateTimeOptions = () => {
    const options = [];
    const interval = parseInt(slotInterval) || 30;
    let current = new Date();
    current.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    while (isBefore(current, end)) {
      options.push(format(current, "HH:mm"));
      current = addMinutes(current, interval);
    }
    return options;
  };

  const handleCreateBlock = async () => {
    try {
      const currentBarbershopId =
        barbershopId || profile?.barbershop_id || null;
      if (!currentBarbershopId) {
        toast.error("Não foi possível identificar o estabelecimento atual");
        return;
      }
      if (!blockStartDate || !blockEndDate) {
        toast.error("Selecione a data inicial e final");
        return;
      }
      if (blockEndDate < blockStartDate) {
        toast.error("Data final deve ser igual ou após a inicial");
        return;
      }
      if (!blockStartTime) {
        toast.error("Selecione o horário de início");
        return;
      }
      if (!blockEndTime) {
        toast.error("Selecione o horário de fim");
        return;
      }

      const [startH, startM] = blockStartTime.split(":").map(Number);
      const [endH, endM] = blockEndTime.split(":").map(Number);
      
      if (endH < startH || (endH === startH && endM <= startM)) {
        toast.error("Horário de fim deve ser maior que o de início");
        return;
      }

      const startStr = format(blockStartDate, "yyyy-MM-dd");
      const endStr = format(blockEndDate, "yyyy-MM-dd");

      const { data, error } = await supabase.rpc('create_barbershop_time_block' as any, {
        p_start_date: startStr,
        p_end_date: endStr,
        p_start_time: blockStartTime,
        p_end_time: blockEndTime,
        p_barbershop_id: currentBarbershopId,
        p_barber_id: blockBarberId === "all" ? null : blockBarberId,
        p_repeat_daily: repeatDaily,
        p_only_open_days: onlyOpenDays,
        p_reason: blockReason || null,
      });

      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error);

      toast.success("Horário bloqueado!");
      setIsBlockModalOpen(false);
      setBlockReason("");
      await fetchSlotsAndBlocks();
      await fetchTimeBlocks();
    } catch (error: any) {
      toast.error("Erro ao bloquear: " + error.message);
    }
  };

  const handleStartTimeChange = (time: string) => {
    setBlockStartTime(time);
    const [h, m] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(h, m + (parseInt(slotInterval) || 30));
    setBlockEndTime(format(date, "HH:mm"));
  };

  const handleDeleteBlock = async (id: string) => {
    if (!confirm("Remover este bloqueio?")) return;
    try {
      const { error } = await supabase.rpc('delete_barbershop_time_block', {
        p_block_id: id
      });

      if (error) throw error;
      toast.success("Bloqueio removido");
      await fetchSlotsAndBlocks();
      await fetchTimeBlocks();
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  return (
    <div className="space-y-5 pb-10" style={{ fontFamily: "Poppins, sans-serif" }}>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-[#3157D5] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>
      <div className="flex flex-col gap-4">
        {/* Action Buttons */}
        <Button 
          variant="outline" 
          onClick={() => {
            setBlockStartDate(selectedDate);
            setBlockEndDate(selectedDate);
            setBlockStartTime("");
            setBlockEndTime("");
            setIsBlockModalOpen(true);
          }}
          className="bg-white border-[#DDE3EE] border-dashed text-[#64748B] hover:text-[#3157D5] hover:border-[#3157D5]/40"
        >
          <Lock className="w-4 h-4 mr-2" />
          Bloquear horário
        </Button>
      </div>

      {/* Available Slots List */}
      <div className="space-y-4">
        <h4 className="text-xs font-medium text-[#64748B]  tracking-[2px]">
          HORÁRIOS DISPONÍVEIS ({availableSlots.length})
        </h4>
        
        {isLoading ? (
          <div className="text-center py-10 text-[#64748B] text-xs ">Carregando...</div>
        ) : availableSlots.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-[#DDE3EE] rounded-[8px] text-sm text-[#64748B]">
            Nenhum horário disponível para esta data.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {availableSlots.map((slot, idx) => (
              <div key={idx} className="bg-white border border-[#DDE3EE] p-3 rounded-[8px] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-[#EAF0FF] p-2 rounded">
                    <Clock className="w-4 h-4 text-[#3157D5]" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#3157D5] ">{slot.time_label}</span>
                    <p className="text-[9px] text-[#64748B] ">{slot.barber_name}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-[9px] font-bold  text-[#3157D5] hover:bg-[#EAF0FF]"
                  onClick={() => {
                    setBlockBarberId(slot.barber_id);
                    setBlockStartTime(slot.time_label);
                    setBlockStartDate(selectedDate);
                    setBlockEndDate(selectedDate);
                    
                    const [startH, startM] = slot.time_label.split(":").map(Number);
                    const end = new Date();
                    end.setHours(startH, startM + parseInt(slotInterval));
                    setBlockEndTime(format(end, "HH:mm"));
                    setIsBlockModalOpen(true);
                  }}
                >
                  Bloquear
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blocked Slots Section */}
      {timeBlocks.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[#DDE3EE]">
          <h4 className="text-xs font-medium text-[#64748B]  tracking-[2px]">
            BLOQUEIOS DO DIA ({timeBlocks.length})
          </h4>
          <div className="space-y-2">
            {timeBlocks.map((block) => (
              <div key={block.id} className="bg-white border border-[#FDECEC] p-3 rounded-[8px] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FDECEC] p-2 rounded">
                    <Lock className="w-4 h-4 text-[#DC2626]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-[#DC2626] ">
                      {new Date(block.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })} - {new Date(block.ends_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                    </span>
                    <p className="text-[9px] text-[#64748B] ">
                      {block.barber_name} {block.reason ? `• ${block.reason}` : ""}
                    </p>
                  </div>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => handleDeleteBlock(block.id)}
                  className="text-[#64748B] hover:text-[#DC2626]"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block Modal */}
      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
        <DialogContent className="bg-white border-[#DDE3EE] text-[#172033] max-w-[350px] p-0 overflow-hidden rounded-[8px]">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="  text-[#3157D5] text-lg">Bloquear HORÁRIO</DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#64748B] ">Profissional</label>
              <Select value={blockBarberId} onValueChange={setBlockBarberId}>
                <SelectTrigger className="bg-white border-[#DDE3EE] h-11 text-xs">
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#DDE3EE] text-[#172033]">
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {barbers.map(b => (
                    <SelectItem key={b.barber_id} value={b.barber_id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#64748B]">Data inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-white border-[#DDE3EE] h-11 text-xs text-[#172033]",
                        !blockStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-[#3157D5]" />
                      {blockStartDate ? format(blockStartDate, "dd/MM/yyyy") : <span>Início</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[310px] p-4 bg-white border-[#DDE3EE] shadow-2xl rounded-lg" align="start">
                    <Calendar
                      mode="single"
                      selected={blockStartDate}
                      onSelect={(date) => {
                        if (!date) return;
                        setBlockStartDate(date);
                        if (!blockEndDate || blockEndDate < date) setBlockEndDate(date);
                      }}
                      className="p-0 pointer-events-auto"
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#64748B]">Data final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-white border-[#DDE3EE] h-11 text-xs text-[#172033]",
                        !blockEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-[#3157D5]" />
                      {blockEndDate ? format(blockEndDate, "dd/MM/yyyy") : <span>Fim</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[310px] p-4 bg-white border-[#DDE3EE] shadow-2xl rounded-lg" align="start">
                    <Calendar
                      mode="single"
                      selected={blockEndDate}
                      onSelect={(date) => date && setBlockEndDate(date)}
                      className="p-0 pointer-events-auto"
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TimePicker 
                label="Início" 
                value={blockStartTime} 
                onChange={handleStartTimeChange} 
                minutesStep={5}
              />
              <TimePicker 
                label="Fim" 
                value={blockEndTime} 
                onChange={setBlockEndTime} 
                minutesStep={5}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#64748B] ">Motivo (Opcional)</label>
              <Input 
                placeholder="Ex: Almoço, Manutenção" 
                value={blockReason} 
                onChange={e => setBlockReason(e.target.value)} 
                className="bg-white border-[#DDE3EE] h-11 text-xs focus-visible:ring-[#3157D5]/15" 
              />
            </div>

            <label className="flex items-start gap-2 text-xs text-[#172033] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={repeatDaily}
                onChange={(e) => setRepeatDaily(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#DDE3EE] text-[#3157D5] focus:ring-[#3157D5]"
              />
              <span>Bloquear este mesmo horário durante todo o período</span>
            </label>
            <label className="flex items-start gap-2 text-xs text-[#172033] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyOpenDays}
                onChange={(e) => setOnlyOpenDays(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#DDE3EE] text-[#3157D5] focus:ring-[#3157D5]"
              />
              <span>Aplicar somente nos dias em que o estabelecimento abre</span>
            </label>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsBlockModalOpen(false)}
                className="bg-transparent border-[#DDE3EE] text-[#64748B] hover:bg-white font-bold   tracking-widest h-11"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateBlock} 
                className="bg-[#3157D5] text-white hover:bg-[#274ac0] font-semibold rounded-[8px] h-11"
              >
                Bloquear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
