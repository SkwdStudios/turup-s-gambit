export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  score: number;
  isReady: boolean;
  isHost: boolean;
  isBot?: boolean;
}

export interface GameState {
  currentTurn: string | null; // playerId
  trumpSuit: Suit | null;
  currentBid: number;
  currentBidder: string | null; // playerId
  trickCards: { [playerId: string]: Card };
  roundNumber: number;
  gamePhase: "waiting" | "bidding" | "playing" | "finished";
}

export interface GameRoom {
  id: string;
  players: Player[];
  gameState: GameState;
  createdAt: number;
  lastActivity: number;
}

export interface ServerToClientEvents {
  "room:joined": (room: GameRoom) => void;
  "room:updated": (room: GameRoom) => void;
  "game:started": (room: GameRoom) => void;
  "game:state-updated": (gameState: GameState) => void;
  "player:joined": (player: Player) => void;
  "player:left": (playerId: string) => void;
  error: (message: string) => void;
}

export interface ClientToServerEvents {
  "room:join": (roomId: string, playerName: string) => void;
  "room:leave": (roomId: string) => void;
  "game:ready": (roomId: string) => void;
  "game:bid": (roomId: string, bid: number) => void;
  "game:play-card": (roomId: string, card: Card) => void;
  "game:select-trump": (roomId: string, suit: Suit) => void;
}
