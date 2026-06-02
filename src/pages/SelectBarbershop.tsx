import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User, LogOut, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AdminGear } from "@/components/AdminGear";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";

interface Barbershop {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  description: string | null;
}

export default function SelectBarbershop() {
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  useEffect(() => {
    const checkSavedBarbershop = async () => {
      if (!authLoading && !user) {
        navigate("/login");
      } else if (user && profile) {
        // Check if we should skip auto-redirect (manual selection mode)
        const params = new URLSearchParams(window.location.search);
        const manualSelection = params.get("select") === "true";

        if (!manualSelection) {
          // Se for superadmin, redireciona para o painel do superadmin
          if (profile.isSuperAdmin) {
            navigate("/super-admin");
            return;
          }
          
          // Se for dono (owner) ou admin, redireciona para o painel admin
          if (profile.isOwner || profile.role === 'admin') {
            navigate("/admin");
            return;
          }
        }

        // Se for cliente e já tiver barbearia selecionada, vai para o painel do cliente
        const savedId = localStorage.getItem(`selectedBarbershopId:${user.id}`);
        
        if (savedId && profile.role === 'client' && !manualSelection) {
          const { data: foundBarbershop } = await supabase
            .from("barbershops")
            .select("id, name, logo_url")
            .eq("id", savedId)
            .maybeSingle();

          console.log("SELECTED BARBERSHOP STORAGE", { 
            userId: user.id, 
            savedId, 
            foundBarbershop 
          });

          if (foundBarbershop) {
            navigate("/client-home");
            return;
          } else {
            // Se não existe mais, limpa o localStorage
            localStorage.removeItem(`selectedBarbershopId:${user.id}`);
            localStorage.removeItem(`selectedBarbershopName:${user.id}`);
          }
        }
        
        fetchBarbershops();
      }
    };

    checkSavedBarbershop();
  }, [user, profile, authLoading, navigate]);

  const fetchBarbershops = async () => {
    const { data, error } = await supabase
      .from("barbershops")
      .select("*")
      .order("name", { ascending: true });

    console.log("BARBERSHOPS DEBUG", { data, error });

    if (error) {
      console.error("BARBERSHOPS ERROR", error);
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    setBarbershops(data || []);
    setIsLoading(false);
  };

  const handleSelect = (shop: Barbershop) => {
    if (user) {
      localStorage.setItem(`selectedBarbershopId:${user.id}`, shop.id);
      localStorage.setItem(`selectedBarbershopName:${user.id}`, shop.name);
    }
    navigate("/client-home");
  };

  if (isLoading || authLoading) {
    return <LoadingScreen />;
  }

  const firstName = profile?.name?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || user?.user_metadata?.name?.split(" ")[0] || "USUÁRIO";

  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center font-light pb-24 overflow-hidden">
      <div className="w-full max-w-[390px] p-6 space-y-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AdminGear />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#141b2a] border border-[#2a3347] flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-[#8a9ab5]" />
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={signOut} 
              className="text-[#8a9ab5] hover:text-[#f0c040]"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Welcome Section */}
        <div>
          <h1 className="text-[11px] font-light uppercase tracking-[0.2em] text-[#8a9ab5] m-0">BEM-VINDO</h1>
          <h2 className="text-4xl font-bold uppercase text-[#f0c040] font-oswald tracking-tight m-0 leading-tight">
            {firstName.toUpperCase()}!
          </h2>
        </div>

        {/* Section Label */}
        <div className="pt-2">
          <h3 className="text-xs font-bold tracking-[0.25em] text-[#f0c040] font-oswald uppercase">
            ESCOLHA UMA BARBEARIA
          </h3>
        </div>

        {/* Barbershops List */}
        <div className="space-y-4 pt-4">
          {barbershops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => handleSelect(shop)}
              className="flex items-center gap-4 p-4 rounded-[4px] bg-[#141b2a] border border-[#2a3347] hover:border-[#f0c040] transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-lg bg-[#1c2333] border border-[#2a3347] flex items-center justify-center overflow-hidden flex-shrink-0 group-hover:border-[#f0c040]/50">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                ) : (
                  <MapPin className="w-8 h-8 text-[#8a9ab5] group-hover:text-[#f0c040]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-bold tracking-wider font-oswald uppercase text-[#c8d4e8] group-hover:text-[#f0c040] truncate">
                  {shop.name}
                </h4>
                {shop.address && (
                  <p className="text-[10px] text-[#8a9ab5] uppercase tracking-wider truncate">
                    {shop.address}
                  </p>
                )}
                {shop.description && (
                  <p className="text-[10px] text-[#6b7280] mt-1 line-clamp-1 italic">
                    {shop.description}
                  </p>
                )}
              </div>
            </div>
          ))}
          {barbershops.length === 0 && (
            <div className="text-center py-10 text-[#8a9ab5]">
              Nenhuma barbearia cadastrada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
