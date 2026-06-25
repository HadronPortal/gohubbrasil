import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, User as UserIcon, Phone } from "lucide-react";
import { getPostLoginRoute } from "@/lib/postLoginRoute";
import loginBg from "@/assets/login/gohub-beauty-background.webp";
import gohubLogo from "@/assets/login/gohub-logo.png";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && profile) {
      localStorage.removeItem('force_barber_panel');
      navigate(getPostLoginRoute(profile), { replace: true });
    }
  }, [user, profile, loading, navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName,
              phone: whatsapp,
              role: "client",
            },
          },
        });

        if (authError) throw authError;

        toast.success("Conta criada com sucesso!");
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        const userId = data.user?.id;
        if (!userId) throw new Error("Usuário não encontrado");

        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError) throw profileError;

        localStorage.removeItem("force_barber_panel");
        navigate(getPostLoginRoute(userProfile), { replace: true });
      }
    } catch (error: any) {
      let friendlyMessage = "Ocorreu um erro. Por favor, tente novamente.";
      
      const message = error.message || "";
      
      if (message.includes("Invalid login credentials")) {
        friendlyMessage = "E-mail ou senha incorretos. Verifique seus dados e tente novamente.";
      } else if (message.includes("Email not confirmed")) {
        friendlyMessage = "Por favor, confirme seu e-mail para acessar a conta.";
      } else if (message.includes("User already registered")) {
        friendlyMessage = "Este e-mail já está em uso. Tente fazer login ou use outro e-mail.";
      } else if (message.includes("Password should be at least")) {
        friendlyMessage = "A senha deve ter pelo menos 6 caracteres.";
      } else if (message.includes("rate limit")) {
        friendlyMessage = "Muitas tentativas. Por favor, aguarde um momento antes de tentar novamente.";
      }
      
      toast.error(friendlyMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const isApp = Capacitor.isNativePlatform();
      const redirectTo = isApp 
        ? "com.gohubbrasil.app://auth/callback" 
        : `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: isApp,
        }
      });

      if (error) throw error;

      if (isApp) {
        if (!data?.url) {
          throw new Error("Nao foi possivel iniciar o login com Google");
        }

        await Browser.open({ url: data.url, windowName: "_self" });
        setIsLoading(false);
      }
    } catch (error: any) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div
      className="gohub-client relative w-full min-h-[100dvh] overflow-x-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Background image */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <img
          src={loginBg}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-center"
        />
        {/* overlay removed for full image visibility */}
      </div>

      {/* Scrollable content */}
      <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-[400px]">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <img
              src={gohubLogo}
              alt="GoHub"
              className="h-16 w-auto object-contain"
            />
          </div>

          {/* Card */}
          <div className="rounded-[8px] bg-white/[0.88] p-5 shadow-lg shadow-slate-900/5 backdrop-blur-lg ring-1 ring-white/40">
            <h1 className="mb-1 text-center text-xl font-semibold text-[#172033]">
              {isSignUp ? "Crie sua conta" : "Bem vindo"}
            </h1>
            <p className="mb-5 text-center text-sm text-[#475569]">
              {isSignUp ? "Cadastre-se para começar" : "Entre para continuar"}
            </p>

            <form onSubmit={handleAuth} className="space-y-3">
              {isSignUp && (
                <>
                  <FieldInput
                    icon={<UserIcon className="h-4 w-4" />}
                    id="fullName"
                    type="text"
                    placeholder="Nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                  <FieldInput
                    icon={<Phone className="h-4 w-4" />}
                    id="whatsapp"
                    type="tel"
                    placeholder="WhatsApp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    required
                    autoComplete="tel"
                  />
                </>
              )}
              <FieldInput
                icon={<Mail className="h-4 w-4" />}
                id="email"
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <FieldInput
                icon={<Lock className="h-4 w-4" />}
                id="password"
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="h-[50px] w-full rounded-[8px] bg-[#3157D5] text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#274ac0] active:bg-[#1f3ea3] disabled:opacity-70"
              >
                {isLoading ? "Carregando..." : isSignUp ? "Criar conta" : "Entrar"}
              </Button>

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="font-medium text-[#475569] hover:text-[#172033]"
                >
                  Esqueceu a senha?
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="font-medium text-[#172033]"
                >
                  {isSignUp ? (
                    <>Já tem conta? <span className="text-[#3157D5]">Entrar</span></>
                  ) : (
                    <>Novo aqui? <span className="text-[#3157D5]">Cadastrar</span></>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3 py-3">
                <div className="h-px flex-1 bg-[#111827] dark:bg-white/70" />
                <span className="text-[11px] uppercase tracking-wider text-[#475569] dark:text-white/70">
                  ou continue com
                </span>
                <div className="h-px flex-1 bg-[#111827] dark:bg-white/70" />
              </div>

              <Button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                variant="outline"
                className="h-[50px] w-full rounded-[8px] border border-[#DDE3EE] bg-white/85 text-[#172033] backdrop-blur-md hover:bg-white active:bg-slate-50"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                </svg>
                Entrar com Google
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

type FieldInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ReactNode;
};

function FieldInput({ icon, className, ...props }: FieldInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718096]">
        {icon}
      </span>
      <Input
        {...props}
        className={
          "h-[52px] rounded-[8px] border border-[#DDE3EE] bg-white/85 pl-10 pr-3 text-[#172033] placeholder:text-[#94A3B8] backdrop-blur-md shadow-sm focus-visible:border-[#3157D5] focus-visible:ring-2 focus-visible:ring-[#3157D5]/15 focus-visible:ring-offset-0 " +
          (className || "")
        }
      />
    </div>
  );
}
