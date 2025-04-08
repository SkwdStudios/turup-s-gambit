import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string | null;
      image: string | null;
      discordId?: string;
      discordUsername?: string;
      discordAvatar?: string;
      username?: string;
      avatar?: string;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string | null;
    image: string | null;
    discordId?: string;
    discordUsername?: string;
    discordAvatar?: string;
    username?: string;
    avatar?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    discordId?: string;
    discordUsername?: string;
    discordAvatar?: string;
    username?: string;
    avatar?: string;
    isAnonymous?: boolean;
  }
}
