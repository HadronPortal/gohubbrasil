import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const AuthContext = createContext<any>({})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    // Buscar perfil e verificar se é super admin em paralelo
    const [profileRes, adminRes] = await Promise.all([
      supabase
        .from('users')
        .select('id, role, barbershop_id, name, phone, avatar_url')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('app_admins')
        .select('id')
        .eq('id', userId)
        .maybeSingle()
    ])

    const data = profileRes.data
    const isSuperAdmin = !!adminRes.data

    let finalProfile = null;
    if (data) {
      const roleStr = String(data.role || '').toLowerCase()
      const isOwner = roleStr === 'owner'
      const isAdmin = isOwner || roleStr === 'admin'
      
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
      finalProfile = { role: 'client', isOwner: false, isAdmin: false, isSuperAdmin };
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
