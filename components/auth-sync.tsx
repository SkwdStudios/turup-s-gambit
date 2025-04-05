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
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  // Sync NextAuth session with localStorage and database
  useEffect(() => {
    let isMounted = true;
    console.log("[AuthSync] Component mounted, current status:", status);
    console.log("[AuthSync] Current session:", session);

    const syncUser = async () => {
      console.log("[AuthSync] Running syncUser function, status:", status);
      if (status === "authenticated" && session?.user) {
        try {
          console.log(
            "[AuthSync] Session user (authenticated):",
            JSON.stringify(session.user, null, 2)
          );

          // Get the Discord ID from the session
          const discordId = session.user.id;
          const discordUsername = session.user.name;
          const discordAvatar = session.user.image;

          console.log("[AuthSync] Extracted Discord data:", {
            discordId,
            discordUsername,
            discordAvatar,
          });

          // Create a user object with Discord data
          const nextAuthUser = {
            id: session.user.id,
            username:
              session.user.username ||
              discordUsername ||
              session.user.email?.split("@")[0] ||
              "User",
            name:
              session.user.username ||
              discordUsername ||
              session.user.email?.split("@")[0] ||
              "User", // Add name field for compatibility
            email: session.user.email,
            avatar:
              session.user.avatar ||
              discordAvatar ||
              `/placeholder.svg?height=200&width=200&text=${(
                discordUsername || "U"
              ).charAt(0)}`,
            image:
              session.user.avatar ||
              discordAvatar ||
              `/placeholder.svg?height=200&width=200&text=${(
                discordUsername || "U"
              ).charAt(0)}`, // Add image field for compatibility
            isAnonymous: false,
            discordId: discordId,
            discordUsername: discordUsername,
            discordAvatar: discordAvatar,
          };

          console.log(
            "[AuthSync] NextAuth user object created:",
            JSON.stringify(nextAuthUser, null, 2)
          );

          // Check if user exists in database by Discord ID
          console.log(
            `[AuthSync] Checking if user exists in database with Discord ID: ${discordId}`
          );
          const existingUserResponse = await fetch(`/api/users/${discordId}`);
          console.log(
            `[AuthSync] User existence check response status: ${existingUserResponse.status}`
          );

          if (!existingUserResponse.ok) {
            console.log(
              "[AuthSync] User not found in database, creating new user"
            );
            // Create user in database if they don't exist
            const createResponse = await fetch("/api/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(nextAuthUser),
            });

            if (!createResponse.ok) {
              const errorData = await createResponse.json();
              console.error("[AuthSync] Failed to create user:", errorData);
              console.error(
                "[AuthSync] Create user response status:",
                createResponse.status
              );
              throw new Error("Failed to create user in database");
            }

            const createdUser = await createResponse.json();
            console.log(
              "[AuthSync] Created user:",
              JSON.stringify(createdUser, null, 2)
            );

            if (isMounted) {
              // Update session with additional user data
              console.log("[AuthSync] Updating session with created user data");
              await updateSession({
                ...session,
                user: {
                  ...session.user,
                  ...createdUser,
                  discordId: discordId,
                  discordUsername: discordUsername,
                  discordAvatar: discordAvatar,
                },
              });
              console.log("[AuthSync] updateSession completed for new user");
            }
          } else {
            console.log("[AuthSync] User found in database");
            // User exists, get their data
            const existingUser = await existingUserResponse.json();
            console.log(
              "[AuthSync] Existing user from database:",
              JSON.stringify(existingUser, null, 2)
            );

            if (isMounted) {
              // Update session with database user data
              console.log(
                "[AuthSync] Updating session with existing user data"
              );
              await updateSession({
                ...session,
                user: {
                  ...session.user,
                  ...existingUser,
                  discordId: discordId,
                  discordUsername: discordUsername,
                  discordAvatar: discordAvatar,
                },
              });
              console.log(
                "[AuthSync] updateSession completed for existing user"
              );
            }
          }

          // localStorage is no longer managed here; useAuth handles it based on session.
          console.log(
            "[AuthSync] Database sync complete, useAuth will reflect session state."
          );

          // Force a router refresh to update UI if database changes affect other parts immediately
          console.log(
            "[AuthSync] Refreshing router potentially needed for UI updates post-sync"
          );
          router.refresh();
        } catch (error) {
          console.error("[AuthSync] Error syncing user:", error);
          console.error(
            "[AuthSync] Error details:",
            error instanceof Error ? error.message : String(error)
          );
        }
      } else if (status === "unauthenticated") {
        console.log("[AuthSync] Status is unauthenticated");
        // No need to manage localStorage here anymore, useAuth handles the unauthenticated state.
        /*
        const storedUser = localStorage.getItem("courtPieceUser");
        console.log("[AuthSync] Stored user in localStorage (unauthenticated):", storedUser);
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            if (!user.isAnonymous) {
              console.log("[AuthSync] Removing non-anonymous user from localStorage");
              localStorage.removeItem("courtPieceUser");
              router.refresh();
            }
          } catch (error) {
            console.error("[AuthSync] Error parsing stored user:", error);
            console.error("[AuthSync] Removing invalid user data from localStorage");
            localStorage.removeItem("courtPieceUser");
          }
        }
        */
      }
    };

    console.log("[AuthSync] Calling syncUser function");
    syncUser();

    return () => {
      console.log("[AuthSync] Component unmounting, cleaning up");
      isMounted = false;
    };
  }, [session, status, updateSession, router]);

  return null;
}
