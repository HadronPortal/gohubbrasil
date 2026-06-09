import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const AuthContext = createContext<any>({})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [hasInitialized, setHasInitialized] = useState(false)

  const loadProfile = async (userId: string) => {
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
      // We still have userData, so we can continue with basic role if panel fails
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
    
    console.log("AUTH PROFILE DEBUG (public.users)", {
      userId,
      profile: finalProfile
    });

    setProfile(finalProfile);
    setLoading(false);
    setHasInitialized(true);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      } else {
        setLoading(false)
        setHasInitialized(true)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Se já inicializou, não mostra loading global novamente
          // Apenas atualiza os dados em background
          if (!hasInitialized) {
            setLoading(true)
          }
          loadProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
          setHasInitialized(true)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading,
      hasInitialized,
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
