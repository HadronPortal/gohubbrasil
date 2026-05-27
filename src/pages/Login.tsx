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
    <div className="min-h-screen bg-[#1E212B] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-12">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-32 h-32 flex items-center justify-center">
                <Scissors className="w-16 h-16 text-white" />
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="border-y-2 border-white w-full py-1 text-center bg-[#1E212B]">
                  <span className="text-xs font-black uppercase tracking-widest">Barbershop</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-3">
            {isSignUp && (
              <>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Nome Completo"
                  className="bg-[#2D323E] border-none text-white h-14 rounded-xl placeholder:text-zinc-500"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="WhatsApp"
                  className="bg-[#2D323E] border-none text-white h-14 rounded-xl placeholder:text-zinc-500"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                />
              </>
            )}
            <Input
              id="email"
              type="email"
              placeholder="E-Mail"
              className="bg-[#2D323E] border-none text-white h-14 rounded-xl placeholder:text-zinc-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              type="password"
              placeholder="Password"
              className="bg-[#2D323E] border-none text-white h-14 rounded-xl placeholder:text-zinc-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#EAB308] hover:bg-yellow-500 text-white font-black py-7 text-lg rounded-xl transition-all uppercase tracking-widest"
            disabled={isLoading}
          >
            {isLoading ? "LOADING..." : isSignUp ? "SIGN UP" : "LOG IN"}
          </Button>

          <div className="flex justify-between items-center px-2">
            <button type="button" className="text-[10px] text-zinc-400 uppercase tracking-tighter">Forgot Password?</button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[10px] text-zinc-400 uppercase tracking-tighter"
            >
              {isSignUp ? "Already a user? LOG IN" : "New User? SIGN UP"}
            </button>
          </div>
        </form>
      </div>
    </div>

  );
}
