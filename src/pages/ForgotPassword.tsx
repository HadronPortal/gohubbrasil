import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, MailCheck, Loader2 } from "lucide-react";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (error: any) {
      const msg = error?.message || "";
      let friendly = "Não foi possível enviar o e-mail. Tente novamente.";
      if (/rate limit/i.test(msg)) {
        friendly = "Muitas tentativas. Aguarde alguns instantes e tente novamente.";
      } else if (/invalid/i.test(msg) || /email/i.test(msg)) {
        friendly = "Informe um e-mail válido.";
      }
      setFieldError(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100]">
        <LoadingScreen />
      </div>
    );
  }

  return (
    <AuthPageShell>
      <AuthCard
        title={sent ? "E-mail enviado" : "Recuperar senha"}
        description={
          sent
            ? "Enviamos as instruções para o e-mail informado. Verifique sua caixa de entrada e o spam."
            : "Informe seu e-mail para receber as instruções de recuperação"
        }
      >
        {sent ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-[8px] border border-[#DDE3EE] bg-[#F6F7FB] p-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3157D5]/10">
                <MailCheck className="h-5 w-5 text-[#3157D5]" />
              </div>
              <p className="text-sm text-[#172033]">
                Enviado para{" "}
                <span className="font-semibold">{email}</span>
              </p>
            </div>
            <Button
              type="button"
              onClick={() => navigate("/login")}
              className="h-[50px] w-full rounded-[8px] bg-[#3157D5] text-base font-semibold text-white hover:bg-[#274ac0] active:bg-[#1f3ea3]"
            >
              Voltar para entrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-3">
            <div className="space-y-1.5">
              <AuthInput
                icon={<Mail className="h-4 w-4" />}
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldError) setFieldError(null);
                }}
                required
                autoComplete="email"
                aria-invalid={!!fieldError}
              />
              {fieldError && (
                <p className="px-1 text-xs font-medium text-[#DC2626]">
                  {fieldError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="h-[50px] w-full rounded-[8px] bg-[#3157D5] text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#274ac0] active:bg-[#1f3ea3] disabled:opacity-70"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </span>
              ) : (
                "Enviar instruções"
              )}
            </Button>

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="flex w-full items-center justify-center gap-1.5 pt-1 text-sm font-medium text-[#64748B] hover:text-[#172033]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para entrar
            </button>
          </form>
        )}
      </AuthCard>
    </AuthPageShell>
  );
}
