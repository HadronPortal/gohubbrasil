import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const AuthContext = createContext<any>({})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    // 1. Fetch panel info and profile via RPC
    const { data: panelData, error: panelError } = await supabase.rpc('get_my_app_panels');
    
    if (panelError) {
      console.error("Error loading panels:", panelError);
      setLoading(false);
      return;
    }

    if (!panelData) {
      console.error("No panel data returned");
      setLoading(false);
      return;
    }

    const role = String(panelData.role || 'client').toLowerCase();
    const isSuperAdmin = role === 'superadmin';
    const isOwner = role === 'owner';
    const isBarber = role === 'barber';
    const isAdmin = isSuperAdmin || isOwner || role === 'admin';
    
    // As per requirement, if owner has a barber panel, clear the force flag on login 
    // to ensure they always land on the Owner Panel first.
    if (isOwner) {
      localStorage.removeItem('force_barber_panel');
    }

    const finalProfile = {
      id: userId,
      role,
      name: panelData.name,
      phone: panelData.phone,
      avatar_url: panelData.avatar_url,
      barbershop_id: panelData.barbershop_id,
      isOwner,
      isAdmin,
      isSuperAdmin,
      isBarber,
      has_barber_panel: panelData.has_barber_panel || false
    };
    
    console.log("AUTH PROFILE DEBUG (via RPC)", {
      userId,
      profile: finalProfile,
      panels: panelData
    });

    setProfile(finalProfile);
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          loadProfile(session.user.id)
        } else {
          setProfile(null)
          setLoading(false)
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
