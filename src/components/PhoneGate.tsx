import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone as PhoneIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function PhoneGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user && profile) {
      const isGoogleLogin =
        user?.app_metadata?.provider === "google" ||
        user?.identities?.some((identity: any) => identity.provider === "google");

      const phoneMissing = !profile?.phone || String(profile.phone).trim() === "";
      const isSuperAdmin = profile?.role?.toLowerCase() === "superadmin";

      setIsOpen(isGoogleLogin && !isSuperAdmin && phoneMissing);
    }
  }, [authLoading, user, profile]);

  const handleSavePhone = async () => {
    const cleanPhone = String(phone || "").replace(/\D/g, "");

    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Informe um WhatsApp/Telefone valido (DDD + numero)");
      return;
    }

    setIsLoading(true);
    try {
      if (!user) {
        throw new Error("Usuario nao autenticado");
      }

      const { error: rpcError } = await supabase.rpc(
        "save_my_phone" as any,
        { p_phone: cleanPhone } as any
      );

      if (rpcError) {
        const { error } = await supabase
          .from("users")
          .upsert(
            {
              id: user.id,
              role: profile?.role || "client",
              barbershop_id: profile?.barbershop_id || null,
              name:
                profile?.name ||
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                user.email ||
                "Cliente",
              phone: cleanPhone,
              avatar_url:
                profile?.avatar_url ||
                user.user_metadata?.avatar_url ||
                user.user_metadata?.picture ||
                null,
            } as any,
            { onConflict: "id" }
          );

        if (error) {
          throw error;
        }
      }

      const { data: savedProfile, error: verifyError } = await supabase
        .from("users")
        .select("phone")
        .eq("id", user.id)
        .maybeSingle();

      if (verifyError) {
        throw verifyError;
      }

      if (!savedProfile?.phone || String(savedProfile.phone).trim() === "") {
        throw new Error("Telefone nao foi gravado no perfil");
      }

      toast.success("Telefone atualizado com sucesso!");
      await refreshProfile();
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar telefone");
      console.error("Erro ao salvar telefone:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
              Para continuar, precisamos confirmar seu numero de contato.
            </p>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase text-[#8a9ab5] tracking-widest font-bold flex items-center gap-2">
                <PhoneIcon className="w-3 h-3 text-[#f0c040]" /> WHATSAPP
              </Label>
              <Input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, ""))}
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
