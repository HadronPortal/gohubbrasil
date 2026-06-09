import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const AuthContext = createContext<any>({})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasInitialized, setHasInitialized] = useState(false)

  const loadProfile = async (userId: string, isUpdate = false) => {
    // Only show loading if we haven't initialized yet and it's not an update
    if (!isUpdate && !hasInitialized) {
      setLoading(true);
    }

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
        setHasInitialized(true);
        return;
      }

      if (!userData) {
        console.error("No user data found in public.users");
        setLoading(false);
        setHasInitialized(true);
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
      
      // Update state only if changed or initial
      setProfile(finalProfile);
    } catch (e) {
      console.error("Unexpected error in loadProfile:", e);
    } finally {
      setLoading(false);
      setHasInitialized(true);
    }
  }

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      } else {
        setLoading(false);
        setHasInitialized(true);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log("AUTH EVENT:", event);

        // Don't trigger loading for focus/refresh events if we already have data
        const isUpdateEvent = event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED';
        const hasSession = !!session?.user;
        const alreadyLoaded = hasInitialized && !!user;

        // Special case: ignore focus/refresh if we're already settled
        if (isUpdateEvent && alreadyLoaded) {
          if (session?.user) setUser(session.user);
          await loadProfile(session.user.id, true);
          return;
        }

        // For other events, update user state
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Only show loading if we really don't have a profile yet
          const shouldShowLoading = !hasInitialized;
          await loadProfile(session.user.id, !shouldShowLoading);
        } else {
          setProfile(null);
          setLoading(false);
          setHasInitialized(true);
        }
      }
    )

    return () => {
      mounted = false;
      subscription.unsubscribe();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading,
      hasInitialized,
      setLoading,
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
