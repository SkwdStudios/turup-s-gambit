"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    status,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    signIn: (provider: string, options?: any) => signIn(provider, options),
    signOut: () => signOut(),
  };
}
