import { useMemo, useState } from "react";
import { Search, Download, Plus } from "lucide-react";
import { DentalSidebar } from "@/components/dental/DentalSidebar";
import { DentalTopbar } from "@/components/dental/DentalTopbar";
import {
  DentalPatientsTable,
  type DentalPatient,
} from "@/components/dental/DentalPatientsTable";
import { DentalPatientModal } from "@/components/dental/DentalPatientModal";

const initialPatients: DentalPatient[] = [
  {
    id: "1",
    name: "Paciente teste",
    phone: "+55 16 99314 9388",
  },
];

export default function DentalPatients() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DentalPatient | null>(null);
  const [patients, setPatients] = useState<DentalPatient[]>(initialPatients);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.cpf || "").toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q),
    );
  }, [patients, query]);

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <DentalSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DentalTopbar />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-2xl font-semibold text-slate-800">Pacientes</h1>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-2 h-10 px-4 rounded text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50">
                  <Download className="h-4 w-4" />
                  EXPORTAR
                </button>
                <button
                  onClick={() => { setEditing(null); setOpen(true); }}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded text-sm font-medium bg-green-500 hover:bg-green-600 text-white"
                >
                  <Plus className="h-4 w-4" />
                  NOVO PACIENTE
                </button>
              </div>
            </div>

            <div className="relative mb-5">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite o nome do paciente, CPF, celular do paciente..."
                className="w-full h-10 pl-10 pr-4 rounded border border-slate-300 bg-white text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <DentalPatientsTable
              patients={filtered}
              onEdit={(p) => { setEditing(p); setOpen(true); }}
            />

            <div className="mt-8 max-w-md mx-auto text-center bg-white border border-slate-200 rounded-md p-5">
              <p className="text-slate-800 font-medium mb-1">Migração simplificada</p>
              <p className="text-slate-600 text-sm">
                Já usa um sistema e gostaria de migrar seus dados?{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  Clique aqui e saiba mais!
                </a>
              </p>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              Dúvidas?{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Saiba tudo sobre Ficha do paciente
              </a>
            </p>
          </div>
        </main>
      </div>

      <DentalPatientModal
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}
        patient={editing}
        onSave={(p) =>
          setPatients((prev) =>
            editing
              ? prev.map((x) => (x.id === p.id ? p : x))
              : [p, ...prev],
          )
        }
      />
    </div>
  );
}