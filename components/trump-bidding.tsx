"use client"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface TrumpBiddingProps {
  onVote: (suit: string) => void
  userVote: string | null
  votes: Record<string, number>
  votingComplete: boolean
}

export function TrumpBidding({ onVote, userVote, votes, votingComplete }: TrumpBiddingProps) {
  const suits = [
    { id: "hearts", name: "Hearts", symbol: "♥", color: "text-red-500" },
    { id: "diamonds", name: "Diamonds", symbol: "♦", color: "text-red-500" },
    { id: "clubs", name: "Clubs", symbol: "♣", color: "text-slate-900 dark:text-slate-100" },
    { id: "spades", name: "Spades", symbol: "♠", color: "text-slate-900 dark:text-slate-100" },
  ]

  return (
    <div className="w-full max-w-md p-6 border-2 border-primary/30 rounded-lg bg-card/90 backdrop-blur-sm">
      <h3 className="text-xl font-medieval text-center mb-6">
        {votingComplete ? "Voting Results" : userVote ? "Waiting for other players..." : "Select Trump Suit"}
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {suits.map((suit) => (
          <div key={suit.id} className="relative">
            <Button
              variant="outline"
              className={`w-full h-24 flex flex-col items-center justify-center border-2 ${
                userVote === suit.id ? "border-primary" : "border-muted"
              } ${votingComplete ? "cursor-default" : "hover:border-primary/70"}`}
              onClick={() => !userVote && !votingComplete && onVote(suit.id)}
              disabled={!!userVote || votingComplete}
            >
              <span className={`text-4xl mb-2 ${suit.color}`}>{suit.symbol}</span>
              <span className="font-medieval">{suit.name}</span>
            </Button>

            {votingComplete && (
              <div className="absolute top-2 right-2 bg-card/90 backdrop-blur-sm px-2 py-1 rounded-full border border-primary/30">
                <span className="text-sm font-medieval">{votes[suit.id]} votes</span>
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

      {votingComplete ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Tallying votes and selecting the trump suit...</p>
          <div className="flex justify-center">
            <motion.div
              className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
          </div>
        </div>
      ) : userVote ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            You've voted for <span className="font-medieval">{suits.find((s) => s.id === userVote)?.name}</span>.
            Waiting for other players to vote...
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center">Choose the suit you want to be trump for this game</p>
      )}
    </div>
  )
}

