"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/card";
import { TurnTimer } from "@/components/turn-timer";
import { InGameEmotes } from "@/components/in-game-emotes";
import { type Card as CardType, type Player } from "@/app/types/game";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";

interface CenterCard {
  id: number;
  suit: string;
  value: string;
  playedBy: string;
}

interface Emote {
  id: number;
  emoji: string;
  player: string;
  timestamp: number;
}

interface GameBoardProps {
  roomId: string;
  gameMode: "classic" | "frenzy";
  players: string[];
  gameState: any;
  gameStatus: string;
  initialCardsDeal: boolean;
  onUpdateGameState: (newState: any) => void;
  onRecordMove: (move: any) => void;
  onPlayCard: (card: any) => void;
  onBid: (bid: number) => void;
  sendMessage: (message: any) => Promise<boolean>;
}

export function GameBoard({
  roomId,
  gameMode,
  players,
  gameState,
  gameStatus,
  initialCardsDeal,
  onUpdateGameState,
  onRecordMove,
  onPlayCard,
  sendMessage,
}: GameBoardProps) {
  // We can still use the store for UI state
  const { trumpSuit, scores, playCard: playCardAction } = useGameStore();

  const {
    selectedCard,
    setSelectedCard,
    cardPlayLoading,
    setCardPlayLoading,
    playingCardId,
    setPlayingCardId,
    showTrumpPopup,
    setShowTrumpPopup,
  } = useUIStore();

  const { user } = useAuthStore();

  const [centerCards, setCenterCards] = useState<CenterCard[]>([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [emotes, setEmotes] = useState<Emote[]>([]);

  // Use the provided onRecordMove function
  const recordMove = (move: any) => {
    console.log("[GameBoard] Recording move:", move);
    onRecordMove(move);
  };

  // Get player hand from game state or use mock data if not available
  const getPlayerHand = () => {
    if (gameState && user) {
      // Try to find the player in the game state
      const player = gameState.players?.find((p) => p.id === user.id);
      if (player && player.hand && player.hand.length > 0) {
        const cards = player.hand.map((card, index) => ({
          id: index,
          suit: card.suit,
          value: card.rank || card.value,
        }));

        // Important: Only return the first 5 cards during initial deal
        return initialCardsDeal ? cards.slice(0, 5) : cards;
      }
    }

    // Fallback to mock data if no hand is found
    const mockHand = [
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

    // Return only first 5 cards for initial deal
    return initialCardsDeal ? mockHand.slice(0, 5) : mockHand;
  };

  // Get the player's hand
  const playerHand = getPlayerHand();

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
        const playerObj = players.find((p) => p.id === playerId);
        const playerName = playerObj ? playerObj.name : playerId;

        // Convert the card to the format expected by the UI
        const uiCard: CenterCard = {
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
        recordMove({
          type: "playCard",
          player: playerName,
          card: uiCard,
        });

        // Reset card play loading state
        if (playerName === (user?.username || "")) {
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
  }, [gameStatus, players, user]);

  // Clear center cards after all players have played
  useEffect(() => {
    if (centerCards.length === 4) {
      setIsTimerActive(false);

      const timer = setTimeout(() => {
        // Determine winner of the trick
        const winningPlayerName =
          players.length > 0
            ? players[Math.floor(Math.random() * Math.min(4, players.length))]
                .name
            : "";

        // Record the trick result
        recordMove({
          type: "trickComplete",
          winner: winningPlayerName,
          cards: [...centerCards],
        });

        // Update scores using the provided function
        const team = Math.random() > 0.5 ? "royals" : "rebels";
        const newScores = {
          ...scores,
          [team]: scores[team] + 1,
        };
        onUpdateGameState({
          scores: newScores,
        });

        setCenterCards([]);
        setCurrentPlayerIndex(0); // Reset to user's turn
        setIsTimerActive(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [centerCards, players, scores, onUpdateGameState, recordMove]);

  const handleCardClick = (cardId: number) => {
    const { showToast } = useUIStore.getState();

    // Check if we're in the playing phase
    if (gameStatus !== "playing") {
      console.log(`[GameBoard] Cannot play card in ${gameStatus} phase`);
      showToast(
        `Cannot play card yet. Current phase: ${gameStatus}`,
        "warning"
      );
      return;
    }

    // Check if it's the player's turn
    if (currentPlayerIndex !== 0) {
      showToast("Not your turn to play", "warning");
      return;
    }

    // Check if a card is already being played
    if (cardPlayLoading) {
      return;
    }

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
      suit: card.suit as any,
      rank: card.value as any,
    };

    console.log("[GameBoard] Playing card:", apiCard);

    // Use the provided onPlayCard function
    onPlayCard(apiCard);
  };

  const handleEmote = (emoji: string) => {
    if (!user) return;

    const newEmote: Emote = {
      id: Date.now(),
      emoji,
      player: user.username,
      timestamp: Date.now(),
    };

    setEmotes((prev) => [...prev, newEmote]);

    // Send emote to other players
    if (sendMessage) {
      sendMessage({
        type: "game:emote",
        payload: {
          roomId,
          playerId: user.id,
          emoji,
        },
      });
    }

    // Auto-remove emote after 3 seconds
    setTimeout(() => {
      setEmotes((prev) => prev.filter((e) => e.id !== newEmote.id));
    }, 3000);
  };

  // Handle playing a card
  const handlePlayCard = (card: any) => {
    console.log("[GameBoard] Playing card:", card);

    // Disable clicking if a card is already being played
    if (cardPlayLoading || playingCardId) {
      console.log("[GameBoard] Card play in progress, ignoring new card play");
      return;
    }

    // Set loading state to prevent clicking multiple cards
    setCardPlayLoading(true);
    setPlayingCardId(card.id);

    // Delay to show animation
    setTimeout(() => {
      // Call the onPlayCard callback to actually play the card
      if (onPlayCard) {
        console.log("[GameBoard] Sending card play to game store:", card);
        onPlayCard(card);
      } else {
        console.error("[GameBoard] No onPlayCard handler provided");
        // Reset state if no handler
        setCardPlayLoading(false);
        setPlayingCardId(null);
      }
    }, 500);
  };

  // Render the game board
  return (
    <div className="relative w-full max-w-6xl mx-auto rounded-lg overflow-hidden">
      {/* Game board container */}
      <div className="relative aspect-[16/10] bg-gradient-to-b from-primary/5 to-primary/10 rounded-lg border border-primary/30 shadow-inner overflow-hidden">
        <div className="absolute inset-0 bg-card-pattern opacity-20" />

        {/* Top player */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="font-medieval text-sm md:text-base text-primary mb-1">
            {players.length > 2 ? players[2]?.name || "Player 3" : "Player 3"}
          </div>
          <div className="flex gap-1 md:gap-2">
            {Array.from({ length: initialCardsDeal ? 5 : 13 }).map((_, i) => (
              <div
                key={`top-card-${i}`}
                className="w-3 md:w-4 h-10 md:h-14 bg-card rounded-md border border-primary/30 shadow-md transform rotate-180"
              />
            ))}
          </div>
        </div>

        {/* Left player */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="font-medieval text-sm md:text-base text-primary mb-1">
            {players.length > 1 ? players[1]?.name || "Player 2" : "Player 2"}
          </div>
          <div className="flex flex-col gap-1">
            {Array.from({ length: initialCardsDeal ? 5 : 13 }).map((_, i) => (
              <div
                key={`left-card-${i}`}
                className="h-3 md:h-4 w-10 md:w-14 bg-card rounded-md border border-primary/30 shadow-md transform -rotate-90"
              />
            ))}
          </div>
        </div>

        {/* Right player */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="font-medieval text-sm md:text-base text-primary mb-1">
            {players.length > 3 ? players[3]?.name || "Player 4" : "Player 4"}
          </div>
          <div className="flex flex-col gap-1">
            {Array.from({ length: initialCardsDeal ? 5 : 13 }).map((_, i) => (
              <div
                key={`right-card-${i}`}
                className="h-3 md:h-4 w-10 md:w-14 bg-card rounded-md border border-primary/30 shadow-md transform rotate-90"
              />
            ))}
          </div>
        </div>

        {/* Current trick */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-2 gap-4 md:gap-8">
            {centerCards.map((card, index) => (
              <motion.div
                key={`center-card-${card.id}-${index}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  damping: 12,
                  stiffness: 200,
                }}
                className="flex flex-col items-center"
              >
                <div className="text-xs md:text-sm text-muted-foreground mb-1">
                  {card.playedBy}
                </div>
                <Card
                  suit={card.suit}
                  value={card.value}
                  onClick={() => {}} // No action when clicking played cards
                  disabled={true}
                  is3D={true}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Turn timer */}
        {isTimerActive && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2">
            <TurnTimer
              duration={20}
              onTimeUp={handleTimeUp}
              isActive={isTimerActive}
              currentPlayer={user?.username || "Your"}
            />
          </div>
        )}

        {/* Emotes */}
        <AnimatePresence>
          {emotes.map((emote) => (
            <motion.div
              key={emote.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background/60 backdrop-blur-sm p-2 rounded-full shadow-lg"
            >
              <div className="text-4xl md:text-5xl">{emote.emoji}</div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Bottom player (user) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
          {/* Game phase status for player */}
          {gameStatus !== "playing" && (
            <div className="mb-2 px-3 py-1 bg-card/80 backdrop-blur-sm rounded-lg border border-primary/30 shadow text-sm">
              {gameStatus === "initial_deal" &&
                "Waiting for initial deal to complete..."}
              {gameStatus === "bidding" &&
                "Trump selected. Waiting for final deal..."}
              {gameStatus === "final_deal" && "Dealing remaining cards..."}
              {gameStatus === "ended" && "Game has ended"}
            </div>
          )}
          {gameStatus === "playing" && currentPlayerIndex !== 0 && (
            <div className="mb-2 px-3 py-1 bg-card/80 backdrop-blur-sm rounded-lg border border-primary/30 shadow text-sm">
              Waiting for your turn...
            </div>
          )}
          {gameStatus === "playing" && currentPlayerIndex === 0 && (
            <div className="mb-2 px-3 py-1 bg-green-800/80 backdrop-blur-sm rounded-lg border border-green-500/50 shadow text-sm animate-pulse">
              Your turn to play!
            </div>
          )}

          <div className="flex justify-center gap-1 md:gap-2 mb-2">
            {playerHand.map((card) => (
              <motion.div
                key={`player-card-${card.id}`}
                whileHover={{
                  y: gameStatus === "playing" ? -10 : 0,
                  transition: { duration: 0.2 },
                }}
                onClick={() => handleCardClick(card.id)}
                className={`cursor-pointer ${
                  selectedCard === card.id ? "transform -translate-y-4" : ""
                } ${
                  playingCardId === card.id
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                } ${
                  gameStatus !== "playing"
                    ? "opacity-70 filter grayscale-[30%] cursor-not-allowed"
                    : ""
                }`}
              >
                <Card
                  suit={card.suit}
                  value={card.value}
                  onClick={() => handleCardClick(card.id)}
                  disabled={
                    playingCardId === card.id || gameStatus !== "playing"
                  }
                  is3D={true}
                />
                {playingCardId === card.id && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          <div className="font-medieval text-primary">
            {user?.username || "Player 1"}
          </div>

          {/* Emote controls */}
          <InGameEmotes onEmote={handleEmote} />
        </div>

        {/* Trump suit indicator or game phase indicator */}
        {trumpSuit ? (
          <div className="absolute top-4 right-4 bg-card/80 backdrop-blur-sm p-2 rounded-lg border border-primary/30 shadow flex items-center gap-2">
            <span className="text-sm text-foreground">Trump:</span>
            <span className="text-2xl">
              {trumpSuit === "hearts"
                ? "♥️"
                : trumpSuit === "diamonds"
                ? "♦️"
                : trumpSuit === "clubs"
                ? "♣️"
                : "♠️"}
            </span>
          </div>
        ) : (
          gameStatus === "initial_deal" && (
            <div className="absolute top-4 right-4 bg-card/80 backdrop-blur-sm p-2 rounded-lg border border-primary/30 shadow">
              <div className="text-sm font-medieval text-foreground">
                Initial 5 cards dealt
              </div>
              <button
                onClick={() => setShowTrumpPopup(true)}
                className="mt-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg shadow-lg border border-primary/30 font-medieval animate-pulse"
              >
                Select Trump Suit
              </button>
            </div>
          )
        )}

        {/* Game Phase Indicator */}
        <div className="absolute top-4 left-4 bg-card/80 backdrop-blur-sm p-2 rounded-lg border border-primary/30 shadow mb-2">
          <div className="text-xs font-semibold">Game Phase</div>
          <div className="text-sm flex items-center gap-2">
            {gameStatus === "initial_deal" && (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></span>
                <span>Initial Deal (5 cards)</span>
              </>
            )}
            {gameStatus === "bidding" && (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span>Trump Selected</span>
              </>
            )}
            {gameStatus === "final_deal" && (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                <span>Final Deal (8 more cards)</span>
              </>
            )}
            {gameStatus === "playing" && (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span>Playing</span>
              </>
            )}
            {gameStatus === "ended" && (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                <span>Game Over</span>
              </>
            )}
          </div>
        </div>

        {/* Scores */}
        <div className="absolute top-20 left-4 bg-card/80 backdrop-blur-sm p-2 rounded-lg border border-primary/30 shadow">
          <div className="text-xs font-semibold">Score</div>
          <div className="flex gap-3 text-sm">
            <div>
              Royals: <span className="font-bold">{scores.royals}</span>
            </div>
            <div>
              Rebels: <span className="font-bold">{scores.rebels}</span>
            </div>
          </div>
        </div>

        {/* Loading overlay */}
        {(cardPlayLoading || gameStatus === "final_deal") && (
          <div className="absolute inset-0 bg-background/30 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-card/90 p-4 rounded-lg shadow-lg flex flex-col items-center">
              <LoadingSpinner size="lg" />
              <div className="mt-2 text-foreground">
                {cardPlayLoading && "Playing card..."}
                {gameStatus === "final_deal" && "Dealing remaining 8 cards..."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
