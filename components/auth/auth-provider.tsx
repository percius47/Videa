"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { createClientSupabase } from "@/lib/supabase";
import { type User, Session } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to store token outside of component state
function storeAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem("supabase.auth.token", token);
  } else {
    localStorage.removeItem("supabase.auth.token");
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<{
    user: User | null;
    session: Session | null;
    isLoading: boolean;
  }>({
    user: null,
    session: null,
    isLoading: true,
  });

  // Create supabase client once
  const supabase = useMemo(() => createClientSupabase(), []);

  // Handle auth state change (memoized to prevent recreation)
  const handleAuthStateChange = useCallback(
    async (event: string, session: Session | null) => {
      // Update token storage without triggering a rerender
      if (session) {
        storeAuthToken(session.access_token);
      } else {
        storeAuthToken(null);
      }

      // Update state in a single operation
      setAuthState({
        user: session?.user ?? null,
        session,
        isLoading: false,
      });
    },
    []
  );

  // Initialize auth on mount
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check active session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Only update state if component is still mounted
        if (mounted) {
          // Update token storage
          if (session) {
            storeAuthToken(session.access_token);
          }

          // Update state in a single operation
          setAuthState({
            user: session?.user ?? null,
            session,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) {
          setAuthState((prev) => ({ ...prev, isLoading: false }));
        }
      }
    };

    // Initialize auth
    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, handleAuthStateChange]);

  // Memoize auth methods to prevent recreation on render
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        return await supabase.auth.signInWithPassword({ email, password });
      } catch (error) {
        return { error };
      }
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      try {
        return await supabase.auth.signUp({ email, password });
      } catch (error) {
        return { error };
      }
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    try {
      const result = await supabase.auth.signOut();
      storeAuthToken(null);
      return result;
    } catch (error) {
      return { error };
    }
  }, [supabase]);

  // Memoize context value to prevent unnecessary renders
  const value = useMemo(
    () => ({
      user: authState.user,
      session: authState.session,
      isLoading: authState.isLoading,
      signIn,
      signUp,
      signOut,
    }),
    [authState, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
