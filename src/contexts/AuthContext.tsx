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

  const fetchProfile = useCallback(async (userId: string) => {
    if (isFetchingProfile.current) return;
    isFetchingProfile.current = true;
    
    try {
      console.log("AuthProvider: Fetching profile for:", userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("role, barbershop_id, full_name, avatar_url")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("AuthProvider: Error fetching profile:", error);
        return null;
      }
      
      console.log("AuthProvider: Profile found:", data);
      return data ? { ...data, name: data.full_name } : null;
    } catch (err) {
      console.error("AuthProvider: Unexpected error in fetchProfile:", err);
      return null;
    } finally {
      isFetchingProfile.current = false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        console.log("AuthProvider: Checking initial session...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          if (mounted) setProfile(p);
        }
      } catch (err) {
        console.error("AuthProvider: Initialization error", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthProvider: Auth event:", event);
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      
      // Update user state if it changed
      setUser((prevUser: any) => {
        if (prevUser?.id === currentUser?.id) return prevUser;
        return currentUser;
      });

      if (currentUser) {
        const p = await fetchProfile(currentUser.id);
        if (mounted) setProfile(p);
      } else {
        if (mounted) setProfile(null);
      }
      
      if (mounted) setLoading(false);
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
