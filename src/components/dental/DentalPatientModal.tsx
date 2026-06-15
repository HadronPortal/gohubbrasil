import { useState } from "react";
import { Calendar, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { DentalPatient } from "./DentalPatientsTable";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (p: DentalPatient) => void;
}

const inputCls =
  "w-full h-10 px-3 rounded border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-xs text-slate-600 mb-1 block">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
  );
}

export function DentalPatientModal({ open, onOpenChange, onSave }: Props) {
  const [name, setName] = useState("");
  const [sex, setSex] = useState("M");
  const [foreign, setForeign] = useState(false);
  const [birth, setBirth] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [phone, setPhone] = useState("");
  const [origin, setOrigin] = useState("");
  const [tags, setTags] = useState("");

  const [respName, setRespName] = useState("");
  const [respBirth, setRespBirth] = useState("");
  const [respCpf, setRespCpf] = useState("");
  const [respPhone, setRespPhone] = useState("");
  const [obs, setObs] = useState("");

  function reset() {
    setName(""); setSex("M"); setForeign(false); setBirth(""); setCpf("");
    setRg(""); setPhone(""); setOrigin(""); setTags("");
    setRespName(""); setRespBirth(""); setRespCpf(""); setRespPhone(""); setObs("");
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Informe o nome do paciente.");
      return;
    }
    onSave({
      id: crypto.randomUUID(),
      name: name.trim(),
      cpf: cpf || undefined,
      phone: phone || "—",
    });
    toast.success("Paciente cadastrado com sucesso.");
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-blue-700 text-lg">Dados do paciente</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <FieldLabel required>Nome do paciente</FieldLabel>
            <Input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Sexo</FieldLabel>
              <div className="flex items-center gap-5 h-10">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" name="sex" checked={sex === "M"} onChange={() => setSex("M")} />
                  Masculino
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="radio" name="sex" checked={sex === "F"} onChange={() => setSex("F")} />
                  Feminino
                </label>
              </div>
            </div>
            <div>
              <FieldLabel>Paciente estrangeiro</FieldLabel>
              <button
                type="button"
                onClick={() => setForeign(!foreign)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${foreign ? "bg-blue-600" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${foreign ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <FieldLabel>Data de nascimento</FieldLabel>
              <div className="relative">
                <Input type="date" className={inputCls} value={birth} onChange={(e) => setBirth(e.target.value)} />
                <Calendar className="h-4 w-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <FieldLabel>CPF</FieldLabel>
              <Input className={inputCls} value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div>
              <FieldLabel>RG</FieldLabel>
              <Input className={inputCls} value={rg} onChange={(e) => setRg(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Celular do paciente</FieldLabel>
              <div className="flex">
                <span className="inline-flex items-center gap-1 px-3 h-10 border border-r-0 border-slate-300 rounded-l bg-slate-50 text-sm text-slate-700">
                  🇧🇷 +55
                </span>
                <Input
                  className={`${inputCls} rounded-l-none`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div>
              <FieldLabel>Como o paciente chegou na clínica</FieldLabel>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger className="h-10 bg-white border-slate-300 text-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <FieldLabel>Etiquetas</FieldLabel>
            <div className="relative">
              <Input
                className={`${inputCls} pl-9`}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Adicionar etiquetas"
              />
              <Tag className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <h3 className="text-blue-700 font-medium text-base mt-4 mb-3">Dados do responsável</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel>Nome do responsável</FieldLabel>
                <Input className={inputCls} value={respName} onChange={(e) => setRespName(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Data de nascimento do responsável</FieldLabel>
                <Input type="date" className={inputCls} value={respBirth} onChange={(e) => setRespBirth(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <FieldLabel>CPF</FieldLabel>
                <Input className={inputCls} value={respCpf} onChange={(e) => setRespCpf(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Celular do responsável</FieldLabel>
                <Input className={inputCls} value={respPhone} onChange={(e) => setRespPhone(e.target.value)} />
              </div>
            </div>

            <div className="mt-4">
              <FieldLabel>Observação</FieldLabel>
              <Textarea
                className="min-h-[100px] bg-white border-slate-300 text-sm"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 pt-4">
          <button
            onClick={() => { reset(); onOpenChange(false); }}
            className="px-5 h-10 rounded text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            FECHAR
          </button>
          <button
            onClick={handleSave}
            className="px-6 h-10 rounded text-sm font-medium bg-green-500 hover:bg-green-600 text-white"
          >
            SALVAR
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}