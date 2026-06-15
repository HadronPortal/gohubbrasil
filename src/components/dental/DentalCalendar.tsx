import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const HOURS = Array.from({ length: 14 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`);

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday=0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function DentalCalendar() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const shift = (delta: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  };

  const monthLabel = weekStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded hover:bg-slate-50"
          >
            Hoje
          </button>
          <button onClick={() => shift(-1)} className="p-1.5 border border-slate-300 rounded hover:bg-slate-50">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => shift(1)} className="p-1.5 border border-slate-300 rounded hover:bg-slate-50">
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-slate-700 capitalize ml-2">{monthLabel}</span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <button className="px-3 py-1.5 border border-slate-300 rounded-l hover:bg-slate-50">Dia</button>
          <button className="px-3 py-1.5 border-y border-r border-slate-300 bg-blue-50 text-blue-700 font-medium">Semana</button>
          <button className="px-3 py-1.5 border-y border-r border-slate-300 rounded-r hover:bg-slate-50">Mês</button>
        </div>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-280px)]">
        <div className="grid" style={{ gridTemplateColumns: "70px repeat(7, 1fr)" }}>
          <div className="bg-slate-50 border-b border-r border-slate-200 h-14" />
          {days.map((d, i) => {
            const isToday = d.getTime() === today.getTime();
            return (
              <div
                key={i}
                className={`border-b border-r border-slate-200 px-3 py-2 text-center ${
                  isToday ? "bg-blue-50" : "bg-slate-50"
                }`}
              >
                <div className={`text-xs uppercase ${isToday ? "text-blue-700" : "text-slate-500"}`}>
                  {DAYS[i].slice(0, 3)}
                </div>
                <div className={`text-lg font-semibold ${isToday ? "text-blue-700" : "text-slate-800"}`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}

          {HOURS.map((h) => (
            <>
              <div key={`h-${h}`} className="border-b border-r border-slate-200 px-2 py-1 text-xs text-slate-500 text-right h-16">
                {h}
              </div>
              {days.map((d, i) => {
                const isToday = d.getTime() === today.getTime();
                return (
                  <div
                    key={`${h}-${i}`}
                    className={`border-b border-r border-slate-200 h-16 hover:bg-blue-50/40 cursor-pointer ${
                      isToday ? "bg-blue-50/30" : ""
                    }`}
                  />
                );
              })}
            </>
          ))}
        </div>
      </div>

      <button
        className="absolute bottom-6 right-6 h-14 w-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg flex items-center justify-center"
        aria-label="Nova consulta"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}