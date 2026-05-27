import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

// Custom Scissors icon (Tesoura)
const CustomScissors = ({ className }: { className?: string }) => (
  <img 
    src="/tesouras.png" 
    alt="Tesoura" 
    className={`${className} scale-125`}
    style={{ filter: "invert(81%) sepia(35%) saturate(847%) hue-rotate(352deg) brightness(101%) contrast(89%)" }}
  />
);

// Custom Razor icon (Navalha)
const Razor = ({ className }: { className?: string }) => (
  <img 
    src="/navalha.png" 
    alt="Navalha" 
    className={`${className} scale-125`}
    style={{ filter: "invert(81%) sepia(35%) saturate(847%) hue-rotate(352deg) brightness(101%) contrast(89%)" }}
  />
);

// Custom Comb icon (Pente)
const Comb = ({ className }: { className?: string }) => (
  <img 
    src="/pente-de-cabelo.png" 
    alt="Pente" 
    className={`${className} scale-125`}
    style={{ filter: "invert(81%) sepia(35%) saturate(847%) hue-rotate(352deg) brightness(101%) contrast(89%)" }}
  />
);

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface UserProfile {
  id: string;
  full_name: string;
}

export default function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("SERVIÇOS");
  const [activeCategory, setActiveCategory] = useState("SCISSORS");
  const navigate = useNavigate();

  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("id", session.user.id)
      .single();
    
    if (profile) setUserProfile(profile as UserProfile);

    const { data: shops } = await supabase.from("barbershops").select("id").limit(1);
    if (shops && shops.length > 0) {
      const bId = shops[0].id;
      setBarbershopId(bId);

      const { data: serviceData } = await supabase
        .from("services")
        .select("*")
        .eq("barbershop_id", bId);
      
      if (serviceData) setServices(serviceData as Service[]);
    }
    
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleContinue = () => {
    if (!selectedServiceId) {
      toast.error("Por favor, selecione um serviço primeiro");
      return;
    }
    navigate(`/booking/${barbershopId}?serviceId=${selectedServiceId}`);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#1c2333] flex items-center justify-center text-[#c8d4e8]">CARREGANDO...</div>;
  }

  const firstName = userProfile?.full_name?.split(" ")[0] || "USUÁRIO";

  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center font-light pb-24">
      <div className="w-full max-w-[390px] p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-[#8a9ab5] hover:text-[#f0c040]">
            <LogOut className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-[#141b2a] border border-[#2a3347] flex items-center justify-center overflow-hidden">
            <User className="w-6 h-6 text-[#8a9ab5]" />
          </div>
        </div>

        {/* Welcome */}
        <div>
          <h1 className="text-[11px] font-light uppercase tracking-[0.2em] text-[#8a9ab5] m-0">BEM-VINDO</h1>
          <h2 className="text-4xl font-bold uppercase text-[#f0c040] font-oswald tracking-tight m-0 leading-tight">
            {firstName.toUpperCase()}!
          </h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a3347] gap-8">
          {["SERVIÇOS", "BARBEIROS", "PROMO"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-xs font-bold tracking-[0.15em] font-oswald uppercase transition-all relative ${
                activeTab === tab ? "text-[#f0c040]" : "text-[#8a9ab5]"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#f0c040]" />
              )}
            </button>
          ))}
        </div>

        {/* Categorias (Apenas Visual) */}
        <div className="flex justify-between items-center pt-2">
          {[
            { id: "SCISSORS", icon: CustomScissors },
            { id: "RAZOR", icon: Razor },
            { id: "COMB", icon: Comb },
          ].map((cat, index) => (
            <div
              key={cat.id}
              className="w-16 h-16 rounded-[4px] border bg-[#161e2e] border-[#f0c040] text-[#f0c040] flex items-center justify-center transition-all"
            >
              <cat.icon className="w-6 h-6 stroke-[3px]" />
            </div>
          ))}
        </div>

        {/* Services List */}
        <div className="space-y-6 pt-4">
          {services.map((s) => (
            <div 
              key={s.id}
              onClick={() => setSelectedServiceId(s.id)}
              className="flex items-start gap-4 cursor-pointer group"
            >
              <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center transition-all ${
                selectedServiceId === s.id ? "border-[#f0c040]" : "border-[#2a3347]"
              }`}>
                {selectedServiceId === s.id && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#f0c040]" />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`text-sm font-bold tracking-wider font-oswald transition-all ${
                  selectedServiceId === s.id ? "text-[#f0c040]" : "text-[#c8d4e8]"
                }`}>
                  {s.name}
                </h3>
                <p className="text-[11px] text-[#8a9ab5] mt-1 leading-relaxed">
                  Serviço profissional com ferramentas e produtos de alta qualidade. Duração: {s.duration_minutes} min.
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Button */}
      <div className="fixed bottom-0 w-full max-w-[390px] p-6 bg-[#1c2333]/90 backdrop-blur-sm">
        <Button
          onClick={handleContinue}
          className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-7 text-lg rounded-[4px] transition-all font-oswald uppercase tracking-[3px]"
        >
          CONTINUAR
        </Button>
      </div>
    </div>
  );
}