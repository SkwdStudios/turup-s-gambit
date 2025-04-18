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
      const isAnonymous = session.user.isAnonymous === true;

      // Generate a unique username if needed
      let username =
        session.user.username ||
        discordUsername ||
        session.user.email?.split("@")[0];

      // For anonymous users, ensure we have a valid username
      if (!username || username.trim() === "") {
        username = `Guest_${Math.floor(Math.random() * 10000)}`;
      }

      return {
        username: username,
        name: discordUsername || username,
        email: session.user.email,
        avatar:
          discordAvatar ||
          `/placeholder.svg?height=200&width=200&text=${(
            username || "U"
          ).charAt(0)}`,
        isAnonymous: isAnonymous,
        discordId: isAnonymous ? undefined : userId,
        discordUsername: isAnonymous ? undefined : discordUsername,
        discordAvatar: isAnonymous ? undefined : discordAvatar,
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

    // Handle both authenticated and anonymous users
    if (status === "authenticated" && session?.user) {
      try {
        // For anonymous users, we don't need to fetch from DB
        if (session.user.isAnonymous) {
          console.log("[AuthSync] Anonymous user, skipping DB sync");
          syncInProgressRef.current = false;
          return;
        }

        // Only proceed with DB operations for authenticated users with valid ID
        if (!currentUserId) {
          console.error("[AuthSync] Authenticated user missing ID");
          syncInProgressRef.current = false;
          return;
        }

        // Fetch user from DB
        const existingUserResponse = await fetch(`/api/users/${currentUserId}`);

        if (!existingUserResponse.ok && existingUserResponse.status === 404) {
          // User not found, create new user
          const newUser = createUserFromSession(currentUserId);
          if (!newUser) {
            console.error(
              "[AuthSync] Failed to create user: Invalid session data"
            );
            syncInProgressRef.current = false;
            return;
          }

          console.log("[AuthSync] Creating new user:", newUser.username);

          try {
            const createResponse = await fetch("/api/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(newUser),
            });

            if (!createResponse.ok) {
              const errorData = await createResponse.json();
              console.error("[AuthSync] Failed to create user:", errorData);
            } else {
              const createdUser = await createResponse.json();
              console.log(
                "[AuthSync] User created successfully:",
                createdUser.username
              );

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
          } catch (createError) {
            console.error("[AuthSync] Error creating user:", createError);
          }
        } else if (existingUserResponse.ok) {
          // User exists, check if session needs updating
          const existingUser: User = await existingUserResponse.json();
          console.log("[AuthSync] Found existing user:", existingUser.username);

          if (shouldUpdateSession(session.user, existingUser)) {
            console.log("[AuthSync] Updating session with DB data");
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
            console.log("[AuthSync] Session is up-to-date");
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
