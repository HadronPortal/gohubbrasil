import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Scissors, LogOut, ArrowLeft } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { toast } from "sonner";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminBarbers from "@/components/admin/AdminBarbers";
import AdminServices from "@/components/admin/AdminServices";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function Admin() {
  const [activeTab, setActiveTab] = useState<"agenda" | "barbeiros" | "servicos">("agenda");
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [loadingBarbershop, setLoadingBarbershop] = useState(true);
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

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

      const fetchBarbershopId = async () => {
        // Se o profile tem barbershop_id, usa ele (regra para owners)
        if (profile?.barbershop_id) {
          setBarbershopId(profile.barbershop_id);
          setLoadingBarbershop(false);
          return;
        }

        // Se for superadmin ou usuário sem barbershop_id, tenta pegar a primeira barbearia (fallback/teste)
        if (isAdmin) {
          const { data } = await supabase.from("barbershops").select("id").limit(1).single();
          if (data) {
            setBarbershopId(data.id);
          }
        }
        
        setLoadingBarbershop(false);
      };

      fetchBarbershopId();
    }
  }, [user, profile, authLoading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (authLoading || loadingBarbershop) {
    return <LoadingScreen />;
  }



  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center font-light pb-24 overflow-x-hidden">
      <div className="w-full max-w-[390px] p-6 space-y-8 flex-1">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold uppercase text-[#f0c040] font-oswald tracking-widest leading-tight">
              PAINEL ADMIN
            </h1>
          </div>
          <LogoutButton showText />
        </div>

        {/* Tab Content */}
        {activeTab === "agenda" && <AdminDashboard barbershopId={barbershopId} profile={profile} />}
        {activeTab === "barbeiros" && <AdminBarbers barbershopId={barbershopId} />}
        {activeTab === "servicos" && <AdminServices barbershopId={barbershopId} />}
      </div>

      {/* Bottom Menu */}
      <div className="fixed bottom-0 w-full max-w-[390px] grid grid-cols-3 bg-[#141b2a] border-t border-[#2a3347] py-4 px-2">
        <button
          onClick={() => setActiveTab("agenda")}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === "agenda" ? "text-[#f0c040]" : "text-[#8a9ab5]"
          }`}
        >
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] font-bold font-oswald tracking-wider uppercase">AGENDA</span>
        </button>
        <button
          onClick={() => setActiveTab("barbeiros")}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === "barbeiros" ? "text-[#f0c040]" : "text-[#8a9ab5]"
          }`}
        >
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-bold font-oswald tracking-wider uppercase">BARBEIROS</span>
        </button>
        <button
          onClick={() => setActiveTab("servicos")}
          className={`flex flex-col items-center gap-1 transition-all ${
            activeTab === "servicos" ? "text-[#f0c040]" : "text-[#8a9ab5]"
          }`}
        >
          <Scissors className="w-6 h-6" />
          <span className="text-[10px] font-bold font-oswald tracking-wider uppercase">SERVIÇOS</span>
        </button>
      </div>
    </div>
  );
}
