import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Scissors } from "lucide-react";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const navigate = useNavigate();

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
        
        // Fetch profile to redirect based on role
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profileData } = await supabase
            .from("users")
            .select("role")
            .eq("id", authUser.id)
            .single();
          
          if (profileData?.role === "superadmin") {
            navigate("/super-admin");
          } else if (profileData?.role === "owner" || profileData?.role === "admin") {
            navigate("/admin");
          } else {
            // Check if there's a saved barbershop to decide where to send the client
            const savedBarbershopId = localStorage.getItem(`selectedBarbershopId:${authUser.id}`);
            if (savedBarbershopId) {
              navigate("/client-home");
            } else {
              navigate("/");
            }
          }
        } else {
          navigate("/");
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 font-light overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: "url('/logo-login.png')",
        }}
      />
      
      {/* Dark Overlay for Readability */}
      <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-[2px]" />

      <div className="w-full max-w-[390px] space-y-12 relative z-20">
        {/* Empty space for where the logo was, as it's now the background */}
        <div className="pt-8"></div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-3">
            {isSignUp && (
              <>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="NOME COMPLETO"
                  className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] h-14 rounded-[4px] placeholder:text-[#8a9ab5] font-light"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="WHATSAPP"
                  className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] h-14 rounded-[4px] placeholder:text-[#8a9ab5] font-light"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                />
              </>
            )}
            <Input
              id="email"
              type="email"
              placeholder="E-MAIL"
              className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] h-14 rounded-[4px] placeholder:text-[#8a9ab5] font-light"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              type="password"
              placeholder="SENHA"
              className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] h-14 rounded-[4px] placeholder:text-[#8a9ab5] font-light"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-7 text-lg rounded-[4px] transition-all font-oswald uppercase tracking-[3px]"
            disabled={isLoading}
          >
            {isLoading ? <div className="flex items-center gap-2"><img src="/tesouras.png" className="w-5 h-5 invert brightness-0" alt="" /> CARREGANDO...</div> : isSignUp ? "CRIAR CONTA" : "ENTRAR"}
          </Button>

          <div className="flex justify-between items-center px-1">
            <button type="button" className="text-[11px] text-[#8a9ab5] uppercase tracking-wider font-light">Esqueceu a senha?</button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[11px] text-[#8a9ab5] uppercase tracking-wider font-light"
            >
              {isSignUp ? (
                <>Já tem conta? <span className="text-[#f0c040]">ENTRAR</span></>
              ) : (
                <>Novo aqui? <span className="text-[#f0c040]">CADASTRAR</span></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}