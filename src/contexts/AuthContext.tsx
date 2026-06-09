import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'

const AuthContext = createContext<any>({})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [initialAuthLoading, setInitialAuthLoading] = useState(true)
  const [isRefreshingSession, setIsRefreshingSession] = useState(false)
  const [hasInitializedAuth, setHasInitializedAuth] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  
  const initializationStarted = useRef(false);
  const timeoutRef = useRef<any>(null);

  const loadProfile = useCallback(async (userId: string, isSilent = false) => {
    console.log(`[AUTH] profile loading start (${isSilent ? 'silent' : 'foreground'}) for ${userId}`);
    
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
        throw userError;
      }

      if (!userData) {
        console.error("[AUTH] No user data found in public.users");
        // Don't throw, maybe just a new user without record yet
        setProfile({ id: userId, role: 'client', name: 'Usuário' });
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
      console.log("[AUTH] profile loaded:", finalProfile.role);
    } catch (err: any) {
      console.error("[AUTH] error in loadProfile:", err);
      setInitError(err.message || "Erro ao carregar perfil");
    } finally {
      setInitialAuthLoading(false);
      setIsRefreshingSession(false);
      setHasInitializedAuth(true);
      console.log("[AUTH] profile loading end");
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, []);

  const initAuth = useCallback(async () => {
    if (initializationStarted.current) return;
    initializationStarted.current = true;
    
    console.log("[AUTH] auth init start");

    // Safety timeout: 5 seconds
    timeoutRef.current = setTimeout(() => {
      console.warn("[AUTH] loading timeout fallback triggered");
      setInitialAuthLoading(false);
      setHasInitializedAuth(true);
      if (timeoutRef.current) timeoutRef.current = null;
    }, 5000);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("[AUTH] Session error:", sessionError);
        throw sessionError;
      }

      if (session?.user) {
        console.log("[AUTH] session found");
        setUser(session.user);
        await loadProfile(session.user.id);
      } else {
        console.log("[AUTH] no session found");
        setInitialAuthLoading(false);
        setHasInitializedAuth(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    } catch (error: any) {
      console.error("[AUTH] Error in initAuth:", error);
      setInitError(error.message || "Erro na autenticação");
      setInitialAuthLoading(false);
      setHasInitializedAuth(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } finally {
      console.log("[AUTH] auth init finally");
    }
  }, [loadProfile]);

  useEffect(() => {
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[AUTH] Auth state change:", event);
        
        if (session?.user) {
          const isNewUser = !user || user.id !== session.user.id;
          setUser(session.user);
          
          // Re-load profile on significant events
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || isNewUser) {
            const isSilent = hasInitializedAuth && !isNewUser;
            await loadProfile(session.user.id, isSilent);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("[AUTH] user signed out");
          setUser(null);
          setProfile(null);
          setInitialAuthLoading(false);
          setHasInitializedAuth(true);
        }
      }
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        console.log("[AUTH] Visibility changed - background refresh");
        loadProfile(user.id, true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [user?.id, initAuth, loadProfile]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading: initialAuthLoading && !hasInitializedAuth,
      isRefreshingSession,
      hasInitializedAuth,
      initError,
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
