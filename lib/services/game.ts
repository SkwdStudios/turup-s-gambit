import { GameMode, GameStatus } from '@prisma/client';
import { db } from './database';

class GameService {
  private static instance: GameService;

  private constructor() {}

  public static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  async createGame({
    roomId,
    mode,
    creatorId
  }: {
    roomId: string;
    mode: GameMode;
    creatorId: string;
  }) {
    const game = await db.createGame({
      roomId,
      mode,
      creatorId
    });

    return game;
  }

  async joinGame({
    userId,
    gameId,
    team,
    position
  }: {
    userId: string;
    gameId: string;
    team: number;
    position: number;
  }) {
    const game = await db.getGameByRoomId(gameId);
    if (!game) throw new Error('Game not found');
    if (game.status !== GameStatus.WAITING) throw new Error('Game already started');

    const player = await db.addPlayerToGame({
      userId,
      gameId,
      team,
      position
    });

    return player;
  }

  async startGame(gameId: string) {
    const game = await db.getGameByRoomId(gameId);
    if (!game) throw new Error('Game not found');
    if (game.status !== GameStatus.WAITING) throw new Error('Game already started');

    // Create a new game session
    const session = await db.createGameSession(gameId);
    
    // Update game status
    await db.updateGameStatus(gameId, GameStatus.PLAYING);

    return session;
  }

  async endGame(gameId: string, winnerId: string) {
    const game = await db.getGameByRoomId(gameId);
    if (!game) throw new Error('Game not found');
    if (game.status !== GameStatus.PLAYING) throw new Error('Game not in progress');

    // Update game session
    if (game.session) {
      await db.updateGameSession(game.session.id, {
        endedAt: new Date()
      });
    }

    // Update game status and winner
    await db.updateGameStatus(gameId, GameStatus.COMPLETED, winnerId);

    return game;
  }

  async saveReplay(gameId: string, moves: any, summary: any) {
    const replay = await db.createGameReplay({
      gameId,
      moves,
      summary
    });

    return replay;
  }

  async getGameState(roomId: string) {
    const game = await db.getGameByRoomId(roomId);
    if (!game) throw new Error('Game not found');

    return game;
  }
}

export const gameService = GameService.getInstance();