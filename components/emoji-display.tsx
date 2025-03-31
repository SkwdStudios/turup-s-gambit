"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface EmojiMessage {
  id: number
  emoji: string
  player: string
  timestamp: number
}

interface EmojiDisplayProps {
  messages: EmojiMessage[]
}

export function EmojiDisplay({ messages }: EmojiDisplayProps) {
  const [visibleMessages, setVisibleMessages] = useState<EmojiMessage[]>([])

  useEffect(() => {
    // Add new messages to visible messages
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1]
      setVisibleMessages((prev) => [...prev, latestMessage])

      // Remove message after 3 seconds
      const timer = setTimeout(() => {
        setVisibleMessages((prev) => prev.filter((msg) => msg.id !== latestMessage.id))
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [messages])

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <AnimatePresence>
        {visibleMessages.map((message) => (
          <motion.div
            key={message.id}
            className="flex flex-col items-center mb-2"
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-card/80 backdrop-blur-sm px-3 py-1 rounded-full border border-primary/30 mb-1">
              <span className="text-sm font-medieval">{message.player}</span>
            </div>
            <div className="text-4xl">{message.emoji}</div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

