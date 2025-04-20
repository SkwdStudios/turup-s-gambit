"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/card";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { X } from "lucide-react";

interface TrumpSelectionPopupProps {
  onVote: (suit: string) => void;
  userVote: string | null;
  votes: Record<string, number>;
  votingComplete: boolean;
  playerHand: Array<{ id: number; suit: string; value: string }>;
  isOpen: boolean;
  onForceBotVotes?: () => void;
  isCurrentUserHost?: boolean;
}

export function TrumpSelectionPopup({
  onVote,
  userVote,
  votes,
  votingComplete,
  playerHand,
  isOpen,
  onForceBotVotes,
  isCurrentUserHost = false,
}: TrumpSelectionPopupProps) {
  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);
  const [handAnalysis, setHandAnalysis] = useState<Record<string, number>>({
    hearts: 0,
    diamonds: 0,
    clubs: 0,
    spades: 0,
  });

  // Analyze the player's hand to count cards by suit
  useEffect(() => {
    if (playerHand.length > 0) {
      const suitCounts = {
        hearts: 0,
        diamonds: 0,
        clubs: 0,
        spades: 0,
      };

      playerHand.forEach((card) => {
        if (card.suit in suitCounts) {
          suitCounts[card.suit]++;
        }
      });

      setHandAnalysis(suitCounts);
    }
  }, [playerHand]);

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

  const handleVote = () => {
    if (selectedSuit) {
      onVote(selectedSuit);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-card w-full max-w-2xl p-6 rounded-lg border-2 border-primary/30 shadow-xl"
        >
          <div className="flex justify-between items-center mb-4">
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
            <h3 className="text-lg font-medieval mb-2">Your Initial Hand:</h3>
            <div className="flex justify-center gap-2 mb-4">
              {playerHand.map((card, index) => (
                <div
                  key={card.id}
                  className="transition-all duration-200"
                  style={{
                    transform: `translateY(${
                      card.suit === selectedSuit ? "-10px" : "0"
                    })`,
                  }}
                >
                  <Card
                    suit={card.suit}
                    value={card.value}
                    onClick={() => setSelectedSuit(card.suit)}
                    is3D={true}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 text-sm text-muted-foreground">
              {suits.map((suit) => (
                <div
                  key={suit.id}
                  className={`flex items-center gap-1 ${
                    handAnalysis[suit.id] > 0 ? "font-medium" : "opacity-50"
                  }`}
                >
                  <span className={suit.color}>{suit.symbol}</span>
                  <span>{handAnalysis[suit.id]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trump selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medieval mb-3">
              {votingComplete
                ? "Voting Results"
                : userVote
                ? "Your Vote"
                : "Choose Trump Suit"}
            </h3>

            <div className="grid grid-cols-4 gap-4">
              {suits.map((suit) => (
                <div key={suit.id} className="relative">
                  <Button
                    variant="outline"
                    className={`w-full h-20 flex flex-col items-center justify-center border-2 ${
                      selectedSuit === suit.id || userVote === suit.id
                        ? "border-primary"
                        : "border-muted"
                    } ${
                      votingComplete || userVote
                        ? "cursor-default"
                        : "hover:border-primary/70"
                    }`}
                    onClick={() =>
                      !userVote && !votingComplete && setSelectedSuit(suit.id)
                    }
                    disabled={!!userVote || votingComplete}
                  >
                    <span className={`text-3xl mb-1 ${suit.color}`}>
                      {suit.symbol}
                    </span>
                    <span className="font-medieval text-sm">{suit.name}</span>
                  </Button>

                  {/* Recommendation badge based on hand analysis */}
                  {!userVote &&
                    !votingComplete &&
                    handAnalysis[suit.id] >= 2 && (
                      <div className="absolute -top-2 -left-2 bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full">
                        {handAnalysis[suit.id] >= 3 ? "Strong" : "Good"} choice
                      </div>
                    )}

                  {votingComplete && (
                    <div className="absolute top-2 right-2 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-full border border-primary/30">
                      <span className="text-sm font-medieval">
                        {votes[suit.id]} votes
                      </span>
                    </div>
                  )}

                  {userVote === suit.id && !votingComplete && (
                    <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                      Your vote
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action area */}
          <div className="flex justify-between items-center">
            {votingComplete ? (
              <div className="w-full text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Tallying votes and selecting the trump suit...
                </p>
                <div className="flex items-center justify-center gap-3">
                  <LoadingSpinner size="md" variant="primary" />
                </div>
              </div>
            ) : userVote ? (
              <div className="w-full text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center justify-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm">
                      Waiting for other players to vote...
                    </span>
                  </div>

                  {/* Force bot votes button - only shown to host */}
                  {isCurrentUserHost && onForceBotVotes && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 text-xs"
                      onClick={onForceBotVotes}
                    >
                      Force Bot Votes
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  After trump selection, you will receive 8 more cards.
                </p>
                <Button
                  className="medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={handleVote}
                  disabled={!selectedSuit}
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
