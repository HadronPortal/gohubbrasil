import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export type AddressData = {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

export const emptyAddress: AddressData = {
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
};

export function composeAddress(a: AddressData): string {
  const line1 = [a.street, a.number].filter(Boolean).join(", ");
  const line2 = [a.neighborhood, [a.city, a.state].filter(Boolean).join("/")]
    .filter(Boolean)
    .join(" - ");
  const parts = [line1, a.complement, line2, a.cep ? `CEP ${a.cep}` : ""].filter(Boolean);
  return parts.join(" - ");
}

function maskCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
}

const inputClass =
  "h-11 rounded-[8px] border-[#DDE3EE] bg-white text-[#172033] placeholder:text-[#94A3B8] focus-visible:border-[#3157D5] focus-visible:ring-2 focus-visible:ring-[#3157D5]/15 focus-visible:ring-offset-0";
const labelClass = "text-xs font-medium text-[#172033]";

export function AddressFields({
  value,
  onChange,
  idPrefix = "addr",
}: {
  value: AddressData;
  onChange: (v: AddressData) => void;
  idPrefix?: string;
}) {
  const [loading, setLoading] = useState(false);

  const set = (patch: Partial<AddressData>) => onChange({ ...value, ...patch });

  const lookupCep = async (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data?.erro) {
        toast.error("CEP não encontrado");
        return;
      }
      onChange({
        ...value,
        cep: maskCep(digits),
        street: data.logradouro || value.street,
        neighborhood: data.bairro || value.neighborhood,
        city: data.localidade || value.city,
        state: data.uf || value.state,
      });
    } catch {
      toast.error("Falha ao consultar CEP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}_cep`} className={labelClass}>
            CEP
          </Label>
          <div className="relative">
            <Input
              id={`${idPrefix}_cep`}
              value={value.cep}
              inputMode="numeric"
              placeholder="00000-000"
              onChange={(e) => {
                const masked = maskCep(e.target.value);
                set({ cep: masked });
                if (masked.replace(/\D/g, "").length === 8) lookupCep(masked);
              }}
              onBlur={(e) => lookupCep(e.target.value)}
              className={inputClass}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#3157D5]" />
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}_number`} className={labelClass}>
            Número
          </Label>
          <Input
            id={`${idPrefix}_number`}
            value={value.number}
            onChange={(e) => set({ number: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}_street`} className={labelClass}>
          Rua
        </Label>
        <Input
          id={`${idPrefix}_street`}
          value={value.street}
          onChange={(e) => set({ street: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}_complement`} className={labelClass}>
          Complemento
        </Label>
        <Input
          id={`${idPrefix}_complement`}
          value={value.complement}
          onChange={(e) => set({ complement: e.target.value })}
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}_neighborhood`} className={labelClass}>
            Bairro
          </Label>
          <Input
            id={`${idPrefix}_neighborhood`}
            value={value.neighborhood}
            onChange={(e) => set({ neighborhood: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-[1fr_80px] gap-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}_city`} className={labelClass}>
              Cidade
            </Label>
            <Input
              id={`${idPrefix}_city`}
              value={value.city}
              onChange={(e) => set({ city: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}_state`} className={labelClass}>
              UF
            </Label>
            <Input
              id={`${idPrefix}_state`}
              value={value.state}
              maxLength={2}
              onChange={(e) => set({ state: e.target.value.toUpperCase() })}
              className={inputClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
}