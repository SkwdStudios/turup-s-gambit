"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GameBoard } from "@/components/game-board"
import { Chat } from "@/components/chat"
import { BiddingPanel } from "@/components/bidding-panel"
import { ReplaySummary } from "@/components/replay-summary"
import { VisualEffects } from "@/components/visual-effects"
import { useGameState } from "@/hooks/use-game-state"
import { useReplay } from "@/hooks/use-replay"
import { useAuth } from "@/hooks/use-auth"
import { LoginModal } from "@/components/login-modal"

export default function GameRoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const mode = searchParams.get("mode") || "classic"

  const [showReplay, setShowReplay] = useState(false)
  const [gameStatus, setGameStatus] = useState<"waiting" | "bidding" | "playing" | "ended">("waiting")
  const [players, setPlayers] = useState<string[]>([])
  const [showLoginModal, setShowLoginModal] = useState(false)

  const { gameState, updateGameState } = useGameState(mode as "classic" | "frenzy")
  const { recordMove, getReplayData } = useReplay()
  const { user } = useAuth()

  // Check if user is logged in
  useEffect(() => {
    if (!user) {
      setShowLoginModal(true)
    }
  }, [user])

  // Simulate players joining
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setPlayers([user.username, "Sir Lancelot", "Lady Guinevere", "Merlin"])
        setGameStatus("bidding")
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [user])

  // Simulate game ending after some time
  useEffect(() => {
    if (gameStatus === "playing") {
      const timer = setTimeout(() => {
        setGameStatus("ended")
      }, 60000) // 1 minute of gameplay for demo

      return () => clearTimeout(timer)
    }
  }, [gameStatus])

  function handleStartGame() {
    setGameStatus("playing")
  }

  function handleEndGame() {
    setGameStatus("ended")
  }

  function handleViewReplay() {
    setShowReplay(true)
  }

  function handleCloseReplay() {
    setShowReplay(false)
  }

  function handleShareGame() {
    navigator.clipboard.writeText(`Join my Court Piece game with code: ${roomId}`)
    alert("Game code copied to clipboard!")
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />

        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 dark:opacity-30" // Increased brightness
            style={{ backgroundImage: "url('/assets/game-table-bg.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
        </div>

        <LoginModal isOpen={showLoginModal} onClose={() => router.push("/")} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col pt-16">
      <VisualEffects enableGrain />

      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 dark:opacity-30" // Increased brightness
          style={{ backgroundImage: "url('/assets/game-table-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
      </div>

      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-medieval text-primary">Court Piece</h1>
            <p className="text-sm text-muted-foreground">
              Room: {roomId} • Mode: {mode === "classic" ? "Classic" : "Frenzy"}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="medieval-button" onClick={handleShareGame}>
              Share Game
            </Button>

            {gameStatus === "playing" && (
              <Button variant="destructive" size="sm" className="medieval-button" onClick={handleEndGame}>
                End Game
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {showReplay ? (
          <div className="col-span-1 lg:col-span-4">
            <ReplaySummary onClose={handleCloseReplay} replayData={getReplayData()} />
          </div>
        ) : (
          <>
            <div className="col-span-1 lg:col-span-3">
              {gameStatus === "waiting" && (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <h2 className="text-3xl font-medieval text-primary mb-6">Waiting for Players</h2>
                  <div className="mb-8">
                    <p className="text-lg mb-4">Players in the room ({players.length}/4):</p>
                    <ul className="space-y-2">
                      {players.map((player, index) => (
                        <li key={index} className="text-foreground/80">
                          {player}
                        </li>
                      ))}
                      {Array.from({ length: 4 - players.length }).map((_, index) => (
                        <li key={`empty-${index}`} className="text-muted-foreground">
                          Waiting for player...
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    className="medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={players.length < 4}
                    onClick={handleStartGame}
                  >
                    {players.length < 4 ? "Waiting for more players..." : "Start Game"}
                  </Button>
                </div>
              )}

              {gameStatus === "bidding" && (
                <div className="h-full flex flex-col items-center justify-center p-8">
                  <h2 className="text-3xl font-medieval text-primary mb-6">Bidding Phase</h2>
                  <BiddingPanel
                    onBidComplete={() => setGameStatus("playing")}
                    gameMode={mode as "classic" | "frenzy"}
                  />
                </div>
              )}

              {(gameStatus === "playing" || gameStatus === "ended") && (
                <GameBoard
                  gameMode={mode as "classic" | "frenzy"}
                  players={players}
                  gameState={gameState}
                  onUpdateGameState={updateGameState}
                  onRecordMove={recordMove}
                  gameStatus={gameStatus}
                />
              )}

              {gameStatus === "ended" && (
                <div className="mt-6 p-6 border-2 border-primary/30 rounded-lg bg-card/80 backdrop-blur-sm text-center">
                  <h2 className="text-3xl font-medieval text-primary mb-4">Game Over</h2>
                  <p className="text-lg mb-6">Congratulations! Your team has won the game.</p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <Button
                      className="medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={handleViewReplay}
                    >
                      View Replay
                    </Button>
                    <Button
                      variant="outline"
                      className="medieval-button"
                      onClick={() => (window.location.href = "/game")}
                    >
                      New Game
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="col-span-1">
              <Chat roomId={roomId} players={players} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

