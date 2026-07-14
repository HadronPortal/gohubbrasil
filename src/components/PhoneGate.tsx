import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogOut } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { useAuth } from "@/contexts/AuthContext";

export function PhoneGate({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyScrolledToEnd, setPolicyScrolledToEnd] = useState(false);

  const isGoogleLogin =
    user?.app_metadata?.provider === "google" ||
    user?.identities?.some((identity: any) => identity.provider === "google");

  const phoneDigits = String(profile?.phone || "").replace(/\D/g, "");
  const phoneMissing = phoneDigits.length < 10;
  const role = String(profile?.role || "client").toLowerCase();
  const isSuperAdmin = role === "superadmin" || Boolean((profile as any)?.isSuperAdmin);
  const isStaff =
    isSuperAdmin ||
    role === "owner" ||
    role === "admin" ||
    role === "barber" ||
    role === "professional";
  const policyAccepted = Boolean(profile?.whatsapp_policy_accepted);
  // Só mostrar qualquer gate para cliente novo (Google) que ainda não tem telefone.
  const gateEligible =
    !authLoading &&
    Boolean(user) &&
    Boolean(profile) &&
    Boolean(isGoogleLogin) &&
    !isStaff &&
    phoneMissing;
  const shouldShowPolicyGate = gateEligible && !policyAccepted;
  const shouldShowGate = gateEligible && policyAccepted && !phoneSaved;

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
      setPhoneSaved(true);
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
      try {
        await supabase.rpc(
          "claim_manual_client_account" as any,
          { p_phone: cleanPhone, p_name: profile?.name || user.user_metadata?.full_name || user.user_metadata?.name || null } as any
        );
      } catch (mergeErr) {
        console.warn("claim_manual_client_account:", mergeErr);
      }
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

  const handleAcceptPolicy = async () => {
    if (!user) return;
    setPolicyLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .update({
          whatsapp_policy_accepted: true,
          whatsapp_policy_accepted_at: new Date().toISOString(),
        } as any)
        .eq("id", user.id)
        .select("whatsapp_policy_accepted, whatsapp_policy_accepted_at")
        .maybeSingle();
      if (error) throw error;
      if (!data?.whatsapp_policy_accepted) {
        throw new Error("Não foi possível registrar o consentimento. Tente novamente.");
      }
      await refreshProfile();
    } catch (error: any) {
      console.error("Erro ao registrar consentimento WhatsApp:", error);
      toast.error(error.message || "Erro ao registrar consentimento");
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleRejectPolicy = async () => {
    setPolicyLoading(true);
    await supabase.auth.signOut().catch(() => undefined);
    window.location.replace("/login");
  };

  if (shouldShowPolicyGate) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-[#172033]">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[480px] flex-col justify-center">
          <section className="rounded-[28px] border border-[#E5EAF3] bg-white p-7 shadow-[0_20px_60px_rgba(23,32,51,0.14)]">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center">
              <WhatsAppIcon size={64} />
            </div>

            <h1 className="text-center text-2xl font-extrabold leading-tight tracking-[-0.02em] text-[#172033]">
              Política de uso do WhatsApp
            </h1>

            <div
              className="no-scrollbar mt-5 max-h-[55vh] space-y-4 overflow-y-auto pr-1 text-sm leading-relaxed text-[#475569]"
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollHeight - el.scrollTop - el.clientHeight <= 8) {
                  setPolicyScrolledToEnd(true);
                }
              }}
              ref={(el) => {
                if (el && el.scrollHeight <= el.clientHeight + 8) {
                  setPolicyScrolledToEnd(true);
                }
              }}
            >
              <p>
                Para melhorar sua experiência no GoHub, usamos o seu número de WhatsApp para enviar mensagens relacionadas aos seus agendamentos e atendimentos.
              </p>
              <p>
                Ao concordar, você autoriza o GoHub e os estabelecimentos nos quais você realizar agendamentos a utilizarem seu número de WhatsApp para enviar:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>confirmação de agendamento;</li>
                <li>lembretes de horário;</li>
                <li>avisos de cancelamento ou alteração;</li>
                <li>mensagens importantes sobre o atendimento solicitado;</li>
                <li>comunicações relacionadas ao serviço contratado ou agendado.</li>
              </ul>
              <div>
                <p className="font-semibold text-[#172033]">Dados utilizados:</p>
                <p>
                  Podemos tratar dados como nome, telefone, estabelecimento escolhido, serviço agendado, profissional, data e horário do atendimento. Esses dados serão usados apenas para funcionamento do agendamento, comunicação com o cliente, segurança e melhoria do serviço.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#172033]">Compartilhamento:</p>
                <p>
                  Seu número e dados do agendamento poderão ser compartilhados somente com o estabelecimento e profissional envolvidos no atendimento. As mensagens são enviadas pelo WhatsApp, serviço pertencente à Meta, sujeito também aos termos e políticas da própria plataforma.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#172033]">Privacidade:</p>
                <p>
                  Não vendemos seus dados pessoais. Você pode solicitar a atualização ou remoção dos seus dados conforme previsto na Lei Geral de Proteção de Dados (LGPD).
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#172033]">Consentimento:</p>
                <p>
                  Ao clicar em "Concordo", você confirma que leu e aceita receber comunicações pelo WhatsApp relacionadas aos seus agendamentos no GoHub.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button
                onClick={handleAcceptPolicy}
                disabled={policyLoading || !policyScrolledToEnd}
                className="h-14 w-full rounded-2xl bg-[#3157D5] text-base font-bold text-white shadow-[0_14px_28px_rgba(49,87,213,0.24)] hover:bg-[#284AC0] disabled:cursor-default disabled:bg-[#E5EAF3] disabled:text-[#9DADEB] disabled:shadow-none disabled:opacity-100"
              >
                {policyLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Concordo"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleRejectPolicy}
                disabled={policyLoading}
                className="h-12 w-full rounded-2xl text-sm font-semibold text-[#66748A] hover:bg-[#F5F7FB] hover:text-[#172033]"
              >
                Não concordo
              </Button>
              <p className="pt-1 text-center text-xs text-[#8A9AB5]">
                Você pode alterar seus dados de contato posteriormente na área de Perfil.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (shouldShowGate) {
    return (
      <main className="min-h-screen bg-white px-6 py-10 text-[#172033]">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[430px] flex-col justify-center">
          <section className="rounded-[28px] border border-[#E5EAF3] bg-white p-7 shadow-[0_20px_60px_rgba(23,32,51,0.14)]">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center">
              <WhatsAppIcon size={64} />
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
                <WhatsAppIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" size={22} />
                <Input
                  type="tel"
                  inputMode="tel"
                  value={formatPhone(phone)}
                  onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="(00) 00000-0000"
                  className="h-14 rounded-2xl border-[#DDE6F4] bg-white pl-14 text-lg text-[#172033] shadow-sm focus-visible:border-[#3157D5] focus-visible:ring-[#3157D5]/20"
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
