import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const AuthContext = createContext<any>({})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasInitializedAuth, setHasInitializedAuth] = useState(false)

  const loadProfile = async (userId: string, isSilent = false) => {
    if (!isSilent) setLoading(true);
    
    try {
      // 1. Fetch user profile from public.users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.error("Error loading profile from public.users:", userError);
        setLoading(false);
        setHasInitializedAuth(true);
        return;
      }

      if (!userData) {
        console.error("No user data found in public.users");
        setLoading(false);
        setHasInitializedAuth(true);
        return;
      }

      // 2. Fetch panel info via RPC to determine roles and flags
      const { data: panelData, error: panelError } = await supabase.rpc('get_my_app_panels');
      
      if (panelError) {
        console.error("Error loading panels:", panelError);
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
    } catch (err) {
      console.error("Unexpected error in loadProfile:", err);
    } finally {
      setLoading(false);
      setHasInitializedAuth(true);
    }
  }

  useEffect(() => {
    // Initial session check
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      } else {
        setLoading(false);
        setHasInitializedAuth(true);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change:", event);
        
        if (session?.user) {
          const isNewUser = !user || user.id !== session.user.id;
          setUser(session.user);
          
          // Only show global loading if it's a new login or sign out/in event
          // For events like TOKEN_REFRESHED, we load profile silently
          const isSilent = hasInitializedAuth && !isNewUser && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN');
          await loadProfile(session.user.id, isSilent);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
          setHasInitializedAuth(true);
        }
      }
    );

    // Re-validate session when window regains focus or visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Debounced or simple background refresh
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
      loading: !hasInitializedAuth || loading,
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
