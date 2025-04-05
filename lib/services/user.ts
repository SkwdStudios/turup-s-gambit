import { db } from "./database";

class UserService {
  private static instance: UserService;

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  async createUser({
    username,
    email,
    password,
    avatar,
    isAnonymous = false,
    discordId,
    discordUsername,
    discordAvatar,
  }: {
    username: string;
    email?: string;
    password?: string;
    avatar: string;
    isAnonymous?: boolean;
    discordId?: string;
    discordUsername?: string;
    discordAvatar?: string;
  }) {
    // Check if user with email already exists
    if (email) {
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        throw new Error("User with this email already exists");
      }
    }

    // Check if user with Discord ID already exists
    if (discordId) {
      const existingDiscordUser = await db.getUserByDiscordId(discordId);
      if (existingDiscordUser) {
        throw new Error("User with this Discord ID already exists");
      }
    }

    const user = await db.createUser({
      username,
      email,
      password,
      avatar,
      isAnonymous,
      discordId,
      discordUsername,
      discordAvatar,
    });

    return user;
  }

  async getUserById(id: string) {
    const user = await db.getUserById(id);
    if (!user) throw new Error("User not found");
    return user;
  }

  async getUserByEmail(email: string) {
    const user = await db.getUserByEmail(email);
    if (!user) throw new Error("User not found");
    return user;
  }

  async getUserByDiscordId(discordId: string) {
    const user = await db.getUserByDiscordId(discordId);
    if (!user) throw new Error("User not found");
    return user;
  }

  async getUserGames(userId: string) {
    const user = await db.getUserById(userId);
    if (!user) throw new Error("User not found");
    return user.gamesCreated;
  }

  async createAnonymousUser(username: string) {
    return this.createUser({
      username,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      isAnonymous: true,
    });
  }
}

export const userService = UserService.getInstance();
