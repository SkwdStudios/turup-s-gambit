"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession, signOut } from "next-auth/react";

export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  isAnonymous: boolean;
  name?: string;
  image?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginAnonymously: (username: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  const AuthSyncComponent = dynamic(
    () => import("../components/auth-sync").then((mod) => mod.AuthSync),
    {
      ssr: false,
    }
  );

  useEffect(() => {
    console.log(
      "[useAuth] AuthProvider effect running. Auth.js status:",
      status
    );

    if (status === "authenticated" && session?.user) {
      console.log(
        "[useAuth] Auth.js status is 'authenticated'. Full session object:",
        JSON.stringify(session, null, 2)
      );
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
        ...sessionUser,
      };
      setUser(authUser);
      localStorage.removeItem("courtPieceUser");
    } else if (status === "unauthenticated") {
      console.log("[useAuth] Auth.js session unauthenticated.");
      const storedUser = localStorage.getItem("courtPieceUser");
      if (storedUser) {
        try {
          const parsedUser: User = JSON.parse(storedUser);
          if (parsedUser && parsedUser.id && parsedUser.isAnonymous) {
            console.log(
              "[useAuth] Using anonymous user from localStorage:",
              parsedUser
            );
            setUser(parsedUser);
          } else {
            console.log(
              "[useAuth] Removing non-anonymous/invalid user from localStorage."
            );
            localStorage.removeItem("courtPieceUser");
            setUser(null);
          }
        } catch (error) {
          console.error("[useAuth] Error parsing localStorage user:", error);
          localStorage.removeItem("courtPieceUser");
          setUser(null);
        }
      } else {
        setUser(null);
      }
    }
  }, [session, status]);

  const loginAnonymously = async (username: string) => {
    try {
      if (status === "authenticated") {
        console.warn("[useAuth] Cannot login anonymously while authenticated.");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

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
      throw error;
    }
  };

  const handleLogout = async () => {
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
    await signOut({ redirect: false });
    router.push("/");
    console.log("[useAuth] User logged out.");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated:
          status === "authenticated" || (!!user && user.isAnonymous),
        loginAnonymously,
        logout: handleLogout,
      }}
    >
      <AuthSyncComponent />
      {children}
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
