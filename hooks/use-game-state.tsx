"use client";

import { useGameStore } from "@/stores";
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
    currentTurn: currentPlayer,
    trumpSuit,
    trickCards: {},
    currentBid: 0,
    currentBidder: null,
    roundNumber: 1,
    gamePhase: "waiting",
    scores,
    teams: { royals: [], rebels: [] },
    consecutiveTricks: { royals: 0, rebels: 0 },
    lastTrickWinner: null,
    dealerIndex: 0,
    trumpCaller: null,
  };

  return {
    gameState,
    updateGameState,
  };
}
