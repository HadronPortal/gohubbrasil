import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Plus, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
import { ImageCropDialog } from "@/components/ImageCropDialog";


interface Barber {
  id?: string;
  barber_id: string;
  user_id: string;
  name: string;
  email: string;
  active: boolean;
  avatar_url?: string;
  bio?: string;
  commission_pct?: number;
  phone?: string;
  barbershop_id?: string;
  barbershop_name?: string;
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
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (barbershopId) fetchBarbers();
  }, [barbershopId]);

  const fetchBarbers = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase.rpc('get_barbers_for_admin', {
      p_barbershop_id: barbershopId
    });

    if (error) {
      console.error("Error fetching barbers:", error);
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    if (data && data.success === false) {
      toast.error(data.error || "Erro ao carregar barbeiros");
      setIsLoading(false);
      return;
    }

    setBarbers(data?.barbers || []);
    setIsLoading(false);
  };

  const handleEdit = (barber: Barber) => {
    setEditingBarber(barber);
    setName(barber.name);
    setEmail(barber.email);
    setPassword("••••••");
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
    setPendingAvatarFile(null);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingAvatarFile(file);
      e.target.value = "";
    }
  };

  const cropExistingAvatar = async () => {
    if (!avatarPreview) return;
    try {
      const response = await fetch(avatarPreview);
      if (!response.ok) throw new Error("Não foi possível carregar a foto atual.");
      const blob = await response.blob();
      setPendingAvatarFile(new File([blob], "profissional-atual.jpg", { type: blob.type || "image/jpeg" }));
    } catch (error: any) {
      toast.error(error.message || "Não foi possível ajustar a foto atual.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let finalAvatarUrl = avatarPreview || "";

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const identifier = editingBarber?.user_id || editingBarber?.barber_id || Math.random().toString(36).substring(7);
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

      const commissionPct = parsePercentage(commission);
      
      const body: any = {
        name,
        phone,
        avatarUrl: finalAvatarUrl,
        bio,
        commissionPct,
        barbershopId
      };

      if (editingBarber) {
        body.barberId = editingBarber.barber_id;
        // Only include email if it changed and is not empty
        if (email && email.trim() && email.trim().toLowerCase() !== editingBarber.email.toLowerCase()) {
          body.email = email.trim().toLowerCase();
        }
        // Only include password if it's not the mask and not empty
        if (password && password.trim() && !/^[*•●]+$/.test(password.trim())) {
          body.password = password.trim();
        }
        // PRESERVE ROLE OWNER: Tell the Edge Function NOT to change role to barber if it's currently owner
        // The RPC update_barber_admin already handles only name/phone/avatar/commission, 
        // but create-barber (used for credentials) needs to know.
        body.preserveRole = true;
      } else {
        body.email = email.trim().toLowerCase();
        body.password = password.trim();
      }

      let resultData: any;
      let resultError: any;

      if (editingBarber) {
        // Se editando, verificar se email ou senha mudaram
        const emailChanged = email && email.trim() && email.trim().toLowerCase() !== editingBarber.email.toLowerCase();
        const passwordChanged = password && password.trim() && !/^[*•●]+$/.test(password.trim());

        if (emailChanged || passwordChanged) {
          // Usar create-barber APENAS para email/senha se mudarem
          const { data: funcData, error: funcError } = await supabase.functions.invoke('create-barber', {
            body: {
              barberId: editingBarber.barber_id,
              email: emailChanged ? email.trim().toLowerCase() : undefined,
              password: passwordChanged ? password.trim() : undefined,
              barbershopId
            }
          });
          
          if (funcError || (funcData && funcData.success === false)) {
            toast.error(funcError?.message || funcData?.error || "Erro ao atualizar credenciais.");
            setIsLoading(false);
            return;
          }
        }

        // Para dados de perfil e comissão, usar sempre a RPC update_barber_admin
        // p_barber_id: barber.barber_id || barber.id
        const { data: rpcData, error: rpcError } = await supabase.rpc('update_barber_admin', {
          p_barber_id: editingBarber.barber_id || editingBarber.id,
          p_name: name,
          p_phone: phone,
          p_avatar_url: finalAvatarUrl,
          p_commission_pct: Number(commissionPct || 0)
        });
        
        resultData = rpcData;
        resultError = rpcError;
      } else {
        // Novo barbeiro - usar create-barber
        const { data: funcData, error: funcError } = await supabase.functions.invoke('create-barber', {
          body
        });
        resultData = funcData;
        resultError = funcError;
      }

      if (resultError) {
        toast.error(resultError.message);
        setIsLoading(false);
        return;
      }

      if (resultData && resultData.success === false) {
        toast.error(resultData.error || "Erro ao salvar barbeiro.");
        setIsLoading(false);
        return;
      }

      toast.success(editingBarber ? "Barbeiro atualizado!" : "Barbeiro cadastrado com sucesso!");
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
      <form onSubmit={handleSave} className="space-y-6" style={{ fontFamily: "Poppins, sans-serif" }}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={resetForm} className="h-9 px-3 rounded-[8px] text-sm text-[#64748B] hover:text-[#172033] hover:bg-[#F6F7FB]">
            Voltar
          </Button>
          <h3 className="text-base font-semibold text-[#172033]">
            {editingBarber ? "Editar profissional" : "Novo profissional"}
          </h3>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => document.getElementById('avatar-input')?.click()}
            className="h-24 w-24 rounded-full border border-dashed border-[#DDE3EE] bg-white flex items-center justify-center overflow-hidden hover:border-[#3157D5]/40 transition"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-6 w-6 text-[#94A3B8]" />
            )}
          </button>
          <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <span className="text-xs text-[#64748B]">Foto de perfil</span>
          {avatarPreview && (
            <button type="button" onClick={cropExistingAvatar} className="text-xs font-semibold text-[#3157D5]">
              Ajustar enquadramento
            </button>
          )}
        </div>

        <div className="space-y-3">
          <Input placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)} required className="h-11 rounded-[8px] border-[#DDE3EE]" />
          <Input placeholder="WhatsApp" type="tel" value={phone} onChange={e => setPhone(e.target.value)} required className="h-11 rounded-[8px] border-[#DDE3EE]" />
          <Input placeholder="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="h-11 rounded-[8px] border-[#DDE3EE]" />
          <Input placeholder={editingBarber ? "Nova senha (deixe em branco para manter)" : "Senha inicial"} type="password" value={password} onChange={e => setPassword(e.target.value)} required={!editingBarber} className="h-11 rounded-[8px] border-[#DDE3EE]" />
          <Input placeholder="Especialidade (ex: corte clássico)" value={bio} onChange={e => setBio(e.target.value)} className="h-11 rounded-[8px] border-[#DDE3EE]" />
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-[#172033]">Comissão %</label>
              <Input type="text" value={commission} onChange={e => setCommission(formatPercentage(e.target.value))} className="h-11 rounded-[8px] border-[#DDE3EE]" />
            </div>
            <label className="flex h-11 flex-1 items-center gap-2 rounded-[8px] border border-[#DDE3EE] bg-white px-3">
              <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)} className="accent-[#3157D5]" />
              <span className="text-sm font-medium text-[#172033]">Ativo</span>
            </label>
          </div>
        </div>

        <Button type="submit" className="w-full h-12 rounded-[8px] bg-[#3157D5] text-sm font-semibold text-white hover:bg-[#274ac0]" disabled={isLoading}>
          {isLoading ? "Salvando..." : "Salvar profissional"}
        </Button>
        <ImageCropDialog
          file={pendingAvatarFile}
          open={!!pendingAvatarFile}
          title="Enquadrar foto do profissional"
          cropShape="round"
          onCancel={() => setPendingAvatarFile(null)}
          onConfirm={(croppedFile) => {
            setAvatarFile(croppedFile);
            setAvatarPreview(URL.createObjectURL(croppedFile));
            setPendingAvatarFile(null);
          }}
        />
      </form>
    );
  }

  return (
    <div className="space-y-4" style={{ fontFamily: "Poppins, sans-serif" }}>
      <h3 className="text-base font-semibold text-[#172033]">Equipe</h3>

      {isLoading && barbers.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-[8px] border border-[#DDE3EE] bg-white" />
          ))}
        </div>
      ) : barbers.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-[#DDE3EE] bg-white py-8 text-center">
          <p className="text-sm text-[#64748B]">Nenhum profissional cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {barbers.map(barber => (
            <div
              key={barber.barber_id}
              onClick={() => handleEdit(barber)}
              className="flex items-center gap-3 rounded-[8px] border border-[#DDE3EE] bg-white p-3 cursor-pointer hover:border-[#3157D5]/40 hover:shadow-sm transition"
            >
              <UserAvatar name={barber.name} avatarUrl={barber.avatar_url} size="md" className="border-[#DDE3EE]" />
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-semibold text-[#172033]">{barber.name}</h4>
                <p className="truncate text-xs text-[#64748B]">{barber.phone || "—"}</p>
                <p className="truncate text-xs text-[#64748B] lowercase">{barber.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${barber.active ? "bg-[#E7F7EE] text-[#15803D]" : "bg-[#FDECEC] text-[#B91C1C]"}`}>
                    {barber.active ? "Ativo" : "Inativo"}
                  </span>
                  <span className="text-[11px] text-[#64748B]">Comissão {barber.commission_pct ?? 0}%</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={(e) => handleDelete(barber.barber_id, e)}
                className="h-9 w-9 rounded-[8px] text-[#64748B] hover:bg-[#FDECEC] hover:text-[#DC2626]"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={() => setIsAdding(true)}
        className="w-full h-12 rounded-[8px] bg-[#3157D5] text-sm font-semibold text-white hover:bg-[#274ac0] gap-2"
      >
        <Plus className="h-4 w-4" />
        Adicionar profissional
      </Button>
    </div>
  );
}
