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
  
  const profileLoaded = useRef(false);
  const fetchingUserId = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    // Flag to not fetch twice for the same user
    if (profileLoaded.current && fetchingUserId.current === userId) return;
    
    profileLoaded.current = true;
    fetchingUserId.current = userId;
    
    const { data, error } = await supabase
      .from('users')
      .select('role, barbershop_id, name, avatar_url')
      .eq('id', userId)
      .single();
    
    if (data) {
      console.log('fetchProfile chamado, role:', data?.role);
      setProfile(data);
    } else {
      console.log('fetchProfile chamado, erro ou sem dados, definindo como client');
      setProfile({ role: 'client', name: 'USUÁRIO' });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      profileLoaded.current = false; // Reset to allow explicit refresh
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          setLoading(false);
          await fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (mounted) setLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      const currentUser = session?.user ?? null;
      
      if (event === 'SIGNED_IN') {
        setUser(currentUser);
        setLoading(false);
        if (currentUser) {
          await fetchProfile(currentUser.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        profileLoaded.current = false;
        fetchingUserId.current = null;
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setUser(currentUser);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

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
