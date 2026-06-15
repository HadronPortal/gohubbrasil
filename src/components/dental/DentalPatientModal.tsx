import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import type { DentalPatient } from "./DentalPatientsTable";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (p: DentalPatient) => void;
  patient?: DentalPatient | null;
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

export function DentalPatientModal({ open, onOpenChange, onSave, patient }: Props) {
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

  // Tabs
  const [tab, setTab] = useState<"info" | "plan" | "addr">("info");

  // Informações adicionais
  const [email, setEmail] = useState("");
  const [phone2, setPhone2] = useState("");
  const [patientNumber, setPatientNumber] = useState("");
  const [recordNumber, setRecordNumber] = useState("");
  const [profession, setProfession] = useState("");
  const [social, setSocial] = useState("");

  // Plano
  const [planName, setPlanName] = useState("Particular");
  const [insCard, setInsCard] = useState("");
  const [insHolder, setInsHolder] = useState("");
  const [insRespCpf, setInsRespCpf] = useState("");

  // Endereço
  const [zip, setZip] = useState("");
  const [street, setStreet] = useState("");
  const [addrNumber, setAddrNumber] = useState("");
  const [addrComplement, setAddrComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");

  const [saving, setSaving] = useState(false);

  function reset() {
    setName(""); setSex("M"); setForeign(false); setBirth(""); setCpf("");
    setRg(""); setPhone(""); setOrigin(""); setTags("");
    setRespName(""); setRespBirth(""); setRespCpf(""); setRespPhone(""); setObs("");
    setTab("info");
    setEmail(""); setPhone2(""); setPatientNumber(""); setRecordNumber("");
    setProfession(""); setSocial("");
    setPlanName("Particular"); setInsCard(""); setInsHolder(""); setInsRespCpf("");
    setZip(""); setStreet(""); setAddrNumber(""); setAddrComplement("");
    setNeighborhood(""); setCity(""); setStateUf("");
  }

  useEffect(() => {
    if (open && patient) {
      setName(patient.name || "");
      setCpf(patient.cpf || "");
      setPhone((patient.phone && patient.phone !== "—" ? patient.phone : "") || "");
      setEmail(patient.email || "");
      setPhone2(patient.phone_secondary || "");
      setPatientNumber(patient.patient_number || "");
      setRecordNumber(patient.record_number || "");
      setProfession(patient.profession || "");
      setSocial(patient.social_network || "");
      setPlanName(patient.plan_name || "Particular");
      setInsCard(patient.insurance_card_number || "");
      setInsHolder(patient.insurance_holder || "");
      setInsRespCpf(patient.insurance_responsible_cpf || "");
      setZip(patient.zip_code || "");
      setStreet(patient.street || "");
      setAddrNumber(patient.address_number || "");
      setAddrComplement(patient.address_complement || "");
      setNeighborhood(patient.neighborhood || "");
      setCity(patient.city || "");
      setStateUf(patient.state || "");
    }
    if (open && !patient) reset();
  }, [open, patient]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Informe o nome do paciente.");
      return;
    }
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        toast.error("Você precisa estar logado.");
        setSaving(false);
        return;
      }
      const payload: any = {
        owner_id: uid,
        name: name.trim(),
        cpf: cpf || null,
        phone: phone || null,
        email: email || null,
        phone_secondary: phone2 || null,
        patient_number: patientNumber || null,
        record_number: recordNumber || null,
        profession: profession || null,
        social_network: social || null,
        plan_name: planName || "Particular",
        insurance_card_number: insCard || null,
        insurance_holder: insHolder || null,
        insurance_responsible_cpf: insRespCpf || null,
        zip_code: zip || null,
        street: street || null,
        address_number: addrNumber || null,
        address_complement: addrComplement || null,
        neighborhood: neighborhood || null,
        city: city || null,
        state: stateUf || null,
      };

      let saved: any;
      if (patient?.id) {
        const { data, error } = await (supabase as any)
          .from("dental_patients")
          .update(payload)
          .eq("id", patient.id)
          .select()
          .single();
        if (error) throw error;
        saved = data;
      } else {
        const { data, error } = await (supabase as any)
          .from("dental_patients")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        saved = data;
      }

      onSave({
        id: saved.id,
        name: saved.name,
        cpf: saved.cpf || undefined,
        phone: saved.phone || "—",
        chart: patient?.chart,
        age: patient?.age,
        email: saved.email || undefined,
        phone_secondary: saved.phone_secondary || undefined,
        patient_number: saved.patient_number || undefined,
        record_number: saved.record_number || undefined,
        profession: saved.profession || undefined,
        social_network: saved.social_network || undefined,
        plan_name: saved.plan_name || undefined,
        insurance_card_number: saved.insurance_card_number || undefined,
        insurance_holder: saved.insurance_holder || undefined,
        insurance_responsible_cpf: saved.insurance_responsible_cpf || undefined,
        zip_code: saved.zip_code || undefined,
        street: saved.street || undefined,
        address_number: saved.address_number || undefined,
        address_complement: saved.address_complement || undefined,
        neighborhood: saved.neighborhood || undefined,
        city: saved.city || undefined,
        state: saved.state || undefined,
      });
      toast.success(patient ? "Paciente atualizado com sucesso." : "Paciente cadastrado com sucesso.");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar paciente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="text-blue-700 text-lg">
            {patient ? "Editar paciente" : "Dados do paciente"}
          </DialogTitle>
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

          {/* Tabs: Informações adicionais / Plano / Endereço */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center gap-6 border-b border-slate-200 mt-2">
              {[
                { id: "info", label: "INFORMAÇÕES ADICIONAIS" },
                { id: "plan", label: "PLANO" },
                { id: "addr", label: "ENDEREÇO" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id as any)}
                  className={`relative px-1 py-3 text-xs font-semibold tracking-wide transition-colors ${
                    tab === t.id ? "text-blue-600" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.label}
                  {tab === t.id && (
                    <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-blue-600 rounded-t" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-5">
              {tab === "info" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>E-mail</FieldLabel>
                    <Input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Telefone</FieldLabel>
                    <Input className={inputCls} value={phone2} onChange={(e) => setPhone2(e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Número do paciente</FieldLabel>
                    <Input className={inputCls} value={patientNumber} onChange={(e) => setPatientNumber(e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Número de prontuário</FieldLabel>
                    <Input className={inputCls} value={recordNumber} onChange={(e) => setRecordNumber(e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Profissão</FieldLabel>
                    <Input className={inputCls} value={profession} onChange={(e) => setProfession(e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Rede Social</FieldLabel>
                    <Input className={inputCls} value={social} onChange={(e) => setSocial(e.target.value)} />
                  </div>
                </div>
              )}

              {tab === "plan" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel>Plano</FieldLabel>
                    <Input className={inputCls} value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Particular" />
                  </div>
                  <div>
                    <FieldLabel>Número da carteirinha</FieldLabel>
                    <Input className={inputCls} value={insCard} onChange={(e) => setInsCard(e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>Titular do plano</FieldLabel>
                    <Input className={inputCls} value={insHolder} onChange={(e) => setInsHolder(e.target.value)} />
                  </div>
                  <div>
                    <FieldLabel>CPF do responsável</FieldLabel>
                    <Input className={inputCls} value={insRespCpf} onChange={(e) => setInsRespCpf(e.target.value)} />
                  </div>
                </div>
              )}

              {tab === "addr" && (
                <div className="grid grid-cols-6 gap-4">
                  <div className="col-span-2">
                    <FieldLabel>CEP</FieldLabel>
                    <Input className={inputCls} value={zip} onChange={(e) => setZip(e.target.value)} placeholder="00000-000" />
                  </div>
                  <div className="col-span-3">
                    <FieldLabel>Rua</FieldLabel>
                    <Input className={inputCls} value={street} onChange={(e) => setStreet(e.target.value)} />
                  </div>
                  <div className="col-span-1">
                    <FieldLabel>Número</FieldLabel>
                    <Input className={inputCls} value={addrNumber} onChange={(e) => setAddrNumber(e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <FieldLabel>Complemento</FieldLabel>
                    <Input className={inputCls} value={addrComplement} onChange={(e) => setAddrComplement(e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <FieldLabel>Bairro</FieldLabel>
                    <Input className={inputCls} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
                  </div>
                  <div className="col-span-4">
                    <FieldLabel>Cidade</FieldLabel>
                    <Input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <FieldLabel>Estado</FieldLabel>
                    <Input className={inputCls} value={stateUf} onChange={(e) => setStateUf(e.target.value)} placeholder="UF" maxLength={2} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 pt-4">
          <button
            onClick={() => { reset(); onOpenChange(false); }}
            disabled={saving}
            className="px-5 h-10 rounded text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            FECHAR
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 h-10 rounded text-sm font-medium bg-green-500 hover:bg-green-600 text-white"
          >
            {saving ? "SALVANDO..." : "SALVAR"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}