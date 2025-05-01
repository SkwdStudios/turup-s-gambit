// Game mode types
export enum GameMode {
  CLASSIC = "CLASSIC",
  FRENZY = "FRENZY",
}

// Game status types
export enum GameStatus {
  WAITING = "WAITING",
  PLAYING = "PLAYING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

// Game interface
export interface Game {
  id: string;
  roomId: string;
  mode: GameMode;
  status: GameStatus;
  winner?: string | null;
  createdAt: string;
  updatedAt: string;
  creatorId: string;
  creator?: any;
  players?: Player[];
  session?: GameSession | null;
  replay?: GameReplay | null;
}

// Player interface
export interface Player {
  id: string;
  team: number;
  position: number;
  joinedAt: string;
  userId: string;
  gameId: string;
  user?: any;
  game?: Game;
}

// GameSession interface
export interface GameSession {
  id: string;
  currentTurn: number;
  trumpSuit?: string | null;
  startedAt: string;
  endedAt?: string | null;
  gameId: string;
  game?: Game;
}

// GameReplay interface
export interface GameReplay {
  id: string;
  moves: any;
  summary: any;
  createdAt: string;
  gameId: string;
  game?: Game;
}

// TrumpVote interface
export interface TrumpVote {
  id: string;
  room_id: string;
  player_id?: string | null;
  bot_id?: string | null;
  suit: string;
  created_at: string;
}

// GameRoom interface
export interface GameRoom {
  id: string;
  created_at: string;
  last_activity: string;
  game_state: any;
  players: any[];
  creator_id?: string | null;
  is_public: boolean;
  creator?: any;
}
