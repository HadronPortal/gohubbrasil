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
    
    // Create a timeout promise to ensure we don't hang forever
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Profile fetch timeout")), 5000)
    );

    try {
      console.log("AuthProvider: Fetching profile for:", userId);
      
      const fetchPromise = supabase
        .from("profiles")
        .select("role, barbershop_id, full_name, avatar_url")
        .eq("id", userId)
        .single();

      // Race the fetch against the timeout
      const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
      const { data, error } = result;

      if (error) {
        console.error("AuthProvider: Error fetching profile from DB:", error);
        return { role: 'client', name: 'USUÁRIO' }; // Default to client on error
      }
      
      console.log("AuthProvider: Profile found:", data);
      return data ? { ...data, name: data.full_name } : { role: 'client', name: 'USUÁRIO' };
    } catch (err) {
      console.error("AuthProvider: Unexpected error in fetchProfile:", err);
      return { role: 'client', name: 'USUÁRIO' }; // Default to client on exception
    } finally {
      isFetchingProfile.current = false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      const p = await fetchProfileData(user.id);
      setProfile(p);
    }
  }, [user, fetchProfileData]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let mounted = true;

    async function initialize() {
      try {
        console.log("AuthProvider: Checking initial session...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          // Don't wait for profile to set loading false - point 3 of request
          setLoading(false); 
          const p = await fetchProfileData(session.user.id);
          if (mounted) setProfile(p);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("AuthProvider: Initialization error", err);
        if (mounted) setLoading(false);
      }
    }

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("AuthProvider: Auth event:", event);
      if (!mounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        if (currentUser) {
          // Always ensure loading is false even if we're still fetching profile
          setLoading(false);
          const p = await fetchProfileData(currentUser.id);
          if (mounted) setProfile(p);
        }
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
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
