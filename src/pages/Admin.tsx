import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Scissors, LogOut, ArrowLeft, RefreshCw, User, MessageSquare, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileModal } from "@/components/ProfileModal";
import { LogoutButton } from "@/components/LogoutButton";
import { toast } from "sonner";
import { getInitial } from "@/lib/utils";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminBarbers from "@/components/admin/AdminBarbers";
import AdminServices from "@/components/admin/AdminServices";
import AdminWhatsApp from "@/components/admin/AdminWhatsApp";
import AdminFinancial from "@/components/admin/AdminFinancial";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function Admin() {
  const [activeTab, setActiveTab] = useState<"agenda" | "barbeiros" | "servicos" | "whatsapp" | "financeiro">("agenda");
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [loadingBarbershop, setLoadingBarbershop] = useState(true);
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }
      
      if (profile && !isAdmin && profile.role !== "owner") {
        toast.error("Acesso restrito");
        navigate("/", { replace: true });
        return;
      }

      // Check if user should be in barber panel instead
      if (profile?.role === 'owner' && localStorage.getItem('force_barber_panel') === 'true' && profile.has_barber_panel) {
        navigate("/barber-dashboard", { replace: true });
        return;
      }

      const fetchBarbershopId = async () => {
        if (profile?.barbershop_id) {
          setBarbershopId(profile.barbershop_id);
          setLoadingBarbershop(false);
          return;
        }

        if (profile?.isSuperAdmin) {
          // Fallback for superadmin who doesn't have a barbershop_id linked
          const { data } = await supabase.from("barbershops").select("id").limit(1).maybeSingle();
          if (data) {
            setBarbershopId(data.id);
          }
        }
        
        setLoadingBarbershop(false);
      };

      fetchBarbershopId();
    }
  }, [user, profile, authLoading, navigate]);


  if ((authLoading && !profile) || loadingBarbershop) {
    return <LoadingScreen />;
  }



  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center font-light pb-24 overflow-x-hidden">
      <div className="w-full max-w-[390px] p-6 space-y-8 flex-1">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold uppercase text-[#f0c040] font-oswald tracking-widest leading-tight">
              PAINEL ADMIN
            </h1>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="transition-transform active:scale-95 outline-none"
              >
                <Avatar className="w-10 h-10 border border-[#f0c040] shadow-[0_0_15px_rgba(240,192,64,0.2)] hover:scale-105 transition-all">
                  <AvatarImage src={profile?.avatar_url || undefined} alt="Profile" className="object-cover" />
                  <AvatarFallback>
                    {getInitial(profile?.name, user?.email)}
                  </AvatarFallback>
                </Avatar>
              </button>
              <LogoutButton showText />
            </div>
          </div>

          {profile?.has_barber_panel && (
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                size="sm"
                disabled
                className="bg-[#f0c040] border-[#f0c040] text-[#1c2333] opacity-100 text-[10px] h-10 gap-2 font-bold font-oswald tracking-wider cursor-default"
              >
                PAINEL DONO
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  localStorage.setItem('force_barber_panel', 'true');
                  navigate("/barber-dashboard");
                }}
                className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] hover:border-[#f0c040] text-[10px] h-10 gap-2 font-bold font-oswald tracking-wider"
              >
                <RefreshCw className="w-3 h-3 text-[#f0c040]" />
                PAINEL BARBEIRO
              </Button>
            </div>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === "agenda" && (
          <AdminDashboard barbershopId={barbershopId} profile={profile} />
        )}
        {activeTab === "barbeiros" && <AdminBarbers barbershopId={barbershopId} />}
        {activeTab === "servicos" && <AdminServices barbershopId={barbershopId} />}
        {activeTab === "whatsapp" && <AdminWhatsApp />}
        {activeTab === "financeiro" && <AdminFinancial barbershopId={barbershopId} />}
      </div>

      {/* Bottom Menu */}
      <div className="fixed bottom-0 w-full max-w-[390px] grid grid-cols-5 bg-[#141b2a] border-t border-[#2a3347] py-4 px-1">
        <button
          onClick={() => setActiveTab("agenda")}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === "agenda" ? "text-[#f0c040]" : "text-[#8a9ab5]"
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[8px] font-bold font-oswald tracking-wider uppercase">AGENDA</span>
        </button>
        <button
          onClick={() => setActiveTab("barbeiros")}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === "barbeiros" ? "text-[#f0c040]" : "text-[#8a9ab5]"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[8px] font-bold font-oswald tracking-wider uppercase">BARBEIROS</span>
        </button>
        <button
          onClick={() => setActiveTab("servicos")}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === "servicos" ? "text-[#f0c040]" : "text-[#8a9ab5]"
          }`}
        >
          <Scissors className="w-5 h-5" />
          <span className="text-[8px] font-bold font-oswald tracking-wider uppercase">SERVIÇOS</span>
        </button>
        <button
          onClick={() => setActiveTab("whatsapp")}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === "whatsapp" ? "text-[#f0c040]" : "text-[#8a9ab5]"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[8px] font-bold font-oswald tracking-wider uppercase">WHATSAPP</span>
        </button>
        <button
          onClick={() => setActiveTab("financeiro")}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === "financeiro" ? "text-[#f0c040]" : "text-[#8a9ab5]"
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[8px] font-bold font-oswald tracking-wider uppercase">FINANCEIRO</span>
        </button>
      </div>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onOpenChange={setIsProfileModalOpen} 
      />
    </div>
  );
}
