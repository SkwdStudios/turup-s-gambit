"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

// Extend the User type to include our custom fields
declare module "next-auth" {
  interface User {
    id?: string;
    username?: string;
    avatar?: string;
    discordId?: string;
    discordUsername?: string;
    discordAvatar?: string;
  }
  
  interface Session {
    user?: User & {
      name?: string;
      email?: string;
      image?: string;
    }
  }
}

export function useAuth() {
  const { data: session, status } = useSession();
  const [localUser, setLocalUser] = useState<any>(null);
  
  // Sync with localStorage on mount and when session changes
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("courtPieceUser");
      if (storedUser) {
        setLocalUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error loading user from localStorage:", error);
    }
  }, [session]);
  
  // Combine session user with localStorage user for maximum compatibility
  const user = session?.user || localUser;
  
  return {
    user,
    status,
    isAuthenticated: status === "authenticated" || !!localUser,
    isLoading: status === "loading" && !localUser,
    signIn: (provider: string, options?: any) => signIn(provider, options),
    logout: () => signOut(),
  };
}
