import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Scissors, Store, User, Mail, Phone, Lock, 
  ArrowLeft, Upload, Edit2, Trash2, X, Check, CreditCard, Plus
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Barbershop {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  description: string | null;
  payment_status: string | null;
  owner?: {
    name: string;
    phone?: string;
  };
}

export default function SuperAdmin() {
  const { profile, isSuperAdmin, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [ownerIsBarber, setOwnerIsBarber] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit State
  const [editingBarbershop, setEditingBarbershop] = useState<Barbershop | null>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
        <Scissors className="w-12 h-12 text-[#C6A355] animate-bounce mb-4" />
        <p className="text-white font-oswald tracking-widest uppercase">Carregando...</p>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" />;
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
    
    try {
      let logoUrl = "";
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }

      const { data: response, error } = await supabase.functions.invoke("create-barbershop-with-owner", {
        body: {
          barbershopName: formData.get("barbershop_name") as string,
          barbershopAddress: formData.get("barbershop_address") as string,
          barbershopPhone: formData.get("barbershop_phone") as string,
          logoUrl,
          description: formData.get("description") as string,
          paymentStatus: formData.get("payment_status") as string || "pending",
          ownerName: formData.get("owner_name") as string,
          ownerEmail: formData.get("owner_email") as string,
          ownerPhone: formData.get("owner_phone") as string,
          ownerPassword: formData.get("owner_password") as string,
          ownerIsBarber: ownerIsBarber
        }
      });

      if (error) throw error;

      if (response && response.success === false) {
        toast.error(response.error || "Erro ao criar barbearia.");
      } else {
        toast.success("Barbearia cadastrada com sucesso");
        setIsCreateModalOpen(false);
        (e.target as HTMLFormElement).reset();
        setLogoFile(null);
        setLogoPreview(null);
        setOwnerIsBarber(false);
        fetchBarbershops();
      }
    } catch (error: any) {
      console.error("Erro ao criar barbearia:", error);
      toast.error(error.message || "Erro ao criar barbearia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBarbershop) return;
    
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

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
          logo_url: logoUrl
        })
        .eq("id", editingBarbershop.id);

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
    <div className="min-h-screen bg-[#0A0A0A] p-4 md:p-8 text-white font-light">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 bg-[#1A1A1A] rounded-full text-white hover:bg-[#252525] transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-oswald uppercase tracking-wider">Super Admin</h1>
        </div>

        {/* Cadastro Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-l-4 border-[#C6A355] pl-4">
            <h2 className="text-xl font-oswald uppercase tracking-widest text-[#C6A355]">Nova Barbearia</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Logo Upload Card */}
              <Card className="bg-[#141414] border-[#1F1F1F] flex flex-col items-center justify-center p-8 space-y-4">
                <Label className="text-gray-300 font-oswald uppercase tracking-widest text-xs">Logo da Barbearia</Label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer"
                >
                  <Avatar className="w-32 h-32 border-2 border-[#1F1F1F] group-hover:border-[#C6A355] transition-colors">
                    <AvatarImage src={logoPreview || ""} className="object-cover" />
                    <AvatarFallback className="bg-[#0A0A0A]">
                      <Store className="w-12 h-12 text-gray-700" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <Upload className="w-6 h-6 text-[#C6A355]" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleFileChange(e)}
                />
                <p className="text-[10px] text-gray-500 uppercase tracking-tighter text-center">
                  Clique para selecionar uma imagem
                </p>
              </Card>

              {/* Barbearia Info */}
              <Card className="bg-[#141414] border-[#1F1F1F]">
                <CardHeader>
                  <CardTitle className="text-sm font-oswald uppercase text-[#C6A355]">Detalhes da Unidade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="barbershop_name" className="text-[10px] uppercase text-gray-500 tracking-widest">Nome</Label>
                    <Input id="barbershop_name" name="barbershop_name" required className="bg-[#0A0A0A] border-[#1F1F1F] h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="barbershop_address" className="text-[10px] uppercase text-gray-500 tracking-widest">Endereço</Label>
                    <Input id="barbershop_address" name="barbershop_address" required className="bg-[#0A0A0A] border-[#1F1F1F] h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="barbershop_phone" className="text-[10px] uppercase text-gray-500 tracking-widest">WhatsApp</Label>
                    <Input id="barbershop_phone" name="barbershop_phone" required className="bg-[#0A0A0A] border-[#1F1F1F] h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="description" className="text-[10px] uppercase text-gray-500 tracking-widest">Descrição</Label>
                    <Textarea id="description" name="description" className="bg-[#0A0A0A] border-[#1F1F1F] resize-none h-20" />
                  </div>
                </CardContent>
              </Card>

              {/* Owner Info */}
              <Card className="bg-[#141414] border-[#1F1F1F]">
                <CardHeader>
                  <CardTitle className="text-sm font-oswald uppercase text-[#C6A355]">Dados do Proprietário</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="owner_name" className="text-[10px] uppercase text-gray-500 tracking-widest">Nome Completo</Label>
                    <Input id="owner_name" name="owner_name" required className="bg-[#0A0A0A] border-[#1F1F1F] h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="owner_email" className="text-[10px] uppercase text-gray-500 tracking-widest">Email de Acesso</Label>
                    <Input id="owner_email" name="owner_email" type="email" required className="bg-[#0A0A0A] border-[#1F1F1F] h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="owner_phone" className="text-[10px] uppercase text-gray-500 tracking-widest">Telefone Celular</Label>
                    <Input id="owner_phone" name="owner_phone" required className="bg-[#0A0A0A] border-[#1F1F1F] h-9" />
                  </div>
                   <div className="pt-2 flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="owner_is_barber" 
                      checked={ownerIsBarber}
                      onChange={(e) => setOwnerIsBarber(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#C6A355] focus:ring-[#C6A355]"
                    />
                    <Label htmlFor="owner_is_barber" className="text-xs text-gray-300 cursor-pointer">Esse dono também atende como barbeiro</Label>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#C6A355] hover:bg-[#D4B466] text-black font-oswald uppercase tracking-widest px-8 rounded-none h-12 transition-all"
              >
                {isSubmitting ? "PROCESSANDO..." : "CADASTRAR UNIDADE"}
              </Button>
            </div>
          </form>
        </section>

        {/* List Section */}
        <section className="space-y-6 pt-12 border-t border-[#1F1F1F]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 border-l-4 border-[#C6A355] pl-4">
              <h2 className="text-xl font-oswald uppercase tracking-widest text-[#C6A355]">Unidades Ativas</h2>
            </div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">Total: {barbershops.length}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 bg-[#141414] animate-pulse rounded-md" />
              ))
            ) : barbershops.map((shop) => (
              <Card key={shop.id} className="bg-[#141414] border-[#1F1F1F] hover:border-gray-700 transition-colors group">
                <CardContent className="p-6 flex gap-4">
                  <Avatar className="w-16 h-16 rounded-md border border-[#1F1F1F]">
                    <AvatarImage src={shop.logo_url || ""} className="object-cover" />
                    <AvatarFallback className="bg-[#0A0A0A]">
                      <Store className="w-6 h-6 text-gray-700" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-oswald uppercase text-white truncate">{shop.name}</h3>
                    <p className="text-[10px] text-gray-500 uppercase truncate">{shop.address}</p>
                    <div className="flex items-center gap-1 text-[10px] text-[#C6A355] font-medium">
                      <User className="w-3 h-3" />
                      <span className="truncate">{shop.owner?.name || "Sem dono"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        setEditingBarbershop(shop);
                        setEditLogoPreview(shop.logo_url);
                      }}
                      className="h-8 w-8 bg-[#1A1A1A] hover:bg-[#C6A355] hover:text-black transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setDeletingId(shop.id)}
                      className="h-8 w-8 bg-[#1A1A1A] hover:bg-red-900 hover:text-white transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-gray-500">Nome</Label>
                <Input name="name" defaultValue={editingBarbershop?.name} className="bg-[#0A0A0A] border-[#1F1F1F]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-gray-500">Endereço</Label>
                <Input name="address" defaultValue={editingBarbershop?.address || ""} className="bg-[#0A0A0A] border-[#1F1F1F]" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase text-gray-500">Telefone</Label>
                <Input name="phone" defaultValue={editingBarbershop?.phone || ""} className="bg-[#0A0A0A] border-[#1F1F1F]" />
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
    </div>
  );
}