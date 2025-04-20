"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/card";
import { TurnTimer } from "@/components/turn-timer";
import { InGameEmotes } from "@/components/in-game-emotes";
import type { GameState } from "@/hooks/use-game-state";
import type { Card as CardType } from "@/app/types/game";
import { useRealtimeGameState } from "@/hooks/use-realtime-game-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";

interface GameBoardProps {
  gameMode: "classic" | "frenzy";
  players: string[];
  gameState: GameState;
  onUpdateGameState: (newState: Partial<GameState>) => void;
  onRecordMove: (move: any) => void;
  gameStatus:
    | "waiting"
    | "initial_deal"
    | "bidding"
    | "final_deal"
    | "playing"
    | "ended";
  initialCardsDeal?: boolean;
  onPlayCard?: (card: CardType) => void;
  onBid?: (bid: number) => void;
  roomId: string;
  sendMessage?: (message: any) => void;
}

export function GameBoard({
  gameMode,
  players,
  gameState,
  onUpdateGameState,
  onRecordMove,
  gameStatus,
  initialCardsDeal = false,
  onPlayCard,
  onBid,
  roomId,
  sendMessage,
}: GameBoardProps) {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [centerCards, setCenterCards] = useState<
    Array<{ id: number; suit: string; value: string; playedBy: string }>
  >([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [emotes, setEmotes] = useState<
    Array<{ id: number; emoji: string; player: string; timestamp: number }>
  >([]);
  const [localGameState, setLocalGameState] = useState<GameState | null>(null);
  const [playingCardId, setPlayingCardId] = useState<number | null>(null);
  const [cardPlayLoading, setCardPlayLoading] = useState(false);
  const { isConnected } = useRealtimeGameState();

  // Mock player hands - full deck and initial 5 cards
  const fullPlayerHand = [
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
  ];

  const initialHand = fullPlayerHand.slice(0, 5);

  // Determine which hand to use based on initialCardsDeal prop
  const playerHand = initialCardsDeal ? initialHand : fullPlayerHand;

  // Start the timer when the game is in playing state
  useEffect(() => {
    if (gameStatus === "playing") {
      setIsTimerActive(true);
      setCurrentPlayerIndex(0); // Start with the user's turn
    } else {
      setIsTimerActive(false);
    }
  }, [gameStatus]);

  // Handle timer expiration - play a random card
  const handleTimeUp = () => {
    if (currentPlayerIndex === 0 && gameStatus === "playing") {
      // User's turn timed out, play a random card
      const playableCards = playerHand.filter(
        (card) => !centerCards.some((c) => c.id === card.id)
      );
      if (playableCards.length > 0) {
        const randomIndex = Math.floor(Math.random() * playableCards.length);
        const randomCard = playableCards[randomIndex];

        // Instead of directly calling handleCardClick, which updates state,
        // use setTimeout to ensure it happens after the current render cycle
        setTimeout(() => {
          handleCardClick(randomCard.id);
        }, 0);
      }
    }
  };

  // Listen for card played events from the server
  useEffect(() => {
    if (gameStatus !== "playing") return;

    const handleCardPlayed = (event: MessageEvent) => {
      if (event.data && event.data.type === "game:card-played") {
        console.log("[GameBoard] Received card played event:", event.data);
        const { playerId, card } = event.data.payload;

        // Find the player who played the card
        const playerIndex = players.findIndex((p) => p === playerId);
        const playerName = playerIndex >= 0 ? players[playerIndex] : playerId;

        // Convert the card to the format expected by the UI
        const uiCard = {
          id:
            typeof card.id === "string"
              ? parseInt(card.id.split("-")[1])
              : card.id,
          suit: card.suit,
          value: card.rank || card.value,
          playedBy: playerName,
        };

        // Add the card to the center if it's not already there
        setCenterCards((prev) => {
          // Check if this card is already in the center
          if (prev.some((c) => c.playedBy === playerName)) {
            return prev;
          }
          return [...prev, uiCard];
        });

        // Update the current player index
        setCurrentPlayerIndex((prev) => (prev + 1) % 4);

        // Record the move
        onRecordMove({
          type: "playCard",
          player: playerName,
          card: uiCard,
        });

        // Reset card play loading state
        if (playerName === players[0]) {
          setCardPlayLoading(false);
          setPlayingCardId(null);
        }
      }
    };

    // Add event listener for card played events
    window.addEventListener("message", handleCardPlayed);

    return () => {
      window.removeEventListener("message", handleCardPlayed);
    };
  }, [gameStatus, players, onRecordMove]);

  // Clear center cards after all players have played
  useEffect(() => {
    if (centerCards.length === 4) {
      setIsTimerActive(false);

      const timer = setTimeout(() => {
        // Determine winner of the trick
        const winningPlayer = players[Math.floor(Math.random() * 4)];

        // Record the trick result
        onRecordMove({
          type: "trickComplete",
          winner: winningPlayer,
          cards: [...centerCards],
        });

        // Update scores
        onUpdateGameState({
          scores: {
            ...gameState?.scores,
            [winningPlayer]: (gameState?.scores[winningPlayer] || 0) + 1,
          },
        });

        setCenterCards([]);
        setCurrentPlayerIndex(0); // Reset to user's turn
        setIsTimerActive(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [
    centerCards,
    players,
    gameState?.scores,
    onUpdateGameState,
    onRecordMove,
  ]);

  const handleCardClick = (cardId: number) => {
    if (gameStatus !== "playing" || currentPlayerIndex !== 0 || cardPlayLoading)
      return;

    setSelectedCard(cardId);
    setPlayingCardId(cardId);
    setCardPlayLoading(true);

    // Find the card in player's hand
    const card = playerHand.find((c) => c.id === cardId);
    if (!card) {
      setCardPlayLoading(false);
      return;
    }

    // Convert the card to the proper format for the API
    const apiCard = {
      id: `${card.suit}-${card.value}`,
      suit: card.suit,
      rank: card.value,
    };

    console.log("[GameBoard] Playing card:", apiCard);

    // If we have an onPlayCard callback, use it
    if (onPlayCard) {
      onPlayCard(apiCard);
    }

    // If we have a sendMessage function, use it to send the card to the server
    if (sendMessage) {
      try {
        // Get the current player's ID from the game state
        // This is more reliable than using players[0] which is just the name
        const currentPlayerId = onPlayCard ? null : players[0]; // If we have onPlayCard, let it handle the player ID

        if (!onPlayCard && !currentPlayerId) {
          console.error("[GameBoard] Cannot play card, player ID not found");
          setCardPlayLoading(false);
          setPlayingCardId(null);
          return;
        }

        // If we have onPlayCard, use it (it will handle getting the player ID)
        // Otherwise, send the message directly with the player ID
        if (!onPlayCard) {
          console.log(
            `[GameBoard] Sending play card message with player ID: ${currentPlayerId}`
          );
          sendMessage({
            type: "game:play-card",
            payload: {
              roomId,
              playerId: currentPlayerId,
              card: apiCard,
            },
          });
        }

        // Note: We don't update the UI here - we'll wait for the server to send us a card-played event
        // This ensures consistency between all clients

        // If the server doesn't respond within 5 seconds, reset the loading state
        setTimeout(() => {
          if (cardPlayLoading) {
            console.log(
              "[GameBoard] Card play timeout - resetting loading state"
            );
            setCardPlayLoading(false);
            setPlayingCardId(null);
          }
        }, 5000);
      } catch (error) {
        console.error("[GameBoard] Error sending play card message:", error);
        setCardPlayLoading(false);
        setPlayingCardId(null);
      }
    } else {
      // Fallback to local simulation if no sendMessage function
      setTimeout(() => {
        // Add card to center
        const playedCard = {
          ...card,
          playedBy: players[0], // First player is always the user
        };

        setCenterCards((prev) => [...prev, playedCard]);

        // Record the move
        onRecordMove({
          type: "playCard",
          player: players[0],
          card: playedCard,
        });

        setCardPlayLoading(false);
        setPlayingCardId(null);
      }, 800); // Simulate a slight delay for the animation
    }
  };

  const handleEmote = (emoji: string) => {
    const newEmote = {
      id: Date.now(),
      emoji,
      player: players[0],
      timestamp: Date.now(),
    };

    setEmotes((prev) => [...prev, newEmote]);

    // Simulate AI response
    setTimeout(() => {
      const aiPlayer =
        players[Math.floor(Math.random() * (players.length - 1)) + 1];
      const aiEmojis = ["👍", "🤔", "😄", "👏", "🃏", "♠️", "♥️", "♦️", "♣️"];
      const aiEmoji = aiEmojis[Math.floor(Math.random() * aiEmojis.length)];

      const aiEmote = {
        id: Date.now(),
        emoji: aiEmoji,
        player: aiPlayer,
        timestamp: Date.now(),
      };

      setEmotes((prev) => [...prev, aiEmote]);
    }, 1500);
  };

  // Remove emotes after 3 seconds
  useEffect(() => {
    if (emotes.length > 0) {
      const latestEmote = emotes[emotes.length - 1];
      const timer = setTimeout(() => {
        setEmotes((prev) => prev.filter((e) => e.id !== latestEmote.id));
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [emotes]);

  // Removed the join message effect as it's causing issues
  // The player is already joined through the main game flow

  return (
    <div className="relative h-full min-h-[700px] border-2 border-primary/30 rounded-lg bg-card/80 backdrop-blur-sm p-6">
      {/* Turn timer */}
      {gameStatus === "playing" && (
        <TurnTimer
          isActive={isTimerActive}
          duration={10}
          onTimeUp={handleTimeUp}
          currentPlayer={players[currentPlayerIndex]}
        />
      )}

      {/* Trump suit indicator */}
      <div className="absolute top-6 left-6 bg-card p-2 rounded-lg border border-border/50">
        <p className="text-sm text-muted-foreground">Trump:</p>
        <p className="font-medieval text-lg text-primary">
          {gameState?.trumpSuit === "hearts" && "♥ Hearts"}
          {gameState?.trumpSuit === "diamonds" && "♦ Diamonds"}
          {gameState?.trumpSuit === "clubs" && "♣ Clubs"}
          {gameState?.trumpSuit === "spades" && "♠ Spades"}
          {!gameState?.trumpSuit && "♥ Hearts"}
        </p>
      </div>

      {/* Scores */}
      <div className="absolute top-6 right-6 bg-card p-2 rounded-lg border border-border/50">
        <p className="text-sm text-muted-foreground">Score:</p>
        <p className="font-medieval text-lg">
          <span className="text-blue-500">
            Royals: {gameState?.scores?.royals || 0}
          </span>{" "}
          |{" "}
          <span className="text-red-500">
            Rebels: {gameState?.scores?.rebels || 0}
          </span>
        </p>
      </div>

      {/* Emote display area */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        {emotes.map((emote) => (
          <div
            key={emote.id}
            className="flex flex-col items-center mb-2 animate-fadeUp"
          >
            <div className="bg-card/80 backdrop-blur-sm px-3 py-1 rounded-full border border-primary/30 mb-1">
              <span className="text-sm font-medieval">{emote.player}</span>
            </div>
            <div className="text-4xl">{emote.emoji}</div>
          </div>
        ))}
      </div>

      {/* Opponent at top */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 text-center">
        <div className="flex items-center gap-2 justify-center mb-2">
          <p className="text-sm">{players[2] || "Opponent"}</p>
          <div className="w-6 h-6 rounded-full bg-card/80 flex items-center justify-center text-xs">
            {gameState?.scores[players[2]] || 0}
          </div>
        </div>
        <div className="flex justify-center gap-1">
          {Array.from({ length: initialCardsDeal ? 5 : 13 }).map((_, i) => (
            <div
              key={`top-${i}`}
              className="w-8 h-12 bg-card border border-border/50 rounded-md"
            />
          ))}
        </div>
      </div>

      {/* Left opponent */}
      <div className="absolute left-10 top-1/2 -translate-y-1/2 text-center">
        <div className="flex items-center gap-2 justify-center mb-2">
          <p className="text-sm">{players[1] || "Opponent"}</p>
          <div className="w-6 h-6 rounded-full bg-card/80 flex items-center justify-center text-xs">
            {gameState?.scores[players[1]] || 0}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {Array.from({ length: initialCardsDeal ? 5 : 13 }).map((_, i) => (
            <div
              key={`left-${i}`}
              className="w-12 h-8 bg-card border border-border/50 rounded-md"
            />
          ))}
        </div>
      </div>

      {/* Right opponent */}
      <div className="absolute right-10 top-1/2 -translate-y-1/2 text-center">
        <div className="flex items-center gap-2 justify-center mb-2">
          <p className="text-sm">{players[3] || "Opponent"}</p>
          <div className="w-6 h-6 rounded-full bg-card/80 flex items-center justify-center text-xs">
            {gameState?.scores[players[3]] || 0}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {Array.from({ length: initialCardsDeal ? 5 : 13 }).map((_, i) => (
            <div
              key={`right-${i}`}
              className="w-12 h-8 bg-card border border-border/50 rounded-md"
            />
          ))}
        </div>
      </div>

      {/* Center area for played cards */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-2 grid-rows-2 gap-6 w-64 h-64">
          {/* Top player card */}
          {centerCards.find((c) => c.playedBy === players[2]) && (
            <div className="col-span-2 flex justify-center">
              <Card
                suit={
                  centerCards.find((c) => c.playedBy === players[2])?.suit || ""
                }
                value={
                  centerCards.find((c) => c.playedBy === players[2])?.value ||
                  ""
                }
                onClick={() => {}}
                is3D={true}
              />
            </div>
          )}

          {/* Left player card */}
          {centerCards.find((c) => c.playedBy === players[1]) && (
            <div className="flex justify-end items-center">
              <Card
                suit={
                  centerCards.find((c) => c.playedBy === players[1])?.suit || ""
                }
                value={
                  centerCards.find((c) => c.playedBy === players[1])?.value ||
                  ""
                }
                onClick={() => {}}
                is3D={true}
              />
            </div>
          )}

          {/* Right player card */}
          {centerCards.find((c) => c.playedBy === players[3]) && (
            <div className="flex justify-start items-center">
              <Card
                suit={
                  centerCards.find((c) => c.playedBy === players[3])?.suit || ""
                }
                value={
                  centerCards.find((c) => c.playedBy === players[3])?.value ||
                  ""
                }
                onClick={() => {}}
                is3D={true}
              />
            </div>
          )}

          {/* Bottom player (user) card */}
          {centerCards.find((c) => c.playedBy === players[0]) && (
            <div className="col-span-2 flex justify-center">
              <Card
                suit={
                  centerCards.find((c) => c.playedBy === players[0])?.suit || ""
                }
                value={
                  centerCards.find((c) => c.playedBy === players[0])?.value ||
                  ""
                }
                onClick={() => {}}
                is3D={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Player's hand */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
        <div className="flex items-center gap-2 justify-center mb-2">
          <p className="text-sm">{players[0] || "You"}</p>
          <div className="w-6 h-6 rounded-full bg-card/80 flex items-center justify-center text-xs">
            {gameState?.scores[players[0]] || 0}
          </div>
        </div>
        <div className="flex justify-center">
          {playerHand
            .filter((card) => !centerCards.some((c) => c.id === card.id))
            // If initialCardsDeal is true, only show the first 5 cards
            .slice(0, initialCardsDeal ? 5 : undefined)
            .map((card, index, filteredHand) => (
              <div
                key={card.id}
                style={{
                  marginLeft: index > 0 ? "-1.5rem" : "0",
                  zIndex: index,
                  transform: `translateY(${
                    selectedCard === card.id ? "-1rem" : "0"
                  })`,
                  transition: "transform 0.2s ease",
                }}
                className="relative"
                onMouseEnter={() => setSelectedCard(card.id)}
                onMouseLeave={() => setSelectedCard(null)}
              >
                <div className="relative">
                  <Card
                    suit={card.suit}
                    value={card.value}
                    onClick={() => handleCardClick(card.id)}
                    disabled={
                      centerCards.some((c) => c.playedBy === players[0]) ||
                      currentPlayerIndex !== 0 ||
                      cardPlayLoading
                    }
                    is3D={true}
                  />
                  {playingCardId === card.id && cardPlayLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md backdrop-blur-sm">
                      <LoadingSpinner size="sm" variant="primary" />
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Special effects for Frenzy mode */}
      {gameMode === "frenzy" && (
        <div className="absolute bottom-24 right-4 bg-accent/10 p-2 rounded-lg border border-accent/30">
          <p className="text-sm font-medieval text-accent mb-1">
            Special Powers
          </p>
          <div className="flex gap-2">
            <button className="bg-card p-1 rounded border border-border/50 text-xs">
              Double Trump
            </button>
            <button className="bg-card p-1 rounded border border-border/50 text-xs">
              Swap Card
            </button>
          </div>
        </div>
      )}

      {/* In-game emotes */}
      <InGameEmotes onEmote={handleEmote} />
    </div>
  );
}
