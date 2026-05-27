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
    <div className="min-h-screen bg-black text-white p-6 pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-amber-500">Olá!</h1>
          <p className="text-zinc-400">Escolha uma barbearia</p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} className="text-zinc-400 hover:text-white">
          <LogOut className="w-6 h-6" />
        </Button>
      </div>

      <div className="grid gap-6">
        {barbershops.map((shop) => (
          <div key={shop.id} className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">
            <div className="h-48 overflow-hidden">
              <img 
                src={shop.logo_url || "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=400&auto=format&fit=crop"} 
                alt={shop.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h3 className="text-xl font-bold">{shop.name}</h3>
                <div className="flex items-center text-zinc-400 text-sm mt-1">
                  <MapPin className="w-4 h-4 mr-1 text-amber-500" />
                  {shop.address}
                </div>
              </div>
              <Button 
                onClick={() => navigate(`/booking/${shop.id}`)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-5 rounded-xl"
              >
                Agendar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
