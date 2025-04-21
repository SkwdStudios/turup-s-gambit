"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { detectBotsByName } from "./bot-voting-helper";
import { GameBoard } from "@/components/game-board";
import { TrumpBidding } from "@/components/trump-bidding";
import { TrumpSelectionPopup } from "@/components/trump-selection-popup";
import { VisualEffects } from "@/components/visual-effects";
import { CardShuffleAnimation } from "@/components/card-shuffle-animation";
import { useReplay } from "@/hooks/use-replay";
import { LoginModal } from "@/components/login-modal";
import { ProtectedRoute } from "@/components/protected-route";
import { GameControls } from "@/components/game-controls";
import { GameInfo } from "@/components/game-info";
import { motion, AnimatePresence } from "framer-motion";
import { WaitingRoomSkeleton } from "@/components/waiting-room-skeleton";
import { GameInfoSkeleton } from "@/components/game-info-skeleton";
import { GameControlsSkeleton } from "@/components/game-controls-skeleton";
import { GameBoardSkeleton } from "@/components/game-board-skeleton";
import { StatusUpdateLoader } from "@/components/status-update-loader";
import { GameLoader, PhaseTransitionLoader } from "@/components/game-loader";
import { WaitingRoom } from "@/components/waiting-room";
// import { isPlayerHost } from "@/utils/game-helpers";

// Import Zustand stores
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";

interface GameRoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

function GameRoomContentInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { roomId } = useParams<{ roomId: string }>();
  const mode = searchParams?.get("mode") || "classic";
  const { recordMove } = useReplay();

  // Game state from Zustand store
  const {
    gameStatus,
    currentRoom,
    players,
    isLoading,
    statusMessage,
    isAddingBots,
    // setIsAddingBots,
    showShuffleAnimation,
    initialCardsDeal,
    isPhaseTransitioning,
    phaseTransitionMessage,
    setGameMode,
    setShowShuffleAnimation,
    trumpSuit,
    votingComplete,
    setStatusMessage,
    startGame,
    selectTrump,
    playCard,
    placeBid,
    addBots,
    isGameBoardReady,
    setIsGameBoardReady,
  } = useGameStore();

  // Auth state from Zustand store
  const { user } = useAuthStore();

  // UI state from Zustand store
  const {
    showLoginModal,
    showTrumpPopup,
    // showReplay,
    setShowLoginModal,
    setShowTrumpPopup,
    // setShowReplay,
  } = useUIStore();

  // Set game mode from URL
  useEffect(() => {
    setGameMode(mode as "classic" | "frenzy");
  }, [mode, setGameMode]);

  // Check if user is logged in
  useEffect(() => {
    if (!user) {
      setShowLoginModal(true);
    }
  }, [user, setShowLoginModal]);

  // Track which bots have already voted
  // We don't need to track bot votes locally anymore
  const [isStartingGame, setIsStartingGame] = useState(false);
  // Use a local state for trump votes for simplicity
  const [trumpVotes, setTrumpVotes] = useState<Record<string, number>>({
    hearts: 0,
    diamonds: 0,
    clubs: 0,
    spades: 0,
  });

  // Check if the current user is the host
  const isCurrentUserHost =
    currentRoom?.players?.some((p) => p.id === user?.id && p.isHost) || false;

  // Handle game start
  const handleStartGame = () => {
    if (isStartingGame || !isCurrentUserHost || players.length < 2) return;

    setIsStartingGame(true);
    setStatusMessage("Starting game...");

    // Start the game
    startGame();

    // Reset after a delay
    setTimeout(() => {
      setIsStartingGame(false);
      setStatusMessage(null);
    }, 2000);
  };

  // Handle adding bots
  const handleAddBots = () => {
    if (isAddingBots || !isCurrentUserHost) return;

    setStatusMessage("Adding bots...");
    addBots();

    // Status message will be cleared by the addBots function
  };

  // Handle trump voting
  const handleTrumpVote = (suit: string) => {
    if (votingComplete) return;

    setStatusMessage(`Voting for ${suit}...`);
    selectTrump(suit as any);

    // Trigger bot voting if there are bots in the game
    const botPlayers = detectBotsByName(players.map((p) => p.name));
    if (botPlayers.length > 0 && currentRoom) {
      // Simplified version for Zustand implementation
      // In a real implementation, we would need to adapt the bot voting helper
      // to work with our Zustand store
      setTimeout(() => {
        // Simulate bot votes
        const suits = ["hearts", "diamonds", "clubs", "spades"];
        botPlayers.forEach((_, index) => {
          setTimeout(() => {
            const randomSuit = suits[Math.floor(Math.random() * suits.length)];
            const newVotes = { ...trumpVotes };
            newVotes[randomSuit] = (newVotes[randomSuit] || 0) + 1;
            setTrumpVotes(newVotes);
          }, index * 800);
        });
      }, 1000);
    }

    setTimeout(() => {
      setStatusMessage(null);
    }, 1500);
  };

  // Handle forcing all bots to vote
  const handleForceBotVotes = () => {
    if (!isCurrentUserHost) return;

    setStatusMessage("Forcing bots to vote...");

    // Simplified version for Zustand implementation
    // In a real implementation, we would need to adapt the bot voting helper
    // to work with our Zustand store
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const botPlayers = players.filter(
      (p) => p.isBot || /^(Sir|Lady|King|Queen)/.test(p.name)
    );

    botPlayers.forEach((_, index) => {
      setTimeout(() => {
        const randomSuit = suits[Math.floor(Math.random() * suits.length)];
        const newVotes = { ...trumpVotes };
        newVotes[randomSuit] = (newVotes[randomSuit] || 0) + 1;
        setTrumpVotes(newVotes);
      }, index * 500);
    });

    setTimeout(() => {
      setStatusMessage(null);
    }, 1500);
  };

  // Handle playing a card
  const handlePlayCard = (card: any) => {
    setStatusMessage("Playing card...");
    playCard(card);

    // Record the move for replay
    recordMove({
      type: "play-card",
      player: user?.username || "",
      card,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      setStatusMessage(null);
    }, 1500);
  };

  // Handle placing a bid
  const handleBid = (bid: number) => {
    setStatusMessage(`Placing bid: ${bid}`);
    placeBid(bid);
    setTimeout(() => setStatusMessage(null), 1500);
  };

  // Get player hand for trump selection
  const playerHand = useMemo(() => {
    if (!currentRoom?.players || !user?.id) return [];

    const player = currentRoom.players.find((p) => p.id === user.id);
    if (!player || !player.hand || !Array.isArray(player.hand)) {
      console.log(
        "[GameRoom] Player hand not found or invalid, using mock data"
      );
      // Provide mock data if hand is not available
      return [
        { id: 1, suit: "hearts", value: "A" },
        { id: 2, suit: "spades", value: "K" },
        { id: 3, suit: "diamonds", value: "Q" },
        { id: 4, suit: "clubs", value: "J" },
        { id: 5, suit: "hearts", value: "10" },
      ];
    }

    return player.hand.map((card, index) => ({
      id: index,
      suit: card.suit,
      value: card.rank || "?", // Fallback to a placeholder if rank is not available
    }));
  }, [currentRoom?.players, user?.id]);

  // Set game board as ready after a delay when loading completes
  useEffect(() => {
    if (!isLoading && currentRoom && !isGameBoardReady) {
      const timer = setTimeout(() => {
        setIsGameBoardReady(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, currentRoom, isGameBoardReady, setIsGameBoardReady]);

  // We'll let the game store control when to show the trump selection popup
  // This ensures it only appears after the initial 5 cards are dealt
  useEffect(() => {
    if (gameStatus === "initial_deal") {
      console.log("[GameRoom] Game status changed to initial_deal");
      // The trump popup will be shown by the game store after the shuffle animation
    }
  }, [gameStatus]);

  // Handle shuffle animation completion
  const handleShuffleComplete = () => {
    setShowShuffleAnimation(false);
    console.log("[GameRoom] Shuffle animation completed");

    // We'll let the game store control when to show the trump selection popup
    // This ensures proper sequencing of the game flow
  };

  // If user is not logged in, show login modal
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 opacity-40 dark:opacity-30"
            style={{
              backgroundImage: "url('/assets/game-table-bg.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
        </div>
        <LoginModal isOpen={showLoginModal} onClose={() => router.push("/")} />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {isLoading ? (
            <WaitingRoomSkeleton />
          ) : (
            <>
              {gameStatus === "waiting" && (
                <WaitingRoom
                  roomId={roomId}
                  players={players.map((p) => p.name)}
                  currentRoom={currentRoom}
                  isCurrentUserHost={isCurrentUserHost}
                  allPlayersJoined={players.length === 4}
                  isAddingBots={isAddingBots}
                  isStartingGame={isStartingGame}
                  onAddBots={handleAddBots}
                  onStartGame={handleStartGame}
                  onForceHostStatus={
                    process.env.NODE_ENV === "development"
                      ? () => {
                          console.log("Debug: Force host status");
                          // This would need to be implemented in the store
                        }
                      : undefined
                  }
                />
              )}

              {gameStatus === "initial_deal" && (
                <>
                  {showShuffleAnimation ? (
                    <CardShuffleAnimation onComplete={handleShuffleComplete} />
                  ) : (
                    <>
                      {isGameBoardReady ? (
                        <GameBoard
                          roomId={roomId as string}
                          gameMode={mode as "classic" | "frenzy"}
                          players={players.map((p) => p.name)}
                          gameState={currentRoom?.gameState}
                          onUpdateGameState={(newState: any) => {
                            useGameStore.getState().updateGameState(newState);
                          }}
                          onRecordMove={recordMove}
                          gameStatus={gameStatus}
                          initialCardsDeal={true}
                          onPlayCard={handlePlayCard}
                          onBid={handleBid}
                          sendMessage={(message: any) => {
                            return useGameStore.getState().sendMessage(message);
                          }}
                        />
                      ) : (
                        <GameBoardSkeleton />
                      )}
                    </>
                  )}
                </>
              )}

              {gameStatus === "bidding" && (
                <>
                  <TrumpBidding
                    onVote={handleTrumpVote}
                    userVote={trumpSuit as string}
                    votes={trumpVotes}
                    votingComplete={votingComplete}
                  />
                  {isGameBoardReady ? (
                    <GameBoard
                      roomId={roomId as string}
                      gameMode={mode as "classic" | "frenzy"}
                      players={players.map((p) => p.name)}
                      gameState={currentRoom?.gameState}
                      onUpdateGameState={(newState: any) => {
                        useGameStore.getState().updateGameState(newState);
                      }}
                      onRecordMove={recordMove}
                      gameStatus={gameStatus}
                      initialCardsDeal={true}
                      onPlayCard={handlePlayCard}
                      onBid={handleBid}
                      sendMessage={(message: any) => {
                        return useGameStore.getState().sendMessage(message);
                      }}
                    />
                  ) : (
                    <GameBoardSkeleton />
                  )}
                </>
              )}

              {gameStatus === "final_deal" && (
                <>
                  {showShuffleAnimation ? (
                    <CardShuffleAnimation
                      onComplete={() => setShowShuffleAnimation(false)}
                    />
                  ) : isGameBoardReady ? (
                    <GameBoard
                      roomId={roomId as string}
                      gameMode={mode as "classic" | "frenzy"}
                      players={players.map((p) => p.name)}
                      gameState={currentRoom?.gameState}
                      onUpdateGameState={(newState: any) => {
                        useGameStore.getState().updateGameState(newState);
                      }}
                      onRecordMove={recordMove}
                      gameStatus={gameStatus}
                      initialCardsDeal={false}
                      onPlayCard={handlePlayCard}
                      onBid={handleBid}
                      sendMessage={(message: any) => {
                        return useGameStore.getState().sendMessage(message);
                      }}
                    />
                  ) : (
                    <GameBoardSkeleton />
                  )}
                </>
              )}

              {(gameStatus === "playing" || gameStatus === "ended") &&
                (isGameBoardReady ? (
                  <GameBoard
                    roomId={roomId as string}
                    gameMode={mode as "classic" | "frenzy"}
                    players={players.map((p) => p.name)}
                    gameState={currentRoom?.gameState}
                    onUpdateGameState={(newState: any) => {
                      useGameStore.getState().updateGameState(newState);
                    }}
                    onRecordMove={recordMove}
                    gameStatus={gameStatus}
                    initialCardsDeal={initialCardsDeal}
                    onPlayCard={handlePlayCard}
                    onBid={handleBid}
                    sendMessage={(message: any) => {
                      return useGameStore.getState().sendMessage(message);
                    }}
                  />
                ) : (
                  <GameBoardSkeleton />
                ))}
            </>
          )}
        </div>
        <div className="space-y-8">
          {isLoading ? (
            <>
              <GameInfoSkeleton />
              <GameControlsSkeleton />
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-8"
            >
              <GameInfo roomId={roomId} />
              <GameControls roomId={roomId} />
            </motion.div>
          )}
        </div>

        {/* Status message loader */}
        <AnimatePresence>
          {statusMessage && <StatusUpdateLoader message={statusMessage} />}
        </AnimatePresence>

        {/* Phase transition loader */}
        {isPhaseTransitioning && (
          <PhaseTransitionLoader message={phaseTransitionMessage} />
        )}

        {/* Main loading screen */}
        {isLoading && (
          <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
            <GameLoader message="Loading game room..." fullScreen />
          </div>
        )}

        {/* Trump Selection Popup - only show when explicitly triggered */}
        {showTrumpPopup && (
          <TrumpSelectionPopup
            onVote={handleTrumpVote}
            userVote={trumpSuit as string}
            votes={trumpVotes}
            votingComplete={votingComplete}
            playerHand={playerHand}
            isOpen={showTrumpPopup}
            onForceBotVotes={handleForceBotVotes}
            isCurrentUserHost={isCurrentUserHost}
          />
        )}
      </div>
    </div>
  );
}

// Wrapper component with Suspense
function GameRoomContent() {
  return (
    <Suspense fallback={<WaitingRoomSkeleton />}>
      <GameRoomContentInner />
    </Suspense>
  );
}

function GameRoomInitializer({
  roomId,
  children,
}: {
  roomId: string;
  children: React.ReactNode;
}) {
  const { setRoomId, joinRoom, currentRoom } = useGameStore();
  const { user } = useAuthStore();
  const hasJoinedRef = React.useRef(false);

  // Initialize the game with the room ID
  useEffect(() => {
    if (roomId && user && !hasJoinedRef.current) {
      console.log("[GameRoomInitializer] Initializing room", roomId);
      setRoomId(roomId);

      // Only join if we haven't already joined
      if (!currentRoom) {
        console.log("[GameRoomInitializer] Joining room as", user.username);
        joinRoom(roomId, user.username);
        hasJoinedRef.current = true;
      }
    }
  }, [roomId, user, currentRoom, setRoomId, joinRoom]);

  return <>{children}</>;
}

export default function GameRoomPage({ params }: GameRoomPageProps) {
  const resolvedParams = React.use(params);
  const roomId = resolvedParams.roomId;

  return (
    <ProtectedRoute>
      <GameRoomInitializer roomId={roomId}>
        <GameRoomContent />
      </GameRoomInitializer>
    </ProtectedRoute>
  );
}
