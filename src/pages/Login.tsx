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
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center justify-center p-6 font-light">
      <div className="w-full max-w-[390px] space-y-12">
        {/* Logo Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="relative w-12 h-24 flex flex-col items-center overflow-hidden">
               <div className="w-full h-full bg-white relative flex flex-col">
                  {/* Barber pole stripes */}
                  <div className="w-[200%] h-8 bg-[#ff4b4b] -rotate-45 -translate-x-2" />
                  <div className="w-[200%] h-8 bg-white -rotate-45 -translate-x-2" />
                  <div className="w-[200%] h-8 bg-[#22a6f0] -rotate-45 -translate-x-2" />
                  <div className="w-[200%] h-8 bg-white -rotate-45 -translate-x-2" />
               </div>
               {/* Pole caps */}
               <div className="absolute top-0 w-14 h-4 bg-zinc-300 rounded-t-full border-b border-zinc-400" />
               <div className="absolute bottom-0 w-14 h-4 bg-zinc-300 rounded-b-full border-t border-zinc-400" />
            </div>
            <div className="border-2 border-[#f0c040] px-6 py-3 bg-[#1c2333] z-10">
              <h1 className="text-2xl font-bold tracking-[0.2em] text-white font-oswald m-0">BARBERSHOP</h1>
            </div>
            <div className="relative w-12 h-24 flex flex-col items-center overflow-hidden">
               <div className="w-full h-full bg-white relative flex flex-col">
                  <div className="w-[200%] h-8 bg-[#ff4b4b] -rotate-45 -translate-x-2" />
                  <div className="w-[200%] h-8 bg-white -rotate-45 -translate-x-2" />
                  <div className="w-[200%] h-8 bg-[#22a6f0] -rotate-45 -translate-x-2" />
                  <div className="w-[200%] h-8 bg-white -rotate-45 -translate-x-2" />
               </div>
               <div className="absolute top-0 w-14 h-4 bg-zinc-300 rounded-t-full border-b border-zinc-400" />
               <div className="absolute bottom-0 w-14 h-4 bg-zinc-300 rounded-b-full border-t border-zinc-400" />
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="h-[1px] w-48 bg-[#2a3347] mb-2" />
            <Scissors className="w-5 h-5 text-[#8a9ab5]" />
            <div className="h-[1px] w-48 bg-[#2a3347] mt-2" />
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-3">
            {isSignUp && (
              <>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="FULL NAME"
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
              placeholder="PASSWORD"
              className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] h-14 rounded-[4px] placeholder:text-[#8a9ab5] font-light"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-8 text-lg rounded-[4px] transition-all font-oswald uppercase tracking-[3px]"
            disabled={isLoading}
          >
            {isLoading ? "LOADING..." : isSignUp ? "SIGN UP" : "LOG IN"}
          </Button>

          <div className="flex justify-between items-center px-1">
            <button type="button" className="text-[10px] text-[#8a9ab5] uppercase tracking-wider font-light">Forgot Password?</button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[10px] text-[#8a9ab5] uppercase tracking-wider font-light"
            >
              {isSignUp ? (
                <>Already a user? <span className="text-[#f0c040]">LOG IN</span></>
              ) : (
                <>New User? <span className="text-[#f0c040]">SIGN UP</span></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}