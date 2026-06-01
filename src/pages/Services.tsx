import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronLeft, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { AdminGear } from "@/components/AdminGear";

// Custom Icons
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
  const { profile } = useAuth();
  
  const [services, setServices] = useState<Service[]>([]);
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
    return (
      <div className="min-h-screen bg-[#1c2333] flex items-center justify-center text-[#c8d4e8] font-oswald tracking-[0.2em]">
        CARREGANDO...
      </div>
    );
  }

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
          <div className="w-10 h-10 rounded-full bg-[#141b2a] border border-[#2a3347] flex items-center justify-center overflow-hidden">
             {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
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

        {/* Services List */}
        <div className="space-y-6 pt-4">
          {services.map((s) => {
            const isSelected = selectedServiceId === s.id;
            
            // Determine icon based on service name
            const Icon = s.name.toLowerCase().includes("barba") 
              ? Razor 
              : (s.name.toLowerCase().includes("corte") ? CustomScissors : Comb);

            return (
              <div 
                key={s.id}
                onClick={() => setSelectedServiceId(s.id)}
                className={`flex items-center gap-4 p-4 rounded-[4px] cursor-pointer transition-all border ${
                  isSelected ? "bg-[#161e2e] border-[#f0c040]" : "bg-[#141b2a] border-[#2a3347]"
                }`}
              >
                <div className={`w-12 h-12 flex items-center justify-center rounded-full ${
                  isSelected ? "text-[#f0c040]" : "text-[#8a9ab5]"
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-sm font-bold tracking-wider font-oswald uppercase ${
                    isSelected ? "text-[#f0c040]" : "text-[#c8d4e8]"
                  }`}>
                    {s.name}
                  </h3>
                  <p className="text-[10px] text-[#8a9ab5] uppercase tracking-wider">
                    {s.duration_minutes} min.
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSelected ? "border-[#f0c040]" : "border-[#2a3347]"
                }`}>
                  {isSelected && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[#f0c040]" />
                  )}
                </div>
              </div>
            );
          })}
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
