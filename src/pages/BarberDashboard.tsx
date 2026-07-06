import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileModal } from "@/components/ProfileModal";
import { useAuth } from "@/contexts/AuthContext";
import { getInitial } from "@/lib/utils";
import { LoadingScreen } from "@/components/LoadingScreen";
import BarberDashboardContent from "@/components/barber/BarberDashboard";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import { toast } from "sonner";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";

export default function BarberDashboard() {
  const { user, profile, isBarber, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCheckingBarber, setIsCheckingBarber] = useState(true);
  const [barberRecord, setBarberRecord] = useState<any>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    async function checkBarberRecord() {
      if (!user) {
        setIsCheckingBarber(false);
        return;
      }

      // Superadmin não deve carregar dados de barbeiro
      if (profile?.isSuperAdmin) {
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

    if (!authLoading && user && profile) {
      checkBarberRecord();
    } else if (!authLoading && !user) {
      setIsCheckingBarber(false);
    }
  }, [authLoading, user, profile]);

  useEffect(() => {
    // Only run redirection logic when all loading is finished
    if (!authLoading && !isCheckingBarber) {
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }
      
      if (!profile) {
        // Fallback if profile didn't load for some reason but session exists
        return;
      }

      // Superadmin sempre vai para o painel do app
      if (profile.isSuperAdmin) {
        navigate("/super-admin", { replace: true });
        return;
      }

      // Priority Rule: If owner and force flag is not set, redirect to admin panel
      if (profile.role === 'owner' && localStorage.getItem('force_barber_panel') !== 'true') {
        navigate("/admin", { replace: true });
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


  if (authLoading || isCheckingBarber) {
    return <LoadingScreen />;
  }

  return (
    <div
      className="min-h-screen bg-[#F6F7FB] text-[#172033] pb-10 overflow-x-hidden"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <div className="mx-auto w-full max-w-[420px] px-4 pt-[max(env(safe-area-inset-top),16px)] space-y-5">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex min-w-0 items-center gap-3 outline-none"
          >
            <Avatar className="h-11 w-11 border border-[#DDE3EE] bg-white">
              <AvatarImage src={profile?.avatar_url || undefined} alt="Perfil" className="object-cover" />
              <AvatarFallback className="bg-[#EAF0FF] text-[#3157D5] font-semibold">
                {getInitial(profile?.name, user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-left">
              <p className="text-[11px] font-medium text-[#64748B] leading-tight">
                Painel Profissional
              </p>
              <p className="truncate text-sm font-semibold text-[#172033] leading-tight">
                {profile?.name || "Bem-vindo"}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
          <NotificationsBell />
          <Button
            type="button"
            onClick={() => setLogoutOpen(true)}
            className="h-11 min-w-[88px] gap-2 rounded-[8px] bg-white border border-[#DDE3EE] px-3 text-sm font-medium text-[#172033] shadow-none hover:bg-[#F6F7FB] hover:text-[#DC2626] hover:border-[#DC2626]/30"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
          </div>
        </header>

        {profile?.role === 'owner' && (
          <div className="grid grid-cols-2 gap-2 rounded-[8px] border border-[#DDE3EE] bg-white p-1">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("force_barber_panel");
                navigate("/admin");
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-[6px] text-xs font-medium text-[#64748B] hover:bg-[#F6F7FB] hover:text-[#172033]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Estabelecimento
            </button>
            <button
              type="button"
              disabled
              className="flex h-10 items-center justify-center rounded-[6px] bg-[#3157D5] text-xs font-semibold text-white"
            >
              Profissional
            </button>
          </div>
        )}

        {/* Dashboard Content */}
        {profile && <BarberDashboardContent profile={profile} />}
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onOpenChange={setIsProfileModalOpen}
      />
      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}
