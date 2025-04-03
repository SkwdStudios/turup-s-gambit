"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface AuthSyncProps {}

/**
 * AuthSync component synchronizes the NextAuth session with the local storage authentication.
 * It ensures that the user state is consistent between NextAuth and the custom auth system.
 */
export function AuthSync({}: AuthSyncProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Sync NextAuth session with localStorage
  useEffect(() => {
    // If user is authenticated with NextAuth
    if (status === "authenticated" && session?.user) {
      const nextAuthUser = {
        id: session.user.id || session.user.email || "",
        username:
          session.user.name || session.user.email?.split("@")[0] || "User",
        email: session.user.email,
        avatar: session.user.image,
        isAnonymous: false,
        name: session.user.name,
        image: session.user.image,
      };

      // Store NextAuth user in localStorage
      localStorage.setItem("courtPieceUser", JSON.stringify(nextAuthUser));
    }
    // If user is explicitly not authenticated with NextAuth
    else if (status === "unauthenticated") {
      // Check if there's a localStorage user that needs to be cleared
      const storedUser = localStorage.getItem("courtPieceUser");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          // Only clear non-anonymous users as they should be managed by NextAuth
          if (!user.isAnonymous) {
            localStorage.removeItem("courtPieceUser");
          }
        } catch (error) {
          console.error("Error parsing stored user:", error);
          localStorage.removeItem("courtPieceUser");
        }
      }
    }
  }, [session, status]);

  // This component doesn't render anything visible
  return null;
}
