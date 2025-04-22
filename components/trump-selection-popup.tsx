"use client";
import React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Crown, Check, Clock, Users } from "lucide-react";
import { Suit } from "@/app/types/game";
import { useUIStore } from "@/stores/uiStore";

interface TrumpSelectionPopupProps {
  onVote: (suit: string) => void;
  userVote: Suit | null;
  trumpVotes: Record<string, number>;
  votingComplete: boolean;
  playerHand: Array<{
    id: number;
    suit: string;
    value: string;
  }>;
  isOpen: boolean;
  isCurrentUserHost: boolean;
  onForceBotVotes?: () => void;
}

export function TrumpSelectionPopup({
  onVote,
  userVote,
  trumpVotes,
  votingComplete,
  playerHand,
  isOpen,
  isCurrentUserHost,
  onForceBotVotes,
}: TrumpSelectionPopupProps) {
  // Get UI store for managing popup state
  const { setShowTrumpPopup } = useUIStore();

  // Create default mock data if player hand is empty
  const effectivePlayerHand =
    playerHand.length > 0
      ? playerHand
      : [
          { id: 1, suit: "hearts", value: "A" },
          { id: 2, suit: "spades", value: "K" },
          { id: 3, suit: "diamonds", value: "Q" },
          { id: 4, suit: "clubs", value: "J" },
          { id: 5, suit: "hearts", value: "10" },
        ];

  // Local state
  const [selectedSuit, setSelectedSuit] = useState<string | null>(
    userVote || null
  );
  const [handAnalysis, setHandAnalysis] = useState<Record<string, number>>({
    hearts: 0,
    diamonds: 0,
    clubs: 0,
    spades: 0,
  });
  const [isHandLoading, setIsHandLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Analyze the player's hand to count cards by suit
  useEffect(() => {
    if (effectivePlayerHand.length > 0) {
      const suitCounts = {
        hearts: 0,
        diamonds: 0,
        clubs: 0,
        spades: 0,
      };

      effectivePlayerHand.forEach((card) => {
        // Check if the suit is a valid key in suitCounts
        if (
          card.suit === "hearts" ||
          card.suit === "diamonds" ||
          card.suit === "clubs" ||
          card.suit === "spades"
        ) {
          suitCounts[card.suit]++;
        }
      });

      setHandAnalysis(suitCounts);
    }
  }, [effectivePlayerHand]);

  // Set selected suit to user vote when it changes
  useEffect(() => {
    if (userVote) {
      setSelectedSuit(userVote);
    }
  }, [userVote]);

  const suits = [
    { id: "hearts", name: "Hearts", symbol: "♥", color: "text-red-500" },
    { id: "diamonds", name: "Diamonds", symbol: "♦", color: "text-red-500" },
    {
      id: "clubs",
      name: "Clubs",
      symbol: "♣",
      color: "text-slate-900 dark:text-slate-100",
    },
    {
      id: "spades",
      name: "Spades",
      symbol: "♠",
      color: "text-slate-900 dark:text-slate-100",
    },
  ];

  // Handle trump suit selection
  const handleVote = () => {
    if (selectedSuit && !userVote) {
      setIsHandLoading(true); // Show loading state
      setShowConfirmation(true);

      // Short delay to show animation
      setTimeout(() => {
        onVote(selectedSuit);
        setIsHandLoading(false);
      }, 500);
    }
  };

  // Handle closing the popup
  const handleClose = () => {
    if (votingComplete) {
      setShowTrumpPopup(false);
    }
  };

  if (!isOpen) return null;

  // Count cards by suit in player's hand
  const suitCounts: Record<string, number> = playerHand.reduce(
    (counts, card) => {
      counts[card.suit] = (counts[card.suit] || 0) + 1;
      return counts;
    },
    {} as Record<string, number>
  );

  // Get total votes
  const totalVotes = Object.values(trumpVotes).reduce(
    (sum, count) => sum + count,
    0
  );

  // Helper to get suit symbol
  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case "hearts":
        return "♥";
      case "diamonds":
        return "♦";
      case "clubs":
        return "♣";
      case "spades":
        return "♠";
      default:
        return suit;
    }
  };

  // Helper to get suit color
  const getSuitColor = (suit: string) => {
    switch (suit) {
      case "hearts":
      case "diamonds":
        return "text-red-500";
      case "clubs":
      case "spades":
        return "text-gray-800";
      default:
        return "";
    }
  };

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-card/95 backdrop-blur-md w-full max-w-2xl p-6 rounded-lg border-2 border-primary/30 shadow-xl"
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-medieval text-primary">
              {votingComplete
                ? "Trump Selection Complete"
                : userVote
                ? "Waiting for Other Players"
                : "Select Trump Suit"}
            </h2>
          </div>

          {/* Player's hand display */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medieval text-foreground">
                Your Initial 5 Cards:
              </h3>
              <div className="bg-primary/20 text-primary-foreground text-xs px-3 py-1 rounded-full">
                First 5 of 13 cards
              </div>
            </div>
            <div className="flex justify-center gap-2 mb-4">
              {isHandLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <LoadingSpinner size="lg" variant="primary" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Dealing initial 5 cards...
                  </p>
                </div>
              ) : (
                effectivePlayerHand.map((card) => (
                  <motion.div
                    key={card.id}
                    className="transition-all duration-200"
                    whileHover={{ y: -10, transition: { duration: 0.2 } }}
                    animate={{
                      y: card.suit === selectedSuit ? -10 : 0,
                      transition: { duration: 0.3 },
                    }}
                  >
                    <Card
                      suit={card.suit}
                      value={card.value}
                      onClick={() => !userVote && setSelectedSuit(card.suit)}
                      is3D={true}
                      disabled={!!userVote}
                    />
                  </motion.div>
                ))
              )}
            </div>
            <div className="flex justify-center gap-6 text-sm bg-muted/50 py-2 px-4 rounded-lg border border-border/50">
              {suits.map((suit) => (
                <div
                  key={suit.id}
                  className={`flex items-center gap-1 ${
                    handAnalysis[suit.id] > 0 ? "font-medium" : "opacity-50"
                  }`}
                >
                  <span className={`text-lg ${suit.color}`}>{suit.symbol}</span>
                  <span className="text-foreground">
                    {handAnalysis[suit.id]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trump selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medieval text-foreground mb-3">
              {votingComplete
                ? "Voting Results"
                : userVote
                ? "Your Vote"
                : "Choose Trump Suit"}
            </h3>

            {votingComplete ? (
              <div className="text-center mb-6">
                <p className="mb-3 text-muted-foreground">
                  Voting complete! Results:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(["hearts", "diamonds", "clubs", "spades"] as Suit[]).map(
                    (suit) => {
                      const isWinner =
                        Math.max(...Object.values(trumpVotes)) ===
                        trumpVotes[suit];
                      return (
                        <div
                          key={suit}
                          className={`p-3 border rounded-lg flex justify-between items-center ${
                            isWinner
                              ? "bg-primary/20 border-primary/50"
                              : "bg-muted/30 border-border/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-2xl ${getSuitColor(suit)}`}>
                              {getSuitSymbol(suit)}
                            </span>
                            <span className="font-medieval capitalize text-foreground">
                              {suit}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-lg text-foreground">
                              {trumpVotes[suit] || 0}
                            </span>
                            {isWinner && (
                              <Crown className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            ) : (
              <>
                <p className="text-center mb-4 text-muted-foreground">
                  Select a trump suit based on your hand. Your hand contains:
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  {(["hearts", "diamonds", "clubs", "spades"] as Suit[]).map(
                    (suit) => (
                      <button
                        key={suit}
                        onClick={() => !userVote && setSelectedSuit(suit)}
                        disabled={!!userVote}
                        className={`
                        p-4 rounded-lg flex flex-col items-center justify-center
                        transition-all duration-300
                        ${
                          selectedSuit === suit && !userVote
                            ? "bg-primary/20 border-2 border-primary/50 shadow-lg"
                            : userVote === suit
                            ? "bg-primary/30 border-2 border-primary/40 shadow-lg"
                            : "bg-card hover:bg-muted/50 border border-border/50"
                        }
                        ${userVote && userVote !== suit ? "opacity-50" : ""}
                      `}
                      >
                        <span className={`text-4xl mb-2 ${getSuitColor(suit)}`}>
                          {getSuitSymbol(suit)}
                        </span>
                        <span className="font-medieval capitalize text-foreground">
                          {suit}
                        </span>
                        <div className="flex justify-between w-full mt-2 px-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="text-sm">
                              {suitCounts[suit] || 0}
                            </span>
                            <span className="text-xs">cards</span>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="text-sm font-bold">
                              {trumpVotes[suit] || 0}
                            </span>
                            <span className="text-xs">votes</span>
                          </div>
                        </div>
                        {userVote === suit && (
                          <div className="absolute top-2 right-2">
                            <Check className="h-5 w-5 text-green-400" />
                          </div>
                        )}
                      </button>
                    )
                  )}
                </div>

                <div className="mt-4 text-center">
                  {userVote ? (
                    <p className="text-foreground flex items-center justify-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      You voted for{" "}
                      <span
                        className={`${getSuitColor(userVote)} font-bold mx-1`}
                      >
                        {getSuitSymbol(userVote)}
                      </span>
                      <span className="capitalize">{userVote}</span>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Please select a trump suit
                    </p>
                  )}

                  <div className="flex items-center justify-center gap-2 mt-3 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Waiting for all players to vote... ({totalVotes} of 4
                      votes)
                    </span>
                  </div>

                  {isCurrentUserHost && onForceBotVotes && (
                    <Button
                      onClick={onForceBotVotes}
                      className="mt-4 medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
                      disabled={votingComplete}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Force Bots to Vote
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Action area */}
          <div className="flex justify-between items-center border-t border-border pt-4">
            {votingComplete ? (
              <div className="w-full text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Tallying votes and selecting the trump suit...
                </p>
                <div className="flex items-center justify-center gap-3">
                  <LoadingSpinner size="md" variant="primary" />
                </div>
                {/* Add a close button to allow users to dismiss the popup if it gets stuck */}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={handleClose}
                >
                  Continue
                </Button>
              </div>
            ) : userVote ? (
              <div className="w-full text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <LoadingSpinner size="sm" />
                    <span>Waiting for other players to vote...</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  After trump selection, the dealer will deal 8 more cards to
                  complete your hand of 13 cards.
                </p>
                <Button
                  className="medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleVote}
                  disabled={!selectedSuit || isHandLoading}
                >
                  Confirm Selection
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
