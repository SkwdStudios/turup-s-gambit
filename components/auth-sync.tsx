"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { User } from "@/app/types/user"; // Import user type for comparison

interface AuthSyncProps {}

// Helper to compare relevant fields between session user and DB user
const shouldUpdateSession = (sessionUser: any, dbUser: User): boolean => {
  if (!sessionUser || !dbUser) return false;
  return (
    sessionUser.email !== dbUser.email ||
    sessionUser.username !== dbUser.username ||
    sessionUser.name !== dbUser.name ||
    sessionUser.image !== dbUser.image ||
    sessionUser.discordId !== dbUser.discordId // Add other critical fields
  );
};

/**
 * AuthSync component synchronizes the NextAuth session with the database.
 * It ensures the user exists in the DB and updates the session *only* if needed.
 */
export function AuthSync({}: AuthSyncProps) {
  const { data: session, status, update: updateSession } = useSession();
  const lastSyncRef = useRef<number>(0);
  const syncInProgressRef = useRef<boolean>(false);
  const prevSessionUserIdRef = useRef<string | undefined | null>(null);

  // Create a user object from session data
  const createUserFromSession = useCallback(
    (userId: string) => {
      if (!session?.user) return null;

      const discordUsername = session.user.name;
      const discordAvatar = session.user.image;

      return {
        id: userId,
        username:
          session.user.username ||
          discordUsername ||
          session.user.email?.split("@")[0] ||
          "User",
        name: discordUsername || "User",
        email: session.user.email,
        avatar:
          discordAvatar ||
          `/placeholder.svg?text=${(discordUsername || "U").charAt(0)}`,
        image:
          discordAvatar ||
          `/placeholder.svg?text=${(discordUsername || "U").charAt(0)}`,
        isAnonymous: false,
        discordId: userId,
        discordUsername: discordUsername,
        discordAvatar: discordAvatar,
      };
    },
    [session]
  );

  // Store session data in sessionStorage with proper expiry
  const updateSessionCache = useCallback(
    (userId: string, userData: any) => {
      if (!session?.expires) return;

      const expiryTime = new Date(session.expires).getTime();
      sessionStorage.setItem(
        `auth-sync-${userId || "anonymous"}`,
        JSON.stringify({
          data: userData,
          expires: expiryTime,
        })
      );
    },
    [session]
  );

  // Main synchronization function
  const syncUser = useCallback(async () => {
    // Skip if sync already in progress
    if (syncInProgressRef.current) return;

    const currentUserId = session?.user?.id;
    const sessionStorageKey = `auth-sync-${currentUserId || "anonymous"}`;
    const now = Date.now();

    // Skip if user hasn't changed and is authenticated
    if (
      currentUserId === prevSessionUserIdRef.current &&
      status === "authenticated"
    ) {
      return;
    }

    // Check sessionStorage cache before making API calls
    if (currentUserId) {
      const storedSession = sessionStorage.getItem(sessionStorageKey);
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession);
        if (parsedSession.expires > now) {
          return;
        }
      }
    }

    // Debounce sync requests
    if (now - lastSyncRef.current < 10000) {
      return;
    }

    // Set sync flags
    syncInProgressRef.current = true;
    lastSyncRef.current = now;
    prevSessionUserIdRef.current = currentUserId;

    // Only proceed if authenticated with valid user and ID
    if (status === "authenticated" && session?.user && currentUserId) {
      try {
        // Fetch user from DB
        const existingUserResponse = await fetch(`/api/users/${currentUserId}`);

        if (!existingUserResponse.ok && existingUserResponse.status === 404) {
          // User not found, create new user
          const newUser = createUserFromSession(currentUserId);
          if (!newUser) {
            console.error(
              "[AuthSync] Failed to create user: Invalid session data"
            );
            return;
          }

          const createResponse = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newUser),
          });

          if (!createResponse.ok) {
            console.error(
              "[AuthSync] Failed to create user:",
              await createResponse.json()
            );
          } else {
            const createdUser = await createResponse.json();
            // Update session with created user data
            await updateSession({
              ...session,
              user: { ...session.user, ...createdUser },
            });
            // Cache the updated session
            updateSessionCache(currentUserId, {
              ...session.user,
              ...createdUser,
            });
          }
        } else if (existingUserResponse.ok) {
          // User exists, check if session needs updating
          const existingUser: User = await existingUserResponse.json();

          if (shouldUpdateSession(session.user, existingUser)) {
            // Update session with DB data
            await updateSession({
              ...session,
              user: { ...session.user, ...existingUser },
            });
            // Cache the updated session
            updateSessionCache(currentUserId, {
              ...session.user,
              ...existingUser,
            });
          } else {
            // Session is up-to-date, just update cache
            updateSessionCache(currentUserId, session.user);
          }
        } else {
          // Handle other API errors
          console.error(
            `[AuthSync] Error fetching user ${currentUserId}: ${existingUserResponse.status}`
          );
        }
      } catch (error) {
        console.error("[AuthSync] Error during syncUser process:", error);
      } finally {
        syncInProgressRef.current = false;
      }
    } else {
      // Reset sync flag if not authenticated
      syncInProgressRef.current = false;
    }
  }, [
    session,
    status,
    updateSession,
    createUserFromSession,
    updateSessionCache,
  ]);

  // Run sync when session or status changes
  useEffect(() => {
    let isMounted = true;
    syncUser();
    return () => {
      isMounted = false;
    };
  }, [syncUser]);

  return null;
}
