import { useParams, useSearchParams } from "next/navigation";
import { useGameStore } from "@/stores";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { GameRoom } from "@/app/types/game";

export type GameMode = "classic" | "frenzy";
export type GameStatus =
  | "waiting"
  | "initial_deal"
  | "bidding"
  | "final_deal"
  | "playing"
  | "ended";

export interface GameRoomState {
  showReplay: boolean;
  gameStatus: GameStatus;
  showLoginModal: boolean;
  showShuffleAnimation: boolean;
  initialCardsDeal: boolean;
  isLoading: boolean;
  isAddingBots: boolean;
  statusMessage: string | null;
  gameMode: GameMode;
  players: string[];
  gameState: GameRoom | null;
  isCurrentUserHost: boolean;
  handleStartGame: () => void;
  handleTrumpVote: (suit: string) => void;
  handlePlayCard: (card: any) => void;
  setIsAddingBots: (value: boolean) => void;
  setStatusMessage: (message: string | null) => void;
  safeSendMessage: (message: any) => boolean;
}

/**
 * useGameRoomState - A hook that provides game room state functionality
 * This is now a wrapper around the Zustand stores for backward compatibility
 */
export function useGameRoomState(): GameRoomState {
  const searchParams = useSearchParams();
  const { roomId } = useParams<{ roomId: string }>();
  const mode = searchParams?.get("mode") || "classic";

  // Get state from stores
  const {
    currentRoom,
    players,
    isConnected,
    gameStatus,
    showShuffleAnimation,
    initialCardsDeal,
    isLoading,
    statusMessage,
    isAddingBots,
    startGame,
    playCard,
    selectTrump,
    sendMessage,
    setStatusMessage,
    setIsAddingBots,
  } = useGameStore();

  const { showReplay, showLoginModal } = useUIStore();
  const { user } = useAuthStore();

  // Check if the current user is the host
  const isCurrentUserHost =
    currentRoom?.players?.some((p) => p.id === user?.id && p.isHost) || false;

  // Handle starting the game
  const handleStartGame = () => {
    if (isCurrentUserHost) {
      startGame();
    }
  };

  // Handle trump voting
  const handleTrumpVote = (suit: string) => {
    selectTrump(suit as "hearts" | "diamonds" | "clubs" | "spades");
  };

  // Handle playing a card
  const handlePlayCard = (card: any) => {
    playCard(card);
  };

  // Safe way to send messages
  const safeSendMessage = (message: any): boolean => {
    if (!isConnected) {
      console.warn("[useGameRoomState] Cannot send message, not connected");
      return false;
    }

    sendMessage(message);
    return true;
  };

  return {
    showReplay,
    gameStatus: gameStatus as GameStatus,
    showLoginModal,
    showShuffleAnimation,
    initialCardsDeal,
    isLoading,
    isAddingBots,
    statusMessage,
    gameMode: mode as GameMode,
    players: players.map((p) => p.name),
    gameState: currentRoom,
    isCurrentUserHost,
    handleStartGame,
    handleTrumpVote,
    handlePlayCard,
    setIsAddingBots,
    setStatusMessage,
    safeSendMessage,
  };
}
