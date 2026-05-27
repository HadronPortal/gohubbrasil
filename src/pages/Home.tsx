import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapPin, LogOut } from "lucide-react";
import { toast } from "sonner";

interface Barbershop {
  id: string;
  name: string;
  address: string;
  logo_url: string;
  description: string;
}

export default function Home() {
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBarbershops();
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
    }
  };

  const fetchBarbershops = async () => {
    const { data, error } = await supabase.from("barbershops").select("*");
    if (error) {
      toast.error("Erro ao carregar barbearias");
    } else {
      setBarbershops(data || []);
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-[#1E212B] text-white p-6 pb-20">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-zinc-400">Welcome</h1>
          <h2 className="text-3xl font-black uppercase text-white tracking-tighter">STEVE!</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-zinc-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-[#EAB308] flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-[#EAB308]">Select a Barbershop</h2>
        {barbershops.map((shop) => (
          <div 
            key={shop.id} 
            onClick={() => navigate(`/booking/${shop.id}`)}
            className="bg-[#2D323E] rounded-2xl overflow-hidden shadow-xl cursor-pointer transition-transform active:scale-[0.98]"
          >
            <div className="h-44 overflow-hidden relative">
              <img 
                src={shop.logo_url || "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=400&auto=format&fit=crop"} 
                alt={shop.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#2D323E] to-transparent" />
              <div className="absolute bottom-4 left-5">
                <h3 className="text-xl font-black uppercase tracking-tight">{shop.name}</h3>
                <div className="flex items-center text-zinc-400 text-[10px] mt-0.5 uppercase tracking-widest">
                  <MapPin className="w-3 h-3 mr-1 text-[#EAB308]" />
                  {shop.address}
                </div>
              </div>
            </div>
            <div className="p-4 flex justify-end">
              <Button 
                className="bg-[#EAB308] hover:bg-yellow-500 text-white font-black py-4 px-8 text-xs rounded-xl uppercase tracking-widest"
              >
                Book Now
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>

  );
}
