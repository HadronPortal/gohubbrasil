import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Plus, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface Barber {
  id: string;
  user_id: string;
  name: string;
  active: boolean;
  avatar_url?: string;
  bio?: string;
  commission_pct?: number;
  phone?: string;
}

export default function AdminBarbers({ barbershopId }: { barbershopId: string | null }) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [commission, setCommission] = useState("0");

  const formatPercentage = (value: string) => {
    // Allows only numbers and one comma for decimals
    const cleanValue = value.replace(/[^\d,]/g, "");
    return cleanValue;
  };

  const parsePercentage = (value: string) => {
    if (!value) return 0;
    return parseFloat(value.replace(",", "."));
  };
  const [active, setActive] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (barbershopId) fetchBarbers();
  }, [barbershopId]);

  const fetchBarbers = async () => {
    setIsLoading(true);
    // 1. Fetch barbers entries
    const { data: barbersData, error: barbersError } = await supabase
      .from("barbers")
      .select("id, user_id, barbershop_id, bio, active, commission_pct")
      .eq("barbershop_id", barbershopId)
      .eq("active", true);

    if (barbersError) {
      console.error("Error fetching barbers:", barbersError);
      toast.error("Erro ao carregar barbeiros");
      setIsLoading(false);
      return;
    }

    // 2. Get user_ids
    const userIds = (barbersData || []).map(b => b.user_id).filter(Boolean);

    // 3. Fetch users info
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("id, name, phone, avatar_url, role, barbershop_id")
      .in("id", userIds);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      toast.error("Erro ao carregar dados dos usuários");
      setIsLoading(false);
      return;
    }

    // 4. Map and merge
    const mappedBarbers = (barbersData || []).map(barber => {
      const userEntry = usersData?.find(u => u.id === barber.user_id);
      return {
        id: barber.id,
        user_id: barber.user_id as string,
        name: userEntry?.name || "Sem Nome",
        active: barber.active !== false,
        avatar_url: userEntry?.avatar_url || undefined,
        bio: barber.bio || "",
        commission_pct: barber.commission_pct || 0,
        phone: userEntry?.phone || ""
      };
    });

    console.log("BARBERS DEBUG", { 
      barbershopId, 
      barbers: barbersData, 
      users: usersData, 
      mappedBarbers 
    });

    setBarbers(mappedBarbers);
    setIsLoading(false);
  };

  const handleEdit = (barber: Barber) => {
    setEditingBarber(barber);
    setName(barber.name);
    setPhone(barber.phone || "");
    setBio(barber.bio || "");
    setCommission(barber.commission_pct?.toString().replace(".", ",") || "0");
    setActive(barber.active);
    setAvatarPreview(barber.avatar_url || null);
    setIsAdding(true);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingBarber(null);
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setBio("");
    setCommission("0");
    setActive(true);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let currentUserId = editingBarber?.user_id;
      let finalAvatarUrl = avatarPreview || "";

      // 1. Upload Avatar if file exists
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const identifier = currentUserId || editingBarber?.id || Math.random().toString(36).substring(7);
        const fileName = `${identifier}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        finalAvatarUrl = publicUrl;
      }

      if (!editingBarber) {
        // 2. Use Edge Function to create/update barber (Auth + Profile + Barber)
        const { data, error } = await supabase.functions.invoke('create-barber', {
          body: {
            name,
            email,
            phone,
            password,
            avatarUrl: finalAvatarUrl,
            bio,
            commissionPct: parseFloat(commission) || 0,
            barbershopId
          }
        });

        if (error) {
          toast.error(error.message);
          setIsLoading(false);
          return;
        }

        if (data && data.success === false) {
          toast.error(data.error || "Erro ao cadastrar barbeiro.");
          setIsLoading(false);
          return;
        }

        toast.success(editingBarber ? "Barbeiro atualizado!" : "Barbeiro cadastrado com sucesso!");
      } else {
        // Update User info in public.users
        if (currentUserId) {
          const { error: userUpdateError } = await supabase
            .from("users")
            .update({
              name,
              phone: phone,
              avatar_url: finalAvatarUrl
            })
            .eq("id", currentUserId);

          if (userUpdateError) throw userUpdateError;
        }

        // Update Barber entry (only config fields)
        const { error: barberError } = await supabase
          .from("barbers")
          .update({
            bio,
            active,
            commission_pct: parseFloat(commission) || 0
          })
          .eq("id", editingBarber.id);
        
        if (barberError) throw barberError;
        
        toast.success("Barbeiro atualizado!");
      }

      resetForm();
      fetchBarbers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza? Agendamentos futuros pendentes serão cancelados.")) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('delete_barber_safe', {
        barber_id: id
      });
      
      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (result.success) {
        toast.success("Barbeiro excluído");
        fetchBarbers();
      } else {
        toast.error(result.error || "Erro ao excluir barbeiro.");
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Erro inesperado ao excluir");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAdding) {
    return (
      <form onSubmit={handleSave} className="space-y-8 animate-in slide-in-from-right duration-300">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" type="button" onClick={resetForm} className="text-[#8a9ab5]">VOLTAR</Button>
          <h3 className="text-xs font-bold tracking-[0.25em] text-[#f0c040] font-oswald uppercase">
            {editingBarber ? "EDITAR BARBEIRO" : "NOVO BARBEIRO"}
          </h3>
        </div>

        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-4">
          <div 
            onClick={() => document.getElementById('avatar-input')?.click()}
            className="w-32 h-32 rounded-full border-2 border-[#f0c040] flex items-center justify-center overflow-hidden cursor-pointer bg-[#141b2a]"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-8 h-8 text-[#8a9ab5]" />
            )}
          </div>
          <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <span className="text-[10px] text-[#8a9ab5] uppercase tracking-widest font-bold">FOTO DE PERFIL</span>
        </div>

        <div className="space-y-4">
          <Input placeholder="NOME COMPLETO" value={name} onChange={e => setName(e.target.value)} required className="bg-[#141b2a] border-[#2a3347] h-12" />
          <Input placeholder="WHATSAPP" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required className="bg-[#141b2a] border-[#2a3347] h-12" />
          {!editingBarber && (
            <>
              <Input placeholder="E-MAIL" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-[#141b2a] border-[#2a3347] h-12" />
              <Input placeholder="SENHA INICIAL" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-[#141b2a] border-[#2a3347] h-12" />
            </>
          )}
          <Input placeholder="ESPECIALIDADE (EX: CORTE CLÁSSICO)" value={bio} onChange={e => setBio(e.target.value)} className="bg-[#141b2a] border-[#2a3347] h-12" />
          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] text-[#8a9ab5] ml-1 uppercase font-bold">COMISSÃO %</label>
              <Input type="text" value={commission} onChange={e => setCommission(e.target.value)} className="bg-[#141b2a] border-[#2a3347] h-12" />
            </div>
            <div className="flex-1 flex flex-col justify-end pb-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)} className="accent-[#f0c040]" />
                <label htmlFor="active" className="text-xs text-[#c8d4e8] uppercase font-bold tracking-widest">ATIVO</label>
              </div>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-7 text-lg rounded-[4px] font-oswald uppercase tracking-[3px]" disabled={isLoading}>
          {isLoading ? "SALVANDO..." : "SALVAR BARBEIRO"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <h3 className="text-xs font-bold tracking-[0.25em] text-[#f0c040] font-oswald uppercase">GERENCIAR BARBEIROS</h3>
      
      <div className="space-y-4">
        {barbers.map(barber => (
          <div 
            key={barber.id} 
            onClick={() => handleEdit(barber)}
            className="bg-[#141b2a] border border-[#2a3347] p-4 rounded-[4px] flex items-center gap-4 cursor-pointer hover:border-[#f0c040]/50 transition-all"
          >
            <div className="w-12 h-12 rounded-full border border-[#f0c040] overflow-hidden flex items-center justify-center bg-[#1c2333]">
              {barber.avatar_url ? (
                <img src={barber.avatar_url} alt={barber.name} className="w-full h-full object-cover" />
              ) : (
                <UserPlus className="w-5 h-5 text-[#8a9ab5]" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-[#c8d4e8] font-oswald uppercase tracking-wider">{barber.name}</h4>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${barber.active ? "text-green-500" : "text-red-500"}`}>
                {barber.active ? "ATIVO" : "INATIVO"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={(e) => handleDelete(barber.id, e)}
              className="text-[#8a9ab5] hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        ))}
      </div>

      <Button 
        onClick={() => setIsAdding(true)}
        className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-7 text-lg rounded-[4px] font-oswald uppercase tracking-[3px] mt-4"
      >
        ADICIONAR BARBEIRO
      </Button>
    </div>
  );
}
