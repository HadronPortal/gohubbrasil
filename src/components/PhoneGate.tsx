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

  const formatPhoneBR = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10)
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

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
        <DialogContent className="gohub-client max-w-[420px] w-[calc(100vw-32px)] sm:w-full bg-white border-0 text-slate-900 p-6 rounded-[16px] shadow-xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 tracking-normal normal-case">
              Precisamos do seu WhatsApp
            </DialogTitle>
          </DialogHeader>
          <div className="pt-1 pb-2 space-y-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              Informe seu número para receber confirmações e avisos sobre seus agendamentos.
            </p>
            <div className="space-y-2">
              <Label htmlFor="phonegate-whatsapp" className="text-sm font-medium text-slate-700">
                WhatsApp
              </Label>
              <div className="relative">
                <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="phonegate-whatsapp"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={formatPhoneBR(phone)}
                  onChange={(event) =>
                    setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                  placeholder="(00) 00000-0000"
                  className="h-12 pl-10 rounded-[10px] border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#3157D5] focus-visible:ring-2 focus-visible:ring-[#3157D5]/20 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSavePhone}
              disabled={isLoading || !phone}
              className="w-full bg-[#3157D5] hover:bg-[#2747b8] text-white font-semibold h-12 rounded-[10px] shadow-sm"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar e continuar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
