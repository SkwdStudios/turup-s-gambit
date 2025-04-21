"use client";

import { useAuthStore } from "@/stores/authStore";
import { User } from "@/app/types/user";

/**
 * useAuth - A hook that provides authentication functionality
 * This is now a wrapper around the Zustand authStore for backward compatibility
 */
export function useAuth() {
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
