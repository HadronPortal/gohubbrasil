import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Plus, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface Barber {
  id: string;
  name: string;
  active: boolean;
  avatar_url?: string;
  user_id?: string;
  bio?: string;
  commission_pct?: number;
  whatsapp?: string;
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
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [commission, setCommission] = useState("0");
  const [active, setActive] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (barbershopId) fetchBarbers();
  }, [barbershopId]);

  const fetchBarbers = async () => {
    const { data } = await supabase
      .from("barbers")
      .select(`
        id, 
        name, 
        active,
        user_id,
        bio,
        commission_pct,
        photo_url,
        profiles:user_id (avatar_url, whatsapp)
      `)
      .eq("barbershop_id", barbershopId);

    if (data) {
      setBarbers(data.map((b: any) => ({
        id: b.id,
        name: b.name,
        active: b.active,
        avatar_url: b.profiles?.avatar_url || b.photo_url,
        user_id: b.user_id,
        bio: b.bio,
        commission_pct: b.commission_pct,
        whatsapp: b.profiles?.whatsapp
      })));
    }
    setIsLoading(false);
  };

  const handleEdit = (barber: any) => {
    setEditingBarber(barber);
    setName(barber.name);
    setWhatsapp(barber.whatsapp || "");
    setBio(barber.bio || "");
    setCommission(barber.commission_pct?.toString() || "0");
    setActive(barber.active);
    setAvatarPreview(barber.avatar_url);
    setIsAdding(true);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingBarber(null);
    setName("");
    setEmail("");
    setPassword("");
    setWhatsapp("");
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
        // 2. Use RPC to create barber record
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_barber', {
          p_email: email,
          p_name: name,
          p_phone: whatsapp,
          p_bio: bio,
          p_commission_pct: parseFloat(commission) || 0,
          p_avatar_url: finalAvatarUrl,
          p_barbershop_id: barbershopId
        });

        if (rpcError) throw rpcError;
        
        const result = rpcData as { success: boolean; error?: string; barber_id?: string };
        if (!result.success) throw new Error(result.error || "Erro ao cadastrar barbeiro no banco.");

        // 3. Create Auth user
        const { error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              name: name,
              role: 'barber',
              barbershop_id: barbershopId,
              barber_id: result.barber_id
            }
          }
        });
        
        if (signUpError) {
          if (signUpError.status === 400 || signUpError.message?.toLowerCase().includes("already registered")) {
            await supabase.auth.resetPasswordForEmail(email);
            toast.success("Barbeiro cadastrado! Usuário já existia, e-mail de redefinição enviado.");
          } else {
            throw signUpError;
          }
        } else {
          toast.success("Barbeiro cadastrado com sucesso!");
        }
        currentUserId = result.barber_id; // Temporary ID association
      } else {
        // Update Profile only if user exists
        if (currentUserId) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              full_name: name,
              whatsapp,
              avatar_url: finalAvatarUrl,
              role: 'barber',
              barbershop_id: barbershopId || undefined
            })
            .eq("id", currentUserId);

          if (profileError) throw profileError;
        }

        // Update Barber entry
        const { error: barberError } = await supabase
          .from("barbers")
          .update({
            name,
            bio,
            active,
            commission_pct: parseFloat(commission) || 0,
            photo_url: finalAvatarUrl
          })
          .eq("id", editingBarber.id);
        
        if (barberError) throw barberError;
      }

      if (editingBarber) {
        toast.success("Barbeiro atualizado!");
      }
      resetForm();
      // Force refresh data
      setTimeout(() => {
        fetchBarbers();
      }, 500);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const barber = barbers.find(b => b.id === id);
    if (!barber) return;

    if (!confirm("Tem certeza? Agendamentos futuros pendentes serão cancelados.")) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('delete_barber', {
        p_barber_id: id
      });
      
      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (result.success) {
        if (barber.user_id) {
          try {
            // @ts-ignore - admin is used here as requested by user
            await supabase.auth.admin.deleteUser(barber.user_id);
          } catch (authError) {
            console.error("Erro ao deletar usuário do Auth:", authError);
          }
        }
        
        toast.success("Barbeiro removido!");
        setBarbers(prev => prev.filter(b => b.id !== id));
      } else {
        throw new Error(result.error || "Erro ao excluir barbeiro.");
      }
    } catch (error: any) {
      toast.error(error.message);
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
          <Input placeholder="WHATSAPP" type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className="bg-[#141b2a] border-[#2a3347] h-12" />
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
              <Input type="text" value={commission} onChange={e => setCommission(e.target.value)} className="bg-[#141b2a] border-[#2a3347] h-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
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
