import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const AuthContext = createContext<any>({})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string) => {
    // Note: Reverted to 'users' table as per explicit user instruction, 
    // though previously 'profiles' was used. Using the columns requested.
    const { data } = await supabase
      .from('users')
      .select('id, role, barbershop_id, name, phone, avatar_url')
      .eq('id', userId)
      .maybeSingle()

    if (data) {
      const roleStr = String(data.role || '').toLowerCase()
      const isOwner = roleStr === 'owner'
      const isAdmin = isOwner || roleStr === 'admin'
      
      setProfile({
        ...data,
        isOwner,
        isAdmin
      })
    } else {
      setProfile({ role: 'client', isOwner: false, isAdmin: false })
    }
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
