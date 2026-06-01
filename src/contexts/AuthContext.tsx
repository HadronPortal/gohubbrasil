import React, { createContext, useContext, useEffect, useState } from "react";
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

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role, barbershop_id, full_name, avatar_url")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("AuthProvider: Error fetching profile:", error);
        return null;
      }
      
      return data ? { ...data, name: data.full_name } : null;
    } catch (err) {
      console.error("AuthProvider: Unexpected error in fetchProfile:", err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Initial session check
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          const p = await fetchProfile(session.user.id);
          if (mounted) setProfile(p);
        }
      } catch (err) {
        console.error("AuthProvider: Init error", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      const newUser = session?.user ?? null;
      
      // Only update if user actually changed to avoid cycles
      if (newUser?.id !== user?.id) {
        setUser(newUser);
        if (newUser) {
          const p = await fetchProfile(newUser.id);
          if (mounted) setProfile(p);
        } else {
          if (mounted) setProfile(null);
        }
      }
      
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array is critical to avoid re-running the effect

  const signOut = async () => {
    await supabase.auth.signOut();
  };

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
