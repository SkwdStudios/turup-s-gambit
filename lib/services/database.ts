import { PrismaClient } from "@prisma/client";
import { GameMode, GameStatus } from "@prisma/client";

class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient();
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // User Operations
  async createUser(data: {
    username: string;
    email?: string;
    password?: string;
    avatar: string;
    isAnonymous?: boolean;
    discordId?: string;
    discordUsername?: string;
    discordAvatar?: string;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        players: true,
        gamesCreated: true,
      },
    });
  }

  async getUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async getUserByDiscordId(discordId: string) {
    return this.prisma.user.findFirst({
      where: {
        discordId: discordId,
      },
    });
  }

  // Game Operations
  async createGame(data: {
    roomId: string;
    mode: GameMode;
    creatorId: string;
  }) {
    return this.prisma.game.create({
      data: {
        ...data,
        status: GameStatus.WAITING,
      },
      include: {
        creator: true,
        players: true,
      },
    });
  }

  async getGameByRoomId(roomId: string) {
    return this.prisma.game.findUnique({
      where: { roomId },
      include: {
        creator: true,
        players: {
          include: {
            user: true,
          },
        },
        session: true,
      },
    });
  }

  async updateGameStatus(gameId: string, status: GameStatus, winner?: string) {
    return this.prisma.game.update({
      where: { id: gameId },
      data: { status, winner },
    });
  }

  // Player Operations
  async addPlayerToGame(data: {
    userId: string;
    gameId: string;
    team: number;
    position: number;
  }) {
    return this.prisma.player.create({
      data,
      include: {
        user: true,
        game: true,
      },
    });
  }

  // Game Session Operations
  async createGameSession(gameId: string) {
    return this.prisma.gameSession.create({
      data: {
        gameId,
      },
    });
  }

  async updateGameSession(
    sessionId: string,
    data: {
      currentTurn?: number;
      trumpSuit?: string;
      endedAt?: Date;
    }
  ) {
    return this.prisma.gameSession.update({
      where: { id: sessionId },
      data,
    });
  }

  // Game Replay Operations
  async createGameReplay(data: { gameId: string; moves: any; summary: any }) {
    return this.prisma.gameReplay.create({
      data,
    });
  }

  async getGameReplay(gameId: string) {
    return this.prisma.gameReplay.findUnique({
      where: { gameId },
    });
  }

  // Cleanup
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

export const db = DatabaseService.getInstance();
