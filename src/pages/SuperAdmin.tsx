import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Scissors, Store, User, Mail, Phone, Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

export default function SuperAdmin() {
  const { profile, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
        <Scissors className="w-12 h-12 text-[#C6A355] animate-bounce mb-4" />
        <p className="text-white font-oswald tracking-widest uppercase">Carregando...</p>
      </div>
    );
  }

  if (!profile?.isSuperAdmin) {
    return <Navigate to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      barbershop_name: formData.get("barbershop_name"),
      barbershop_address: formData.get("barbershop_address"),
      barbershop_phone: formData.get("barbershop_phone"),
      owner_name: formData.get("owner_name"),
      owner_email: formData.get("owner_email"),
      owner_phone: formData.get("owner_phone"),
      owner_password: formData.get("owner_password"),
    };

    try {
      const { data: response, error } = await supabase.functions.invoke("create-barbershop", {
        body: data,
      });

      if (error) throw error;

      toast.success("Barbearia e dono criados com sucesso!");
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      console.error("Erro ao criar barbearia:", error);
      toast.error(error.message || "Erro ao criar barbearia. Verifique os dados e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="p-2 bg-[#1A1A1A] rounded-full text-white hover:bg-[#252525] transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-oswald text-white uppercase tracking-wider">Super Admin</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Dados da Barbearia */}
            <Card className="bg-[#141414] border-[#1F1F1F] shadow-2xl">
              <CardHeader className="border-b border-[#1F1F1F]/50 pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#C6A355]/10 rounded-lg">
                    <Store className="w-6 h-6 text-[#C6A355]" />
                  </div>
                  <div>
                    <CardTitle className="text-white font-oswald uppercase tracking-wider">Barbearia</CardTitle>
                    <CardDescription className="text-gray-400">Informações da nova unidade</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="barbershop_name" className="text-gray-300 font-oswald uppercase tracking-widest text-xs">Nome da Barbearia</Label>
                  <Input id="barbershop_name" name="barbershop_name" required className="bg-[#0A0A0A] border-[#1F1F1F] text-white focus:border-[#C6A355] transition-colors" placeholder="Ex: Barber Shop Matriz" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barbershop_address" className="text-gray-300 font-oswald uppercase tracking-widest text-xs">Endereço</Label>
                  <Input id="barbershop_address" name="barbershop_address" required className="bg-[#0A0A0A] border-[#1F1F1F] text-white focus:border-[#C6A355] transition-colors" placeholder="Rua, Número, Bairro, Cidade" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barbershop_phone" className="text-gray-300 font-oswald uppercase tracking-widest text-xs">WhatsApp da Barbearia</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input id="barbershop_phone" name="barbershop_phone" required className="bg-[#0A0A0A] border-[#1F1F1F] text-white pl-10 focus:border-[#C6A355] transition-colors" placeholder="(00) 00000-0000" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados do Dono */}
            <Card className="bg-[#141414] border-[#1F1F1F] shadow-2xl">
              <CardHeader className="border-b border-[#1F1F1F]/50 pb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#C6A355]/10 rounded-lg">
                    <User className="w-6 h-6 text-[#C6A355]" />
                  </div>
                  <div>
                    <CardTitle className="text-white font-oswald uppercase tracking-wider">Proprietário</CardTitle>
                    <CardDescription className="text-gray-400">Informações do responsável</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="owner_name" className="text-gray-300 font-oswald uppercase tracking-widest text-xs">Nome do Dono</Label>
                  <Input id="owner_name" name="owner_name" required className="bg-[#0A0A0A] border-[#1F1F1F] text-white focus:border-[#C6A355] transition-colors" placeholder="Nome Completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_email" className="text-gray-300 font-oswald uppercase tracking-widest text-xs">E-mail do Dono</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input id="owner_email" name="owner_email" type="email" required className="bg-[#0A0A0A] border-[#1F1F1F] text-white pl-10 focus:border-[#C6A355] transition-colors" placeholder="email@exemplo.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_phone" className="text-gray-300 font-oswald uppercase tracking-widest text-xs">Telefone do Dono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input id="owner_phone" name="owner_phone" required className="bg-[#0A0A0A] border-[#1F1F1F] text-white pl-10 focus:border-[#C6A355] transition-colors" placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_password" className="text-gray-300 font-oswald uppercase tracking-widest text-xs">Senha Inicial</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input id="owner_password" name="owner_password" type="password" required className="bg-[#0A0A0A] border-[#1F1F1F] text-white pl-10 focus:border-[#C6A355] transition-colors" placeholder="Min. 6 caracteres" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-[#C6A355] hover:bg-[#D4B466] text-black font-oswald uppercase tracking-[3px] py-6 px-12 rounded-none transition-all duration-300 disabled:opacity-50"
            >
              {isSubmitting ? "CRIANDO UNIDADE..." : "CADASTRAR BARBEARIA"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
