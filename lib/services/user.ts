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
    // For anonymous users, we don't need to check for existing users
    if (!isAnonymous) {
      // Check if user with email already exists
      if (email) {
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
          return existingUser; // Return existing user instead of throwing error
        }
      }

      // Check if user with Discord ID already exists
      if (discordId) {
        const existingDiscordUser = await db.getUserByDiscordId(discordId);
        if (existingDiscordUser) {
          return existingDiscordUser; // Return existing user instead of throwing error
        }
      }
    }

    // Ensure username is unique by adding a random suffix if needed
    let finalUsername = username;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        // Try to create the user with the current username
        const user = await db.createUser({
          username: finalUsername,
          email,
          password,
          avatar,
          isAnonymous,
          discordId,
          discordUsername,
          discordAvatar,
        });

        return user;
      } catch (error: any) {
        // If the error is about duplicate username, try again with a modified username
        if (
          error.message &&
          error.message.includes(
            "Unique constraint failed on the fields: (`username`)"
          )
        ) {
          finalUsername = `${username}_${Math.floor(Math.random() * 10000)}`;
          attempts++;
        } else {
          // For other errors, rethrow
          throw error;
        }
      }
    }

    // If we've exhausted our attempts, throw an error
    throw new Error(
      `Failed to create user with unique username after ${maxAttempts} attempts`
    );
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
    // Ensure we have a valid username
    const sanitizedUsername =
      username?.trim() || `Guest_${Math.floor(Math.random() * 10000)}`;

    // Generate a placeholder avatar if needed
    const firstLetter = sanitizedUsername.charAt(0).toUpperCase();
    const avatar = `/placeholder.svg?height=200&width=200&text=${firstLetter}`;

    return this.createUser({
      username: sanitizedUsername,
      avatar: avatar,
      isAnonymous: true,
    });
  }
}

export const userService = UserService.getInstance();
