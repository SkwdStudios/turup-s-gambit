"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"

interface TurnTimerProps {
  isActive: boolean
  duration: number
  onTimeUp: () => void
  currentPlayer: string
}

export function TurnTimer({ isActive, duration, onTimeUp, currentPlayer }: TurnTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const hasCalledTimeUp = useRef(false)

  useEffect(() => {
    // Reset timer and flag when player changes or timer becomes active
    setTimeLeft(duration)
    hasCalledTimeUp.current = false

    if (isActive) {
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      // Set up new timer
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Clear the interval when time is up
            if (timerRef.current) {
              clearInterval(timerRef.current)
            }

            // Only call onTimeUp if we haven't already
            if (!hasCalledTimeUp.current) {
              hasCalledTimeUp.current = true
              // Use setTimeout to ensure this happens after render
              setTimeout(() => {
                onTimeUp()
              }, 0)
            }

            return 0
          }
          return prev - 1
        })
      }, 1000)

      // Clean up on unmount or when isActive changes
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
        }
      }
    }
  }, [isActive, duration, currentPlayer, onTimeUp])

  const percentage = (timeLeft / duration) * 100

  if (!isActive) return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
      <div className="text-sm font-medieval mb-1">
        {currentPlayer}'s Turn: {timeLeft}s
      </div>
      <div className="w-48 h-2 bg-card/50 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: "100%" }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "linear" }}
        />
      </div>
    </div>
  )
}

