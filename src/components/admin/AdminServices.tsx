import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, X, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

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
    setPrice(formatPrice((service.price * 100).toFixed(0)));
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
      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update({
            name,
            duration_minutes: parseInt(duration),
            price: parsePrice(price)
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
            price: parsePrice(price)
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <h3 className="text-xs font-bold tracking-[0.25em] text-[#f0c040] font-oswald uppercase">SERVIÇOS DISPONÍVEIS</h3>
      
      <div className="space-y-4">
        {services.map(service => (
          <div key={service.id} className="bg-[#141b2a] border border-[#2a3347] p-4 rounded-[4px] flex justify-between items-center group">
            <div>
              <h4 className="text-sm font-bold text-[#c8d4e8] font-oswald uppercase tracking-wider">{service.name}</h4>
              <p className="text-[10px] text-[#8a9ab5] uppercase tracking-widest mt-0.5">
                {service.duration_minutes} MINutos • R$ {service.price.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(service)}
                className="text-[#8a9ab5] hover:text-[#f0c040] transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(service.id)}
                className="text-[#8a9ab5] hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button 
        onClick={() => setIsAdding(true)}
        className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-7 text-lg rounded-[4px] font-oswald uppercase tracking-[3px] mt-4"
      >
        ADICIONAR SERVIÇO
      </Button>

      {/* Modal/Overlay for Adding */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#1c2333] border border-[#2a3347] w-full max-w-[340px] p-6 rounded-[4px] space-y-6 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => { setIsAdding(false); setEditingService(null); setName(""); setPrice(""); setDuration("30"); }} className="absolute top-4 right-4 text-[#8a9ab5] hover:text-[#f0c040]">
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xs font-bold tracking-[0.25em] text-[#f0c040] font-oswald uppercase">{editingService ? "EDITAR SERVIÇO" : "NOVO SERVIÇO"}</h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-[#8a9ab5] ml-1 uppercase font-bold tracking-widest">NOME DO SERVIÇO</label>
                <Input value={name} onChange={e => setName(e.target.value)} required className="bg-[#141b2a] border-[#2a3347] h-12" />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-[#8a9ab5] ml-1 uppercase font-bold tracking-widest">DURAÇÃO (MIN)</label>
                  <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} required className="bg-[#141b2a] border-[#2a3347] h-12" />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] text-[#8a9ab5] ml-1 uppercase font-bold tracking-widest">PREÇO (R$)</label>
                  <Input 
                    type="text" 
                    value={price} 
                    onChange={e => setPrice(formatPrice(e.target.value))} 
                    required 
                    className="bg-[#141b2a] border-[#2a3347] h-12" 
                    placeholder="0,00"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-6 font-oswald uppercase tracking-[3px] mt-2" disabled={isLoading}>
                {isLoading ? "SALVANDO..." : "SALVAR SERVIÇO"}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {serviceToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6">
          <div className="bg-[#1c2333] border border-[#2a3347] w-full max-w-[340px] p-8 rounded-[4px] space-y-6 relative animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#f0c040] font-oswald uppercase tracking-wider">CONFIRMAR EXCLUSÃO</h3>
              <p className="text-sm text-[#8a9ab5] leading-relaxed">
                Tem certeza que deseja excluir este serviço? Esta ação não pode ser desfeita.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <Button 
                onClick={() => setServiceToDelete(null)}
                className="bg-transparent border border-[#2a3347] hover:bg-[#2a3347] text-[#8a9ab5] font-bold py-6 font-oswald uppercase tracking-wider"
              >
                CANCELAR
              </Button>
              <Button 
                onClick={confirmDelete}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-6 font-oswald uppercase tracking-wider"
                disabled={isLoading}
              >
                {isLoading ? "EXCLUINDO..." : "EXCLUIR"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
