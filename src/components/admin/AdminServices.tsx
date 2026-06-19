import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, X, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { money } from "@/utils/format";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
}

export default function AdminServices({ barbershopId }: { barbershopId: string | null }) {
  const [services, setServices] = useState<Service[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  
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

  const fetchServices = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("barbershop_id", barbershopId)
      .order("name");

    if (data) setServices(data as Service[]);
    setIsLoading(false);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setName(service.name);
    setDuration(service.duration_minutes.toString());
    setPrice(formatPrice((service.price * 100).toString()));
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
      // Ensure global catalog entry exists for this category and link it.
      let catalogServiceId: string | null = null;
      if (barbershopId) {
        const { data: catId, error: catErr } = await supabase.rpc("upsert_catalog_service", {
          p_barbershop_id: barbershopId,
          p_name: name,
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
            ...(catalogServiceId ? { catalog_service_id: catalogServiceId } : {}),
          })
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
            ...(catalogServiceId ? { catalog_service_id: catalogServiceId } : {}),
          });

        if (error) throw error;
        toast.success("Serviço adicionado!");
      }

      setIsAdding(false);
      setEditingService(null);
      setName("");
      setPrice("");
      setDuration("30");
      fetchServices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4" style={{ fontFamily: "Poppins, sans-serif" }}>
      <h3 className="text-base font-semibold text-[#172033]">Serviços</h3>

      {services.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-[#DDE3EE] bg-white py-8 text-center">
          <p className="text-sm text-[#64748B]">Nenhum serviço cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {services.map(service => (
            <div key={service.id} className="flex items-center justify-between rounded-[8px] border border-[#DDE3EE] bg-white p-3">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold text-[#172033]">{service.name}</h4>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {service.duration_minutes} min • {money(service.price)}
                </p>
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
          ))}
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
            <button onClick={() => { setIsAdding(false); setEditingService(null); setName(""); setPrice(""); setDuration("30"); }} className="absolute right-3 top-3 text-[#64748B] hover:text-[#172033]">
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-base font-semibold text-[#172033]">{editingService ? "Editar serviço" : "Novo serviço"}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#172033]">Nome do serviço</label>
                <Input value={name} onChange={e => setName(e.target.value)} required className="h-11 rounded-[8px] border-[#DDE3EE]" />
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
