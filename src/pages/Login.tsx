import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Scissors } from "lucide-react";

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
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName,
              phone: whatsapp,
            },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from("users")
            .insert({
              id: authData.user.id,
              name: fullName,
              phone: whatsapp,
              role: "client",
              barbershop_id: null,
            });

          if (profileError) throw profileError;
        }

        toast.success("Conta criada com sucesso! Você já pode entrar.");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center justify-center p-6 font-light">
      <div className="w-full max-w-[390px] space-y-12">
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative w-full flex justify-center">
            <img 
              src="/logo-atual.png" 
              alt="Logo Barber Shop" 
              className="w-48 h-auto object-contain"
            />
          </div>
        </div>

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
            {isLoading ? "CARREGANDO..." : isSignUp ? "CRIAR CONTA" : "ENTRAR"}
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