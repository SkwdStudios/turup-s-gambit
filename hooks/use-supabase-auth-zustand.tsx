"use client";

import { useAuthStore } from "@/stores/authStore";
import { User } from "@/app/types/user";

/**
 * useSupabaseAuth - A hook that provides Supabase authentication functionality
 * This is now a wrapper around the Zustand authStore for backward compatibility
 */
export function useSupabaseAuth() {
  const {
    user,
    isLoading,
    isAuthenticated,
    loginAnonymously,
    logout
  } = useAuthStore();
  
  return {
    user,
    isLoading,
    isAuthenticated,
    loginAnonymously,
    logout
  };
}

/**
 * This component is no longer needed as we're using Zustand for state management
 * It's kept here for backward compatibility
 */
export function SupabaseAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
