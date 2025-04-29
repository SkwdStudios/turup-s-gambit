"use client";

import { useGameStore } from "@/stores";
import { GameRoom, GameState } from "@/app/types/game";
import { BroadcastMessage } from "@/app/types/game";

/**
 * useRealtimeGameState - A hook that provides real-time game state functionality
 * This is now a wrapper around the Zustand gameStore for backward compatibility
 */
export function useRealtimeGameState() {
  const {
    currentRoom,
    players,
    isConnected,
    joinRoom,
    leaveRoom,
    startGame,
    updateGameState,
    playCard,
    placeBid,
    selectTrump,
    sendMessage,
  } = useGameStore();

  return {
    currentRoom,
    players,
    isConnected,
    joinRoom,
    leaveRoom,
    startGame,
    updateGameState,
    playCard,
    placeBid,
    selectTrump,
    sendMessage,
  };
}

/**
 * This component is no longer needed as we're using Zustand for state management
 * It's kept here for backward compatibility
 */
export function RealtimeGameStateProvider({
  children,
  roomId,
}: {
  children: React.ReactNode;
  roomId: string;
}) {
  // Initialize the game with the room ID
  const { setRoomId } = useGameStore();

  // Set the room ID
  if (roomId) {
    setRoomId(roomId);
  }

  return <>{children}</>;
}
