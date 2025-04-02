import { GameRoom, Player, GameState, Card, Suit, Rank } from "../types/game";

export class GameManager {
  private rooms: Map<string, GameRoom>;
  private static instance: GameManager;

  private constructor() {
    this.rooms = new Map();
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public getRooms(): Map<string, GameRoom> {
    return this.rooms;
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private createNewRoom(): GameRoom {
    const roomId = this.generateRoomId();
    const newRoom: GameRoom = {
      id: roomId,
      players: [],
      gameState: {
        currentTurn: null,
        trumpSuit: null,
        currentBid: 0,
        currentBidder: null,
        trickCards: {},
        roundNumber: 0,
        gamePhase: "waiting",
      },
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    this.rooms.set(roomId, newRoom);
    return newRoom;
  }

  public findOrCreateRoom(): GameRoom {
    // Find a room with less than 4 players
    for (const room of this.rooms.values()) {
      if (room.players.length < 4 && room.gameState.gamePhase === "waiting") {
        return room;
      }
    }
    // If no suitable room found, create a new one
    return this.createNewRoom();
  }

  public addPlayerToRoom(roomId: string, playerName: string): Player {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.players.length >= 4) {
      throw new Error("Room is full");
    }

    const newPlayer: Player = {
      id: Math.random().toString(36).substring(2, 9),
      name: playerName,
      hand: [],
      score: 0,
      isReady: false,
      isHost: room.players.length === 0,
    };

    room.players.push(newPlayer);
    room.lastActivity = Date.now();
    return newPlayer;
  }

  public removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== playerId);
    room.lastActivity = Date.now();

    // If room is empty, remove it
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
    } else if (room.players.length > 0) {
      // Assign new host if needed
      const hasHost = room.players.some((p) => p.isHost);
      if (!hasHost) {
        room.players[0].isHost = true;
      }
    }
  }

  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  public updateGameState(roomId: string, gameState: Partial<GameState>): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.gameState = { ...room.gameState, ...gameState };
    room.lastActivity = Date.now();
  }

  public cleanupStaleRooms(maxAge: number = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (now - room.lastActivity > maxAge) {
        this.rooms.delete(roomId);
      }
    }
  }

  private generateDeck(): Card[] {
    const deck: Card[] = [];
    const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
    const ranks: Rank[] = [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
      "A",
    ];

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          suit,
          rank,
          id: `${suit}-${rank}`,
        });
      }
    }

    return this.shuffleDeck(deck);
  }

  private shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  public startGame(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.players.length !== 4) {
      throw new Error("Game can only start with 4 players");
    }

    const deck = this.generateDeck();
    const cardsPerPlayer = 13;

    // Deal cards to players
    room.players.forEach((player, index) => {
      const start = index * cardsPerPlayer;
      const end = start + cardsPerPlayer;
      player.hand = deck.slice(start, end);
    });

    room.gameState = {
      currentTurn: room.players[0].id,
      trumpSuit: null,
      currentBid: 0,
      currentBidder: null,
      trickCards: {},
      roundNumber: 1,
      gamePhase: "bidding",
    };

    room.lastActivity = Date.now();
  }
}
