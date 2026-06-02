import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const AuthContext = createContext<any>({})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, role, barbershop_id, name, phone, avatar_url')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error("Error loading profile:", error);
      setLoading(false);
      return;
    }

    let finalProfile = null;
    if (data) {
      const roleStr = String(data.role || '').toLowerCase()
      const isSuperAdmin = roleStr === 'superadmin'
      const isOwner = roleStr === 'owner'
      const isAdmin = isSuperAdmin || isOwner || roleStr === 'admin'
      
      finalProfile = {
        ...data,
        isOwner,
        isAdmin,
        isSuperAdmin
      }
      
      console.log("AUTH PROFILE DEBUG", {
        userId: userId,
        profile: finalProfile,
        role: data.role,
        isAdmin,
        isOwner,
        isSuperAdmin
      });
    } else {
      finalProfile = { role: 'client', isOwner: false, isAdmin: false, isSuperAdmin: false };
      console.log("AUTH PROFILE DEBUG (No profile found)", {
        userId: userId,
        profile: finalProfile
      });
    }
    setProfile(finalProfile)
    setLoading(false)
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
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
