"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card } from "@/components/card"

export function CardShuffleAnimation() {
  const [cards, setCards] = useState<
    Array<{ id: number; suit: string; value: string; x: number; y: number; rotation: number }>
  >([])

  useEffect(() => {
    // Generate random cards for the animation
    const suits = ["hearts", "diamonds", "clubs", "spades"]
    const values = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"]

    const generatedCards = []

    for (let i = 0; i < 20; i++) {
      generatedCards.push({
        id: i,
        suit: suits[Math.floor(Math.random() * suits.length)],
        value: values[Math.floor(Math.random() * values.length)],
        x: Math.random() * 100 - 50, // Random position between -50% and 50%
        y: Math.random() * 100 - 50, // Random position between -50% and 50%
        rotation: Math.random() * 360, // Random rotation
      })
    }

    setCards(generatedCards)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full h-full max-w-2xl max-h-2xl">
        <AnimatePresence>
          {cards.map((card) => (
            <motion.div
              key={card.id}
              className="absolute top-1/2 left-1/2"
              initial={{
                x: 0,
                y: 0,
                rotate: 0,
                scale: 0.5,
                opacity: 0,
              }}
              animate={[
                // First animation: cards fly in from center
                {
                  x: `${card.x}%`,
                  y: `${card.y}%`,
                  rotate: card.rotation,
                  scale: 1,
                  opacity: 1,
                  transition: {
                    duration: 0.8,
                    delay: card.id * 0.05,
                  },
                },
                // Second animation: cards fly back to center and stack
                {
                  x: 0,
                  y: 0,
                  rotate: 0,
                  scale: 1,
                  opacity: 1,
                  transition: {
                    duration: 0.8,
                    delay: 1.5 + (20 - card.id) * 0.05,
                  },
                },
              ]}
              exit={{
                scale: 0.5,
                opacity: 0,
                transition: { duration: 0.3 },
              }}
            >
              <Card suit={card.suit} value={card.value} onClick={() => {}} is3D={true} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

