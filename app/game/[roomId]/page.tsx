"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { GameBoard } from "@/components/game-board"
import { TrumpBidding } from "@/components/trump-bidding"
import { ReplaySummary } from "@/components/replay-summary"
import { VisualEffects } from "@/components/visual-effects"
import { CardShuffleAnimation } from "@/components/card-shuffle-animation"
import { useGameState } from "@/hooks/use-game-state"
import { useReplay } from "@/hooks/use-replay"
import { useAuth } from "@/hooks/use-auth"
import { LoginModal } from "@/components/login-modal"
import { Share } from "lucide-react"

interface EmojiMessage {
  id: number
  emoji: string
  player: string
  timestamp: number
}

export default function GameRoomPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const mode = searchParams.get("mode") || "classic"

  const [showReplay, setShowReplay] = useState(false)
  const [gameStatus, setGameStatus] = useState<"waiting" | "dealing" | "bidding" | "playing" | "ended">("waiting")
  const [players, setPlayers] = useState<string[]>([])
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [emojiMessages, setEmojiMessages] = useState<EmojiMessage[]>([])
  const [showShuffleAnimation, setShowShuffleAnimation] = useState(false)
  const [initialCardsDeal, setInitialCardsDeal] = useState(false)
  const [trumpVotes, setTrumpVotes] = useState<Record<string, number>>({
    hearts: 0,
    diamonds: 0,
    clubs: 0,
    spades: 0,
  })
  const [userVote, setUserVote] = useState<string | null>(null)
  const [votingComplete, setVotingComplete] = useState(false)

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
        setGameStatus("waiting")
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [user])

  // Handle game start with card shuffle animation
  function handleStartGame() {
    setShowShuffleAnimation(true)

    // After shuffle animation, deal initial 5 cards
    setTimeout(() => {
      setShowShuffleAnimation(false)
      setGameStatus("dealing")
      setInitialCardsDeal(true)

      // After dealing initial cards, move to bidding phase
      setTimeout(() => {
        setGameStatus("bidding")
      }, 1500)
    }, 3000)
  }

  // Handle trump suit voting
  function handleTrumpVote(suit: string) {
    if (userVote) return // User already voted

    setUserVote(suit)
    setTrumpVotes((prev) => ({
      ...prev,
      [suit]: prev[suit] + 1,
    }))

    // Simulate other players voting
    setTimeout(() => {
      const suits = ["hearts", "diamonds", "clubs", "spades"]
      const aiVotes: Record<string, number> = { ...trumpVotes, [suit]: trumpVotes[suit] + 1 }

      // Each AI player votes
      for (let i = 1; i < players.length; i++) {
        const aiSuit = suits[Math.floor(Math.random() * suits.length)]
        aiVotes[aiSuit] = aiVotes[aiSuit] + 1
      }

      setTrumpVotes(aiVotes)
      setVotingComplete(true)

      // Determine winning suit
      setTimeout(() => {
        const maxVotes = Math.max(...Object.values(aiVotes))
        const winningTrumps = Object.keys(aiVotes).filter((s) => aiVotes[s] === maxVotes)

        // In case of tie, pick randomly
        const selectedTrump = winningTrumps[Math.floor(Math.random() * winningTrumps.length)]

        // Update game state with selected trump
        updateGameState({
          trumpSuit: selectedTrump,
        })

        // Deal remaining cards and start playing
        setTimeout(() => {
          setInitialCardsDeal(false) // Now deal all cards
          setGameStatus("playing")
        }, 1500)
      }, 2000)
    }, 2000)
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
    navigator.clipboard.writeText(`Join my Turup's Gambit game with code: ${roomId}`)
    alert("Game code copied to clipboard!")
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />

        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40 dark:opacity-30"
            style={{ backgroundImage: "url('/assets/game-table-bg.jpg')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
        </div>

        <LoginModal isOpen={showLoginModal} onClose={() => router.push("/")} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col pt-16 pb-16">
      <VisualEffects enableGrain />

      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 dark:opacity-30"
          style={{ backgroundImage: "url('/assets/game-table-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
      </div>

      {/* Streamlined header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm py-2">
        <div className="container mx-auto flex justify-between items-center px-4">
          <div className="flex items-center gap-4">
            <div className="bg-card/80 backdrop-blur-sm px-3 py-1 rounded-md border border-primary/30">
              <span className="text-sm font-medieval">Room: {roomId}</span>
            </div>
            <div className="bg-card/80 backdrop-blur-sm px-3 py-1 rounded-md border border-primary/30">
              <span className="text-sm font-medieval">Mode: {mode === "classic" ? "Classic" : "Frenzy"}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="medieval-button flex items-center gap-2"
            onClick={handleShareGame}
          >
            <Share size={16} />
            <span className="hidden sm:inline">Share Game</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4">
        {showReplay ? (
          <div className="max-w-5xl mx-auto">
            <ReplaySummary onClose={handleCloseReplay} replayData={getReplayData()} />
          </div>
        ) : (
          <div className="relative max-w-5xl mx-auto">
            {showShuffleAnimation && <CardShuffleAnimation />}

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

            {gameStatus === "dealing" && (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <h2 className="text-3xl font-medieval text-primary mb-6">Dealing Cards</h2>
                <p className="text-lg mb-8">The dealer is distributing the initial cards...</p>
              </div>
            )}

            {gameStatus === "bidding" && (
              <div className="h-full flex flex-col items-center justify-center p-8">
                <h2 className="text-3xl font-medieval text-primary mb-6">Trump Suit Bidding</h2>
                <TrumpBidding
                  onVote={handleTrumpVote}
                  userVote={userVote}
                  votes={trumpVotes}
                  votingComplete={votingComplete}
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
                initialCardsDeal={initialCardsDeal}
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
        )}
      </main>
    </div>
  )
}

