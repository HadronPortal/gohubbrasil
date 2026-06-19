import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Lock, Loader2 } from "lucide-react";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { LoadingScreen } from "@/components/LoadingScreen";

type State = "checking" | "ready" | "expired" | "success";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [state, setState] = useState<State>("checking");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      setState(session ? "ready" : "expired");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    if (password.length < 6) {
      setFieldError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setFieldError("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setState("success");
    } catch (error: any) {
      setFieldError(error?.message || "Erro ao atualizar senha.");
    } finally {
      setIsLoading(false);
    }
  };

  if (state === "checking" || isLoading) {
    return (
      <div className="fixed inset-0 z-[100]">
        <LoadingScreen />
      </div>
    );
  }

  if (state === "expired") {
    return (
      <AuthPageShell>
        <AuthCard
          title="Link expirado"
          description="Este link de recuperação não é mais válido. Solicite um novo para continuar."
        >
          <div className="space-y-3">
            <Button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="h-[50px] w-full rounded-[8px] bg-[#3157D5] text-base font-semibold text-white hover:bg-[#274ac0] active:bg-[#1f3ea3]"
            >
              Solicitar novo link
            </Button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="flex w-full items-center justify-center gap-1.5 pt-1 text-sm font-medium text-[#64748B] hover:text-[#172033]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para entrar
            </button>
          </div>
        </AuthCard>
      </AuthPageShell>
    );
  }

  if (state === "success") {
    return (
      <AuthPageShell>
        <AuthCard
          title="Senha alterada"
          description="Sua senha foi atualizada com sucesso. Agora você já pode entrar com a nova senha."
        >
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-[8px] border border-[#DDE3EE] bg-[#F6F7FB] p-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#16A34A]/10">
                <CheckCircle2 className="h-5 w-5 text-[#16A34A]" />
              </div>
              <p className="text-sm text-[#172033]">Tudo certo!</p>
            </div>
            <Button
              type="button"
              onClick={() => navigate("/login")}
              className="h-[50px] w-full rounded-[8px] bg-[#3157D5] text-base font-semibold text-white hover:bg-[#274ac0] active:bg-[#1f3ea3]"
            >
              Entrar
            </Button>
          </div>
        </AuthCard>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell>
      <AuthCard
        title="Redefinir senha"
        description="Escolha uma nova senha segura para sua conta."
      >
        <form onSubmit={handleUpdatePassword} className="space-y-3">
          <AuthInput
            icon={<Lock className="h-4 w-4" />}
            type="password"
            placeholder="Nova senha"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldError) setFieldError(null);
            }}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <div className="space-y-1.5">
            <AuthInput
              icon={<Lock className="h-4 w-4" />}
              type="password"
              placeholder="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldError) setFieldError(null);
              }}
              required
              minLength={6}
              autoComplete="new-password"
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
                Salvando...
              </span>
            ) : (
              "Definir nova senha"
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
      </AuthCard>
    </AuthPageShell>
  );
}
