import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, X, Pencil, Trash2, AlertTriangle, ImageIcon, Sparkles, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { money } from "@/utils/format";
import {
  ICON_LIBRARY,
  getIconByKey,
  getIconsForCategory,
  suggestIconKey,
  type IconEntry,
} from "@/lib/serviceIcons";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  icon_key?: string | null;
  catalog_service_id?: string | null;
}

export default function AdminServices({ barbershopId }: { barbershopId: string | null }) {
  const [services, setServices] = useState<Service[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [serviceIconMap, setServiceIconMap] = useState<Record<string, string | null>>({});

  // Form state
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [iconKey, setIconKey] = useState<string | null>(null); // null = sugestão automática
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [iconQuery, setIconQuery] = useState("");
  
  const formatPrice = (value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    if (!cleanValue) return "";
    const numberValue = parseInt(cleanValue) / 100;
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numberValue);
  };

  const parsePrice = (value: string) => {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, "").replace(",", "."));
  };

  useEffect(() => {
    if (barbershopId) fetchServices();
  }, [barbershopId]);

  useEffect(() => {
    if (!barbershopId) return;
    (async () => {
      const { data } = await supabase
        .from("barbershops")
        .select("category_id, business_categories(slug)")
        .eq("id", barbershopId)
        .maybeSingle();
      const slug = (data as any)?.business_categories?.slug || null;
      setCategorySlug(slug);
    })();
  }, [barbershopId]);

  const fetchServices = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("services")
      .select("*, service_catalog:catalog_service_id(icon_key)")
      .eq("barbershop_id", barbershopId)
      .order("name");

    if (data) {
      const list = data as any[];
      setServices(list as Service[]);
      const map: Record<string, string | null> = {};
      list.forEach((s) => {
        // Prioridade: escolha do estabelecimento → sugestão global do catálogo
        map[s.id] = s.icon_key || s.service_catalog?.icon_key || null;
      });
      setServiceIconMap(map);
    }
    setIsLoading(false);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setDuration(service.duration_minutes.toString());
    setPrice(formatPrice((service.price * 100).toString()));
    setIconKey(serviceIconMap[service.id] || null);
    setIsAdding(true);
  };

  const handleDeleteClick = (id: string) => {
    setServiceToDelete(id);
  };

  const confirmDelete = async () => {
    if (!serviceToDelete) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", serviceToDelete);

      if (error) throw error;
      toast.success("Serviço excluído com sucesso!");
      fetchServices();
      setServiceToDelete(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const finalIconKey = iconKey || suggestIconKey(name, categorySlug) || null;
      // Ensure global catalog entry exists for this category and link it.
      let catalogServiceId: string | null = null;
      if (barbershopId) {
        const { data: catId, error: catErr } = await supabase.rpc("upsert_catalog_service", {
          p_barbershop_id: barbershopId,
          p_name: name,
          p_icon_key: finalIconKey,
        });
        if (catErr) {
          console.error("Erro ao vincular ao catálogo:", catErr);
        } else {
          catalogServiceId = (catId as string) || null;
        }
      }

      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update({
            name,
            duration_minutes: parseInt(duration),
            price: parsePrice(price),
            icon_key: finalIconKey,
            ...(catalogServiceId ? { catalog_service_id: catalogServiceId } : {}),
          } as any)
          .eq("id", editingService.id);

        if (error) throw error;
        toast.success("Serviço atualizado!");
      } else {
        const { error } = await supabase
          .from("services")
          .insert({
            barbershop_id: barbershopId,
            name,
            duration_minutes: parseInt(duration),
            price: parsePrice(price),
            icon_key: finalIconKey,
            ...(catalogServiceId ? { catalog_service_id: catalogServiceId } : {}),
          } as any);

        if (error) throw error;
        toast.success("Serviço adicionado!");
      }

      resetForm();
      fetchServices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingService(null);
    setName("");
    setPrice("");
    setDuration("30");
    setIconKey(null);
  };

  const previewKey = iconKey || suggestIconKey(name, categorySlug);
  const previewEntry = previewKey ? getIconByKey(previewKey) : null;

  const visibleIcons = (() => {
    const base: IconEntry[] = getIconsForCategory(categorySlug);
    const others = ICON_LIBRARY.filter((i) => !base.includes(i));
    const all = [...base, ...others];
    const q = iconQuery.trim().toLowerCase();
    if (!q) return all;
    return all.filter((i) =>
      i.label.toLowerCase().includes(q) || (i.aliases || []).some((a) => a.toLowerCase().includes(q))
    );
  })();

  return (
    <div className="space-y-4" style={{ fontFamily: "Poppins, sans-serif" }}>
      <h3 className="text-base font-semibold text-[#172033]">Serviços</h3>

      {services.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-[#DDE3EE] bg-white py-8 text-center">
          <p className="text-sm text-[#64748B]">Nenhum serviço cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map(service => {
            const k = serviceIconMap[service.id] || suggestIconKey(service.name, categorySlug);
            const entry = k ? getIconByKey(k) : null;
            return (
            <div key={service.id} className="flex items-center justify-between gap-3 rounded-[8px] border border-[#DDE3EE] bg-white p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#F6F7FB]">
                  {entry ? (
                    <img src={entry.image} alt="" className="h-9 w-9 object-contain" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-[#94A3B8]" />
                  )}
                </div>
                <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold text-[#172033]">{service.name}</h4>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {service.duration_minutes} min • {money(service.price)}
                </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(service)} className="h-9 w-9 rounded-[8px] text-[#64748B] hover:bg-[#F6F7FB] hover:text-[#3157D5]">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(service.id)} className="h-9 w-9 rounded-[8px] text-[#64748B] hover:bg-[#FDECEC] hover:text-[#DC2626]">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      <Button
        onClick={() => setIsAdding(true)}
        className="w-full h-12 rounded-[8px] bg-[#3157D5] text-sm font-semibold text-white hover:bg-[#274ac0] gap-2"
      >
        <Plus className="h-4 w-4" />
        Adicionar serviço
      </Button>

      {isAdding && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" style={{ fontFamily: "Poppins, sans-serif" }}>
          <div className="relative w-full max-w-[360px] rounded-[8px] border border-[#DDE3EE] bg-white p-5 space-y-4 shadow-xl">
            <button onClick={resetForm} className="absolute right-3 top-3 text-[#64748B] hover:text-[#172033]">
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-base font-semibold text-[#172033]">{editingService ? "Editar serviço" : "Novo serviço"}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#172033]">Nome do serviço</label>
                <Input value={name} onChange={e => setName(e.target.value)} required className="h-11 rounded-[8px] border-[#DDE3EE]" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#172033]">Ícone do serviço</label>
                <button
                  type="button"
                  onClick={() => { setIconQuery(""); setShowIconPicker(true); }}
                  className="flex w-full items-center gap-3 rounded-[8px] border border-[#DDE3EE] bg-white p-2 text-left transition hover:border-[#3157D5]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-[#F6F7FB]">
                    {previewEntry ? (
                      <img src={previewEntry.image} alt="" className="h-9 w-9 object-contain" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-[#94A3B8]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#172033]">
                      {previewEntry ? previewEntry.label : "Escolher ícone"}
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      {iconKey ? "Ícone escolhido" : "Sugestão automática"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#3157D5]">Alterar</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#172033]">Duração (min)</label>
                  <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} required className="h-11 rounded-[8px] border-[#DDE3EE]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#172033]">Preço (R$)</label>
                  <Input type="text" value={price} onChange={e => setPrice(formatPrice(e.target.value))} required placeholder="0,00" className="h-11 rounded-[8px] border-[#DDE3EE]" />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 rounded-[8px] bg-[#3157D5] text-sm font-semibold text-white hover:bg-[#274ac0]" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar serviço"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {showIconPicker && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" style={{ fontFamily: "Poppins, sans-serif" }}>
          <div className="flex max-h-[85vh] w-full max-w-[440px] flex-col rounded-t-[16px] bg-white sm:rounded-[12px] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EEF2F7] px-4 py-3">
              <h3 className="text-base font-semibold text-[#172033]">Escolher ícone</h3>
              <button onClick={() => setShowIconPicker(false)} className="text-[#64748B] hover:text-[#172033]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  value={iconQuery}
                  onChange={(e) => setIconQuery(e.target.value)}
                  placeholder="Buscar ícone"
                  className="h-10 rounded-[8px] border-[#DDE3EE] pl-9 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => { setIconKey(null); setShowIconPicker(false); }}
                className={`mt-3 flex w-full items-center gap-3 rounded-[8px] border p-2 text-left ${
                  !iconKey ? "border-[#3157D5] bg-[#EEF3FF]" : "border-[#DDE3EE] bg-white"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#F6F7FB]">
                  <Sparkles className="h-5 w-5 text-[#3157D5]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#172033]">Usar sugestão automática</p>
                  <p className="text-[11px] text-[#64748B]">Escolhemos o ícone com base no nome.</p>
                </div>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {visibleIcons.map((entry) => {
                  const selected = iconKey === entry.key;
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => { setIconKey(entry.key); setShowIconPicker(false); }}
                      className={`flex flex-col items-center gap-1 rounded-[8px] border p-2 text-center transition ${
                        selected ? "border-[#3157D5] bg-[#EEF3FF]" : "border-[#DDE3EE] bg-white hover:border-[#3157D5]"
                      }`}
                    >
                      <img src={entry.image} alt="" className="h-12 w-12 object-contain" />
                      <span className="line-clamp-2 min-h-[28px] text-[11px] font-medium leading-tight text-[#172033]">
                        {entry.label}
                      </span>
                    </button>
                  );
                })}
                {visibleIcons.length === 0 && (
                  <p className="col-span-full py-6 text-center text-sm text-[#64748B]">Nenhum ícone encontrado.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {serviceToDelete && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" style={{ fontFamily: "Poppins, sans-serif" }}>
          <div className="w-full max-w-[340px] rounded-[8px] border border-[#DDE3EE] bg-white p-5 space-y-4 text-center shadow-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FDECEC]">
              <AlertTriangle className="h-5 w-5 text-[#DC2626]" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#172033]">Confirmar exclusão</h3>
              <p className="mt-1 text-sm text-[#64748B]">Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setServiceToDelete(null)} className="h-11 rounded-[8px] bg-white border border-[#DDE3EE] text-[#172033] hover:bg-[#F6F7FB]">
                Cancelar
              </Button>
              <Button onClick={confirmDelete} className="h-11 rounded-[8px] bg-[#DC2626] text-white hover:bg-[#bf1f1f]" disabled={isLoading}>
                {isLoading ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
