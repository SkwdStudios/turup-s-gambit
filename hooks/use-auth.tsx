"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
  useCallback,
} from "react";
import dynamic from "next/dynamic";
import { useSession, signOut } from "next-auth/react";
import { User } from "@/app/types/user";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginAnonymously: (username: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// More robust comparison, focusing on key identifying fields
const usersAreEqual = (userA: User | null, userB: User | null): boolean => {
  if (userA === userB) return true; // Handle null === null and object identity
  if (!userA || !userB) return false;
  return (
    userA.id === userB.id &&
    userA.isAnonymous === userB.isAnonymous && // Crucial for distinguishing login state
    userA.username === userB.username &&
    userA.name === userB.name &&
    userA.email === userB.email &&
    userA.image === userB.image // Check image/avatar as it's visible
    // Add other fields ONLY if their change should trigger a state update in AuthProvider
  );
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);
  const { data: session, status } = useSession();

  // Single ref to track previous auth state
  const prevAuthState = useRef({
    status,
    userId: session?.user?.id,
    user,
  });

  const AuthSyncComponent = dynamic(
    () => import("../components/auth-sync").then((mod) => mod.AuthSync),
    {
      ssr: false,
    }
  );

  useEffect(() => {
    const currentAuthState = {
      status,
      userId: session?.user?.id,
      user,
    };

    // Skip if nothing changed
    if (
      status === prevAuthState.current.status &&
      session?.user?.id === prevAuthState.current.userId &&
      !internalLoading
    ) {
      return;
    }

    if (status === "authenticated" && session?.user) {
      const sessionUser = session.user as any;
      const authUser: User = {
        id: sessionUser.id || sessionUser.sub || "",
        username:
          sessionUser.username ||
          sessionUser.name ||
          sessionUser.email?.split("@")[0] ||
          "User",
        email: sessionUser.email || undefined,
        avatar: sessionUser.image || sessionUser.avatar || undefined,
        isAnonymous: false,
        name: sessionUser.name || sessionUser.username || undefined,
        image: sessionUser.image || sessionUser.avatar || undefined,
        discordId: sessionUser.discordId || sessionUser.id,
        discordUsername: sessionUser.discordUsername || sessionUser.name,
        discordAvatar: sessionUser.discordAvatar || sessionUser.image,
      };

      if (!usersAreEqual(user, authUser)) {
        setUser(authUser);
        localStorage.removeItem("courtPieceUser");
      }
    } else if (status === "unauthenticated") {
      const storedUser = localStorage.getItem("courtPieceUser");
      let potentialUser: User | null = null;

      if (storedUser) {
        try {
          const parsedUser: User = JSON.parse(storedUser);
          if (parsedUser?.id && parsedUser.isAnonymous) {
            potentialUser = parsedUser;
          }
        } catch (error) {
          console.error("[useAuth] Error parsing localStorage user:", error);
          localStorage.removeItem("courtPieceUser");
        }
      }

      if (!usersAreEqual(user, potentialUser)) {
        setUser(potentialUser);
      }
    }

    if (internalLoading && status !== "loading") {
      setInternalLoading(false);
    }

    prevAuthState.current = currentAuthState;
  }, [status, session, user, internalLoading]);

  const loginAnonymously = useCallback(
    async (username: string) => {
      try {
        if (status === "authenticated") {
          console.warn(
            "[useAuth] Already authenticated, cannot login anonymously."
          );
          return;
        }

        const anonId = `anon_${Date.now()}`;
        const avatarPlaceholder = `/placeholder.svg?height=32&width=32&text=${username
          .charAt(0)
          .toUpperCase()}`;

        const authUser: User = {
          id: anonId,
          username: username,
          avatar: avatarPlaceholder,
          isAnonymous: true,
          name: username,
          image: avatarPlaceholder,
        };
        localStorage.setItem("courtPieceUser", JSON.stringify(authUser));
        setUser(authUser);
      } catch (error) {
        console.error("Anonymous login failed:", error);
      }
    },
    [status]
  );

  const handleLogout = useCallback(async () => {
    const storedUser = localStorage.getItem("courtPieceUser");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.isAnonymous) {
          localStorage.removeItem("courtPieceUser");
        }
      } catch (e) {
        localStorage.removeItem("courtPieceUser");
      }
    }
    setUser(null);
    setInternalLoading(true); // Reset loading state on logout
    await signOut({ redirect: false });
  }, []); // Removed router dependency as it's not used here

  const contextValue = useMemo(
    () => ({
      user,
      // Use internalLoading OR next-auth loading status
      isLoading: internalLoading || status === "loading",
      isAuthenticated:
        status === "authenticated" || (!!user && user.isAnonymous),
      loginAnonymously,
      logout: handleLogout,
    }),
    [user, internalLoading, status, loginAnonymously, handleLogout]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {/* Render children only after initial loading state is resolved? Optional optimization */}
      {/* {!internalLoading && children} */}
      {children}
      <AuthSyncComponent />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
