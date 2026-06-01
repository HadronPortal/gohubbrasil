import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, User, Settings, LogOut } from "lucide-react";
import { toast } from "sonner";

interface Barber {
  id: string;
  name: string;
  bio: string;
  avatar_url?: string;
  initials: string;
}

export default function SelectBarber() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBarbers();
  }, []);

  const fetchBarbers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    // Fetch profile for welcome message
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, name, avatar_url, role")
      .eq("id", session.user.id)
      .single();
    
    // Set profile data, using auth metadata as fallback for the name
    // We check both "admin" and "owner" as the user might have set either in the DB
    const userData = profile || {
      id: session.user.id,
      name: session.user.user_metadata?.name || session.user.user_metadata?.full_name,
      avatar_url: session.user.user_metadata?.avatar_url,
      role: "client"
    };
    
    // Normalize role for the UI: treat both 'admin' and 'owner' as having admin privileges
    if (userData.role === 'admin') {
      userData.role = 'owner';
    }
    
    setUserProfile(userData);

    // Get the first barbershop (assuming one for now, as in Home.tsx)
    const { data: shops } = await supabase.from("barbershops").select("id").limit(1);
    if (shops && shops.length > 0) {
      const bId = shops[0].id;
      setBarbershopId(bId);

      // We need to fetch barbers and their associated profile info
      const { data: barberData, error } = await supabase
        .from("barbers")
        .select(`
          id, 
          name, 
          bio,
          user_id,
          photo_url,
          users:user_id (
            avatar_url
          )
        `)
        .eq("barbershop_id", bId)
        .eq("active", true);
      
      if (error) {
        console.error("Error fetching barbers:", error);
        toast.error("Erro ao carregar barbeiros");
      } else if (barberData) {
        const mappedBarbers = barberData.map((b: any) => ({
          id: b.id,
          name: b.name,
          bio: b.bio || "CORTE & BARBA",
          avatar_url: b.photo_url || b.users?.avatar_url,
          initials: b.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2)
        }));
        setBarbers(mappedBarbers);
      }
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
    return <div className="min-h-screen bg-[#1c2333] flex items-center justify-center text-[#c8d4e8]">CARREGANDO...</div>;
  }

  const firstName = userProfile?.name?.split(" ")[0] || "USUÁRIO";

  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center font-light pb-24 overflow-hidden">
      <div className="w-full max-w-[390px] p-6 space-y-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-[#8a9ab5] hover:text-[#f0c040]">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            {userProfile?.role === "owner" && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/admin")} 
                className="text-[#f0c040] hover:bg-[#f0c040]/10"
                title="Painel Admin"
              >
                <Settings className="w-5 h-5" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#141b2a] border border-[#2a3347] flex items-center justify-center overflow-hidden">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-[#8a9ab5]" />
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/login");
              }} 
              className="text-[#8a9ab5] hover:text-[#f0c040]"
              title="Sair"
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
