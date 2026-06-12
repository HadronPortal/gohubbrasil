import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // First try to get session (might already be set by setSession in App.tsx)
        let { data: { session }, error: sessionError } = await supabase.auth.getSession();

        // If no session, try to parse from URL (native or web hash)
        if (!session) {
          const hash = window.location.hash;
          if (hash) {
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            
            if (accessToken && refreshToken) {
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              session = data.session;
              if (error) throw error;
            }
          }
        }

        if (sessionError) throw sessionError;

        if (!session?.user) {
          toast.error("Não foi possível concluir o login com Google");
          navigate("/login", { replace: true });
          return;
        }

        const user = session.user;

        // Check if profile exists in public.users
        const { data: profile, error: profileError } = await supabase
          .from("users")
          .select("id, role, barbershop_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        let finalProfile = profile;

        if (!profile) {
          // Create profile if it doesn't exist
          const { data: newProfile, error: insertError } = await supabase
            .from("users")
            .insert({
              id: user.id,
              role: "client",
              barbershop_id: null,
              name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
              phone: user.user_metadata?.phone || null,
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          finalProfile = newProfile;
        }

        // Get panel info for redirect logic (using the same RPC logic as Login.tsx)
        const { data: panelData } = await supabase.rpc("get_my_app_panels");
        
        const role = String(panelData?.role || finalProfile?.role || "client").toLowerCase();
        const barbershopId = panelData?.barbershop_id || finalProfile?.barbershop_id;

        // Clear force flag on login
        localStorage.removeItem("force_barber_panel");

        if (role === "superadmin") {
          navigate("/super-admin", { replace: true });
        } else if (role === "owner" || role === "admin") {
          navigate("/admin", { replace: true });
        } else if (role === "barber") {
          navigate("/barber-dashboard", { replace: true });
        } else {
          if (barbershopId) {
            navigate("/client-home", { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        }
      } catch (error: any) {
        console.error("Auth callback error:", error);
        toast.error(error.message || "Erro ao processar login");
        navigate("/login", { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return <LoadingScreen />;
}
