import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogOut, Phone as PhoneIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function PhoneGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);

  const isGoogleLogin =
    user?.app_metadata?.provider === "google" ||
    user?.identities?.some((identity: any) => identity.provider === "google");

  const phoneMissing = !profile?.phone || String(profile.phone).trim() === "";
  const isSuperAdmin = profile?.role?.toLowerCase() === "superadmin";
  const shouldShowGate =
    !authLoading &&
    Boolean(user) &&
    Boolean(profile) &&
    Boolean(isGoogleLogin) &&
    !isSuperAdmin &&
    phoneMissing &&
    !phoneSaved;

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);

    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  useEffect(() => {
    if (!phoneMissing) {
      setPhoneSaved(false);
    }
  }, [phoneMissing]);

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
      setPhoneSaved(true);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar telefone");
      console.error("Erro ao salvar telefone:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    await supabase.auth.signOut().catch(() => undefined);
    setPhoneSaved(false);
    setPhone("");
    window.location.replace("/login");
  };

  if (shouldShowGate) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-[#172033]">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[430px] flex-col justify-center">
          <section className="rounded-[28px] border border-[#E5EAF3] bg-white p-7 shadow-[0_20px_60px_rgba(23,32,51,0.14)]">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF3FF] text-[#3157D5]">
              <PhoneIcon className="h-7 w-7" />
            </div>

            <h1 className="text-center text-2xl font-extrabold leading-tight tracking-[-0.02em] text-[#172033]">
              Precisamos do seu WhatsApp
            </h1>
            <p className="mt-4 text-center text-base leading-relaxed text-[#66748A]">
              Informe seu numero para receber confirmacoes e avisos sobre seus agendamentos.
            </p>

            <div className="mt-7 space-y-2">
              <Label className="text-sm font-semibold text-[#172033]">WhatsApp</Label>
              <div className="relative">
                <PhoneIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8A9AB5]" />
                <Input
                  type="tel"
                  inputMode="tel"
                  value={formatPhone(phone)}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="(00) 00000-0000"
                  className="h-14 rounded-2xl border-[#DDE6F4] bg-white pl-12 text-lg text-[#172033] shadow-sm focus-visible:border-[#3157D5] focus-visible:ring-[#3157D5]/20"
                />
              </div>
            </div>

            <div className="mt-7 space-y-3">
              <Button
                onClick={handleSavePhone}
                disabled={isLoading || String(phone || "").replace(/\D/g, "").length < 10}
                className="h-14 w-full rounded-2xl bg-[#3157D5] text-base font-bold text-white shadow-[0_14px_28px_rgba(49,87,213,0.24)] hover:bg-[#284AC0] disabled:bg-[#9DADEB]"
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar e continuar"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="h-12 w-full rounded-2xl border-[#DDE6F4] bg-white text-base font-bold text-[#172033] hover:bg-[#F5F7FB]"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cancelar e voltar ao login
              </Button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
