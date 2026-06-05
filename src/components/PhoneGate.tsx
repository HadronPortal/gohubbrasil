import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function PhoneGate({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkPhone();
  }, []);

  const checkPhone = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setChecking(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("phone")
      .eq("id", user.id)
      .single();

    if (profile && !profile.phone) {
      setIsOpen(true);
    }
    setChecking(false);
  };

  const handleSavePhone = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Informe um WhatsApp/Telefone válido (DDD + número)");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("users")
        .update({ phone })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Telefone atualizado com sucesso!");
      setIsOpen(false);
      window.location.reload(); // Refresh to continue flow
    } catch (error: any) {
      toast.error("Erro ao salvar telefone");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (checking) return null;

  return (
    <>
      {children}
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] p-6 rounded-[8px] [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="font-oswald uppercase text-[#f0c040] tracking-widest text-lg">
              Precisamos do seu WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-[#8a9ab5]">
              Para continuar, precisamos confirmar seu número de contato.
            </p>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-[#8a9ab5] tracking-widest font-bold flex items-center gap-2">
                <Phone className="w-3 h-3 text-[#f0c040]" /> WHATSAPP
              </Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="(00) 00000-0000"
                className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8] h-12 focus-visible:ring-[#f0c040] rounded-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSavePhone}
              disabled={isLoading || !phone}
              className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold h-12 rounded-none"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "SALVAR E CONTINUAR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
