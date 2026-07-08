import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User, LogOut, MapPin } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { useAuth } from "@/contexts/AuthContext";
import { AdminGear } from "@/components/AdminGear";
import { UserAvatar } from "@/components/UserAvatar";
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
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const location = useLocation();
  
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const checkSavedBarbershop = async () => {
      if (!authLoading && !user) {
        navigate("/login", { replace: true });
      } else if (user && profile) {
        if (profile.role === 'client' && profile.barbershop_id) {
          const params = new URLSearchParams(window.location.search);
          const manualSelection = params.get("select") === "true" || location.state?.select === true;
          
          if (!manualSelection) {
            navigate("/client-home", { replace: true });
            return;
          }
        }

        const params = new URLSearchParams(window.location.search);
        const manualSelection = params.get("select") === "true" || location.state?.select === true;

        if (!manualSelection) {
          // Se for superadmin, redireciona para o painel do superadmin
          if (profile.isSuperAdmin) {
            navigate("/super-admin", { replace: true });
            return;
          }
          
          // Se for dono (owner) ou admin, redireciona para o painel admin
          if (profile.isOwner || profile.role === 'admin') {
            navigate("/admin", { replace: true });
            return;
          }

          // Se for barbeiro
          if (profile.role === 'barber') {
            navigate("/barber-dashboard", { replace: true });
            return;
          }
        }
        
        fetchBarbershops();
      }
    };

    checkSavedBarbershop();
  }, [user, profile, authLoading, navigate]);

  const fetchBarbershops = async () => {
    setIsLoading(true);
    // Use the new RPC to only get available barbershops for clients
    const { data, error } = await supabase.rpc('get_available_barbershops');

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

  const handleSelect = async (shop: Barbershop) => {
    if (user) {
      try {
        const { data, error } = await supabase.rpc('set_my_selected_barbershop', {
          p_barbershop_id: shop.id
        });

        if (error) {
          console.error("Error setting barbershop:", error);
          toast.error(error.message || "Erro ao salvar estabelecimento selecionado");
          return;
        }

        if (data?.success === false) {
          toast.error(data.error || "Erro ao salvar estabelecimento selecionado");
          return;
        }

        if (data?.success) {
          // Atualiza o perfil localmente antes de navegar
          await refreshProfile?.();
          
          // Salva cache em localStorage como fonte imediata
          localStorage.setItem('selectedBarbershopId', data.barbershop_id);
          
          // Navega para o painel do cliente usando replace
          navigate("/client-home", { replace: true });
        }
      } catch (error: any) {
        console.error("Unexpected error selecting barbershop:", error);
        toast.error(error.message || "Ocorreu um erro inesperado");
      }
    }
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
            <UserAvatar 
              name={profile?.name} 
              email={user?.email} 
              avatarUrl={profile?.avatar_url} 
              size="md" 
              className="bg-[#141b2a] border border-[#2a3347]" 
            />

            <LogoutButton showText />
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
            ESCOLHA UM ESTABELECIMENTO
          </h3>
        </div>

        {/* Barbershops List */}
        <div className="space-y-4 pt-4">
          {barbershops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => handleSelect(shop)}
              className="flex items-center gap-4 p-4 rounded-[4px] bg-[#141b2a] border border-[#2a3347] hover:border-[#f0c040] transition-all cursor-pointer group select-none touch-manipulation"
              onContextMenu={(e) => e.preventDefault()}
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
              Nenhum estabelecimento cadastrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
