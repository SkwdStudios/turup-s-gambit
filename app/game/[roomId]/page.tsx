"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  triggerBotVoting,
  forceAllBotsToVote,
  detectBotsByName,
  resetBotVotesTracking, // Added import here
} from "./bot-voting-helper";
import { Button } from "@/components/ui/button";
import { GameBoard } from "@/components/game-board";
import { TrumpBidding } from "@/components/trump-bidding";
import { TrumpSelectionPopup } from "@/components/trump-selection-popup";
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
import { motion, AnimatePresence } from "framer-motion";
import {
  RealtimeGameStateProvider,
  useRealtimeGameState,
} from "@/hooks/use-realtime-game-state";
import { WaitingRoomSkeleton } from "@/components/waiting-room-skeleton";
import { GameInfoSkeleton } from "@/components/game-info-skeleton";
import { GameControlsSkeleton } from "@/components/game-controls-skeleton";
import { GameBoardSkeleton } from "@/components/game-board-skeleton";
import { StatusUpdateLoader } from "@/components/status-update-loader";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { GameLoader, PhaseTransitionLoader } from "@/components/game-loader";

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

  const [showReplay, setShowReplay] = useState(false);
  const [gameStatus, setGameStatus] = useState<
    "waiting" | "initial_deal" | "bidding" | "final_deal" | "playing" | "ended"
  >("waiting");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showShuffleAnimation, setShowShuffleAnimation] = useState(false);
  const [initialCardsDeal, setInitialCardsDeal] = useState(false);
  const [showTrumpPopup, setShowTrumpPopup] = useState(false);
  const [trumpVotes, setTrumpVotes] = useState<Record<string, number>>({
    hearts: 0,
    diamonds: 0,
    clubs: 0,
    spades: 0,
  });
  const [userVote, setUserVote] = useState<string | null>(null);
  const [votingComplete, setVotingComplete] = useState(false);
  const [trumpSuit, setTrumpSuit] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [isAddingBots, setIsAddingBots] = useState(false);
  const [isCurrentUserHost, setIsCurrentUserHost] = useState(false);

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
    sendMessage,
  } = useRealtimeGameState();

  // Check if all players have joined
  const allPlayersJoined = players.length === 4;

  useEffect(() => {
    if (!user) {
      setShowLoginModal(true);
    }
  }, [user]);

  // Track phase transitions for loading states
  const [isPhaseTransitioning, setIsPhaseTransitioning] = useState(false);
  const [phaseTransitionMessage, setPhaseTransitionMessage] = useState("");
  const [isGameBoardReady, setIsGameBoardReady] = useState(false);

  // Handle loading state
  useEffect(() => {
    // Set loading to false when we have connection and room data
    if (isConnected && currentRoom) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsLoading(false);
        // Set game board as ready after a short delay
        setTimeout(() => {
          setIsGameBoardReady(true);
        }, 500);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [isConnected, currentRoom]);

  // Check if current user is the host
  useEffect(() => {
    if (currentRoom && user) {
      // Find the current user in the players list
      // First try to match by username
      let currentPlayer = currentRoom.players.find(
        (p) => p.name === user.username
      );

      // If not found, try to match by name
      if (!currentPlayer) {
        currentPlayer = currentRoom.players.find((p) => p.name === user.name);
      }

      // If still not found, try to match by email prefix
      if (!currentPlayer && user.email) {
        currentPlayer = currentRoom.players.find(
          (p) => p.name === user.email?.split("@")[0]
        );
      }

      // If still not found, try to match by the current player name in the room
      if (!currentPlayer && players.length > 0) {
        currentPlayer = currentRoom.players.find((p) => p.name === players[0]);
      }

      // Debug info
      console.log("Current user:", user);
      console.log("Current room players:", currentRoom.players);
      console.log("Current player found:", currentPlayer);
      console.log("Is host?", currentPlayer?.isHost);

      // Set host status
      if (currentPlayer) {
        console.log("Setting host status to:", currentPlayer.isHost);
        setIsCurrentUserHost(currentPlayer.isHost || false);
      } else {
        // If we can't find the current player but this is the first player in the room
        // and there's no host, make them the host
        if (
          currentRoom.players.length > 0 &&
          !currentRoom.players.some((p) => p.isHost)
        ) {
          console.log("No host found in room, setting first player as host");
          setIsCurrentUserHost(true);
        }
      }
    }
  }, [currentRoom, user, players]);

  // Track which bots have already voted
  const [botVotes, setBotVotes] = useState<Record<string, boolean>>({});

  // Handle game state changes based on currentRoom
  useEffect(() => {
    if (currentRoom) {
      // Reset bot voting state when game phase changes from initial_deal
      if (currentRoom.gameState.gamePhase !== "initial_deal") {
        // Import and call resetBotVotesTracking from bot-voting-helper
        try {
          // Removed require call: const { resetBotVotesTracking } = require("./bot-voting-helper");
          resetBotVotesTracking(); // Use imported function directly
          console.log("[Game] Reset bot votes tracking due to phase change");
        } catch (error) {
          console.error("[Game] Error resetting bot votes tracking:", error);
        }
      }

      // Update game status based on room state
      switch (currentRoom.gameState.gamePhase) {
        case "initial_deal":
          setGameStatus("initial_deal");
          setStatusMessage("Initial cards dealt. Select trump suit...");
          setInitialCardsDeal(true);
          setShowTrumpPopup(true);
          setTimeout(() => setStatusMessage(null), 2000);

          // Trigger bot voting with a slight delay to ensure UI is ready
          setTimeout(() => {
            // Only trigger bot voting if we're still in initial_deal phase
            if (
              currentRoom.gameState.gamePhase === "initial_deal" &&
              !votingComplete
            ) {
              console.log(
                "[Game] Triggering bot voting from initial_deal case"
              );
              try {
                triggerBotVoting(
                  currentRoom,
                  roomId,
                  safeSendMessage, // Use safe version
                  botVotes,
                  setBotVotes,
                  votingComplete
                );
              } catch (error) {
                console.error("[Game] Error triggering bot voting:", error);
              }
            } else {
              console.log(
                `[Game] Skipping bot voting - phase: ${currentRoom.gameState.gamePhase}, votingComplete: ${votingComplete}`
              );
            }
          }, 1000);
          break;

        case "bidding":
          setGameStatus("bidding");
          setStatusMessage("Trump suit selected. Dealing remaining cards...");

          // Show phase transition loader
          setIsPhaseTransitioning(true);
          setPhaseTransitionMessage(
            "Trump suit selected! Dealing remaining cards..."
          );

          // Hide the loader after a delay
          setTimeout(() => {
            setIsPhaseTransitioning(false);
            setStatusMessage(null);
          }, 2000);

          // No bot voting in bidding phase - bots vote in initial_deal phase
          break;

        case "final_deal":
          setGameStatus("final_deal");
          setInitialCardsDeal(false); // Show all 13 cards
          setStatusMessage("All cards dealt. Game will start soon...");

          // Show phase transition loader
          setIsPhaseTransitioning(true);
          setPhaseTransitionMessage("All cards dealt! Game will start soon...");

          // Hide the loader after a delay
          setTimeout(() => {
            setIsPhaseTransitioning(false);
            setStatusMessage(null);
          }, 2000);
          break;

        case "playing":
          setGameStatus("playing");
          setInitialCardsDeal(false); // Show all 13 cards

          // Show phase transition loader
          setIsPhaseTransitioning(true);
          setPhaseTransitionMessage("Game is starting! Get ready to play...");

          // Hide the trump popup if it's still showing
          if (showTrumpPopup) {
            setShowTrumpPopup(false);
            setVotingComplete(false);
            setUserVote(null);
            setBotVotes({});
          }

          setStatusMessage("Game started! Your turn to play...");

          // Log the transition to playing phase
          console.log("[Game] Transitioning to playing phase", {
            trumpSuit: currentRoom.gameState.trumpSuit,
            players: currentRoom.players,
            hand: currentRoom.players.find(
              (p) =>
                p.name === user?.username ||
                p.name === user?.name ||
                (user?.email && p.name === user?.email.split("@")[0])
            )?.hand,
          });

          // Hide the loader after a delay
          setTimeout(() => {
            setIsPhaseTransitioning(false);
            setStatusMessage(null);
          }, 2500);
          break;

        case "finished":
          setGameStatus("ended");
          setStatusMessage("Game ended");
          setTimeout(() => setStatusMessage(null), 2000);
          break;

        default:
          // Default to waiting
          setGameStatus("waiting");
      }

      // Update trump suit if available
      if (currentRoom.gameState.trumpSuit) {
        setTrumpSuit(currentRoom.gameState.trumpSuit);
        setStatusMessage(
          `Trump suit selected: ${currentRoom.gameState.trumpSuit}`
        );

        // Close the trump popup when trump is selected
        if (currentRoom.gameState.gamePhase === "bidding") {
          setTimeout(() => {
            setShowTrumpPopup(false);
          }, 3000);
        }

        setTimeout(() => setStatusMessage(null), 2000);
      }
    }
  }, [currentRoom, roomId, sendMessage, votingComplete, botVotes]);
  // Handle game start
  function handleStartGame() {
    if (isStartingGame) return;

    setIsStartingGame(true);
    setStatusMessage("Starting game...");

    // Add a slight delay to show the loading state
    setTimeout(() => {
      startGame();

      // Show shuffle animation
      setShowShuffleAnimation(true);
      setGameStatus("initial_deal");

      // Clear status message after a delay
      setTimeout(() => {
        setStatusMessage(null);
        setIsStartingGame(false);
      }, 2000);
    }, 800);
  }

  // Listen for trump vote messages
  useEffect(() => {
    // Set up a listener for the trump-vote message
    const handleTrumpVoteMessage = (event: any) => {
      // Check if this is a message event with data
      if (!event.data) return;

      // Try to parse the message data
      try {
        const message =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        // Check if this is a trump-vote message
        if (message.type === "game:trump-vote") {
          const { suit, botId, playerId } = message.payload;
          console.log(
            `[Trump Vote] Received vote for ${suit}`,
            botId ? `from bot ${botId}` : `from player ${playerId}`
          );

          // Update the vote count
          setTrumpVotes((prev) => {
            const newVotes = {
              ...prev,
              [suit]: (prev[suit] || 0) + 1,
            };
            console.log(`[Trump Vote] Updated vote counts:`, newVotes);
            return newVotes;
          });

          // If this is a bot vote, mark it as voted
          if (botId) {
            setBotVotes((prev) => {
              const newBotVotes = {
                ...prev,
                [botId]: true,
              };
              console.log(`[Trump Vote] Updated bot votes:`, newBotVotes);
              return newBotVotes;
            });
          }

          // Calculate total votes properly
          setTimeout(() => {
            setTrumpVotes((currentVotes) => {
              const totalVotes = Object.values(currentVotes).reduce(
                (sum, count) => sum + (count as number),
                0
              );

              console.log(
                `[Trump Vote] Total votes: ${totalVotes}, Players: ${
                  currentRoom?.players.length || 0
                }`
              );

              // Check if all players have voted
              if (totalVotes >= (currentRoom?.players.length || 0)) {
                console.log(
                  `[Trump Vote] All players have voted, marking voting as complete`
                );
                setVotingComplete(true);
              }

              return currentVotes; // Return unchanged state
            });
          }, 100);
        }
      } catch (error) {
        console.error("[Trump Vote] Error handling message:", error);
      }
    };

    // Add the event listener
    if (isConnected && currentRoom) {
      console.log("[Trump Vote] Setting up message event listener");
      window.addEventListener("message", handleTrumpVoteMessage);

      // Trigger bot voting after a short delay
      setTimeout(() => {
        // Only trigger bot voting if we're in initial_deal phase and voting isn't complete
        if (
          currentRoom.gameState.gamePhase === "initial_deal" &&
          !votingComplete
        ) {
          console.log("[Trump Vote] Triggering initial bot voting");
          try {
            triggerBotVoting(
              currentRoom,
              roomId,
              safeSendMessage, // Use safe version
              botVotes,
              setBotVotes,
              votingComplete
            );
          } catch (error) {
            console.error("[Trump Vote] Error triggering bot voting:", error);
          }
        } else {
          console.log(
            `[Trump Vote] Skipping bot voting - phase: ${currentRoom.gameState.gamePhase}, votingComplete: ${votingComplete}`
          );
        }
      }, 2000);
    }

    return () => {
      console.log("[Trump Vote] Removing message event listener");
      window.removeEventListener("message", handleTrumpVoteMessage);
    };
  }, [isConnected, currentRoom, roomId, sendMessage, botVotes, votingComplete]);

  // Handle trump voting
  const handleTrumpVote = (suit: string) => {
    if (userVote || votingComplete) return;

    // Show loading state
    setIsPhaseTransitioning(true);
    setPhaseTransitionMessage(`Voting for ${suit}...`);
    setStatusMessage(`Voting for ${suit}...`);
    setUserVote(suit);

    // Get the current user's player ID
    let currentPlayerId = null;
    if (currentRoom && user) {
      // Find the current user in the players list
      const currentPlayer = currentRoom.players.find(
        (p) =>
          p.name === user.username ||
          p.name === user.name ||
          (user.email && p.name === user.email.split("@")[0])
      );

      if (currentPlayer) {
        currentPlayerId = currentPlayer.id;
      }
    }

    // Send the vote with the player ID
    if (currentPlayerId) {
      try {
        safeSendMessage({
          type: "game:select-trump",
          payload: { roomId, suit, playerId: currentPlayerId },
        });
      } catch (error) {
        console.error("[Trump Vote] Error sending player vote:", error);
        // Fallback to the old method if sending fails
        selectTrump(suit);
      }
    } else {
      // Fallback to the old method if we can't find the player ID
      selectTrump(suit);
    }

    // Update local vote count
    setTrumpVotes((prev) => ({
      ...prev,
      [suit]: prev[suit] + 1,
    }));

    // Clear status message and hide loader after a delay
    setTimeout(() => {
      setIsPhaseTransitioning(false);
      setStatusMessage(null);
    }, 2000);
  };

  // Create a safe version of sendMessage that handles errors
  const safeSendMessage = (message: any) => {
    try {
      sendMessage(message);
      return true;
    } catch (error) {
      console.error("[Safe Send] Error sending message:", error, message);
      // Don't show an alert for every error to avoid spamming the user
      return false;
    }
  };

  // Handle forcing bot votes
  const handleForceBotVotes = () => {
    if (!currentRoom) {
      setStatusMessage("Error: No room data available");
      setTimeout(() => setStatusMessage(null), 2000);
      return;
    }

    // Check if we're in the right game phase
    if (currentRoom.gameState.gamePhase !== "initial_deal") {
      setStatusMessage(
        `Error: Cannot vote in ${currentRoom.gameState.gamePhase} phase`
      );
      setTimeout(() => setStatusMessage(null), 2000);
      return;
    }

    // Debug: Log all players and their isBot status
    console.log(
      "[Debug] All players in room:",
      currentRoom.players.map((p) => ({
        name: p.name,
        id: p.id,
        isBot: p.isBot || false,
      }))
    );

    // Count bot players
    const botPlayers = currentRoom.players.filter((p) => p.isBot);
    console.log(
      `[Debug] Found ${botPlayers.length} bot players:`,
      botPlayers.map((p) => ({ name: p.name, id: p.id }))
    );

    // If no bots found by isBot property, try detecting by name
    if (botPlayers.length === 0) {
      console.log(
        `[Debug] No bots found by isBot property, trying name detection`
      );
      const detectedBots = detectBotsByName(currentRoom.players);
      console.log(
        `[Debug] Name detection found ${detectedBots.length} potential bots:`,
        detectedBots.map((p) => ({ name: p.name, id: p.id }))
      );

      if (detectedBots.length === 0) {
        setStatusMessage("Error: No bot players found");
        setTimeout(() => setStatusMessage(null), 2000);
        return;
      }
    }

    // Check which bots have already voted
    const playersVoted = currentRoom.gameState.playersVoted || [];
    console.log(`[Debug] Players who have already voted:`, playersVoted);

    setStatusMessage("Forcing bots to vote...");

    try {
      // Force all bots to vote with the safe message sender
      forceAllBotsToVote(currentRoom, roomId, safeSendMessage);

      // Clear status message after a delay
      setTimeout(() => setStatusMessage(null), 2000);
    } catch (error) {
      console.error("[Debug] Error forcing bot votes:", error);
      setStatusMessage(
        `Error: ${error.message || "Failed to force bot votes"}`
      );
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  function handlePlayCard(card: Card) {
    if (!currentRoom) {
      setStatusMessage("Error: No room data available");
      setTimeout(() => setStatusMessage(null), 2000);
      return;
    }

    // Check if we're in the right game phase
    if (currentRoom.gameState.gamePhase !== "playing") {
      setStatusMessage(
        `Error: Cannot play card in ${currentRoom.gameState.gamePhase} phase`
      );
      setTimeout(() => setStatusMessage(null), 2000);
      return;
    }

    // Get the current user's player ID
    let currentPlayerId = null;
    if (currentRoom && user) {
      // Find the current user in the players list
      const currentPlayer = currentRoom.players.find(
        (p) =>
          p.name === user.username ||
          p.name === user.name ||
          (user.email && p.name === user.email.split("@")[0])
      );

      if (currentPlayer) {
        currentPlayerId = currentPlayer.id;
      }
    }

    if (!currentPlayerId) {
      setStatusMessage("Error: Could not determine player ID");
      setTimeout(() => setStatusMessage(null), 2000);
      return;
    }

    setStatusMessage("Playing card...");
    console.log(`[Game] Playing card for player ${currentPlayerId}:`, card);

    try {
      // Use the playCard function from the game state context
      playCard(card);
      setTimeout(() => setStatusMessage(null), 1500);
    } catch (error) {
      console.error("[Game] Error playing card:", error);
      setStatusMessage(
        `Error playing card: ${error.message || "Unknown error"}`
      );
      setTimeout(() => setStatusMessage(null), 2000);
    }
  }

  function handleBid(bid: number) {
    setStatusMessage(`Placing bid: ${bid}`);
    placeBid(bid);
    setTimeout(() => setStatusMessage(null), 1500);
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

  // Handle adding bots to the game
  function handleAddBots() {
    // Double-check that the current user is the host
    if (isAddingBots) return;

    // Force check if the current user is the host
    const isHost = currentRoom?.players.some(
      (p) =>
        (p.name === user?.name ||
          p.name === user?.username ||
          p.name === user?.email?.split("@")[0]) &&
        p.isHost
    );

    console.log("Direct host check:", isHost);

    if (!isHost && !isCurrentUserHost) {
      console.log("User is not the host, cannot add bots");
      return;
    }

    setIsAddingBots(true);
    setStatusMessage("Adding bot players...");

    // Calculate how many bots we need to add
    const botsNeeded = 4 - players.length;

    if (botsNeeded <= 0) {
      setIsAddingBots(false);
      setStatusMessage("Room is already full!");
      setTimeout(() => setStatusMessage(null), 2000);
      return;
    }

    // Add bots one by one with a slight delay between each
    const botNames = [
      "Sir Lancelot",
      "Lady Guinevere",
      "Sir Galahad",
      "Merlin",
      "King Arthur",
      "Queen Morgana",
    ];

    // Shuffle the bot names to get random ones each time
    const shuffledBotNames = [...botNames].sort(() => Math.random() - 0.5);

    // Add bots with a delay between each
    for (let i = 0; i < botsNeeded; i++) {
      setTimeout(() => {
        const botName = shuffledBotNames[i % shuffledBotNames.length];

        // Send player:joined message for the bot
        sendMessage({
          type: "player:joined",
          payload: {
            playerName: botName,
            roomId,
            isBot: true,
          },
        });

        // If this is the last bot, clear the loading state
        if (i === botsNeeded - 1) {
          setTimeout(() => {
            setIsAddingBots(false);
            setStatusMessage("Bots added successfully!");
            setTimeout(() => setStatusMessage(null), 2000);
          }, 500);
        }
      }, i * 800); // Add each bot with a delay
    }
  }

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
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                            className="flex flex-col items-center gap-1"
                          >
                            <span className="font-medieval">
                              {currentRoom?.players.find(
                                (p) => p.name === players[index]
                              )?.name || players[index]}
                            </span>
                            <div className="flex flex-col items-center">
                              {currentRoom?.players.find(
                                (p) => p.name === players[index]
                              )?.isHost && (
                                <span className="text-xs text-primary">
                                  Host
                                </span>
                              )}
                              {currentRoom?.players.find(
                                (p) => p.name === players[index]
                              )?.isBot && (
                                <span className="text-xs text-secondary flex items-center gap-1">
                                  <span className="inline-block h-2 w-2 rounded-full bg-secondary animate-pulse"></span>
                                  Bot
                                </span>
                              )}
                            </div>
                          </motion.div>
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
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="mt-4 flex flex-col gap-2"
                  >
                    <p className="text-sm text-muted-foreground">
                      {players.length}/4 players joined
                    </p>
                    <div className="space-y-2">
                      {/* Debug info */}
                      {console.log(
                        "Rendering buttons - isCurrentUserHost:",
                        isCurrentUserHost
                      )}
                      {console.log("allPlayersJoined:", allPlayersJoined)}
                      {console.log("players.length:", players.length)}

                      {/* Debug button - only visible in development */}
                      {process.env.NODE_ENV === "development" && (
                        <Button
                          className="w-full medieval-button bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center gap-2 mb-2"
                          onClick={() => {
                            console.log("Debug: Force host status");
                            setIsCurrentUserHost(true);
                          }}
                        >
                          Debug: Force Host Status
                        </Button>
                      )}

                      {/* Fill with Bots button - only visible to host when not all players have joined */}
                      {isCurrentUserHost &&
                      !allPlayersJoined &&
                      players.length < 4 ? (
                        <Button
                          className="w-full medieval-button bg-secondary hover:bg-secondary/90 text-secondary-foreground flex items-center justify-center gap-2"
                          onClick={handleAddBots}
                          disabled={isAddingBots}
                        >
                          {isAddingBots ? (
                            <>
                              <LoadingSpinner size="sm" />
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                              >
                                Adding Bots...
                              </motion.span>
                            </>
                          ) : (
                            "Fill with Bots"
                          )}
                        </Button>
                      ) : (
                        <div className="hidden">
                          {console.log(
                            "Fill with Bots button not shown because:",
                            !isCurrentUserHost
                              ? "Not host"
                              : allPlayersJoined
                              ? "All players joined"
                              : players.length >= 4
                              ? "Room is full"
                              : "Unknown reason"
                          )}
                        </div>
                      )}

                      {/* Start Game button - only visible when all players have joined */}
                      {allPlayersJoined && (
                        <Button
                          className="w-full medieval-button bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-2"
                          onClick={handleStartGame}
                          disabled={isStartingGame}
                        >
                          {isStartingGame ? (
                            <>
                              <LoadingSpinner size="sm" />
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                              >
                                Starting Game...
                              </motion.span>
                            </>
                          ) : (
                            "Start Game"
                          )}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {gameStatus === "initial_deal" && (
                <>
                  {showShuffleAnimation ? (
                    <CardShuffleAnimation
                      onComplete={() => setShowShuffleAnimation(false)}
                    />
                  ) : (
                    <>
                      {isGameBoardReady ? (
                        <GameBoard
                          roomId={roomId}
                          gameMode={mode as "classic" | "frenzy"}
                          players={players}
                          gameState={gameState}
                          onUpdateGameState={updateGameState}
                          onRecordMove={recordMove}
                          gameStatus={gameStatus}
                          initialCardsDeal={true}
                          onPlayCard={handlePlayCard}
                          onBid={handleBid}
                          sendMessage={sendMessage}
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
                    userVote={userVote}
                    votes={trumpVotes}
                    votingComplete={votingComplete}
                  />
                  {isGameBoardReady ? (
                    <GameBoard
                      roomId={roomId}
                      gameMode={mode as "classic" | "frenzy"}
                      players={players}
                      gameState={gameState}
                      onUpdateGameState={updateGameState}
                      onRecordMove={recordMove}
                      gameStatus={gameStatus}
                      initialCardsDeal={true}
                      onPlayCard={handlePlayCard}
                      onBid={handleBid}
                      sendMessage={sendMessage}
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
                      roomId={roomId}
                      gameMode={mode as "classic" | "frenzy"}
                      players={players}
                      gameState={gameState}
                      onUpdateGameState={updateGameState}
                      onRecordMove={recordMove}
                      gameStatus={gameStatus}
                      initialCardsDeal={false}
                      onPlayCard={handlePlayCard}
                      onBid={handleBid}
                      sendMessage={sendMessage}
                    />
                  ) : (
                    <GameBoardSkeleton />
                  )}
                </>
              )}

              {(gameStatus === "playing" || gameStatus === "ended") &&
                (isGameBoardReady ? (
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
                    sendMessage={sendMessage}
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

        {/* Trump Selection Popup */}
        {showTrumpPopup && gameStatus === "initial_deal" && (
          <TrumpSelectionPopup
            onVote={handleTrumpVote}
            userVote={userVote}
            votes={trumpVotes}
            votingComplete={votingComplete}
            playerHand={
              currentRoom?.players
                .find(
                  (p) =>
                    p.name === user?.username ||
                    p.name === user?.name ||
                    (user?.email && p.name === user?.email.split("@")[0])
                )
                ?.hand.map((card, index) => ({
                  id: index,
                  suit: card.suit,
                  value: card.rank,
                })) || []
            }
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

export default function GameRoomPage({ params }: GameRoomPageProps) {
  const resolvedParams = React.use(params);
  const roomId = resolvedParams.roomId;

  return (
    <RealtimeGameStateProvider roomId={roomId}>
      <ProtectedRoute>
        <GameRoomContent />
      </ProtectedRoute>
    </RealtimeGameStateProvider>
  );
}
