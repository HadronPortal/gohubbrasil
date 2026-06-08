import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const AuthContext = createContext<any>({})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [initialAuthLoading, setInitialAuthLoading] = useState(true)
  const [isRefreshingSession, setIsRefreshingSession] = useState(false)
  const [hasInitializedAuth, setHasInitializedAuth] = useState(false)

  const loadProfile = async (userId: string, isSilent = false) => {
    console.log(`[AUTH] Profile loading started (${isSilent ? 'silent' : 'foreground'}) for ${userId}`);
    if (!isSilent) setInitialAuthLoading(true);
    else setIsRefreshingSession(true);
    
    try {
      // 1. Fetch user profile from public.users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.error("[AUTH] Error loading profile from public.users:", userError);
        return;
      }

      if (!userData) {
        console.error("[AUTH] No user data found in public.users");
        return;
      }

      // 2. Fetch panel info via RPC to determine roles and flags
      const { data: panelData, error: panelError } = await supabase.rpc('get_my_app_panels');
      
      if (panelError) {
        console.error("[AUTH] Error loading panels:", panelError);
      }

      const role = String(userData.role || 'client').toLowerCase();
      const isSuperAdmin = role === 'superadmin';
      const isOwner = role === 'owner';
      const isBarber = role === 'barber';
      const isAdmin = isSuperAdmin || isOwner || role === 'admin';
      
      if (isOwner) {
        localStorage.removeItem('force_barber_panel');
      }

      const finalProfile = {
        id: userId,
        role,
        name: userData.name,
        phone: userData.phone,
        avatar_url: userData.avatar_url,
        barbershop_id: userData.barbershop_id || null,
        isOwner,
        isAdmin,
        isSuperAdmin,
        isBarber,
        has_barber_panel: panelData?.has_barber_panel || false
      };
      
      setProfile(finalProfile);
      console.log("[AUTH] Profile loaded successfully:", finalProfile.role);
    } catch (err) {
      console.error("[AUTH] Unexpected error in loadProfile:", err);
    } finally {
      setInitialAuthLoading(false);
      setIsRefreshingSession(false);
      setHasInitializedAuth(true);
      console.log("[AUTH] Profile loading end");
    }
  }

  useEffect(() => {
    // Initial session check
    const initSession = async () => {
      console.log("[AUTH] Initial session check start");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          console.log("[AUTH] Session found, loading profile");
          setUser(session.user);
          await loadProfile(session.user.id);
        } else {
          console.log("[AUTH] No session found");
          setInitialAuthLoading(false);
          setHasInitializedAuth(true);
        }
      } catch (error) {
        console.error("[AUTH] Error in initSession:", error);
        setInitialAuthLoading(false);
        setHasInitializedAuth(true);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AUTH] Auth state change:", event);
        
        if (session?.user) {
          const isNewUser = !user || user.id !== session.user.id;
          setUser(session.user);
          
          // Only show global loading if it's a new login or sign out/in event
          // For events like TOKEN_REFRESHED, we load profile silently
          const isSilent = hasInitializedAuth && !isNewUser;
          await loadProfile(session.user.id, isSilent);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setInitialAuthLoading(false);
          setHasInitializedAuth(true);
        }
      }
    );

    // Re-validate session when window regains focus or visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log("[AUTH] Visibility changed to visible, refreshing profile in background");
        loadProfile(user.id, true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    }
  }, [user?.id, hasInitializedAuth]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading: initialAuthLoading && !hasInitializedAuth,
      isRefreshingSession,
      hasInitializedAuth,
      refreshProfile: () => user && loadProfile(user.id, true),
      isSuperAdmin: profile?.isSuperAdmin || false,
      isOwner: profile?.isOwner || false,
      isAdmin: profile?.isAdmin || false,
      isBarber: profile?.isBarber || false
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
