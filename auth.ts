import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";

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
if (!process.env.NEXTAUTH_URL?.startsWith('http')) {
  console.warn('NEXTAUTH_URL should start with http:// or https://');
  // Default to http://localhost:3000 if not properly formatted
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
      authorization: {
        url: "https://discord.com/api/oauth2/authorize",
        params: {
          scope: "identify email guilds",
          prompt: "consent"
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async signIn({ user, account, profile }) {
      // We don't need to manually store user data in localStorage here
      // NextAuth will handle the session management through cookies
      // The client-side code can sync with NextAuth session when needed
      return true;
    },
  },
  debug: process.env.NODE_ENV === "development",
  basePath: "/api/auth",
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
  },
});
