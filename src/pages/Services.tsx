import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, User } from "lucide-react";
import { toast } from "sonner";

// Custom Icons (same as in Home.tsx previously)
const CustomScissors = ({ className }: { className?: string }) => (
  <img 
    src="/tesouras.png" 
    alt="Tesoura" 
    className={`${className} scale-125`}
    style={{ filter: "invert(81%) sepia(35%) saturate(847%) hue-rotate(352deg) brightness(101%) contrast(89%)" }}
  />
);

const Razor = ({ className }: { className?: string }) => (
  <img 
    src="/navalha.png" 
    alt="Navalha" 
    className={`${className} scale-125`}
    style={{ filter: "invert(81%) sepia(35%) saturate(847%) hue-rotate(352deg) brightness(101%) contrast(89%)" }}
  />
);

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

export default function Services() {
  const [searchParams] = useSearchParams();
  const barberId = searchParams.get("barberId");
  const barbershopId = searchParams.get("barbershopId");
  
  const [services, setServices] = useState<Service[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!barberId || !barbershopId) {
      navigate("/");
      return;
    }
    fetchData();
  }, [barberId, barbershopId]);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", session.user.id)
      .single();
    
    if (profile) setUserProfile(profile);

    const { data: serviceData } = await supabase
      .from("services")
      .select("*")
      .eq("barbershop_id", barbershopId);
    
    if (serviceData) setServices(serviceData as Service[]);
    
    setIsLoading(false);
  };

  const handleContinue = () => {
    if (!selectedServiceId) {
      toast.error("Por favor, selecione um serviço primeiro");
      return;
    }
    navigate(`/booking/${barbershopId}?serviceId=${selectedServiceId}&barberId=${barberId}`);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#1c2333] flex items-center justify-center text-[#c8d4e8]">CARREGANDO...</div>;
  }

  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center font-light pb-24 overflow-hidden">
      <div className="w-full max-w-[390px] p-6 space-y-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-[#8a9ab5] hover:text-[#f0c040]">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-[#141b2a] border border-[#2a3347] flex items-center justify-center overflow-hidden">
             {userProfile?.avatar_url ? (
              <img src={userProfile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-[#8a9ab5]" />
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-xs font-bold tracking-[0.25em] text-[#f0c040] font-oswald uppercase">
            ESCOLHA O SERVIÇO
          </h3>
        </div>

        {/* Categorias (Apenas Visual) */}
        <div className="flex justify-between items-center">
          {[
            { id: "SCISSORS", icon: CustomScissors },
            { id: "RAZOR", icon: Razor },
            { id: "COMB", icon: Comb },
          ].map((cat) => (
            <div
              key={cat.id}
              className="w-16 h-16 rounded-[4px] border bg-[#161e2e] border-[#f0c040] text-[#f0c040] flex items-center justify-center"
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
                  Duração: {s.duration_minutes} min.
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
          className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-7 text-lg rounded-[4px] border-none shadow-none transition-all font-oswald uppercase tracking-[3px]"
        >
          CONTINUAR
        </Button>
      </div>
    </div>
  );
}
