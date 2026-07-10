import * as React from "react";
import { Clock, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  label?: string;
  minutesStep?: number;
}

export function TimePicker({ value, onChange, label, minutesStep = 15 }: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempHour, setTempHour] = React.useState("09");
  const [tempMinute, setTempMinute] = React.useState("00");

  React.useEffect(() => {
    if (value && value.includes(":")) {
      const [h, m] = value.split(":");
      setTempHour(h);
      setTempMinute(m);
    }
  }, [value, isOpen]);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = Array.from({ length: 60 / minutesStep }, (_, i) => (i * minutesStep).toString().padStart(2, "0"));

  const handleConfirm = () => {
    onChange(`${tempHour}:${tempMinute}`);
    setIsOpen(false);
  };

  return (
    <>
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="text-xs font-medium text-[#64748B]">
            {label}
          </label>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsOpen(true)}
          className="w-full justify-start text-left font-normal bg-white border-[#DDE3EE] h-11 text-[#172033] hover:bg-[#F6F7FB] hover:border-[#3157D5]/40 rounded-[8px]"
        >
          <Clock className="mr-2 h-4 w-4 text-[#3157D5]" />
          <span className="text-sm font-semibold">{value || "--:--"}</span>
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-white border-[#DDE3EE] text-[#172033] p-0 overflow-hidden w-[calc(100vw-24px)] max-w-[340px] rounded-[12px]">
          <DialogHeader className="p-4 border-b border-[#DDE3EE] flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-[#3157D5] text-sm font-semibold">
              Selecionar horário
            </DialogTitle>
            <button onClick={() => setIsOpen(false)} className="text-[#64748B] hover:text-[#172033]">
              <X className="w-4 h-4" />
            </button>
          </DialogHeader>

          <div className="p-4 flex gap-4 justify-center items-center h-[260px]">
            {/* Hours Column */}
            <div className="flex-1 flex flex-col items-center min-w-0">
              <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">Hora</span>
              <div className="w-full overflow-y-auto h-[200px] no-scrollbar flex flex-col gap-1 pr-1">
                {hours.map((h) => (
                  <button
                    key={h}
                    onClick={() => setTempHour(h)}
                    className={cn(
                      "py-2 px-3 text-center rounded-[8px] text-base transition-all",
                      tempHour === h
                        ? "bg-[#3157D5] text-white font-bold"
                        : "text-[#172033] hover:bg-[#EAF0FF] hover:text-[#3157D5]"
                    )}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-2xl text-[#3157D5] font-bold mb-[-20px]">:</span>

            {/* Minutes Column */}
            <div className="flex-1 flex flex-col items-center min-w-0">
              <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">Min</span>
              <div className="w-full overflow-y-auto h-[200px] no-scrollbar flex flex-col gap-1 pl-1">
                {minutes.map((m) => (
                  <button
                    key={m}
                    onClick={() => setTempMinute(m)}
                    className={cn(
                      "py-2 px-3 text-center rounded-[8px] text-base transition-all",
                      tempMinute === m
                        ? "bg-[#3157D5] text-white font-bold"
                        : "text-[#172033] hover:bg-[#EAF0FF] hover:text-[#3157D5]"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 bg-[#F6F7FB] border-t border-[#DDE3EE] flex flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1 bg-white border-[#DDE3EE] text-[#64748B] hover:bg-[#F6F7FB] hover:text-[#172033] h-11 text-sm font-semibold rounded-[8px]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-[#3157D5] text-white hover:bg-[#274ac0] h-11 text-sm font-semibold rounded-[8px]"
            >
              <Check className="w-4 h-4 mr-1" /> Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
