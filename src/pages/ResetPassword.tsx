import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a session (the link from email should provide one)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão inválida ou expirada. Solicite um novo link.");
        navigate("/forgot-password");
      }
    };
    checkSession();
  }, [navigate]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      toast.success("Senha atualizada com sucesso!");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar senha.");
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
          <h1 className="text-2xl font-bold text-[#f0c040] font-oswald tracking-[2px] uppercase">Nova Senha</h1>
          <p className="text-sm text-[#8a9ab5]">Escolha uma nova senha segura.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <Input
            type="password"
            placeholder="NOVA SENHA"
            className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] h-12 rounded-[4px] placeholder:text-[#8a9ab5] font-light"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          <Button 
            type="submit" 
            className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-6 text-lg rounded-[4px] transition-all font-oswald uppercase tracking-[3px]"
            disabled={isLoading}
          >
            {isLoading ? "ATUALIZANDO..." : "DEFINIR NOVA SENHA"}
          </Button>
        </form>
      </div>
    </div>
  );
}
