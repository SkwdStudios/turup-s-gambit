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

  // Handle loading state
  useEffect(() => {
    // Set loading to false when we have connection and room data
    if (isConnected && currentRoom) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsLoading(false);
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
      // Update game status based on room state
      if (currentRoom.gameState.gamePhase === "bidding") {
        setGameStatus("bidding");
        setStatusMessage("Bidding in progress...");
        setTimeout(() => setStatusMessage(null), 2000);

        // Make bots vote for trump suits - but only if they haven't voted yet
        const botPlayers = currentRoom.players.filter((p) => p.isBot);
        if (botPlayers.length > 0 && !votingComplete) {
          // Get all bot players that haven't voted yet
          const botsToVote = botPlayers.filter((bot) => !botVotes[bot.id]);
          if (botsToVote.length === 0) return; // All bots have voted

          const suits = ["hearts", "diamonds", "clubs", "spades"];

          // Add a slight delay for each bot to make it seem more natural
          botsToVote.forEach((bot, index) => {
            setTimeout(() => {
              // Double-check if voting is still in progress
              if (
                !votingComplete &&
                currentRoom.gameState.gamePhase === "bidding" &&
                !botVotes[bot.id] // Make sure this bot hasn't voted yet
              ) {
                // Choose a random suit for the bot to vote for
                const randomSuit =
                  suits[Math.floor(Math.random() * suits.length)];
                console.log(`Bot ${bot.name} is voting for ${randomSuit}`);

                // Mark this bot as having voted
                setBotVotes((prev) => ({
                  ...prev,
                  [bot.id]: true,
                }));

                // Send the vote
                sendMessage({
                  type: "game:select-trump",
                  payload: { roomId, suit: randomSuit, botId: bot.id },
                });
              }
            }, 1000 + index * 1500); // Stagger bot votes
          });
        }
      } else if (currentRoom.gameState.gamePhase === "playing") {
        setGameStatus("playing");
        setStatusMessage("Game started!");
        setTimeout(() => setStatusMessage(null), 2000);
      } else if (currentRoom.gameState.gamePhase === "ended") {
        setGameStatus("ended");
        setStatusMessage("Game ended");
        setTimeout(() => setStatusMessage(null), 2000);
      }

      // Update trump suit if available
      if (currentRoom.gameState.trumpSuit) {
        setTrumpSuit(currentRoom.gameState.trumpSuit);
        setGameStatus("playing"); // Force game status to playing when trump is selected
        setStatusMessage(
          `Trump suit selected: ${currentRoom.gameState.trumpSuit}`
        );
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
    const handleTrumpVote = (event: any) => {
      if (event.type === "game:trump-vote") {
        const { suit, botId } = event.payload;
        console.log(
          `Received trump vote for ${suit}`,
          botId ? `from bot ${botId}` : ""
        );

        // Update the vote count
        setTrumpVotes((prev) => ({
          ...prev,
          [suit]: prev[suit] + 1,
        }));

        // If this is a bot vote, mark it as voted
        if (botId) {
          setBotVotes((prev) => ({
            ...prev,
            [botId]: true,
          }));
        }

        // Calculate total votes properly
        setTimeout(() => {
          setTrumpVotes((currentVotes) => {
            const totalVotes = Object.values(currentVotes).reduce(
              (sum, count) => sum + (count as number),
              0
            );

            // Check if all players have voted
            if (totalVotes >= (currentRoom?.players.length || 0)) {
              setVotingComplete(true);
            }

            return currentVotes; // Return unchanged state
          });
        }, 100);
      }
    };

    // Add the event listener
    if (isConnected && currentRoom) {
      window.addEventListener("message", handleTrumpVote);
    }

    return () => {
      window.removeEventListener("message", handleTrumpVote);
    };
  }, [isConnected, currentRoom]);

  // Handle trump voting
  const handleTrumpVote = (suit: string) => {
    if (userVote || votingComplete) return;

    setStatusMessage(`Voting for ${suit}...`);
    setUserVote(suit);
    selectTrump(suit);

    // Update local vote count
    setTrumpVotes((prev) => ({
      ...prev,
      [suit]: prev[suit] + 1,
    }));

    // Clear status message after a delay
    setTimeout(() => setStatusMessage(null), 2000);
  };

  function handlePlayCard(card: Card) {
    setStatusMessage("Playing card...");
    playCard(card);
    setTimeout(() => setStatusMessage(null), 1500);
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
                    sendMessage={sendMessage}
                  />
                )}
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
        </div>

        {/* Status message loader */}
        <AnimatePresence>
          {statusMessage && <StatusUpdateLoader message={statusMessage} />}
        </AnimatePresence>
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
