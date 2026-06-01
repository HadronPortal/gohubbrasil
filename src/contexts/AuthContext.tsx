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

  const fetchProfile = useCallback(async (userId: string) => {
    if (profileLoaded.current) return;
    
    console.log("AuthProvider: Fetching profile for:", userId);
    const { data, error } = await supabase
      .from('users')
      .select('role, barbershop_id, name, avatar_url')
      .eq('id', userId)
      .single();
    
    console.log('fetchProfile resultado:', data);
    setProfile(data || { role: 'client' });
    profileLoaded.current = true;
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      profileLoaded.current = false;
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const signOut = useCallback(async () => {
    console.log("AuthProvider: Signing out...");
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    profileLoaded.current = false;
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      console.log("AuthProvider: Auth event:", event);

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        profileLoaded.current = false;
        setLoading(false);
      } else if (session?.user) {
        setUser(session.user);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1c2333] flex items-center justify-center text-[#c8d4e8] font-oswald tracking-[0.2em]">
        CARREGANDO...
      </div>
    );
  }

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
