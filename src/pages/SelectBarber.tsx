import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, User, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AdminGear } from "@/components/AdminGear";
import { LoadingScreen } from "@/components/LoadingScreen";

interface Barber {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  avatar_url?: string;
  initials: string;
  active: boolean;
}

export default function SelectBarber() {
  const [searchParams] = useSearchParams();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [barbershop, setBarbershop] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const barbershopId = searchParams.get("barbershopId");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    } else if (user && profile) {
      if (profile.role !== 'client') {
        const target = profile.isSuperAdmin ? "/super-admin" : "/admin";
        navigate(target);
        return;
      }
      
      if (!barbershopId) {
        navigate("/");
        return;
      }
      fetchBarbers();
    }
  }, [user, authLoading, profile, barbershopId]); // Re-fetch if profile or barbershopId changes

  const fetchBarbers = async () => {
    if (barbershopId) {
      // 0. Fetch barbershop info
      const { data: shopData } = await supabase
        .from("barbershops")
        .select("name, logo_url")
        .eq("id", barbershopId)
        .single();
      
      if (shopData) setBarbershop(shopData);

      // 1. Fetch barbers
      const { data: barbersData, error: barbersError } = await supabase
        .from("barbers")
        .select("id, user_id, barbershop_id, bio, active, commission_pct")
        .eq("barbershop_id", barbershopId);

      console.log("BARBERS QUERY", { barbershopId, barberData: barbersData, barberError: barbersError });

      if (barbersError) {
        console.error("Error fetching barbers:", barbersError);
        toast.error("Erro ao carregar barbeiros");
        setIsLoading(false);
        return;
      }

      // 2. Filter active and get user_ids
      // Active is true if it's not explicitly false
      const activeBarbersEntries = (barbersData || []).filter(b => b.active !== false);
      const userIds = activeBarbersEntries.map(b => b.user_id).filter(Boolean);

      // 3. Fetch users info
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, name, phone, avatar_url, role, barbershop_id")
        .in("id", userIds);

      console.log("BARBER USERS QUERY", { userIds, usersData: usersData, usersError: usersError });

      if (usersError) {
        console.error("Error fetching users:", usersError);
        toast.error("Erro ao carregar dados dos usuários");
        setIsLoading(false);
        return;
      }

      // 4. Map and merge
      const mappedBarbers = activeBarbersEntries
        .map(barber => {
          const userEntry = usersData?.find(u => u.id === barber.user_id);
          if (!userEntry) return null;
          
          return {
            id: barber.id,
            user_id: barber.user_id as string,
            name: userEntry.name,
            avatar_url: userEntry.avatar_url || undefined,
            bio: barber.bio || "CORTE & BARBA",
            active: barber.active !== false,
            initials: userEntry.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
          } as Barber;
        })
        .filter((b): b is Barber => b !== null);

      console.log("CLIENT BARBERS DEBUG", { 
        barbershopId: barbershopId, 
        barbers: barbersData, 
        users: usersData, 
        mappedBarbers 
      });

      setBarbers(mappedBarbers);
    }
    setIsLoading(false);
  };

  const handleContinue = () => {
    if (!selectedBarberId) {
      toast.error("Por favor, selecione um barbeiro primeiro");
      return;
    }
    navigate(`/services?barberId=${selectedBarberId}&barbershopId=${barbershopId}`);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  const firstName = profile?.name?.split(" ")[0] || user?.user_metadata?.full_name?.split(" ")[0] || user?.user_metadata?.name?.split(" ")[0] || "USUÁRIO";

  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center font-light pb-24 overflow-hidden">
      <div className="w-full max-w-[390px] p-6 space-y-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-[#8a9ab5] hover:text-[#f0c040]">
              <ChevronLeft className="w-6 h-6" />
            </Button>
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
              onClick={async () => {
                await signOut();
                navigate("/login");
              }} 
              className="text-[#8a9ab5] hover:text-[#f0c040]"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Barbershop Info */}
        {barbershop && (
          <div className="flex items-center gap-4 p-4 bg-[#141b2a] border border-[#2a3347] rounded-[4px]">
            <div className="w-12 h-12 rounded-full bg-[#1c2333] border border-[#2a3347] flex items-center justify-center overflow-hidden flex-shrink-0">
              {barbershop.logo_url ? (
                <img src={barbershop.logo_url} alt={barbershop.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-[#8a9ab5]" />
              )}
            </div>
            <h2 className="text-xl font-bold uppercase text-[#f0c040] font-oswald tracking-tight truncate">
              {barbershop.name}
            </h2>
          </div>
        )}

        {/* Section Label */}
        <div className="pt-2">
          <h3 className="text-xs font-bold tracking-[0.25em] text-[#f0c040] font-oswald uppercase">
            ESCOLHA SEU BARBEIRO
          </h3>
        </div>

        {/* Barbers Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4">
          {barbers.map((barber) => (
            <div
              key={barber.id}
              onClick={() => setSelectedBarberId(barber.id)}
              className={`flex flex-col items-center p-6 rounded-[4px] border transition-all cursor-pointer ${
                selectedBarberId === barber.id
                  ? "bg-[#161e2e] border-[#f0c040]"
                  : "bg-[#141b2a] border-[#2a3347]"
              }`}
            >
              {/* Barber Photo */}
              <div className="w-20 h-20 rounded-full border-2 border-[#f0c040] flex items-center justify-center overflow-hidden mb-4">
                {barber.avatar_url ? (
                  <img src={barber.avatar_url} alt={barber.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#f0c040] flex items-center justify-center text-[#1c2333] font-bold text-xl font-oswald">
                    {barber.initials}
                  </div>
                )}
              </div>

              {/* Barber Info */}
              <h4 className={`text-sm font-bold tracking-wider font-oswald text-center uppercase mb-1 ${
                selectedBarberId === barber.id ? "text-[#f0c040]" : "text-[#c8d4e8]"
              }`}>
                {barber.name}
              </h4>
              <span className="text-[10px] text-[#8a9ab5] text-center uppercase tracking-wider">
                {barber.bio}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Button */}
      <div className="fixed bottom-0 w-full max-w-[390px] p-6 bg-[#1c2333]/90 backdrop-blur-sm">
        <Button
          onClick={handleContinue}
          className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-7 text-lg rounded-[4px] border-none shadow-none transition-all font-oswald uppercase tracking-[3px]"
        >
          CONTINUAR
        </Button>
      </div>
    </div>
  );
}
