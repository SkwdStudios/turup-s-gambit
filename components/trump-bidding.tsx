"use client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface TrumpBiddingProps {
  onVote: (suit: string) => void;
  userVote: string | null;
  votes: Record<string, number>;
  votingComplete: boolean;
}

export function TrumpBidding({
  onVote,
  userVote,
  votes,
  votingComplete,
}: TrumpBiddingProps) {
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

  return (
    <div className="w-full max-w-md p-6 border-2 border-primary/30 rounded-lg bg-card/90 backdrop-blur-sm">
      <h3 className="text-xl font-medieval text-center mb-6">
        {votingComplete
          ? "Voting Results"
          : userVote
          ? "Waiting for other players..."
          : "Select Trump Suit"}
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {suits.map((suit) => (
          <div key={suit.id} className="relative">
            <Button
              variant="outline"
              className={`w-full h-24 flex flex-col items-center justify-center border-2 ${
                userVote === suit.id ? "border-primary" : "border-muted"
              } ${
                votingComplete ? "cursor-default" : "hover:border-primary/70"
              }`}
              onClick={() => !userVote && !votingComplete && onVote(suit.id)}
              disabled={!!userVote || votingComplete}
            >
              <span className={`text-4xl mb-2 ${suit.color}`}>
                {suit.symbol}
              </span>
              <span className="font-medieval">{suit.name}</span>
            </Button>

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

            {!votingComplete && votes[suit.id] > 0 && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute top-2 right-2 bg-secondary/80 backdrop-blur-sm px-2 py-1 rounded-full border border-secondary/30"
              >
                <span className="text-sm font-medieval">{votes[suit.id]}</span>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {votingComplete ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Tallying votes and selecting the trump suit...
          </p>
          <div className="flex flex-col items-center justify-center gap-3">
            <LoadingSpinner size="md" variant="primary" />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex gap-2 items-center justify-center"
            >
              {suits.map((suit) => (
                <motion.div
                  key={suit.id}
                  className={`text-2xl ${suit.color} ${
                    votes[suit.id] > 0 ? "scale-125" : "opacity-50"
                  }`}
                  animate={{
                    scale: votes[suit.id] > 0 ? [1, 1.2, 1] : 1,
                    opacity: votes[suit.id] > 0 ? 1 : 0.5,
                  }}
                  transition={{
                    repeat: votes[suit.id] > 0 ? Infinity : 0,
                    duration: 1.5,
                  }}
                >
                  {suit.symbol}
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      ) : userVote ? (
        <div className="text-center">
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              You&apos;ve voted for{" "}
              <span className="font-medieval">
                {suits.find((s) => s.id === userVote)?.name}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span className="text-sm">
                Waiting for other players to vote...
              </span>
            </div>
            <motion.div
              className="text-3xl mt-2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {suits.find((s) => s.id === userVote)?.symbol}
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Choose the suit you want to be trump for this game
          </p>
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-primary text-xl"
          >
            ↑ Select a suit above ↑
          </motion.div>
        </div>
      )}
    </div>
  );
}
