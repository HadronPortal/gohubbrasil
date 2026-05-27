import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Scissors, User } from "lucide-react";

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
        {/* Logo Section - exactly like reference */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="relative w-12 h-24 flex flex-col items-center">
               <div className="w-full h-full bg-gradient-to-b from-red-500 via-white to-blue-500 rounded-full" />
            </div>
            <div className="border-2 border-white px-6 py-3">
              <h1 className="text-3xl font-bold tracking-[0.25em] text-white font-oswald m-0">BARBERSHOP</h1>
            </div>
            <div className="relative w-12 h-24 flex flex-col items-center">
               <div className="w-full h-full bg-gradient-to-b from-red-500 via-white to-blue-500 rounded-full" />
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="h-[1px] w-48 bg-[#2a3347] mb-2" />
            <Scissors className="w-6 h-6 text-[#8a9ab5]" />
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
                  className="bg-[#141b2a] border-none text-white h-14 rounded-[4px] placeholder:text-[#8a9ab5] font-light"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="WHATSAPP"
                  className="bg-[#141b2a] border-none text-white h-14 rounded-[4px] placeholder:text-[#8a9ab5] font-light"
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
              className="bg-[#141b2a] border-none text-white h-14 rounded-[4px] placeholder:text-[#8a9ab5] font-light"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              id="password"
              type="password"
              placeholder="PASSWORD"
              className="bg-[#141b2a] border-none text-white h-14 rounded-[4px] placeholder:text-[#8a9ab5] font-light"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-[#22a6f0] hover:bg-[#1a88c7] text-white font-bold py-8 text-lg rounded-[4px] transition-all font-oswald uppercase tracking-[3px]"
            disabled={isLoading}
          >
            {isLoading ? "LOADING..." : isSignUp ? "SIGN UP" : "LOG IN"}
          </Button>

          <div className="flex justify-between items-center px-1">
            <button type="button" className="text-[10px] text-[#8a9ab5] uppercase tracking-wider font-bold">Forgot Password?</button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-[10px] text-[#8a9ab5] uppercase tracking-wider font-bold"
            >
              {isSignUp ? (
                <>New User? <span className="text-[#22a6f0]">LOG IN</span></>
              ) : (
                <>New User? <span className="text-[#22a6f0]">SIGN UP</span></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>

  );
}