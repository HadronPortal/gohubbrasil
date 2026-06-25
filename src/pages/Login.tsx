import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, User as UserIcon, Phone } from "lucide-react";
import { getPostLoginRoute } from "@/lib/postLoginRoute";
import loginBg from "@/assets/login/gohub-beauty-background.webp";
import gohubLogo from "@/assets/login/gohub-logo.png";

const GOOGLE_CLIENT_ID =
  "457468212381-6bnsj4nprqvopma59o4cskfsotkvt9j4.apps.googleusercontent.com";

declare global {
  interface Window {
    google?: any;
  }
}

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement | null>(null);
  const googleInitRef = useRef(false);

  useEffect(() => {
    if (!loading && user && profile) {
      localStorage.removeItem('force_barber_panel');
      navigate(getPostLoginRoute(profile), { replace: true });
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    let cancelled = false;

    const setup = async () => {
      try {
        const google = await waitForGoogle();
        if (cancelled || !googleBtnRef.current) return;

        if (!googleInitRef.current) {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response: any) => {
              const credential = response?.credential;
              if (!credential) {
                toast.error("Não foi possível entrar com Google.");
                return;
              }
              try {
                const { error } = await supabase.auth.signInWithIdToken({
                  provider: "google",
                  token: credential,
                });
                if (error) throw error;
                // AuthContext + redirect effect handle profile + navigation.
              } catch (err: any) {
                toast.error(err.message || "Erro ao entrar com Google.");
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_button: true,
          });
          googleInitRef.current = true;
        }

        googleBtnRef.current.innerHTML = "";
        google.accounts.id.renderButton(googleBtnRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
          logo_alignment: "left",
          width: 320,
        });
      } catch {
        // GIS failed to load; silent — user still has email/password.
      }
    };

    setup();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const waitForGoogle = (): Promise<any> =>
    new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        if (window.google?.accounts?.id) return resolve(window.google);
        if (Date.now() - start > 8000)
          return reject(new Error("Google Identity Services não carregou"));
        setTimeout(tick, 100);
      };
      tick();
    });

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

              {!Capacitor.isNativePlatform() && (
                <div
                  id="google-login-button"
                  ref={googleBtnRef}
                  className="flex w-full justify-center"
                />
              )}
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
