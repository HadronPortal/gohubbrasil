import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfDay, addMinutes, isBefore, isAfter, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Clock, Lock, Settings, Trash2, ArrowLeft, User } from "lucide-react";
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
}

interface Barber {
  barber_id: string;
  name: string;
}

interface TimeBlock {
  id: string;
  starts_at: string;
  ends_at: string;
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

export default function FreeSlotsView({ barbershopId, onBack }: FreeSlotsViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBarberId, setSelectedBarberId] = useState<string>("all");
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
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
  const [blockDate, setBlockDate] = useState<Date | undefined>(new Date());

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
      
      const enrichedBlocks = (data.blocks || []).map((block: any) => ({
        ...block,
        barber_name: block.barber_id 
          ? data.barbers?.find((b: any) => b.barber_id === block.barber_id)?.name || "Barbeiro" 
          : "Todos"
      }));
      setTimeBlocks(enrichedBlocks);
    } catch (error: any) {
      toast.error("Erro ao carregar horários: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const { error } = await supabase.rpc('update_barbershop_schedule_settings', {
        p_opening_time: openingTime,
        p_closing_time: closingTime,
        p_slot_interval_minutes: parseInt(slotInterval)
      });

      if (error) throw error;
      toast.success("Configurações salvas!");
      setIsConfigModalOpen(false);
      fetchSlotsAndBlocks();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
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
      if (!blockDate) {
        toast.error("Selecione a data");
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

      const dateStr = format(blockDate, "yyyy-MM-dd");
      
      const { data, error } = await supabase.rpc('create_barbershop_time_block_local', {
        p_day: dateStr,
        p_start_time: blockStartTime,
        p_end_time: blockEndTime,
        p_reason: blockReason || null,
        p_barber_id: blockBarberId === "all" ? null : blockBarberId,
        p_barbershop_id: null
      });

      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error);

      toast.success("Horário bloqueado!");
      setIsBlockModalOpen(false);
      setBlockReason("");
      fetchSlotsAndBlocks();
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
      fetchSlotsAndBlocks();
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-[#8a9ab5] hover:text-[#f0c040]">
          <ArrowLeft className="w-4 h-4 mr-2" />
          VOLTAR
        </Button>
        <h3 className="text-xs font-bold tracking-[0.25em] text-[#f0c040] font-oswald uppercase">
          HORÁRIOS LIVRES
        </h3>
      </div>

      <div className="flex flex-col gap-4">
        {/* Selectors */}
        <div className="grid grid-cols-2 gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-[#141b2a] border-[#2a3347] h-12 text-[#c8d4e8]",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>Selecione a data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[310px] p-4 bg-[#141b2a] border-[#2a3347] shadow-2xl rounded-lg" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="p-0"
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Select value={selectedBarberId} onValueChange={setSelectedBarberId}>
            <SelectTrigger className="bg-[#141b2a] border-[#2a3347] h-12 text-[#c8d4e8]">
              <SelectValue placeholder="Barbeiro" />
            </SelectTrigger>
            <SelectContent className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8]">
              <SelectItem value="all">Todos os Barbeiros</SelectItem>
              {barbers.map(b => (
                <SelectItem key={b.barber_id} value={b.barber_id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              setBlockDate(selectedDate);
              setBlockStartTime("");
              setBlockEndTime("");
              setIsBlockModalOpen(true);
            }}
            className="bg-[#141b2a] border-[#2a3347] border-dashed text-[#8a9ab5] hover:text-[#f0c040] hover:border-[#f0c040]"
          >
            <Lock className="w-4 h-4 mr-2" />
            BLOQUEAR
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsConfigModalOpen(true)}
            className="bg-[#141b2a] border-[#2a3347] border-dashed text-[#8a9ab5] hover:text-[#f0c040] hover:border-[#f0c040]"
          >
            <Settings className="w-4 h-4 mr-2" />
            CONFIGURAR
          </Button>
        </div>
      </div>

      {/* Available Slots List */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-[2px]">
          HORÁRIOS DISPONÍVEIS ({availableSlots.length})
        </h4>
        
        {isLoading ? (
          <div className="text-center py-10 text-[#8a9ab5] text-xs uppercase tracking-widest">Carregando...</div>
        ) : availableSlots.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-[#2a3347] rounded-[4px] text-sm text-[#8a9ab5]">
            Nenhum horário disponível para esta data.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {availableSlots.map((slot, idx) => (
              <div key={idx} className="bg-[#141b2a] border border-[#2a3347] p-3 rounded-[4px] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-[#f0c040]/10 p-2 rounded">
                    <Clock className="w-4 h-4 text-[#f0c040]" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#f0c040] font-oswald">{slot.time_label}</span>
                    <p className="text-[9px] text-[#8a9ab5] uppercase tracking-widest">{slot.barber_name}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-[9px] font-bold uppercase tracking-widest text-[#f0c040] hover:bg-[#f0c040]/10"
                  onClick={() => {
                    setBlockBarberId(slot.barber_id);
                    setBlockStartTime(slot.time_label);
                    setBlockDate(selectedDate);
                    
                    const [startH, startM] = slot.time_label.split(":").map(Number);
                    const end = new Date();
                    end.setHours(startH, startM + parseInt(slotInterval));
                    setBlockEndTime(format(end, "HH:mm"));
                    setIsBlockModalOpen(true);
                  }}
                >
                  BLOQUEAR
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Blocked Slots Section */}
      {timeBlocks.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[#2a3347]">
          <h4 className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-[2px]">
            BLOQUEIOS DO DIA ({timeBlocks.length})
          </h4>
          <div className="space-y-2">
            {timeBlocks.map((block) => (
              <div key={block.id} className="bg-[#1c2333] border border-red-900/30 p-3 rounded-[4px] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-red-500/10 p-2 rounded">
                    <Lock className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-red-500 uppercase tracking-widest">
                      {new Date(block.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })} - {new Date(block.ends_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                    </span>
                    <p className="text-[9px] text-[#8a9ab5] uppercase tracking-widest">
                      {block.barber_name} {block.reason ? `• ${block.reason}` : ""}
                    </p>
                  </div>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => handleDeleteBlock(block.id)}
                  className="text-[#8a9ab5] hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config Modal */}
      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8] max-w-[350px]">
          <DialogHeader>
            <DialogTitle className="font-oswald uppercase tracking-widest text-[#f0c040]">CONFIGURAR HORÁRIOS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">Abertura</label>
              <Input type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)} className="bg-[#141b2a] border-[#2a3347]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">Fechamento</label>
              <Input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} className="bg-[#141b2a] border-[#2a3347]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">Intervalo (minutos)</label>
              <Select value={slotInterval} onValueChange={setSlotInterval}>
                <SelectTrigger className="bg-[#141b2a] border-[#2a3347]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8]">
                  {[10, 15, 20, 30, 45, 60, 90, 120].map(val => (
                    <SelectItem key={val} value={val.toString()}>{val} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveConfig} className="w-full bg-[#f0c040] text-[#1c2333] hover:bg-[#d4a935] font-bold uppercase font-oswald tracking-widest">
              SALVAR CONFIGURAÇÕES
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Modal */}
      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
        <DialogContent className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8] max-w-[350px] p-0 overflow-hidden rounded-[8px]">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="font-oswald uppercase tracking-widest text-[#f0c040] text-lg">BLOQUEAR HORÁRIO</DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">Barbeiro</label>
              <Select value={blockBarberId} onValueChange={setBlockBarberId}>
                <SelectTrigger className="bg-[#141b2a] border-[#2a3347] h-11 text-xs">
                  <SelectValue placeholder="Selecione o barbeiro" />
                </SelectTrigger>
                <SelectContent className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8]">
                  <SelectItem value="all">Todos os Barbeiros</SelectItem>
                  {barbers.map(b => (
                    <SelectItem key={b.barber_id} value={b.barber_id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">Data</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-[#141b2a] border-[#2a3347] h-11 text-xs text-[#c8d4e8]",
                      !blockDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-[#f0c040]" />
                    {blockDate ? format(blockDate, "dd/MM/yyyy") : <span>Selecione a data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[310px] p-4 bg-[#141b2a] border-[#2a3347] shadow-2xl rounded-lg" align="start">
                  <Calendar
                    mode="single"
                    selected={blockDate}
                    onSelect={(date) => date && setBlockDate(date)}
                    className="p-0"
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">Início</label>
                <Select value={blockStartTime} onValueChange={handleStartTimeChange}>
                  <SelectTrigger className="bg-[#141b2a] border-[#2a3347] h-11 text-xs">
                    <SelectValue placeholder="Início" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8] max-h-[200px]">
                    {generateTimeOptions().map(time => (
                      <SelectItem key={`start-${time}`} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">Fim</label>
                <Select value={blockEndTime} onValueChange={setBlockEndTime}>
                  <SelectTrigger className="bg-[#141b2a] border-[#2a3347] h-11 text-xs">
                    <SelectValue placeholder="Fim" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8] max-h-[200px]">
                    {generateTimeOptions().map(time => (
                      <SelectItem key={`end-${time}`} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-wider">Motivo (Opcional)</label>
              <Input 
                placeholder="Ex: Almoço, Manutenção" 
                value={blockReason} 
                onChange={e => setBlockReason(e.target.value)} 
                className="bg-[#141b2a] border-[#2a3347] h-11 text-xs focus-visible:ring-[#f0c040]/30" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsBlockModalOpen(false)}
                className="bg-transparent border-[#2a3347] text-[#8a9ab5] hover:bg-[#141b2a] font-bold uppercase font-oswald tracking-widest h-11"
              >
                CANCELAR
              </Button>
              <Button 
                onClick={handleCreateBlock} 
                className="bg-[#f0c040] text-[#1c2333] hover:bg-[#d4a935] font-bold uppercase font-oswald tracking-widest h-11"
              >
                BLOQUEAR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
