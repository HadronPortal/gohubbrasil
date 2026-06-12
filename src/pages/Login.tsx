import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import {
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  Mail,
  Phone,
  Scissors,
  Sparkles,
  Store,
  User,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    const redirectUser = async (profileData: any) => {
      localStorage.removeItem("force_barber_panel");

      const role = String(profileData.role || "client").toLowerCase();

      if (role === "superadmin") {
        navigate("/super-admin", { replace: true });
      } else if (role === "owner" || role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "barber") {
        navigate("/barber-dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    };

    if (!loading && user && profile) {
      redirectUser(profile);
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
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (rememberMe) {
          localStorage.setItem("gohub_login_email", email);
        } else {
          localStorage.removeItem("gohub_login_email");
        }

        const { data: panelData } = await supabase.rpc("get_my_app_panels");

        if (panelData) {
          const role = String(panelData.role || "client").toLowerCase();

          localStorage.removeItem("force_barber_panel");

          if (role === "superadmin") {
            navigate("/super-admin", { replace: true });
          } else if (role === "owner" || role === "admin") {
            navigate("/admin", { replace: true });
          } else if (role === "barber") {
            navigate("/barber-dashboard", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        } else {
          navigate("/", { replace: true });
        }
      }
    } catch (error: any) {
      let friendlyMessage = "Ocorreu um erro. Por favor, tente novamente.";
      const message = error.message || "";

      if (message.includes("Invalid login credentials")) {
        friendlyMessage = "E-mail ou senha incorretos. Verifique seus dados e tente novamente.";
      } else if (message.includes("Email not confirmed")) {
        friendlyMessage = "Por favor, confirme seu e-mail para acessar a conta.";
      } else if (message.includes("User already registered")) {
        friendlyMessage = "Este e-mail ja esta em uso. Tente fazer login ou use outro e-mail.";
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

  useEffect(() => {
    const savedEmail = localStorage.getItem("gohub_login_email");
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const isApp = Capacitor.isNativePlatform();
      const redirectTo = isApp
        ? "com.gohubbrasil.app://auth/callback"
        : `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: isApp,
        },
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

  const serviceHighlights = [
    { icon: Scissors, label: "Barbearias" },
    { icon: HeartPulse, label: "Clinicas" },
    { icon: Sparkles, label: "Beleza" },
    { icon: Wrench, label: "Servicos" },
  ];

  return (
    <div className="h-screen overflow-hidden bg-[#eef4ff] font-sans text-[#101a3d]">
      <div className="mx-auto h-screen w-full max-w-[430px] overflow-hidden bg-white shadow-2xl sm:my-4 sm:h-[calc(100vh-2rem)] sm:rounded-[28px]">
        <section className="relative overflow-hidden bg-gradient-to-br from-[#24008f] via-[#0444da] to-[#05a8ff] px-5 pb-4 pt-5 text-white">
          <div className="absolute -left-16 top-8 h-36 w-36 rounded-full bg-white/10" />
          <div className="absolute -right-20 top-10 h-48 w-48 rounded-full bg-[#1bb6ff]/35" />
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#0068e8]/70 to-transparent" />
          <div className="absolute bottom-24 left-9 right-9 h-28 rounded-t-[44px] border border-white/10 bg-white/5 opacity-60" />
          <div className="absolute bottom-20 left-14 h-20 w-10 rounded-t-2xl bg-white/8" />
          <div className="absolute bottom-20 left-28 h-32 w-12 rounded-t-2xl bg-white/8" />

          <div className="relative z-10">
            <img
              src="/Logo-GoHub.png"
              alt="GoHub"
              className="h-10 w-10 rounded-xl bg-white object-contain p-1.5 shadow-lg"
            />

            <div className="mt-4 grid grid-cols-[1fr_108px] items-center gap-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#4de0ff]">
                  GoHub Brasil
                </p>
                <h1 className="mt-2 max-w-[210px] text-[26px] font-black leading-[1.06] tracking-normal text-white normal-case">
                  Encontre servicos perto de voce
                </h1>
                <p className="mt-2 max-w-[205px] text-[12px] font-semibold leading-relaxed text-white/82">
                  Barbearias, clinicas, beleza, automotivos e muito mais em so um lugar.
                </p>
              </div>

              <div className="relative h-28">
                <div className="absolute left-3 top-1 h-20 w-20 rounded-full bg-white/10 blur-sm" />
                <div className="absolute left-3 top-2 flex h-[88px] w-[76px] items-center justify-center rounded-[40px_40px_44px_44px] bg-gradient-to-b from-[#5aa2ff] to-[#083bff] shadow-[0_14px_24px_rgba(0,0,0,0.25)]">
                  <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-white shadow-[inset_0_-6px_10px_rgba(17,96,255,0.12)]">
                    <Store className="h-7 w-7 text-[#0847ff]" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-10 h-4 w-10 rounded-full bg-black/20 blur-md" />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 rounded-[16px] bg-white/95 p-1.5 shadow-[0_14px_28px_rgba(6,25,89,0.25)] backdrop-blur">
              {serviceHighlights.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl bg-[#f6f8ff] px-1 text-[#1235cf] active:scale-95"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="max-w-full truncate text-[8px] font-extrabold text-[#101a3d]">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <form onSubmit={handleAuth} className="relative z-20 -mt-1 rounded-t-[24px] bg-white px-6 pb-5 pt-5 shadow-[0_-12px_28px_rgba(10,30,80,0.08)]">
          <div>
            <h2 className="text-[24px] font-black leading-none tracking-normal text-[#101a3d] normal-case">
              {isSignUp ? "Criar conta" : "Entrar"}
            </h2>
            <p className="mt-2 text-[13px] font-semibold text-[#7b89a8]">
              {isSignUp ? "Comece a usar sua conta GoHub" : "Acesse sua conta para continuar"}
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {isSignUp && (
              <>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8fa0bf]" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Nome completo"
                    className="h-12 rounded-xl border-[#dfe7f5] bg-[#fbfcff] pl-11 text-[#101a3d] placeholder:text-[#8fa0bf] focus-visible:ring-[#064dff]"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8fa0bf]" />
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="WhatsApp"
                    className="h-12 rounded-xl border-[#dfe7f5] bg-[#fbfcff] pl-11 text-[#101a3d] placeholder:text-[#8fa0bf] focus-visible:ring-[#064dff]"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8fa0bf]" />
              <Input
                id="email"
                type="email"
                placeholder="E-mail"
                className="h-12 rounded-xl border-[#dfe7f5] bg-[#fbfcff] pl-11 text-[#101a3d] placeholder:text-[#8fa0bf] focus-visible:ring-[#064dff]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8fa0bf]" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                className="h-12 rounded-xl border-[#dfe7f5] bg-[#fbfcff] pl-11 pr-11 text-[#101a3d] placeholder:text-[#8fa0bf] focus-visible:ring-[#064dff]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8fa0bf]"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {!isSignUp && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[11px] font-bold text-[#101a3d]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-[#c8d4ea] accent-[#064dff]"
                />
                Lembrar meus dados
              </label>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-[11px] font-extrabold text-[#064dff]"
              >
                Esqueci minha senha
              </button>
            </div>
          )}

          <Button
            type="submit"
            className="mt-5 h-12 w-full rounded-xl bg-[#064dff] text-[14px] font-extrabold text-white shadow-[0_10px_22px_rgba(6,77,255,0.28)] hover:bg-[#053ed0]"
            disabled={isLoading}
          >
            {isLoading ? "Carregando..." : isSignUp ? "Criar conta" : "Entrar"}
          </Button>

          <div className="relative mt-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#e5ebf5]" />
            </div>
            <div className="relative flex justify-center text-[11px] font-semibold">
              <span className="bg-white px-4 text-[#9aa8c0]">ou continue com</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            variant="outline"
            className="mt-4 flex h-12 w-full items-center justify-center gap-3 rounded-xl border-[#dfe7f5] bg-white text-[13px] font-extrabold text-[#101a3d] shadow-sm hover:bg-[#f8fbff]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Entrar com Google
          </Button>

          <div className="mt-5 text-center text-[13px] font-semibold text-[#101a3d]">
            {isSignUp ? "Ja tem conta?" : "Novo por aqui?"}{" "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-extrabold text-[#064dff]"
            >
              {isSignUp ? "Entrar" : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
