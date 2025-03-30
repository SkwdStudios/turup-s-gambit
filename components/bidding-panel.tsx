"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface BiddingPanelProps {
  onBidComplete: () => void
  gameMode: "classic" | "frenzy"
}

export function BiddingPanel({ onBidComplete, gameMode }: BiddingPanelProps) {
  const [selectedSuit, setSelectedSuit] = useState<string | null>(null)
  const [bidAmount, setBidAmount] = useState<number>(7)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const suits = [
    { id: "hearts", name: "Hearts", symbol: "♥", color: "text-red-500" },
    { id: "diamonds", name: "Diamonds", symbol: "♦", color: "text-red-500" },
    { id: "clubs", name: "Clubs", symbol: "♣", color: "text-slate-900 dark:text-slate-100" },
    { id: "spades", name: "Spades", symbol: "♠", color: "text-slate-900 dark:text-slate-100" },
  ]

  const handleSubmitBid = () => {
    if (!selectedSuit) return

    setIsSubmitting(true)

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      onBidComplete()
    }, 1500)
  }

  return (
    <div className="w-full max-w-md p-6 border-2 border-primary/30 rounded-lg bg-card/90 backdrop-blur-sm">
      <h3 className="text-xl font-medieval text-center mb-6">Select Trump Suit</h3>

      <RadioGroup value={selectedSuit || ""} onValueChange={setSelectedSuit} className="grid grid-cols-2 gap-4 mb-6">
        {suits.map((suit) => (
          <div key={suit.id}>
            <RadioGroupItem value={suit.id} id={suit.id} className="peer sr-only" />
            <Label
              htmlFor={suit.id}
              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
            >
              <span className={`text-4xl mb-2 ${suit.color}`}>{suit.symbol}</span>
              <span className="font-medieval">{suit.name}</span>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {gameMode === "frenzy" && (
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Bid Amount</h4>
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBidAmount((prev) => Math.max(7, prev - 1))}
              disabled={bidAmount <= 7}
            >
              -
            </Button>
            <span className="text-2xl font-medieval">{bidAmount}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBidAmount((prev) => Math.min(13, prev + 1))}
              disabled={bidAmount >= 13}
            >
              +
            </Button>
          </div>
        </div>
      )}

      <Button
        className="w-full medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
        onClick={handleSubmitBid}
        disabled={!selectedSuit || isSubmitting}
      >
        {isSubmitting ? "Submitting bid..." : "Confirm Selection"}
      </Button>
    </div>
  )
}

