import { Check, Gift, X } from "lucide-react";
import { useState } from "react";

const STEPS = [
  { label: "Confirme o nome da sua clínica", done: false },
  { label: "Veja e/ou cadastre sua equipe", done: false },
  { label: "Cadastre um paciente", done: false },
  { label: "Crie um orçamento", done: false },
  { label: "Emita um receituário", done: false },
  { label: "Agende uma consulta", done: false },
];

export function DentalOnboardingCard() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const done = STEPS.filter((s) => s.done).length;
  const pct = Math.round((done / STEPS.length) * 100);

  return (
    <div className="fixed bottom-6 left-64 z-20 w-80 bg-white rounded-lg shadow-xl border border-slate-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-amber-500" />
          <span className="font-semibold text-sm text-slate-800">Comece aqui e ganhe um prêmio!</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>Progresso</span>
          <span className="font-medium">{pct}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <ul className="mt-3 space-y-2">
          {STEPS.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
              <span
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                  s.done ? "bg-green-500 border-green-500" : "border-slate-300"
                }`}
              >
                {s.done && <Check className="h-3 w-3 text-white" />}
              </span>
              <span className={s.done ? "line-through text-slate-400" : ""}>{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}