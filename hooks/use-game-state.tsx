"use client";

import { useGameStore } from "@/stores/gameStore";
import { GameState } from "@/app/types/game";

/**
 * useGameState - A hook that provides game state functionality
 * This is now a wrapper around the Zustand gameStore for backward compatibility
 */
export function useGameState(mode: "classic" | "frenzy") {
  const {
    trumpSuit,
    currentTrick,
    scores,
    currentPlayer,
    updateGameState,
    setGameMode,
  } = useGameStore();

  // Set the game mode
  setGameMode(mode);

  // Construct a gameState object from the store values
  const gameState: GameState = {
    trumpSuit,
    currentTrick,
    scores,
    currentPlayer,
    gameMode: mode,
    specialPowers:
      mode === "frenzy"
        ? {
            doubleTrump: true,
            swapCard: true,
          }
        : undefined,
  };

  return {
    gameState,
    updateGameState,
  };
}
