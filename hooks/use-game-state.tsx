"use client"

import { useState } from "react"

export interface GameState {
  trumpSuit: string
  currentTrick: any[]
  scores: Record<string, number>
  currentPlayer: string
  gameMode: "classic" | "frenzy"
  specialPowers?: Record<string, boolean>
}

export function useGameState(mode: "classic" | "frenzy") {
  const [gameState, setGameState] = useState<GameState>({
    trumpSuit: "hearts",
    currentTrick: [],
    scores: {},
    currentPlayer: "",
    gameMode: mode,
    specialPowers:
      mode === "frenzy"
        ? {
            doubleTrump: true,
            swapCard: true,
          }
        : undefined,
  })

  const updateGameState = (newState: Partial<GameState>) => {
    setGameState((prev) => ({
      ...prev,
      ...newState,
    }))
  }

  return {
    gameState,
    updateGameState,
  }
}

