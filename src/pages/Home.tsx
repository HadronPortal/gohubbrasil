import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User, Scissors } from "lucide-react";
import { toast } from "sonner";

const Razor = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 21l8-8" />
    <path d="M11 13l9-4 2 2-9 4z" />
  </svg>
);

const Comb = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 6h16l-2 12H6L4 6z" />
    <path d="M7 6v8" />
    <path d="M10 6v8" />
    <path d="M13 6v8" />
    <path d="M16 6v8" />
  </svg>
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
        <div className="flex justify-between items-center bg-[#141b2a] p-1 rounded-full w-full max-w-[320px] mx-auto">
          {["SERVIÇOS", "BARBEIROS", "PROMO"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-[10px] font-bold tracking-[0.1em] font-oswald uppercase transition-all rounded-full ${
                activeTab === tab ? "bg-[#f0c040] text-[#1c2333]" : "text-[#8a9ab5]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Categories */}
        <div className="flex justify-between items-center pt-2 px-4">
          {[
            { id: "SCISSORS", icon: Scissors, label: "CORTE" },
            { id: "RAZOR", icon: Razor, label: "BARBA" },
            { id: "COMB", icon: Comb, label: "PENTEADO" },
          ].map((cat) => (
            <div key={cat.id} className="flex flex-col items-center gap-3">
              <button
                onClick={() => setActiveCategory(cat.id)}
                className={`w-20 h-24 rounded-[12px] border flex items-center justify-center transition-all ${
                  activeCategory === cat.id 
                  ? "bg-[#f0c040] border-[#f0c040] text-white" 
                  : "bg-[#141b2a] border-[#2a3347] text-[#f0c040]"
                }`}
              >
                <cat.icon className="w-10 h-10" />
              </button>
              <span className={`text-[10px] font-bold tracking-[0.2em] font-oswald ${
                activeCategory === cat.id ? "text-[#f0c040]" : "text-[#8a9ab5]"
              }`}>
                {cat.label}
              </span>
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