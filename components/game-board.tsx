"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/card"
import type { GameState } from "@/hooks/use-game-state"

interface GameBoardProps {
  gameMode: "classic" | "frenzy"
  players: string[]
  gameState: GameState
  onUpdateGameState: (newState: Partial<GameState>) => void
  onRecordMove: (move: any) => void
  gameStatus: "waiting" | "bidding" | "playing" | "ended"
}

export function GameBoard({
  gameMode,
  players,
  gameState,
  onUpdateGameState,
  onRecordMove,
  gameStatus,
}: GameBoardProps) {
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [centerCards, setCenterCards] = useState<Array<{ id: number; suit: string; value: string; playedBy: string }>>(
    [],
  )

  // Mock player hands
  const playerHand = [
    { id: 1, suit: "hearts", value: "A" },
    { id: 2, suit: "spades", value: "K" },
    { id: 3, suit: "diamonds", value: "Q" },
    { id: 4, suit: "clubs", value: "J" },
    { id: 5, suit: "hearts", value: "10" },
    { id: 6, suit: "spades", value: "9" },
    { id: 7, suit: "diamonds", value: "8" },
    { id: 8, suit: "clubs", value: "7" },
    { id: 9, suit: "hearts", value: "6" },
    { id: 10, suit: "spades", value: "5" },
    { id: 11, suit: "diamonds", value: "4" },
    { id: 12, suit: "clubs", value: "3" },
    { id: 13, suit: "hearts", value: "2" },
  ]

  // Simulate AI players playing cards
  useEffect(() => {
    if (gameStatus === "playing" && centerCards.length > 0 && centerCards.length < 4) {
      const timer = setTimeout(() => {
        const aiPlayer = players[centerCards.length]
        const randomCard = {
          id: 100 + centerCards.length,
          suit: ["hearts", "diamonds", "clubs", "spades"][Math.floor(Math.random() * 4)],
          value: ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"][Math.floor(Math.random() * 13)],
          playedBy: aiPlayer,
        }

        setCenterCards((prev) => [...prev, randomCard])

        // Record the move
        onRecordMove({
          type: "playCard",
          player: aiPlayer,
          card: randomCard,
        })
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [centerCards, gameStatus, players, onRecordMove])

  // Clear center cards after all players have played
  useEffect(() => {
    if (centerCards.length === 4) {
      const timer = setTimeout(() => {
        // Determine winner of the trick
        const winningPlayer = players[Math.floor(Math.random() * 4)]

        // Record the trick result
        onRecordMove({
          type: "trickComplete",
          winner: winningPlayer,
          cards: [...centerCards],
        })

        // Update scores
        onUpdateGameState({
          scores: {
            ...gameState.scores,
            [winningPlayer]: (gameState.scores[winningPlayer] || 0) + 1,
          },
        })

        setCenterCards([])
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [centerCards, players, gameState.scores, onUpdateGameState, onRecordMove])

  const handleCardClick = (cardId: number) => {
    if (gameStatus !== "playing") return

    setSelectedCard(cardId)

    // Find the card in player's hand
    const card = playerHand.find((c) => c.id === cardId)
    if (!card) return

    // Add card to center
    const playedCard = {
      ...card,
      playedBy: players[0], // First player is always the user
    }

    setCenterCards((prev) => [...prev, playedCard])

    // Record the move
    onRecordMove({
      type: "playCard",
      player: players[0],
      card: playedCard,
    })
  }

  return (
    <div className="relative h-full min-h-[600px] border-2 border-primary/30 rounded-lg bg-card/80 backdrop-blur-sm p-4">
      {/* Trump suit indicator */}
      <div className="absolute top-4 left-4 bg-card p-2 rounded-lg border border-border/50">
        <p className="text-sm text-muted-foreground">Trump:</p>
        <p className="font-medieval text-lg text-primary">♥ Hearts</p>
      </div>

      {/* Scores */}
      <div className="absolute top-4 right-4 bg-card p-2 rounded-lg border border-border/50">
        <p className="text-sm text-muted-foreground">Score:</p>
        <p className="font-medieval text-lg">
          Team 1: {(gameState.scores[players[0]] || 0) + (gameState.scores[players[2]] || 0)} | Team 2:{" "}
          {(gameState.scores[players[1]] || 0) + (gameState.scores[players[3]] || 0)}
        </p>
      </div>

      {/* Opponent at top */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 text-center">
        <p className="text-sm mb-2">{players[2] || "Opponent"}</p>
        <div className="flex justify-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`top-${i}`} className="w-8 h-12 bg-card border border-border/50 rounded-md" />
          ))}
        </div>
      </div>

      {/* Left opponent */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 text-center">
        <p className="text-sm mb-2">{players[1] || "Opponent"}</p>
        <div className="flex flex-col gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`left-${i}`} className="w-12 h-8 bg-card border border-border/50 rounded-md" />
          ))}
        </div>
      </div>

      {/* Right opponent */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 text-center">
        <p className="text-sm mb-2">{players[3] || "Opponent"}</p>
        <div className="flex flex-col gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`right-${i}`} className="w-12 h-8 bg-card border border-border/50 rounded-md" />
          ))}
        </div>
      </div>

      {/* Center area for played cards */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-2 grid-rows-2 gap-4 w-48 h-48">
          {/* Top player card */}
          {centerCards.find((c) => c.playedBy === players[2]) && (
            <div className="col-span-2 flex justify-center">
              <Card
                suit={centerCards.find((c) => c.playedBy === players[2])?.suit || ""}
                value={centerCards.find((c) => c.playedBy === players[2])?.value || ""}
                onClick={() => {}}
              />
            </div>
          )}

          {/* Left player card */}
          {centerCards.find((c) => c.playedBy === players[1]) && (
            <div className="flex justify-end items-center">
              <Card
                suit={centerCards.find((c) => c.playedBy === players[1])?.suit || ""}
                value={centerCards.find((c) => c.playedBy === players[1])?.value || ""}
                onClick={() => {}}
              />
            </div>
          )}

          {/* Right player card */}
          {centerCards.find((c) => c.playedBy === players[3]) && (
            <div className="flex justify-start items-center">
              <Card
                suit={centerCards.find((c) => c.playedBy === players[3])?.suit || ""}
                value={centerCards.find((c) => c.playedBy === players[3])?.value || ""}
                onClick={() => {}}
              />
            </div>
          )}

          {/* Bottom player (user) card */}
          {centerCards.find((c) => c.playedBy === players[0]) && (
            <div className="col-span-2 flex justify-center">
              <Card
                suit={centerCards.find((c) => c.playedBy === players[0])?.suit || ""}
                value={centerCards.find((c) => c.playedBy === players[0])?.value || ""}
                onClick={() => {}}
              />
            </div>
          )}
        </div>
      </div>

      {/* Player's hand */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className="text-sm mb-2">{players[0] || "You"}</p>
        <div className="flex justify-center">
          {playerHand
            .filter((card) => !centerCards.some((c) => c.id === card.id))
            .map((card, index, filteredHand) => (
              <div
                key={card.id}
                style={{
                  marginLeft: index > 0 ? "-1.5rem" : "0",
                  zIndex: index,
                  transform: `translateY(${selectedCard === card.id ? "-1rem" : "0"})`,
                  transition: "transform 0.2s ease",
                }}
                className="relative"
                onMouseEnter={() => setSelectedCard(card.id)}
                onMouseLeave={() => setSelectedCard(null)}
              >
                <Card
                  suit={card.suit}
                  value={card.value}
                  onClick={() => handleCardClick(card.id)}
                  disabled={centerCards.some((c) => c.playedBy === players[0])}
                />
              </div>
            ))}
        </div>
      </div>

      {/* Special effects for Frenzy mode */}
      {gameMode === "frenzy" && (
        <div className="absolute bottom-24 right-4 bg-accent/10 p-2 rounded-lg border border-accent/30">
          <p className="text-sm font-medieval text-accent mb-1">Special Powers</p>
          <div className="flex gap-2">
            <button className="bg-card p-1 rounded border border-border/50 text-xs">Double Trump</button>
            <button className="bg-card p-1 rounded border border-border/50 text-xs">Swap Card</button>
          </div>
        </div>
      )}
    </div>
  )
}

