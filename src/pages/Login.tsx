import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: authData.user.id,
              full_name: fullName,
              whatsapp: whatsapp,
              role: "client",
            });

          if (profileError) throw profileError;
        }

        toast.success("Conta criada com sucesso! Verifique seu e-mail.");
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
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-4 bg-amber-500 rounded-full">
              <Scissors className="w-8 h-8 text-black" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-amber-500">BarberApp</h1>
          <p className="text-gray-400">
            {isSignUp ? "Crie sua conta para agendar" : "Entre para agendar seu corte"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="mt-8 space-y-6 bg-zinc-900 p-8 rounded-2xl border border-zinc-800 shadow-xl">
          <div className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome Completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome"
                    className="bg-zinc-800 border-zinc-700 text-white"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    className="bg-zinc-800 border-zinc-700 text-white"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                className="bg-zinc-800 border-zinc-700 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                className="bg-zinc-800 border-zinc-700 text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-6 text-lg rounded-xl transition-all"
            disabled={isLoading}
          >
            {isLoading ? "Carregando..." : isSignUp ? "Criar conta" : "Entrar"}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-amber-500 hover:underline text-sm font-medium"
            >
              {isSignUp ? "Já tem uma conta? Entre" : "Não tem conta? Crie agora"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
