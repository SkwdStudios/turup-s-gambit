import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRealtimeGameState } from "./use-realtime-game-state";
import { useSupabaseAuth } from "./use-supabase-auth";
import {
  setGameFlowState,
  setUIReadyState,
  executeWhenUIReady,
  scheduleIfStateUnchanged,
} from "@/lib/game-flow-manager";
import { triggerBotVoting } from "@/app/game/[roomId]/bot-voting-helper";
import { GameRoom, Player } from "@/app/types/game";

export type GameMode = "classic" | "frenzy";
export type GameStatus =
  | "waiting"
  | "initial_deal"
  | "bidding"
  | "final_deal"
  | "playing"
  | "ended";

export interface GameRoomState {
  showReplay: boolean;
  gameStatus: GameStatus;
  showLoginModal: boolean;
  showShuffleAnimation: boolean;
  initialCardsDeal: boolean;
  isLoading: boolean;
  isAddingBots: boolean;
  statusMessage: string | null;
  gameMode: GameMode;
  players: string[];
  gameState: GameRoom | null;
  isCurrentUserHost: boolean;
  handleStartGame: () => void;
  handleTrumpVote: (suit: string) => void;
  handlePlayCard: (card: any) => void;
  setIsAddingBots: (value: boolean) => void;
  setStatusMessage: (message: string | null) => void;
  safeSendMessage: (message: any) => boolean;
}

export function useGameRoomState(): GameRoomState {
  const searchParams = useSearchParams();
  const { roomId } = useParams<{ roomId: string }>();
  const mode = searchParams?.get("mode") || "classic";
  const { user } = useSupabaseAuth();
  const {
    currentRoom,
    players,
    isConnected,
    startGame,
    playCard,
    placeBid,
    selectTrump,
    sendMessage,
  } = useRealtimeGameState();

  // Game state
  const [showReplay, setShowReplay] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>("waiting");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showShuffleAnimation, setShowShuffleAnimation] = useState(false);
  const [initialCardsDeal, setInitialCardsDeal] = useState(false);
  const [showTrumpPopup, setShowTrumpPopup] = useState(false);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [votingComplete, setVotingComplete] = useState(false);
  const [trumpSuit, setTrumpSuit] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isAddingBots, setIsAddingBots] = useState(false);
  const [isCurrentUserHost, setIsCurrentUserHost] = useState(false);
  const [isPhaseTransitioning, setIsPhaseTransitioning] = useState(false);
  const [phaseTransitionMessage, setPhaseTransitionMessage] = useState("");
  const [isGameBoardReady, setIsGameBoardReady] = useState(false);

  // Safe message sender
  const safeSendMessage = (message: any) => {
    try {
      sendMessage(message);
      return true;
    } catch (error) {
      console.error("[Safe Send] Error sending message:", error);
      return false;
    }
  };

  // Handle loading state
  useEffect(() => {
    setGameFlowState("initializing");
    setUIReadyState(false);

    if (isConnected && currentRoom) {
      console.log("[Game Board] Connection and room data available");
      setGameFlowState("waiting");

      const loadingTimer = setTimeout(() => {
        setIsLoading(false);
        console.log("[Game Board] Loading set to false");

        const readyTimer = setTimeout(() => {
          console.log("[Game Board] Setting game board as ready");
          setIsGameBoardReady(true);
          setUIReadyState(true);
        }, 1500);

        return () => {
          clearTimeout(readyTimer);
          setUIReadyState(false);
        };
      }, 800);

      return () => {
        clearTimeout(loadingTimer);
        setUIReadyState(false);
      };
    }

    return () => {
      setUIReadyState(false);
      setGameFlowState("initializing");
    };
  }, [isConnected, currentRoom]);

  // Handle game state changes
  useEffect(() => {
    if (currentRoom) {
      switch (currentRoom.gameState.gamePhase) {
        case "initial_deal":
          handleInitialDealPhase();
          break;
        case "bidding":
          handleBiddingPhase();
          break;
        case "final_deal":
          handleFinalDealPhase();
          break;
        case "playing":
          handlePlayingPhase();
          break;
        case "finished":
          handleFinishedPhase();
          break;
        default:
          setGameStatus("waiting");
          setGameFlowState("waiting");
      }

      if (currentRoom.gameState.trumpSuit) {
        setTrumpSuit(currentRoom.gameState.trumpSuit);
        setStatusMessage(
          `Trump suit selected: ${currentRoom.gameState.trumpSuit}`
        );
        setTimeout(() => setStatusMessage(null), 2000);
      }
    }
  }, [currentRoom]);

  // Phase handlers
  const handleInitialDealPhase = () => {
    setGameStatus("initial_deal");
    setStatusMessage("Initial cards dealt. Select trump suit...");
    setInitialCardsDeal(true);
    setGameFlowState("trump_selection");
    setShowTrumpPopup(false);

    executeWhenUIReady(() => {
      console.log("[Game] UI is ready, showing trump popup");
      setShowTrumpPopup(true);
    }, 10000);

    setTimeout(() => setStatusMessage(null), 2000);

    scheduleIfStateUnchanged(
      () => {
        if (!votingComplete) {
          try {
            triggerBotVoting(
              currentRoom || undefined,
              roomId,
              safeSendMessage,
              { complete: votingComplete },
              (updater) => {
                const newState = updater({ complete: votingComplete });
                setVotingComplete(newState.complete);
              },
              votingComplete
            );
          } catch (error) {
            console.error("[Game] Error triggering bot voting:", error);
          }
        }
      },
      3000,
      "trump_selection"
    );
  };

  const handleBiddingPhase = () => {
    setGameStatus("bidding");
    setStatusMessage("Trump suit selected. Dealing remaining cards...");
    setGameFlowState("dealing");
    setIsPhaseTransitioning(true);
    setPhaseTransitionMessage(
      "Trump suit selected! Dealing remaining cards..."
    );

    setTimeout(() => {
      setIsPhaseTransitioning(false);
      setStatusMessage(null);
    }, 2000);
  };

  const handleFinalDealPhase = () => {
    setGameStatus("final_deal");
    setInitialCardsDeal(false);
    setStatusMessage("All cards dealt. Game will start soon...");
    setGameFlowState("preparing");
    setIsPhaseTransitioning(true);
    setPhaseTransitionMessage("All cards dealt! Game will start soon...");

    setTimeout(() => {
      setIsPhaseTransitioning(false);
      setStatusMessage(null);
    }, 2000);
  };

  const handlePlayingPhase = () => {
    setGameStatus("playing");
    setInitialCardsDeal(false);
    setGameFlowState("playing");
    setIsPhaseTransitioning(true);
    setPhaseTransitionMessage("Game is starting! Get ready to play...");

    if (showTrumpPopup) {
      setShowTrumpPopup(false);
      setVotingComplete(false);
      setUserVote(null);
    }

    setStatusMessage("Game started! Your turn to play...");

    setTimeout(() => {
      setIsPhaseTransitioning(false);
      setStatusMessage(null);
    }, 2500);
  };

  const handleFinishedPhase = () => {
    setGameStatus("ended");
    setStatusMessage("Game ended");
    setGameFlowState("game_end");
    setTimeout(() => setStatusMessage(null), 2000);
  };

  // Game actions
  const handleStartGame = () => {
    if (isStartingGame) return;

    setIsStartingGame(true);
    setStatusMessage("Starting game...");
    setGameFlowState("preparing");

    setTimeout(() => {
      startGame();
      setShowShuffleAnimation(true);
      setGameStatus("initial_deal");

      setTimeout(() => {
        setStatusMessage(null);
        setIsStartingGame(false);
      }, 2000);
    }, 800);
  };

  const handleTrumpVote = (suit: string) => {
    if (userVote || votingComplete) return;

    setIsPhaseTransitioning(true);
    setPhaseTransitionMessage(`Voting for ${suit}...`);
    setStatusMessage(`Voting for ${suit}...`);
    setUserVote(suit);

    const currentPlayer = currentRoom?.players.find(
      (p) =>
        p.name === user?.username ||
        p.name === user?.name ||
        (user?.email && p.name === user?.email.split("@")[0])
    );

    if (currentPlayer?.id) {
      try {
        safeSendMessage({
          type: "game:select-trump",
          payload: { roomId, suit, playerId: currentPlayer.id },
        });
      } catch (error) {
        console.error("[Trump Vote] Error sending player vote:", error);
        selectTrump(suit);
      }
    } else {
      selectTrump(suit);
    }

    setTimeout(() => {
      setIsPhaseTransitioning(false);
      setStatusMessage(null);
    }, 2000);
  };

  const handlePlayCard = (card: any) => {
    if (!currentRoom) {
      setStatusMessage("Error: No room data available");
      setTimeout(() => setStatusMessage(null), 2000);
      return;
    }

    if (currentRoom.gameState.gamePhase !== "playing") {
      setStatusMessage(
        `Error: Cannot play card in ${currentRoom.gameState.gamePhase} phase`
      );
      setTimeout(() => setStatusMessage(null), 2000);
      return;
    }

    const currentPlayer = currentRoom.players.find(
      (p) =>
        p.name === user?.username ||
        p.name === user?.name ||
        (user?.email && p.name === user?.email.split("@")[0])
    );

    if (!currentPlayer?.id) {
      setStatusMessage("Error: Could not determine player ID");
      setTimeout(() => setStatusMessage(null), 2000);
      return;
    }

    setStatusMessage("Playing card...");
    try {
      playCard(card);
      setTimeout(() => setStatusMessage(null), 1500);
    } catch (error: unknown) {
      console.error("[Game] Error playing card:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setStatusMessage(`Error playing card: ${errorMessage}`);
      setTimeout(() => setStatusMessage(null), 2000);
    }
  };

  return {
    showReplay,
    gameStatus,
    showLoginModal,
    showShuffleAnimation,
    initialCardsDeal,
    isLoading,
    isAddingBots,
    statusMessage,
    gameMode: mode as GameMode,
    players,
    gameState: currentRoom,
    isCurrentUserHost,
    handleStartGame,
    handleTrumpVote,
    handlePlayCard,
    setIsAddingBots,
    setStatusMessage,
    safeSendMessage,
  };
}
