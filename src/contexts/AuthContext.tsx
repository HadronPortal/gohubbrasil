import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const AuthContext = createContext<any>({})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return
      
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('role, barbershop_id, name, avatar_url')
          .eq('id', session.user.id)
          .single()
        
        if (mounted) setProfile(data)
      }
      
      if (mounted) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        setUser(session?.user ?? null)
        
        if (event === 'SIGNED_IN' && session?.user) {
          const { data } = await supabase
            .from('users')
            .select('role, barbershop_id, name, avatar_url')
            .eq('id', session.user.id)
            .single()
          if (mounted) setProfile(data)
        }
        
        if (event === 'SIGNED_OUT') {
          if (mounted) setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {loading ? (
        <div style={{
          color: '#f0c040',
          textAlign: 'center',
          marginTop: '40vh',
          fontFamily: 'Oswald, sans-serif',
          letterSpacing: '0.2em',
          textTransform: 'uppercase'
        }}>
          Carregando...
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
