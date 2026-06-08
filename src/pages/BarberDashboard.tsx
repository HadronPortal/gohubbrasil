import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, RefreshCw, User } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileModal } from "@/components/ProfileModal";
import { useAuth } from "@/contexts/AuthContext";
import { getInitial } from "@/lib/utils";
import { LoadingScreen } from "@/components/LoadingScreen";
import BarberDashboardContent from "@/components/barber/BarberDashboard";
import { toast } from "sonner";

export default function BarberDashboard() {
  const { user, profile, isBarber, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCheckingBarber, setIsCheckingBarber] = useState(true);
  const [barberRecord, setBarberRecord] = useState<any>(null);

  useEffect(() => {
    async function checkBarberRecord() {
      if (!user) {
        setIsCheckingBarber(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('barbers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) throw error;
        setBarberRecord(data);
      } catch (err) {
        console.error("Error checking barber record:", err);
      } finally {
        setIsCheckingBarber(false);
      }
    }

    if (!authLoading && user) {
      checkBarberRecord();
    } else if (!authLoading && !user) {
      setIsCheckingBarber(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    // Only run redirection logic when all loading is finished
    if (!authLoading && !isCheckingBarber) {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }
      
      if (!profile) return;

      // Priority Rule: If owner and force flag is not set, redirect to admin panel
      if (profile.role === 'owner' && localStorage.getItem('force_barber_panel') !== 'true') {
        if (window.location.pathname !== "/admin") {
          navigate("/admin", { replace: true });
        }
        return;
      }
      
      const canAccess = profile.role === 'barber' || (profile.role === 'owner' && !!barberRecord);

      if (!canAccess) {
        toast.error("Acesso restrito");
        navigate("/", { replace: true });
        return;
      }
    }
  }, [user, profile, isCheckingBarber, barberRecord, authLoading, navigate]);


  if (authLoading && !profile) {
    return <LoadingScreen />;
  }

  if (isCheckingBarber && !barberRecord) {
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

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onOpenChange={setIsProfileModalOpen} 
      />
    </div>
  );
}
