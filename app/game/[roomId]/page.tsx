"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { detectBotsByName } from "./bot-voting-helper";
import { GameBoard } from "@/components/game-board";
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

// Import our new Supabase Realtime trump voting hook
import { useSupabaseTrumpVoting } from "@/hooks/use-supabase-trump-voting";

export enum GameStates {
  WAITING = "waiting",
  INITIAL_DEAL = "initial_deal",
  BIDDING = "bidding",
  FINAL_DEAL = "final_deal",
  PLAYING = "playing",
  ENDED = "ended",
}

interface GameRoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

// Types for component props
interface GameBackgroundProps {}

interface WaitingRoomSectionProps {
  roomId: string;
  players: any[];
  currentRoom: any;
  isCurrentUserHost: boolean;
  isAddingBots: boolean;
  isStartingGame: boolean;
  handleAddBots: () => void;
  handleStartGame: () => void;
}

interface GameBoardWrapperProps {
  roomId: string;
  mode: string;
  players: any[];
  currentRoom: any;
  gameStatus: string;
  initialCardsDeal: boolean;
  recordMove: any;
  handlePlayCard: (card: any) => void;
  handleBid: (bid: number) => void;
  isGameBoardReady: boolean;
}

interface InitialDealSectionProps {
  roomId: string;
  mode: string;
  players: any[];
  currentRoom: any;
  gameStatus: string;
  showShuffleAnimation: boolean;
  handleShuffleComplete: () => void;
  recordMove: any;
  handlePlayCard: (card: any) => void;
  handleBid: (bid: number) => void;
  isGameBoardReady: boolean;
}

interface FinalDealSectionProps {
  roomId: string;
  mode: string;
  players: any[];
  currentRoom: any;
  gameStatus: string;
  showShuffleAnimation: boolean;
  setShowShuffleAnimation: (show: boolean) => void;
  recordMove: any;
  handlePlayCard: (card: any) => void;
  handleBid: (bid: number) => void;
  isGameBoardReady: boolean;
}

interface GameSidebarProps {
  isLoading: boolean;
  roomId: string;
}

interface GameOverlaysProps {
  statusMessage: string | null;
  isPhaseTransitioning: boolean;
  phaseTransitionMessage: string;
}

// Background component
const GameBackground: React.FC<GameBackgroundProps> = () => (
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
);

// Waiting Room Section
const WaitingRoomSection: React.FC<WaitingRoomSectionProps> = ({
  roomId,
  players,
  currentRoom,
  isCurrentUserHost,
  isAddingBots,
  isStartingGame,
  handleAddBots,
  handleStartGame,
}) => (
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
        ? () => console.log("Debug: Force host status")
        : undefined
    }
  />
);

// Game Board Component
const GameBoardWrapper: React.FC<GameBoardWrapperProps> = ({
  roomId,
  mode,
  players,
  currentRoom,
  gameStatus,
  initialCardsDeal,
  recordMove,
  handlePlayCard,
  handleBid,
  isGameBoardReady,
}) => {
  if (!isGameBoardReady) return <GameBoardSkeleton />;

  return (
    <GameBoard
      roomId={roomId as string}
      gameMode={mode as "classic" | "frenzy"}
      players={players.map((p) => p.name)}
      gameState={currentRoom?.gameState}
      onUpdateGameState={useGameStore.getState().updateGameState}
      onRecordMove={recordMove}
      gameStatus={gameStatus}
      initialCardsDeal={initialCardsDeal}
      onPlayCard={handlePlayCard}
      onBid={handleBid}
      sendMessage={useGameStore.getState().sendMessage}
    />
  );
};

// Final Deal Section
const FinalDealSection: React.FC<FinalDealSectionProps> = ({
  roomId,
  mode,
  players,
  currentRoom,
  gameStatus,
  showShuffleAnimation,
  setShowShuffleAnimation,
  recordMove,
  handlePlayCard,
  handleBid,
  isGameBoardReady,
}) => {
  if (showShuffleAnimation) {
    return (
      <CardShuffleAnimation onComplete={() => setShowShuffleAnimation(false)} />
    );
  }

  return (
    <GameBoardWrapper
      roomId={roomId}
      mode={mode}
      players={players}
      currentRoom={currentRoom}
      gameStatus={gameStatus}
      initialCardsDeal={false}
      recordMove={recordMove}
      handlePlayCard={handlePlayCard}
      handleBid={handleBid}
      isGameBoardReady={isGameBoardReady}
    />
  );
};

// Game Sidebar
const GameSidebar: React.FC<GameSidebarProps> = ({ isLoading, roomId }) => {
  if (isLoading) {
    return (
      <>
        <GameInfoSkeleton />
        <GameControlsSkeleton />
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-8"
    >
      <GameInfo roomId={roomId} />
      <GameControls roomId={roomId} />
    </motion.div>
  );
};

// Overlays Component
const GameOverlays: React.FC<GameOverlaysProps> = ({
  statusMessage,
  isPhaseTransitioning,
  phaseTransitionMessage,
}) => (
  <>
    <AnimatePresence>
      {statusMessage && <StatusUpdateLoader message={statusMessage} />}
    </AnimatePresence>

    {isPhaseTransitioning && (
      <PhaseTransitionLoader message={phaseTransitionMessage} />
    )}
  </>
);

// Main content component
function GameRoomContentInner() {
  const { mode } = useParams();
  const router = useRouter();
  const { recordMove } = useReplay();

  // Game state from Zustand store
  const {
    roomId,
    currentRoom,
    players,
    isLoading,
    gameStatus: storeGameStatus,
    startGame,
    selectTrump,
    playCard,
    placeBid,
    addBots,
    statusMessage,
    isAddingBots,
    isGameBoardReady,
    isPhaseTransitioning,
    showShuffleAnimation,
    initialCardsDeal,
    phaseTransitionMessage,
    setIsAddingBots,
    setInitialCardsDeal,
    setShowShuffleAnimation,
    setIsPhaseTransitioning,
    setIsGameBoardReady,
    setGameStatus,
    setStatusMessage,
    setPhaseTransitionMessage,
  } = useGameStore();

  // Auth state from Zustand store
  const { user } = useAuthStore();

  // UI state from Zustand store
  const { showLoginModal, showTrumpPopup, setShowLoginModal } = useUIStore();

  // Replace the mock trump votes state with our Supabase Realtime implementation
  const {
    trumpVotes,
    userVote,
    votingComplete,
    handleVote,
    handleForceBotVotes: forceBotVotes,
  } = useSupabaseTrumpVoting(currentRoom, roomId as string, user?.id);

  // Local component state
  const [isStartingGame, setIsStartingGame] = useState(false);

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
  };

  // Wrapper for trump vote function to match expected signature and handle UI state
  const handleTrumpVote = (suit: string) => {
    if (votingComplete) return;

    setStatusMessage(`Voting for ${suit}...`);

    // Call our Supabase voting handler (cast as Suit type)
    handleVote(suit as any);

    // Also update game state through Zustand
    // selectTrump(suit as any);

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
    // Define a mock hand for testing - ONLY 5 CARDS for initial deal
    const mockHand = [
      { id: 1, suit: "hearts", value: "A" },
      { id: 2, suit: "spades", value: "K" },
      { id: 3, suit: "diamonds", value: "Q" },
      { id: 4, suit: "clubs", value: "J" },
      { id: 5, suit: "hearts", value: "10" },
    ];

    // For debugging during development, just use the mock hand to ensure we have cards
    return mockHand;
  }, [currentRoom?.players, user]);

  // Set game board as ready after a delay when loading completes
  useEffect(() => {
    if (
      currentRoom &&
      !isLoading &&
      !isGameBoardReady &&
      !isPhaseTransitioning &&
      storeGameStatus !== "waiting"
    ) {
      const timer = setTimeout(() => {
        setIsGameBoardReady(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, currentRoom, isGameBoardReady, setIsGameBoardReady]);

  // Handle shuffle animation completion
  const handleShuffleComplete = () => {
    setShowShuffleAnimation(false);
    console.log("[GameRoom] Shuffle animation completed");
    setGameStatus("bidding");
  };

  // If user is not logged in, show login modal
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />
        <GameBackground />
        <div className="container mx-auto px-4 py-8">
          <WaitingRoomSkeleton />
        </div>
        <LoginModal isOpen={showLoginModal} onClose={() => router.push("/")} />
      </div>
    );
  }

  if (isLoading || !currentRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />
        <GameBackground />
        <div className="container mx-auto px-4 py-8">
          <WaitingRoomSkeleton />
        </div>
      </div>
    );
  }

  if (storeGameStatus === "waiting") {
    console.log("Waiting room status : ", currentRoom);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <VisualEffects enableGrain />
        <GameBackground />

        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">{storeGameStatus}</h1>
          <WaitingRoomSection
            roomId={roomId || ""}
            players={players}
            currentRoom={currentRoom}
            isCurrentUserHost={isCurrentUserHost}
            isAddingBots={isAddingBots}
            isStartingGame={isStartingGame}
            handleAddBots={handleAddBots}
            handleStartGame={handleStartGame}
          />
        </div>
      </div>
    );
  }

  if (storeGameStatus === "initial_deal") {
    console.log("Initial deal room status : ", currentRoom);
    console.log("Initial deal room status : ", storeGameStatus);

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />
        <GameBackground />

        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">{storeGameStatus}</h1>
          {showShuffleAnimation && (
            <CardShuffleAnimation onComplete={handleShuffleComplete} />
          )}
          <GameBoardSkeleton />;
        </div>
      </div>
    );
  }

  if (storeGameStatus === "bidding") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />
        <GameBackground />

        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">{storeGameStatus}</h1>
          <TrumpSelectionPopup
            onVote={handleTrumpVote}
            userVote={userVote}
            trumpVotes={trumpVotes}
            votingComplete={votingComplete}
            playerHand={playerHand}
            isOpen={showTrumpPopup}
            onForceBotVotes={forceBotVotes}
            isCurrentUserHost={isCurrentUserHost}
          />
          <GameBoardSkeleton />;
          <GameOverlays
            statusMessage={statusMessage}
            isPhaseTransitioning={isPhaseTransitioning}
            phaseTransitionMessage={phaseTransitionMessage}
          />
        </div>
      </div>
    );
  }

  if (storeGameStatus === "final_deal") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <VisualEffects enableGrain />
        <GameBackground />

        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-4">{storeGameStatus}</h1>

          <FinalDealSection
            roomId={roomId || ""}
            mode={(mode as string) || "classic"}
            players={players}
            currentRoom={currentRoom}
            gameStatus={storeGameStatus}
            showShuffleAnimation={showShuffleAnimation}
            setShowShuffleAnimation={setShowShuffleAnimation}
            recordMove={recordMove}
            handlePlayCard={handlePlayCard}
            handleBid={handleBid}
            isGameBoardReady={isGameBoardReady}
          />

          <GameOverlays
            statusMessage={statusMessage}
            isPhaseTransitioning={isPhaseTransitioning}
            phaseTransitionMessage={phaseTransitionMessage}
          />
        </div>
      </div>
    );
  }

  // Render the main game content
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <VisualEffects enableGrain />
      <GameBackground />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">{storeGameStatus}</h1>

        {(storeGameStatus === "playing" || storeGameStatus === "ended") && (
          <GameBoardWrapper
            roomId={roomId || ""}
            mode={(mode as string) || "classic"}
            players={players}
            currentRoom={currentRoom}
            gameStatus={storeGameStatus}
            initialCardsDeal={initialCardsDeal}
            recordMove={recordMove}
            handlePlayCard={handlePlayCard}
            handleBid={handleBid}
            isGameBoardReady={isGameBoardReady}
          />
        )}

        <GameOverlays
          statusMessage={statusMessage}
          isPhaseTransitioning={isPhaseTransitioning}
          phaseTransitionMessage={phaseTransitionMessage}
        />
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
