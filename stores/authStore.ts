import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { User } from "@/app/types/user";
import { supabaseAuth, signOut as supabaseSignOut } from "@/lib/supabase-auth";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  loginAnonymously: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Helper function to convert Supabase user to our User type
function supabaseUserToUser(supabaseUser: any): User {
  const userData = supabaseUser.user_metadata || {};

  // Handle different provider data structures
  const provider = supabaseUser.app_metadata?.provider;
  const isDiscord = provider === "discord";
  const isGoogle = provider === "google";

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

  return user;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      loginAnonymously: async (username) => {
        const { isAuthenticated, user } = get();

        if (isAuthenticated && !user?.isAnonymous) {
          console.warn(
            "[AuthStore] Already authenticated, cannot login anonymously."
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

        // Store in localStorage (persisted store will handle this automatically)
        set({
          user: authUser,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: async () => {
        const { user } = get();

        // If it's an anonymous user, just clear it
        if (user?.isAnonymous) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: true,
          });
          return;
        }

        // Otherwise, sign out from auth providers
        try {
          // Sign out from Supabase
          await supabaseSignOut();

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        } catch (error) {
          console.error("[AuthStore] Error during logout:", error);
          // Still clear the user state even if there was an error
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      refreshUser: async () => {
        set({ isLoading: true });

        try {
          // Check Supabase auth first
          const { data, error } = await supabaseAuth.auth.getUser();

          if (error) {
            console.log(
              "[AuthStore] No authenticated user found:",
              error.message
            );

            // Check for anonymous user in localStorage (will be handled by persist)
            const { user } = get();
            if (user?.isAnonymous) {
              set({
                isAuthenticated: true,
                isLoading: false,
              });
              return;
            }

            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }

          if (data.user) {
            const authUser = supabaseUserToUser(data.user);
            set({
              user: authUser,
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          }

          // No authenticated user found
          set({
            isLoading: false,
            isAuthenticated: false,
          });
        } catch (error) {
          console.error("[AuthStore] Error refreshing user:", error);
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Initialize authentication state
// This will be executed when the module is imported
if (typeof window !== "undefined") {
  // Run on client-side only
  useAuthStore.getState().refreshUser();

  // Subscribe to Supabase auth changes
  supabaseAuth.auth.onAuthStateChange(async (event, session) => {
    const store = useAuthStore.getState();

    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      if (session?.user) {
        const authUser = supabaseUserToUser(session.user);
        store.setUser(authUser);
      }
    } else if (event === "SIGNED_OUT") {
      store.setUser(null);
    } else if (event === "USER_UPDATED") {
      if (session?.user) {
        const authUser = supabaseUserToUser(session.user);
        store.setUser(authUser);
      }
    }
  });
}
