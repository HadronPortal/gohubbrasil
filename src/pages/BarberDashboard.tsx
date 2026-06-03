import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, RefreshCw, User } from "lucide-react";
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
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold uppercase text-[#f0c040] font-oswald tracking-widest leading-tight">
              PAINEL BARBEIRO
            </h1>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#141b2a] border border-[#f0c040] flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(240,192,64,0.2)]">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-[#8a9ab5]" />
                )}
              </div>
              <LogoutButton showText />
            </div>
          </div>

          {profile?.role === 'owner' && (
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  localStorage.removeItem('force_barber_panel');
                  navigate("/admin");
                }}
                className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] hover:border-[#f0c040] text-[10px] h-10 gap-2 font-bold font-oswald tracking-wider"
              >
                <RefreshCw className="w-3 h-3 text-[#f0c040]" />
                PAINEL DONO
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                disabled
                className="bg-[#f0c040] border-[#f0c040] text-[#1c2333] opacity-100 text-[10px] h-10 gap-2 font-bold font-oswald tracking-wider cursor-default"
              >
                PAINEL BARBEIRO
              </Button>
            </div>
          )}
        </div>

        {/* Dashboard Content */}
        {profile && <BarberDashboardContent profile={profile} />}
      </div>
    </div>
  );
}
