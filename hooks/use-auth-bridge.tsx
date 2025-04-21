"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { User } from "@/app/types/user";

/**
 * AuthBridge - A component that bridges between the Zustand auth store and the Supabase auth context
 * This allows us to gradually migrate from one to the other without breaking existing code
 */
export function AuthBridge({ children }: { children: React.ReactNode }) {
  const zustandAuth = useAuthStore();
  const supabaseAuth = useSupabaseAuth();

  // Use refs to keep track of original functions without causing re-renders
  const originalLoginAnonymouslyRef = useRef(zustandAuth.loginAnonymously);
  const functionsReplacedRef = useRef(false);

  // Update Zustand store whenever Supabase auth changes
  useEffect(() => {
    if (supabaseAuth.user) {
      // If user exists in Supabase auth, update Zustand store
      const user: User = supabaseAuth.user;
      zustandAuth.setUser(user);
      zustandAuth.setLoading(supabaseAuth.isLoading);
    } else if (!supabaseAuth.isLoading) {
      // If not loading and no user, clear Zustand store
      zustandAuth.setUser(null);
      zustandAuth.setLoading(false);
    }
  }, [
    supabaseAuth.user,
    supabaseAuth.isLoading,
    zustandAuth.setUser,
    zustandAuth.setLoading,
  ]);

  // Replace auth functions once
  useEffect(() => {
    // Only replace functions once to avoid infinite loops
    if (functionsReplacedRef.current) return;

    // Store original function reference
    originalLoginAnonymouslyRef.current = zustandAuth.loginAnonymously;

    // Replace the Zustand login function with one that calls both
    useAuthStore.setState({
      loginAnonymously: async (username: string) => {
        // Call the Supabase auth method first
        await supabaseAuth.loginAnonymously(username);
        // Keep original implementation as fallback for now
        if (!supabaseAuth.user) {
          await originalLoginAnonymouslyRef.current(username);
        }
      },

      // Replace the logout function
      logout: async () => {
        await supabaseAuth.logout();
        // No need to call Zustand logout as it will be triggered by the effect
      },
    });

    functionsReplacedRef.current = true;

    // Restore original functions when unmounting
    return () => {
      useAuthStore.setState({
        loginAnonymously: originalLoginAnonymouslyRef.current,
      });
      functionsReplacedRef.current = false;
    };
  }, [supabaseAuth.loginAnonymously, supabaseAuth.logout]); // Only depend on the auth methods

  return <>{children}</>;
}
