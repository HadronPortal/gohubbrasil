import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: any;
  profile: any;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isFetchingProfile = useRef(false);
  const initialized = useRef(false);

  const fetchProfileData = useCallback(async (userId: string) => {
    if (isFetchingProfile.current) return null;
    isFetchingProfile.current = true;
    
    try {
      console.log("AuthProvider: Fetching profile from 'users' for:", userId);
      
      const { data, error } = await Promise.race([
        supabase
          .from("users")
          .select("role, barbershop_id, name, avatar_url")
          .eq("id", userId)
          .single(),
        new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error("timeout")), 10000)
        )
      ]);

      if (error || !data) {
        console.warn("AuthProvider: Profile error or not found, using fallback if needed:", error);
        return null;
      }
      
      console.log('Perfil do usuário carregado:', data);
      return data;
    } catch (err) {
      console.error("AuthProvider: fetchProfile timeout or exception");
      return null;
    } finally {
      isFetchingProfile.current = false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfileData(user.id);
      if (p) {
        setProfile(p);
      } else {
        setProfile((prev: any) => prev || { role: 'client', name: 'USUÁRIO' });
      }
    }
  }, [user, fetchProfileData]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let mounted = true;

    async function initialize() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          setLoading(false); 
          const p = await fetchProfileData(session.user.id);
          if (mounted) {
            if (p) {
              setProfile(p);
            } else {
              setProfile((prev: any) => prev || { role: 'client', name: 'USUÁRIO' });
            }
          }
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("AuthProvider: Init error", err);
        if (mounted) {
          setLoading(false);
          setProfile((prev: any) => prev || { role: 'client', name: 'USUÁRIO' });
        }
      }
    }

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      
      // Update user only if different
      setUser((prev: any) => prev?.id === currentUser?.id ? prev : currentUser);
      
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (currentUser) {
          setLoading(false);
          const p = await fetchProfileData(currentUser.id);
          if (mounted) {
            if (p) {
              setProfile(p);
            } else {
              setProfile((prev: any) => prev || { role: 'client', name: 'USUÁRIO' });
            }
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setUser(null);
      }
      
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileData]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
