import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, RefreshCw } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import BarberDashboardContent from "@/components/barber/BarberDashboard";
import { toast } from "sonner";

export default function BarberDashboard() {
  const { user, profile, isBarber, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }
      
      // Allow owner even if not explicitly marked as isBarber (as per requirement)
      if (!isBarber && profile?.role !== 'owner') {
        toast.error("Acesso restrito");
        navigate("/", { replace: true });
        return;
      }
    }
  }, [user, profile, isBarber, authLoading, navigate]);


  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#1c2333] text-[#c8d4e8] flex flex-col items-center font-light pb-24 overflow-x-hidden">
      <div className="w-full max-w-[390px] p-6 space-y-8 flex-1">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold uppercase text-[#f0c040] font-oswald tracking-widest leading-tight">
              PAINEL BARBEIRO
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {profile?.role === 'owner' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/admin")}
                className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] hover:border-[#f0c040] text-[10px] h-8 gap-2 font-bold font-oswald tracking-wider"
              >
                <RefreshCw className="w-3 h-3 text-[#f0c040]" />
                PAINEL DONO
              </Button>
            )}
            <LogoutButton showText />
          </div>
        </div>

        {/* Dashboard Content */}
        {profile && <BarberDashboardContent profile={profile} />}
      </div>
    </div>
  );
}
