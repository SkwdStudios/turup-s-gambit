"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GameBoard } from "@/components/game-board";
import { TrumpBidding } from "@/components/trump-bidding";
import { ReplaySummary } from "@/components/replay-summary";
import { VisualEffects } from "@/components/visual-effects";
import { CardShuffleAnimation } from "@/components/card-shuffle-animation";
import { useGameState } from "@/hooks/use-game-state";
import { useReplay } from "@/hooks/use-replay";
import { useAuth } from "@/hooks/use-auth";
import { LoginModal } from "@/components/login-modal";
import { Share } from "lucide-react";
import { GameRoom, GameState, Card, Suit, Player } from "@/app/types/game";
import { ProtectedRoute } from "@/components/protected-route";
import { GameControls } from "@/components/game-controls";
import { GameInfo } from "@/components/game-info";
import { motion } from "framer-motion";
import {
  RealtimeGameStateProvider,
  useRealtimeGameState,
} from "@/hooks/use-realtime-game-state";

interface GameRoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

function GameRoomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { roomId } = useParams<{ roomId: string }>();
  const mode = searchParams?.get("mode") || "classic";

  const [showReplay, setShowReplay] = useState(false);
  const [gameStatus, setGameStatus] = useState<
    "waiting" | "initial_deal" | "bidding" | "final_deal" | "playing" | "ended"
  >("waiting");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showShuffleAnimation, setShowShuffleAnimation] = useState(false);
  const [initialCardsDeal, setInitialCardsDeal] = useState(false);
  const [trumpVotes, setTrumpVotes] = useState<Record<string, number>>({
    hearts: 0,
    diamonds: 0,
    clubs: 0,
    spades: 0,
  });
  const [userVote, setUserVote] = useState<string | null>(null);
  const [votingComplete, setVotingComplete] = useState(false);
  const [trumpSuit, setTrumpSuit] = useState<string | null>(null);

  const { gameState, updateGameState } = useGameState(
    mode as "classic" | "frenzy"
  );
  const { recordMove, getReplayData } = useReplay();
  const { user } = useAuth();

  // Use the Realtime Game State
  const {
    currentRoom,
    players,
    isConnected,
    startGame,
    playCard,
    placeBid,
    selectTrump,
  } = useRealtimeGameState();

  // Check if all players have joined
  const allPlayersJoined = players.length === 4;

  useEffect(() => {
    if (!user) {
      setShowLoginModal(true);
    }
  }, [user]);

  // Handle game state changes based on currentRoom
  useEffect(() => {
    if (currentRoom) {
      // Update game status based on room state
      if (currentRoom.gameState.gamePhase === "bidding") {
        setGameStatus("bidding");
      } else if (currentRoom.gameState.gamePhase === "playing") {
        setGameStatus("playing");
      } else if (currentRoom.gameState.gamePhase === "ended") {
        setGameStatus("ended");
      }

      // Update trump suit if available
      if (currentRoom.gameState.trumpSuit) {
        setTrumpSuit(currentRoom.gameState.trumpSuit);
      }
    }
  }, [currentRoom]);
  // Handle game start
  function handleStartGame() {
    startGame();
  }

  // Handle trump voting
  const handleTrumpVote = (suit: string) => {
    if (userVote || votingComplete) return;

    setUserVote(suit);
    selectTrump(suit);
  };

  function handlePlayCard(card: Card) {
    playCard(card);
  }

  function handleBid(bid: number) {
    placeBid(bid);
  }

  function handleEndGame() {
    setGameStatus("ended");
  }

  function handleViewReplay() {
    setShowReplay(true);
  }

  function handleCloseReplay() {
    setShowReplay(false);
  }

  function handleShareGame() {
    navigator.clipboard.writeText(
      `Join my Turup's Gambit game with code: ${roomId}`
    );
    alert("Game code copied to clipboard!");
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
    );
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {gameStatus === "waiting" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md mx-auto p-6 border-2 border-primary/30 rounded-lg bg-card/90 backdrop-blur-sm text-center"
              >
                <motion.h2
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-medieval mb-4"
                >
                  Waiting for Players
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mb-4"
                >
                  Share this room with friends to start the game
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-center mb-4"
                >
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                    }}
                  >
                    <Share className="h-4 w-4" />
                    Copy Room Link
                  </Button>
                </motion.div>
                <div className="grid grid-cols-4 gap-4">
                  {[0, 1, 2, 3].map((index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      className={`h-24 border-2 rounded-lg flex items-center justify-center ${
                        index < players.length
                          ? "border-primary bg-primary/10"
                          : "border-muted bg-muted/10"
                      }`}
                    >
                      {index < players.length ? (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className="font-medieval"
                        >
                          {currentRoom?.players.find(
                            (p) => p.name === players[index]
                          )?.name || players[index]}
                        </motion.span>
                      ) : (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.6 + index * 0.1 }}
                          className="text-muted-foreground"
                        >
                          Empty
                        </motion.span>
                      )}
                    </motion.div>
                  ))}
                </div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="mt-4 text-sm text-muted-foreground"
                >
                  {players.length}/4 players joined
                </motion.p>
              </motion.div>
            )}

            {gameStatus === "initial_deal" && showShuffleAnimation && (
              <CardShuffleAnimation
                onComplete={() => setShowShuffleAnimation(false)}
              />
            )}

            {gameStatus === "bidding" && (
              <TrumpBidding
                onVote={handleTrumpVote}
                userVote={userVote}
                votes={trumpVotes}
                votingComplete={votingComplete}
              />
            )}

            {gameStatus === "final_deal" && showShuffleAnimation && (
              <CardShuffleAnimation
                onComplete={() => setShowShuffleAnimation(false)}
              />
            )}

            {(gameStatus === "playing" || gameStatus === "ended") && (
              <GameBoard
                roomId={roomId}
                gameMode={mode as "classic" | "frenzy"}
                players={players}
                gameState={gameState}
                onUpdateGameState={updateGameState}
                onRecordMove={recordMove}
                gameStatus={gameStatus}
                initialCardsDeal={initialCardsDeal}
                onPlayCard={handlePlayCard}
                onBid={handleBid}
              />
            )}
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-8"
          >
            <GameInfo roomId={roomId} />
            <GameControls roomId={roomId} />
          </motion.div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function GameRoomPage({ params }: GameRoomPageProps) {
  const resolvedParams = React.use(params);
  const roomId = resolvedParams.roomId;

  return (
    <RealtimeGameStateProvider roomId={roomId}>
      <GameRoomContent />
    </RealtimeGameStateProvider>
  );
}
