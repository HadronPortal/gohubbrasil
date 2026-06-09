import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const AuthContext = createContext<any>({})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    try {
      console.log("AuthContext: Loading profile for", userId);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (userError) {
        console.error("AuthContext: Error loading users table:", userError);
        return;
      }

      const { data: panelData, error: panelError } = await supabase.rpc('get_my_app_panels');
      if (panelError) console.error("AuthContext: Error loading panels RPC:", panelError);

      const role = String(userData?.role || 'client').toLowerCase();
      
      const finalProfile = {
        id: userId,
        role,
        name: userData?.name,
        phone: userData?.phone,
        avatar_url: userData?.avatar_url,
        barbershop_id: userData?.barbershop_id || null,
        isOwner: role === 'owner',
        isAdmin: role === 'superadmin' || role === 'owner' || role === 'admin',
        isSuperAdmin: role === 'superadmin',
        isBarber: role === 'barber',
        has_barber_panel: panelData?.has_barber_panel || false
      };

      setProfile(finalProfile);
    } catch (err) {
      console.error("AuthContext: Unexpected error in loadProfile:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log("AuthContext: Auth event:", event);
        
        if (session?.user) {
          setUser(session.user);
          // Only re-load profile if user ID changed or on critical events
          loadProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading,
      refreshProfile: () => user && loadProfile(user.id),
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
