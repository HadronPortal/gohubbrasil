import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'

const AuthContext = createContext<any>({})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const profileFetched = useRef(false)

  const loadProfile = async (userId: string) => {
    if (profileFetched.current) return
    profileFetched.current = true
    
    const { data } = await supabase
      .from('users')
      .select('role, barbershop_id, name, avatar_url')
      .eq('id', userId)
      .single()

    setProfile(data || { role: 'client' })
    setLoading(false)
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user && !profileFetched.current) {
          loadProfile(session.user.id)
        } else if (!session?.user) {
          profileFetched.current = false
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
