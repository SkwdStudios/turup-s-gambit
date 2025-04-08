import NextAuth from "next-auth";
import Discord, { DiscordProfile } from "next-auth/providers/discord";
import { prisma } from "./lib/prisma";
import Google from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { User } from "next-auth";
// Debug logging
console.log("Environment variables check:");
console.log("AUTH_DISCORD_ID exists:", !!process.env.AUTH_DISCORD_ID);
console.log("AUTH_DISCORD_SECRET exists:", !!process.env.AUTH_DISCORD_SECRET);
console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
console.log("AUTH_SECRET exists:", !!process.env.AUTH_SECRET);

if (!process.env.AUTH_DISCORD_ID) {
  throw new Error("Missing AUTH_DISCORD_ID environment variable");
}
if (!process.env.AUTH_DISCORD_SECRET) {
  throw new Error("Missing AUTH_DISCORD_SECRET environment variable");
}
if (!process.env.NEXTAUTH_URL) {
  throw new Error("Missing NEXTAUTH_URL environment variable");
}

// Ensure NEXTAUTH_URL is properly formatted
if (!process.env.NEXTAUTH_URL?.startsWith("http")) {
  console.warn("NEXTAUTH_URL should start with http:// or https://");
  // Default to http://localhost:3000 if not properly formatted
  process.env.NEXTAUTH_URL = "http://localhost:3000";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord,
    Google,
    CredentialsProvider({
      id: "credentials",
      name: "Anonymous",
      credentials: {
        username: { label: "Username", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.username) {
          return null;
        }

        try {
          // Generate a unique ID for anonymous users
          const anonymousId = `anon_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`;
          const username = credentials.username as string;

          // Check if username is already taken
          const existingUser = await prisma.user.findFirst({
            where: { username: username },
          });

          if (existingUser) {
            // If username exists, append a random string to make it unique
            const uniqueUsername = `${username}_${Math.random()
              .toString(36)
              .substring(2, 5)}`;

            // Create new anonymous user with unique username
            const newUser = await prisma.user.create({
              data: {
                username: uniqueUsername,
                email: null,
                avatar: `/placeholder.svg?height=200&width=200&text=${uniqueUsername.charAt(
                  0
                )}`,
                isAnonymous: true,
                discordId: anonymousId,
                discordUsername: uniqueUsername,
                discordAvatar: null,
              },
            });

            return {
              id: newUser.id,
              name: newUser.username,
              email: null,
              image: newUser.avatar,
              discordId: newUser.discordId || undefined,
              discordUsername: newUser.discordUsername || undefined,
              discordAvatar: newUser.discordAvatar || undefined,
              username: newUser.username,
              avatar: newUser.avatar,
            } as User;
          }

          // Create new anonymous user
          const newUser = await prisma.user.create({
            data: {
              username: username,
              email: null,
              avatar: `/placeholder.svg?height=200&width=200&text=${username.charAt(
                0
              )}`,
              isAnonymous: true,
              discordId: anonymousId,
              discordUsername: username,
              discordAvatar: null,
            },
          });

          return {
            id: newUser.id,
            name: newUser.username,
            email: null,
            image: newUser.avatar,
            discordId: newUser.discordId || undefined,
            discordUsername: newUser.discordUsername || undefined,
            discordAvatar: newUser.discordAvatar || undefined,
            username: newUser.username,
            avatar: newUser.avatar,
          } as User;
        } catch (error) {
          console.error("Error creating anonymous user:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      console.log(
        "[Auth.ts session callback] Incoming token:",
        JSON.stringify(token, null, 2)
      );
      console.log(
        "[Auth.ts session callback] Incoming session:",
        JSON.stringify(session, null, 2)
      );
      if (session.user) {
        try {
          // Handle anonymous users differently
          if (token.isAnonymous) {
            session.user.id = token.id as string;
            session.user.discordId = token.discordId as string;
            session.user.discordUsername = token.discordUsername as string;
            session.user.discordAvatar = token.discordAvatar as string;
            session.user.username = token.username as string;
            session.user.avatar = token.avatar as string;

            console.log(
              "[Auth.ts session callback] Returning anonymous session:",
              JSON.stringify(session, null, 2)
            );
            return session;
          }

          // Regular user flow
          if (!token.id || !token.discordId) {
            console.error(
              "[Auth.ts session callback] Error: Missing required fields (id or discordId) in token:",
              JSON.stringify(token, null, 2)
            );
            throw new Error("Missing required token fields");
          }

          // Use the Discord ID consistently with type safety
          session.user.id = token.id as string;
          session.user.discordId = token.discordId as string;
          session.user.discordUsername =
            (token.discordUsername as string) || "";
          session.user.discordAvatar = (token.discordAvatar as string) || "";

          // Ensure required fields are populated
          if (!session.user.username) {
            session.user.username =
              (token.discordUsername as string) ||
              session.user.email?.split("@")[0] ||
              "User";
          }
          if (!session.user.avatar) {
            session.user.avatar =
              (token.discordAvatar as string) ||
              `/placeholder.svg?height=200&width=200&text=${(
                (token.discordUsername as string) || "U"
              ).charAt(0)}`;
          }

          // Fetch additional user data from database
          console.log(
            `[Auth.ts session callback] Fetching user from DB with discordId: ${token.discordId}`
          );
          const dbUser = await prisma.user.findFirst({
            where: { discordId: token.discordId as string },
          });
          console.log(
            "[Auth.ts session callback] DB user found:",
            JSON.stringify(dbUser, null, 2)
          );

          if (dbUser) {
            session.user.username = dbUser.username || session.user.username;
            session.user.avatar = dbUser.avatar || session.user.avatar;
          }
        } catch (error) {
          console.error("Error in session callback:", error);
          // Ensure session still has minimum required data
          session.user.username = session.user.username || "User";
          session.user.avatar =
            session.user.avatar ||
            `/placeholder.svg?height=200&width=200&text=U`;
          console.log(
            "[Auth.ts session callback] Session modified in catch block:",
            JSON.stringify(session, null, 2)
          );
        }
      }
      console.log(
        "[Auth.ts session callback] Returning final session:",
        JSON.stringify(session, null, 2)
      );
      return session;
    },
    async jwt({ token, account, profile }) {
      console.log("[Auth.ts jwt callback] Executing...");
      console.log(
        "[Auth.ts jwt callback] Incoming token:",
        JSON.stringify(token, null, 2)
      );
      console.log(
        "[Auth.ts jwt callback] Incoming account:",
        JSON.stringify(account, null, 2)
      );
      console.log(
        "[Auth.ts jwt callback] Incoming profile:",
        JSON.stringify(profile, null, 2)
      );

      // Handle anonymous login via credentials provider
      if (account?.provider === "credentials") {
        token.isAnonymous = true;
        // Use type assertion to access custom properties
        const customAccount = account as any;
        token.id = customAccount.id;
        token.discordId = customAccount.discordId;
        token.discordUsername = customAccount.discordUsername;
        token.discordAvatar = customAccount.discordAvatar;
        token.username = customAccount.username;
        token.avatar = customAccount.avatar;
      }
      // Handle Discord login
      else if (account?.provider === "discord" && profile) {
        console.log("[Auth.ts jwt callback] Processing Discord login...");
        // Type assertion for Discord profile
        const discordProfile = profile as DiscordProfile;
        token.discordId = discordProfile.id;
        token.discordUsername = discordProfile.username;
        token.discordAvatar = discordProfile.image_url;
        token.email = discordProfile.email;
        // Ensure we're using Discord ID consistently
        token.id = discordProfile.id;
      }
      console.log(
        "[Auth.ts jwt callback] Returning final token:",
        JSON.stringify(token, null, 2)
      );
      return token;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "discord" && profile) {
        try {
          // Type assertion for Discord profile if needed, or use specific types
          const discordProfile = profile as DiscordProfile;

          const existingUser = await prisma.user.findFirst({
            where: {
              OR: [
                { discordId: discordProfile.id },
                { email: discordProfile.email },
              ],
            },
          });

          if (!existingUser) {
            // Create new user with type safety
            await prisma.user.create({
              data: {
                username:
                  discordProfile.username || `user_${discordProfile.id}`, // Fallback username
                email: discordProfile.email || null, // Handle potentially null email
                avatar: discordProfile.image_url || "", // Ensure string
                discordId: discordProfile.id,
                discordUsername: discordProfile.username || null, // Handle potentially null
                discordAvatar: discordProfile.image_url || null, // Handle potentially null
                isAnonymous: false,
              },
            });
          } else {
            // Update existing user with type safety
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                username: discordProfile.username || existingUser.username, // Fallback
                email: discordProfile.email || existingUser.email, // Fallback
                avatar: discordProfile.image_url || existingUser.avatar || "", // Ensure string
                discordId: discordProfile.id,
                discordUsername:
                  discordProfile.username || existingUser.discordUsername, // Fallback
                discordAvatar:
                  discordProfile.image_url || existingUser.discordAvatar, // Fallback
                isAnonymous: false,
              },
            });
          }
        } catch (error) {
          console.error("Error saving Discord user data:", error);
          return false;
        }
      }
      return true;
    },
  },
});
