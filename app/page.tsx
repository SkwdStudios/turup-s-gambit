"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { VisualEffects } from "@/components/visual-effects"
import { motion } from "framer-motion"
import { FlyingCards } from "@/components/flying-cards"

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16 pb-16">
      <VisualEffects enableGrain enableCRT />
      <FlyingCards />

      {/* Full-page blur effect that excludes navbar and footer */}
      <div className="fixed inset-0 bg-background/30 backdrop-blur-[2px] -z-5"></div>

      <div className="z-10 text-center px-4 py-16 max-w-4xl relative">
        <motion.h1
          className="text-5xl md:text-7xl font-medieval text-primary mb-6 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Turup's Gambit
        </motion.h1>
        <motion.p
          className="text-xl md:text-2xl mb-8 font-medieval text-foreground/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Enter the realm of strategy and cunning in this medieval fantasy card game
        </motion.p>

        <motion.div
          className="max-w-3xl mx-auto mb-12 text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <p className="mb-4">
            In the ancient halls of Camelot, where knights and nobles gather, a game of wits and fortune unfolds.
            Turup's Gambit, known in whispered legends as "Hokm," challenges the strategic minds of the realm.
          </p>
          <p className="mb-4">
            Form alliances, predict your opponent's moves, and master the art of the trump suit. Will you rise to become
            the champion of the royal court, or fall to the cunning of your adversaries?
          </p>
          <p>The cards await your command, brave challenger. Your destiny is in your hands.</p>
        </motion.div>

        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Link href="/game" passHref>
            <Button className="medieval-button text-2xl py-8 px-12 bg-primary hover:bg-primary/90 text-primary-foreground group">
              Play Now
            </Button>
          </Link>
        </motion.div>
      </div>

      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-60 dark:opacity-40"
          style={{ backgroundImage: "url('/assets/fantasy-background.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background" />
      </div>
    </div>
  )
}

