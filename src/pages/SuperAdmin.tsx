import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Scissors, Store, User, Mail, Phone, Lock, 
  ArrowLeft, Upload, Edit2, Trash2, X, Check, CreditCard, Plus, LogOut
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { UserAvatar } from "@/components/UserAvatar";
import { getInitial } from "@/lib/utils";
import { money } from "@/utils/format";
import { format } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ProfileModal } from "@/components/ProfileModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Barbershop {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  description: string | null;
  payment_status: string | null;
  subscription_status: string | null;
  monthly_price: number | null;
  paid_until: string | null;
  blocked: boolean;
  owner?: {
    name: string;
    phone?: string;
  };
}

const STATUS_TRANSLATIONS: Record<string, string> = {
  trialing: "Período de teste",
  active: "Ativa",
  past_due: "Vencida",
  blocked: "Bloqueada",
  cancelled: "Cancelada"
};

const parseCurrency = (value: string): number => {
  if (!value) return 0;
  // Remove R$, spaces, and thousands separator (dot), then replace decimal separator (comma) with dot
  const cleanValue = value
    .replace(/R\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(cleanValue) || 0;
};

const formatCurrencyInput = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value));
};

export default function SuperAdmin() {
  const navigate = useNavigate();
  const { user, profile, isSuperAdmin, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [ownerIsBarber, setOwnerIsBarber] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Edit State
  const [editingBarbershop, setEditingBarbershop] = useState<Barbershop | null>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);

  // Create/Edit Form State
  const [createMonthlyPrice, setCreateMonthlyPrice] = useState("");
  const [editMonthlyPrice, setEditMonthlyPrice] = useState("");

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Payment Modal State
  const [paymentModalShop, setPaymentModalShop] = useState<Barbershop | null>(null);
  const [paymentValue, setPaymentValue] = useState("");
  const [paidUntil, setPaidUntil] = useState("");

  useEffect(() => {
    if (isSuperAdmin) {
      fetchBarbershops();
    }
  }, [isSuperAdmin]);

  const fetchBarbershops = async () => {
    setIsLoading(true);
    try {
      const { data: shops, error } = await supabase
        .from("barbershops")
        .select(`
          *,
          users(name, phone, role)
        `)
        .order("name", { ascending: true });

      if (error) throw error;

      const formattedShops = shops.map((shop: any) => {
        const ownerUser = shop.users?.find((u: any) => u.role === 'owner') || shop.users?.[0];
        return {
          ...shop,
          owner: ownerUser ? {
            name: ownerUser.name,
            phone: ownerUser.phone
          } : null
        };
      });

      setBarbershops(formattedShops);
    } catch (error: any) {
      console.error("Error fetching shops:", error);
      toast.error("Erro ao carregar barbearias");
    } finally {
      setIsLoading(false);
    }
  };


  const handleUpdatePaymentStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("barbershops")
        .update({ payment_status: status })
        .eq("id", id);
      
      if (error) throw error;
      
      setBarbershops(prev => prev.map(shop => 
        shop.id === id ? { ...shop, payment_status: status } : shop
      ));
      
      toast.success("Status de pagamento atualizado");
    } catch (error: any) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleMarkPaid = async () => {
    if (!paymentModalShop || !paidUntil) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('mark_barbershop_paid', {
        p_barbershop_id: paymentModalShop.id,
        p_paid_until: paidUntil,
        p_amount: parseCurrency(paymentValue)
      });

      if (error) throw error;
      
      toast.success("Pagamento registrado com sucesso");
      setPaymentModalShop(null);
      fetchBarbershops();
    } catch (error: any) {
      console.error("Error marking as paid:", error);
      toast.error("Erro ao registrar pagamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log('loading gate super admin', {
    authLoading,
    profile: !!profile,
  });

  if (authLoading && !profile) {
    return <LoadingScreen />;
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isEdit) {
        setEditLogoFile(file);
        setEditLogoPreview(URL.createObjectURL(file));
      } else {
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
      }
    }
  };

  const uploadLogo = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('barbershops')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('barbershops')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const paidUntilValue = formData.get("paid_until") as string;
    const monthlyPriceValue = parseCurrency(formData.get("monthly_price") as string);
    
    try {
      let logoUrl = "";
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }

      // Logic for subscription status based on paid_until
      let subscriptionStatus = (formData.get("subscription_status") as string) || "trialing";
      if (paidUntilValue) {
        subscriptionStatus = "active";
      }

      const { data: response, error } = await supabase.functions.invoke("create-barbershop-with-owner", {
        body: {
          barbershopName: formData.get("barbershop_name") as string,
          address: formData.get("barbershop_address") as string,
          phone: formData.get("barbershop_phone") as string,
          logoUrl,
          description: formData.get("description") as string,
          subscriptionStatus: subscriptionStatus,
          monthlyPrice: monthlyPriceValue,
          paidUntil: paidUntilValue,
          ownerName: formData.get("owner_name") as string,
          ownerEmail: formData.get("owner_email") as string,
          ownerPhone: formData.get("owner_phone") as string,
          ownerPassword: formData.get("owner_password") as string,
          ownerIsBarber: Boolean(ownerIsBarber)
        }
      });

      if (error) {
        console.error("EDGE ERROR", { error, data: response });
        toast.error(error.message || "Erro de conexão com o servidor.");
        return;
      }

      if (response && response.success === false) {
        console.error("EDGE ERROR BUSINESS LOGIC", { data: response });
        toast.error(response.error || "Erro ao criar barbearia.");
      } else {
        toast.success("Barbearia cadastrada com sucesso");
        setIsCreateModalOpen(false);
        (e.target as HTMLFormElement).reset();
        setLogoFile(null);
        setLogoPreview(null);
        setOwnerIsBarber(false);
        setCreateMonthlyPrice("");
        fetchBarbershops();
      }
    } catch (error: any) {
      console.error("Erro ao criar barbearia:", error);
      toast.error(error.message || "Erro inesperado ao criar barbearia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBarbershop) return;
    
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const paidUntilValue = formData.get("paid_until") as string;
    const monthlyPriceValue = parseCurrency(formData.get("monthly_price") as string);
    let subscriptionStatus = formData.get("subscription_status") as string;
    let blocked = editingBarbershop.blocked;

    if (paidUntilValue) {
      const paidUntilDate = new Date(paidUntilValue);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (paidUntilDate >= now) {
        subscriptionStatus = 'active';
        blocked = false;
      }
    }

    try {
      let logoUrl = editingBarbershop.logo_url;
      if (editLogoFile) {
        logoUrl = await uploadLogo(editLogoFile);
      }

      const { error } = await supabase
        .from("barbershops")
        .update({
          name: formData.get("name") as string,
          address: formData.get("address") as string,
          phone: formData.get("phone") as string,
          description: formData.get("description") as string,
          subscription_status: subscriptionStatus,
          monthly_price: monthlyPriceValue,
          paid_until: paidUntilValue,
          blocked: blocked,
          logo_url: logoUrl
        })
        .eq("id", editingBarbershop.id);

      if (error) throw error;

      // Se a data estiver vencida, garantir que o status seja atualizado
      if (paidUntilValue) {
        await supabase.rpc('refresh_barbershop_payment_status');
      }

      if (error) throw error;

      toast.success("Barbearia atualizada com sucesso");
      setEditingBarbershop(null);
      setEditLogoFile(null);
      setEditLogoPreview(null);
      fetchBarbershops();
    } catch (error: any) {
      console.error("Error updating:", error);
      toast.error(error.message || "Erro ao atualizar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.rpc("delete_barbershop_safe", {
        p_barbershop_id: deletingId
      });

      if (error) throw error;
      if (data && data.success === false) {
        toast.error(data.error || "Erro ao excluir");
      } else {
        toast.success("Barbearia excluída");
        fetchBarbershops();
      }
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast.error(error.message || "Erro ao excluir");
    } finally {
      setIsSubmitting(false);
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 md:p-8 text-white font-light pb-24">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-oswald uppercase tracking-wider">Painel do App</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="transition-transform active:scale-95 outline-none"
              >
                <UserAvatar 
                  name={profile?.name} 
                  email={user?.email} 
                  avatarUrl={profile?.avatar_url} 
                  size="md" 
                  className="bg-[#141414] border border-[#C6A355] hover:scale-105 transition-all" 
                />

              </button>
              <LogoutButton showText />
            </div>
          </div>

          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#C6A355] hover:bg-[#D4B466] text-black font-oswald uppercase tracking-widest px-8 rounded-none h-12 transition-all gap-2">
                <Plus className="w-5 h-5" />
                Cadastrar Barbearia
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#141414] border-[#1F1F1F] text-white max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-oswald uppercase text-[#C6A355]">Nova Barbearia</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-8 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Barbearia Info */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-l-2 border-[#C6A355] pl-3 mb-4">
                      <h3 className="text-sm font-oswald uppercase tracking-widest text-[#C6A355]">Detalhes da Unidade</h3>
                    </div>

                    <div className="flex flex-col items-center justify-center p-6 border border-[#1F1F1F] bg-[#0A0A0A] rounded-md space-y-4 mb-6">
                      <Label className="text-gray-300 font-oswald uppercase tracking-widest text-xs">Logo</Label>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="relative group cursor-pointer"
                      >
                        <Avatar className="w-24 h-24 border-2 border-[#1F1F1F] group-hover:border-[#C6A355] transition-colors">
                          <AvatarImage src={logoPreview || ""} className="object-cover" />
                          <AvatarFallback className="bg-[#141414]">
                            <Store className="w-8 h-8 text-gray-700" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                          <Upload className="w-5 h-5 text-[#C6A355]" />
                        </div>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleFileChange(e)}
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="barbershop_name" className="text-[10px] uppercase text-gray-500 tracking-widest">Nome da Barbearia</Label>
                        <Input id="barbershop_name" name="barbershop_name" required className="bg-[#0A0A0A] border-[#1F1F1F] h-10" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="barbershop_address" className="text-[10px] uppercase text-gray-500 tracking-widest">Endereço</Label>
                        <Input id="barbershop_address" name="barbershop_address" required className="bg-[#0A0A0A] border-[#1F1F1F] h-10" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="barbershop_phone" className="text-[10px] uppercase text-gray-500 tracking-widest">WhatsApp/Tel</Label>
                          <Input id="barbershop_phone" name="barbershop_phone" required className="bg-[#0A0A0A] border-[#1F1F1F] h-10" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="monthly_price" className="text-[10px] uppercase text-gray-500 tracking-widest">Valor Mensal</Label>
                          <Input 
                            id="monthly_price" 
                            name="monthly_price" 
                            type="text" 
                            placeholder="R$ 0,00" 
                            value={createMonthlyPrice}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              const numberValue = value ? parseInt(value) / 100 : 0;
                              setCreateMonthlyPrice(formatCurrencyInput(numberValue));
                            }}
                            className="bg-[#0A0A0A] border-[#1F1F1F] h-10" 
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="subscription_status" className="text-[10px] uppercase text-gray-500 tracking-widest">Status Assinatura</Label>
                          <Select name="subscription_status" defaultValue="trialing">
                            <SelectTrigger className="bg-[#0A0A0A] border-[#1F1F1F] h-10">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#141414] border-[#1F1F1F] text-white">
                              {Object.entries(STATUS_TRANSLATIONS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="paid_until" className="text-[10px] uppercase text-gray-500 tracking-widest">Pago Até (Vencimento)</Label>
                          <Input id="paid_until" name="paid_until" type="date" className="bg-[#0A0A0A] border-[#1F1F1F] h-10" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="description" className="text-[10px] uppercase text-gray-500 tracking-widest">Descrição</Label>
                        <Textarea id="description" name="description" className="bg-[#0A0A0A] border-[#1F1F1F] resize-none h-20" />
                      </div>
                    </div>
                  </div>

                  {/* Owner Info */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 border-l-2 border-[#C6A355] pl-3 mb-4">
                      <h3 className="text-sm font-oswald uppercase tracking-widest text-[#C6A355]">Dados do Proprietário</h3>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label htmlFor="owner_name" className="text-[10px] uppercase text-gray-500 tracking-widest">Nome do Dono</Label>
                        <Input id="owner_name" name="owner_name" required className="bg-[#0A0A0A] border-[#1F1F1F] h-10" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="owner_email" className="text-[10px] uppercase text-gray-500 tracking-widest">E-mail (Login)</Label>
                        <Input id="owner_email" name="owner_email" type="email" required className="bg-[#0A0A0A] border-[#1F1F1F] h-10" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="owner_phone" className="text-[10px] uppercase text-gray-500 tracking-widest">Telefone</Label>
                          <Input id="owner_phone" name="owner_phone" required className="bg-[#0A0A0A] border-[#1F1F1F] h-10" />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="owner_password" className="text-[10px] uppercase text-gray-500 tracking-widest">Senha Inicial</Label>
                          <Input id="owner_password" name="owner_password" type="password" required className="bg-[#0A0A0A] border-[#1F1F1F] h-10" />
                        </div>
                      </div>
                      
                      <div className="pt-4 p-4 border border-[#C6A355]/20 bg-[#C6A355]/5 rounded-md flex items-center space-x-3">
                        <input 
                          type="checkbox" 
                          id="owner_is_barber_modal" 
                          checked={ownerIsBarber}
                          onChange={(e) => setOwnerIsBarber(e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-[#C6A355] focus:ring-[#C6A355]"
                        />
                        <Label htmlFor="owner_is_barber_modal" className="text-xs text-gray-300 cursor-pointer font-medium">
                          O dono também atende como barbeiro
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-6">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-[#C6A355] hover:bg-[#D4B466] text-black font-oswald uppercase tracking-widest w-full h-12 rounded-none transition-all"
                  >
                    {isSubmitting ? "PROCESSANDO..." : "CADASTRAR BARBEARIA"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* List Section */}
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-4">
            <div className="flex items-center gap-2 border-l-4 border-[#C6A355] pl-4">
              <h2 className="text-xl font-oswald uppercase tracking-widest text-[#C6A355]">Unidades Cadastradas</h2>
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Total: {barbershops.length}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-64 bg-[#141414] animate-pulse rounded-md" />
              ))
            ) : (barbershops || []).map((shop) => (
              <Card key={shop.id} className="bg-[#141414] border-[#1F1F1F] hover:border-gray-700 transition-colors group overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-6 space-y-4">
                    <div className="flex gap-4">
                      <Avatar className="w-16 h-16 rounded-md border border-[#1F1F1F] flex-shrink-0">
                        <AvatarImage src={shop.logo_url || ""} className="object-cover" />
                        <AvatarFallback className="bg-[#0A0A0A]">
                          <Store className="w-6 h-6 text-gray-700" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-oswald text-xl uppercase text-white truncate group-hover:text-[#C6A355] transition-colors">{shop.name}</h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#C6A355] font-medium uppercase tracking-wider mt-1">
                          <User className="w-3.5 h-3.5" />
                          <span className="truncate">{shop.owner?.name || "Sem dono"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-[11px] uppercase tracking-wider text-gray-400">
                      <div className="flex items-start gap-2">
                        <Mail className="w-3.5 h-3.5 mt-0.5 text-gray-600" />
                        <span className="truncate">{shop.address || "Sem endereço"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-600" />
                        <span>{shop.phone || shop.owner?.phone || "Sem telefone"}</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#1F1F1F] space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-gray-600 tracking-tighter">Status</Label>
                          <div className={cn(
                            "text-[10px] font-bold uppercase",
                            shop.blocked ? "text-red-500" : "text-green-500"
                          )}>
                            {STATUS_TRANSLATIONS[shop.subscription_status || "trialing"] || shop.subscription_status}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-gray-600 tracking-tighter">Valor Mensal</Label>
                          <div className="text-[10px] text-gray-300 font-medium">
                            {money(shop.monthly_price)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-gray-600 tracking-tighter">Vencimento (Pago Até)</Label>
                          <div className="text-[10px] text-gray-300">
                            {shop.paid_until ? format(new Date(shop.paid_until), "dd/MM/yyyy") : "Não definido"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] uppercase text-gray-600 tracking-tighter">Bloqueada</Label>
                          <div className={cn(
                            "text-[10px] font-bold uppercase",
                            shop.blocked ? "text-red-500" : "text-green-500"
                          )}>
                            {shop.blocked ? "Sim" : "Não"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1 flex-1 pr-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setPaymentModalShop(shop);
                              setPaymentValue(formatCurrencyInput(shop.monthly_price));
                              setPaidUntil(shop.paid_until || "");
                            }}
                            className="h-8 text-[10px] uppercase font-bold bg-[#C6A355] text-black border-none hover:bg-[#D4B466] w-full"
                          >
                            MARCAR PAGO
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setEditingBarbershop(shop);
                              setEditLogoPreview(shop.logo_url);
                              setEditMonthlyPrice(formatCurrencyInput(shop.monthly_price));
                            }}
                            className="h-9 w-9 bg-[#1A1A1A] hover:bg-[#C6A355] hover:text-black transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setDeletingId(shop.id)}
                            className="h-9 w-9 bg-[#1A1A1A] hover:bg-red-900 hover:text-white transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>

      {/* Edit Modal */}
      <Dialog open={!!editingBarbershop} onOpenChange={(open) => !open && setEditingBarbershop(null)}>
        <DialogContent className="bg-[#141414] border-[#1F1F1F] text-white">
          <DialogHeader>
            <DialogTitle className="font-oswald uppercase text-[#C6A355]">Editar Unidade</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-6 pt-4">
            <div className="flex flex-col items-center gap-4">
               <Avatar className="w-24 h-24 border border-[#1F1F1F]">
                <AvatarImage src={editLogoPreview || ""} className="object-cover" />
                <AvatarFallback className="bg-[#0A0A0A]">
                  <Store className="w-10 h-10 text-gray-700" />
                </AvatarFallback>
              </Avatar>
              <Button 
                type="button"
                variant="outline" 
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => handleFileChange(e as any, true);
                  input.click();
                }}
                className="bg-[#1A1A1A] border-[#1F1F1F] text-xs h-8"
              >
                Trocar Logo
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-gray-500">Nome</Label>
                  <Input name="name" defaultValue={editingBarbershop?.name} className="bg-[#0A0A0A] border-[#1F1F1F]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-gray-500">Valor Mensal</Label>
                  <Input 
                    name="monthly_price" 
                    type="text" 
                    placeholder="R$ 0,00" 
                    value={editMonthlyPrice}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      const numberValue = value ? parseInt(value) / 100 : 0;
                      setEditMonthlyPrice(formatCurrencyInput(numberValue));
                    }}
                    className="bg-[#0A0A0A] border-[#1F1F1F]" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-gray-500">Status Assinatura</Label>
                  <Select name="subscription_status" defaultValue={editingBarbershop?.subscription_status || "trialing"}>
                    <SelectTrigger className="bg-[#0A0A0A] border-[#1F1F1F] h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141414] border-[#1F1F1F] text-white">
                      {Object.entries(STATUS_TRANSLATIONS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-gray-500">Pago Até (Vencimento)</Label>
                  <Input name="paid_until" type="date" defaultValue={editingBarbershop?.paid_until || ""} className="bg-[#0A0A0A] border-[#1F1F1F]" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-gray-500">Telefone</Label>
                  <Input name="phone" defaultValue={editingBarbershop?.phone || ""} className="bg-[#0A0A0A] border-[#1F1F1F]" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-gray-500">Endereço</Label>
                <Input name="address" defaultValue={editingBarbershop?.address || ""} className="bg-[#0A0A0A] border-[#1F1F1F]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-gray-500">Descrição</Label>
                <Textarea name="description" defaultValue={editingBarbershop?.description || ""} className="bg-[#0A0A0A] border-[#1F1F1F] resize-none h-24" />
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#C6A355] hover:bg-[#D4B466] text-black font-oswald uppercase tracking-widest w-full rounded-none"
              >
                {isSubmitting ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent className="bg-[#141414] border-[#1F1F1F] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-oswald uppercase text-red-500">Excluir Barbearia?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Essa ação pode remover ou desvincular dados da barbearia. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#1A1A1A] border-[#1F1F1F] text-white hover:bg-[#252525] rounded-none border-none">CANCELAR</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-oswald tracking-widest rounded-none border-none"
            >
              EXCLUIR
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment Modal */}
      <Dialog open={!!paymentModalShop} onOpenChange={(open) => !open && setPaymentModalShop(null)}>
        <DialogContent className="bg-[#141414] border-[#1F1F1F] text-white">
          <DialogHeader>
            <DialogTitle className="font-oswald uppercase text-[#C6A355]">Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-gray-500">Valor Mensal (Atual: {money(paymentModalShop?.monthly_price)})</Label>
              <Input 
                type="text" 
                value={paymentValue} 
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  const numberValue = value ? parseInt(value) / 100 : 0;
                  setPaymentValue(formatCurrencyInput(numberValue));
                }}
                placeholder="R$ 0,00"
                className="bg-[#0A0A0A] border-[#1F1F1F]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-gray-500">Novo Vencimento (Pago até)</Label>
              <Input 
                type="date" 
                value={paidUntil} 
                onChange={(e) => setPaidUntil(e.target.value)}
                className="bg-[#0A0A0A] border-[#1F1F1F]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleMarkPaid}
              disabled={isSubmitting}
              className="bg-[#C6A355] hover:bg-[#D4B466] text-black font-oswald uppercase tracking-widest w-full"
            >
              {isSubmitting ? "PROCESSANDO..." : "CONFIRMAR PAGAMENTO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProfileModal 

        isOpen={isProfileModalOpen} 
        onOpenChange={setIsProfileModalOpen} 
      />
    </div>
  );
}