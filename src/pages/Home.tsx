import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User, Scissors, ChevronLeft } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("SERVICES");
  const [activeCategory, setActiveCategory] = useState("RAZOR");
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
    return <div className="min-h-screen bg-[#1c2333] flex items-center justify-center text-[#c8d4e8]">LOADING...</div>;
  }

  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center font-light pb-24">
      <div className="w-full max-w-[390px] p-6 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center w-full">
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-[#8a9ab5] hover:text-[#f0c040]">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="w-10 h-10 rounded-full border-2 border-[#f0c040] flex items-center justify-center overflow-hidden bg-[#141b2a]">
            <User className="w-6 h-6 text-[#f0c040]" />
          </div>
        </div>

        {/* Welcome */}
        <div>
          <h1 className="text-[11px] font-light uppercase tracking-[0.2em] text-[#8a9ab5] m-0">WELCOME</h1>
          <h2 className="text-4xl font-bold uppercase text-[#f0c040] font-oswald tracking-tight m-0 leading-tight">
            GUILHERME!
          </h2>
          <p className="text-[10px] text-[#8a9ab5] mt-1 max-w-[200px] leading-tight">Lorem ipsum dolor sit amet consectetur adipiscing elit</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 border-b border-[#2a3347] pb-2">
          {["SERVICES", "BARBERS", "PROMO"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-[11px] font-bold tracking-[0.2em] font-oswald uppercase transition-all relative pb-2 ${
                activeTab === tab ? "text-[#f0c040] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#f0c040]" : "text-[#8a9ab5]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Categories */}
        <div className="flex justify-between items-center py-4 px-2">
          {[
            { id: "SCISSORS", icon: Scissors, label: "HAIRCUT" },
            { id: "RAZOR", icon: Razor, label: "SHAVING" },
            { id: "COMB", icon: Comb, label: "HAIR STYLE" },
          ].map((cat) => (
            <div key={cat.id} className="flex flex-col items-center gap-3">
              <button
                onClick={() => setActiveCategory(cat.id)}
                className={`w-16 h-16 rounded-[8px] flex items-center justify-center transition-all ${
                  activeCategory === cat.id 
                  ? "bg-[#f0c040] text-white" 
                  : "bg-[#141b2a] text-[#8a9ab5]"
                }`}
              >
                <cat.icon className="w-8 h-8" />
              </button>
              <span className={`text-[8px] font-bold tracking-[0.2em] font-oswald uppercase ${
                activeCategory === cat.id ? "text-[#f0c040]" : "text-[#8a9ab5]"
              }`}>
                {cat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Services List */}
        <div className="space-y-5 pt-2">
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
                <h3 className={`text-xs font-bold tracking-widest font-oswald uppercase transition-all ${
                  selectedServiceId === s.id ? "text-[#f0c040]" : "text-white"
                }`}>
                  {s.name}
                </h3>
                <p className="text-[9px] text-[#8a9ab5] mt-1 leading-relaxed">
                  Lorem ipsum dolor sit amet consectetur adipiscing elit
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Button */}
      <div className="fixed bottom-0 w-full max-w-[390px] p-6 bg-[#1c2333]">
        <Button
          onClick={handleContinue}
          className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold py-7 text-xs rounded-[4px] transition-all font-oswald uppercase tracking-[3px]"
        >
          CONTINUE
        </Button>
      </div>
    </div>
  );
}