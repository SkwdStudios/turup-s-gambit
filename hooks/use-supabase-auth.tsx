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
import { supabaseAuth, signOut as supabaseSignOut } from "@/lib/supabase-auth";
import { User } from "@/app/types/user";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginAnonymously: (username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to convert Supabase user to our User type
function supabaseUserToUser(supabaseUser: SupabaseUser): User {
  console.log("[supabaseUserToUser] Converting user:", supabaseUser);
  const userData = supabaseUser.user_metadata || {};
  console.log("[supabaseUserToUser] User metadata:", userData);

  // Handle different provider data structures
  const provider = supabaseUser.app_metadata?.provider;
  const isDiscord = provider === "discord";
  const isGoogle = provider === "google";

  console.log("[supabaseUserToUser] Provider:", provider);

  // Get the best username based on provider
  let username = "User";
  let avatar = "";
  let name = "";

  if (isDiscord) {
    // Discord-specific data extraction
    username =
      userData.custom_claims?.global_name ||
      userData.custom_claims?.username ||
      userData.full_name ||
      userData.name ||
      userData.username ||
      userData.preferred_username;

    name =
      userData.custom_claims?.global_name ||
      userData.full_name ||
      userData.name ||
      username;

    // Discord avatar construction
    if (userData.custom_claims?.avatar) {
      const discordId = userData.custom_claims?.sub || userData.sub;
      avatar = `https://cdn.discordapp.com/avatars/${discordId}/${userData.custom_claims.avatar}.png`;
    } else {
      avatar = userData.avatar_url || userData.picture;
    }
  } else if (isGoogle) {
    // Google-specific data extraction
    username =
      userData.name ||
      userData.full_name ||
      userData.email?.split("@")[0] ||
      "User";
    name = userData.name || userData.full_name || username;
    avatar = userData.picture || userData.avatar_url;
  } else {
    // Default fallback for other providers or email
    username =
      userData.username ||
      userData.preferred_username ||
      userData.name ||
      userData.full_name ||
      (supabaseUser.email ? supabaseUser.email.split("@")[0] : "User");

    name = userData.full_name || userData.name || username;
    avatar = userData.avatar_url || userData.picture;
  }

  // If no avatar, create a placeholder
  if (!avatar) {
    const initial = (username.charAt(0) || "U").toUpperCase();
    avatar = `/placeholder.svg?height=200&width=200&text=${initial}`;
  }

  // Create the user object
  const user: User = {
    id: supabaseUser.id,
    username,
    email: supabaseUser.email,
    avatar,
    isAnonymous: false,
    name,
    image: avatar,
  };

  // Add provider-specific fields if available
  if (isDiscord) {
    user.discordId =
      userData.custom_claims?.sub || userData.sub || userData.provider_id;
    user.discordUsername =
      userData.custom_claims?.username ||
      userData.custom_claims?.global_name ||
      username;
    user.discordAvatar = avatar;
  }

  console.log("[supabaseUserToUser] Converted user:", user);
  return user;
}

// Helper function to compare users
function usersAreEqual(a: User | null, b: User | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.id === b.id;
}

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log("[useAuth] Initializing auth...");
        setIsLoading(true);

        // Get authenticated user using the more secure method
        const { data, error } = await supabaseAuth.auth.getUser();
        console.log("[useAuth] Initial auth check complete");

        if (error) {
          console.log("[useAuth] No authenticated user found:", error.message);
        } else if (data.user) {
          console.log("[useAuth] Initial user data:", data.user);
          console.log(
            "[useAuth] Initial user metadata:",
            data.user.user_metadata
          );

          const authUser = supabaseUserToUser(data.user);
          console.log("[useAuth] Initial converted user:", authUser);

          setUser(authUser);
          setIsAuthenticated(true);
          console.log("[useAuth] Initial authentication complete");
        } else {
          // Check for anonymous user in localStorage
          const storedUser = localStorage.getItem("courtPieceUser");
          if (storedUser) {
            try {
              const parsedUser: User = JSON.parse(storedUser);
              if (parsedUser?.id && parsedUser.isAnonymous) {
                setUser(parsedUser);
                setIsAuthenticated(true);
              }
            } catch (error) {
              console.error(
                "[useAuth] Error parsing localStorage user:",
                error
              );
              localStorage.removeItem("courtPieceUser");
            }
          }
        }
      } catch (error) {
        console.error("[useAuth] Error initializing auth:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabaseAuth.auth.onAuthStateChange(async (event, session) => {
      console.log("[useAuth] Auth state changed:", event);
      console.log("[useAuth] Session:", session);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session?.user) {
          console.log("[useAuth] User data:", session.user);
          console.log("[useAuth] User metadata:", session.user.user_metadata);

          const authUser = supabaseUserToUser(session.user);
          console.log("[useAuth] Converted user:", authUser);

          setUser(authUser);
          setIsAuthenticated(true);
          localStorage.removeItem("courtPieceUser"); // Remove anonymous user if exists

          console.log(
            "[useAuth] Authentication complete, user set:",
            authUser.username
          );
        }
      } else if (event === "SIGNED_OUT") {
        console.log("[useAuth] User signed out");
        setUser(null);
        setIsAuthenticated(false);
      } else if (event === "USER_UPDATED") {
        if (session?.user) {
          const authUser = supabaseUserToUser(session.user);
          setUser(authUser);
          console.log("[useAuth] User updated:", authUser.username);
        }
      } else {
        console.log("[useAuth] No session user available or unhandled event");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loginAnonymously = useCallback(
    async (username: string) => {
      try {
        if (isAuthenticated && !user?.isAnonymous) {
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
        setIsAuthenticated(true);
      } catch (error) {
        console.error("[useAuth] Anonymous login failed:", error);
      }
    },
    [isAuthenticated, user]
  );

  const logout = useCallback(async () => {
    try {
      // Handle anonymous user logout
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

      // Handle Supabase logout
      if (!user?.isAnonymous) {
        await supabaseSignOut();
      }

      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("[useAuth] Logout failed:", error);
    }
  }, [user]);

  const contextValue = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      loginAnonymously,
      logout,
    }),
    [user, isLoading, isAuthenticated, loginAnonymously, logout]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      "useSupabaseAuth must be used within a SupabaseAuthProvider"
    );
  }
  return context;
}
