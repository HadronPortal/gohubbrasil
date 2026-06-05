import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar e-mail de recuperação.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 font-light overflow-hidden">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat brightness-125 contrast-110"
        style={{ backgroundImage: "url('/login-bg.png')" }}
      />
      <div className="absolute inset-0 z-10 bg-black/30" />

      <div className="w-full max-w-[390px] space-y-8 relative z-20">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#f0c040] font-oswald tracking-[2px] uppercase">Recuperar Senha</h1>
          <p className="text-sm text-[#8a9ab5]">Insira seu e-mail para receber um link de redefinição.</p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            type="email"
            placeholder="SEU E-MAIL"
            className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] h-12 rounded-[4px] placeholder:text-[#8a9ab5] font-light"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button 
            type="submit" 
            className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-6 text-lg rounded-[4px] transition-all font-oswald uppercase tracking-[3px]"
            disabled={isLoading}
          >
            {isLoading ? "ENVIANDO..." : "ENVIAR LINK"}
          </Button>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full flex items-center justify-center gap-2 text-[#8a9ab5] text-sm hover:text-[#f0c040] transition-colors"
          >
            <ChevronLeft size={16} />
            VOLTAR PARA LOGIN
          </button>
        </form>
      </div>
    </div>
  );
}
