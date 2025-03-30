"use client"

import { useState, useEffect } from "react"

export function useReplay() {
  const [replayData, setReplayData] = useState<any[]>([])

  // Load replay data from localStorage on mount
  useEffect(() => {
    const savedReplay = localStorage.getItem("courtPieceReplay")
    if (savedReplay) {
      try {
        setReplayData(JSON.parse(savedReplay))
      } catch (error) {
        console.error("Failed to parse replay data:", error)
      }
    }
  }, [])

  // Save replay data to localStorage when it changes
  useEffect(() => {
    if (replayData.length > 0) {
      localStorage.setItem("courtPieceReplay", JSON.stringify(replayData))
    }
  }, [replayData])

  const recordMove = (move: any) => {
    setReplayData((prev) => [
      ...prev,
      {
        ...move,
        timestamp: new Date().toISOString(),
      },
    ])
  }

  const clearReplay = () => {
    setReplayData([])
    localStorage.removeItem("courtPieceReplay")
  }

  const getReplayData = () => replayData

  return {
    recordMove,
    clearReplay,
    getReplayData,
  }
}

