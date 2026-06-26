import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  Scissors,
  LogOut,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileModal } from "@/components/ProfileModal";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import { toast } from "sonner";
import { cn, getInitial } from "@/lib/utils";
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
  const [logoutOpen, setLogoutOpen] = useState(false);

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


  if (authLoading || loadingBarbershop) {
    return <LoadingScreen />;
  }



  const tabs: Array<{ id: typeof activeTab; label: string; Icon: typeof Calendar }> = [
    { id: "agenda", label: "Agenda", Icon: Calendar },
    { id: "barbeiros", label: "Equipe", Icon: Users },
    { id: "servicos", label: "Serviços", Icon: Scissors },
    { id: "whatsapp", label: "WhatsApp", Icon: WhatsAppIcon as unknown as typeof Calendar },
    { id: "financeiro", label: "Financeiro", Icon: TrendingUp },
  ];

  return (
    <div
      className="min-h-screen bg-[#F6F7FB] text-[#172033] pb-28 overflow-x-hidden"
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
              <p className="truncate text-sm font-semibold text-[#172033] leading-tight">
                {profile?.name || "Bem-vindo"}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
          <NotificationsBellMount />
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

        {profile?.has_barber_panel && (
          <div className="grid grid-cols-2 gap-2 rounded-[8px] border border-[#DDE3EE] bg-white p-1">
            <button
              type="button"
              disabled
              className="flex h-10 items-center justify-center rounded-[6px] bg-[#3157D5] text-xs font-semibold text-white"
            >
              Estabelecimento
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem("force_barber_panel", "true");
                navigate("/barber-dashboard");
              }}
              className="flex h-10 items-center justify-center gap-2 rounded-[6px] text-xs font-medium text-[#64748B] hover:bg-[#F6F7FB] hover:text-[#172033]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Profissional
            </button>
          </div>
        )}

        {/* Tab Content */}
        <main className="space-y-5">
          {activeTab === "agenda" && (
            <AdminDashboard barbershopId={barbershopId} profile={profile} />
          )}
          {activeTab === "barbeiros" && <AdminBarbers barbershopId={barbershopId} />}
          {activeTab === "servicos" && <AdminServices barbershopId={barbershopId} />}
          {activeTab === "whatsapp" && <AdminWhatsApp />}
          {activeTab === "financeiro" && <AdminFinancial barbershopId={barbershopId} />}
        </main>
      </div>

      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 left-1/2 z-40 -translate-x-1/2 w-full max-w-[420px] border-t border-[#DDE3EE] bg-white pb-[max(env(safe-area-inset-bottom),8px)] pt-2 px-1 grid grid-cols-5"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        {tabs.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[8px] transition-colors",
                active ? "text-[#3157D5]" : "text-[#64748B] hover:text-[#172033]",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className={cn("text-[10px]", active ? "font-semibold" : "font-medium")}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      <ProfileModal isOpen={isProfileModalOpen} onOpenChange={setIsProfileModalOpen} />
      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}
