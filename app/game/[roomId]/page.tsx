"use client";

import React, { useState, useEffect, useRef } from "react";
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

interface BaseMessage {
  type: string;
  payload?: any;
}

export default function GameRoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params?.roomId as string;
  const mode = searchParams?.get("mode") || "classic";

  const [showReplay, setShowReplay] = useState(false);
  const [gameStatus, setGameStatus] = useState<
    "waiting" | "dealing" | "bidding" | "playing" | "ended"
  >("waiting");
  const [players, setPlayers] = useState<string[]>([]);
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
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { gameState, updateGameState } = useGameState(
    mode as "classic" | "frenzy"
  );
  const { recordMove, getReplayData } = useReplay();
  const { user } = useAuth();

  const ws = useRef<WebSocket | null>(null);

  const sendMessage = (message: BaseMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      try {
        console.log(`[WS Client] Sending message type: ${message.type}`);
        ws.current.send(JSON.stringify(message));
      } catch (e) {
        console.error("[WS Client] Error sending message:", e);
      }
    } else {
      console.warn(
        "[WS Client] WebSocket not open. Cannot send message:",
        message.type
      );
    }
  };

  useEffect(() => {
    if (!roomId || !user) return;

    // First, ensure the WebSocket server is running
    fetch("/api/socket")
      .then(() => {
        const wsProto =
          window.location.protocol === "https:" ? "wss://" : "ws://";
        const wsUrl = `${wsProto}localhost:3001/api/socket`;

        console.log(`[WS Client] Attempting to connect to ${wsUrl}`);
        ws.current = new WebSocket(wsUrl);
        const currentWs = ws.current;

        currentWs.onopen = () => {
          console.log("[WS Client] WebSocket connection opened");
          setIsConnected(true);
          sendMessage({
            type: "room:join",
            payload: {
              roomId: roomId,
              playerName: user?.email?.split("@")[0] || "Anonymous",
            },
          });
        };

        currentWs.onclose = (event: CloseEvent) => {
          console.log(
            "[WS Client] WebSocket connection closed. Code:",
            event.code,
            "Reason:",
            event.reason
          );
          setIsConnected(false);
          ws.current = null;
        };

        currentWs.onerror = (event: Event) => {
          console.error("[WS Client] WebSocket error:", event);
          setIsConnected(false);
        };

        currentWs.onmessage = (event: MessageEvent) => {
          try {
            const message: BaseMessage = JSON.parse(event.data);
            console.log(`[WS Client] Received message type: ${message.type}`);

            switch (message.type) {
              case "room:joined":
                const joinedRoom = message.payload as GameRoom;
                console.log("Joined room (ws):", joinedRoom);
                setCurrentRoom(joinedRoom);
                setPlayers(joinedRoom.players.map((p) => p.name));
                setGameStatus(
                  joinedRoom.gameState.gamePhase === "waiting"
                    ? "waiting"
                    : "playing"
                );
                break;
              case "room:updated":
                const updatedRoom = message.payload as GameRoom;
                console.log("Room updated (ws):", updatedRoom);
                setCurrentRoom(updatedRoom);
                setPlayers(updatedRoom.players.map((p) => p.name));
                if (updatedRoom.gameState.gamePhase !== "waiting") {
                  setGameStatus(
                    updatedRoom.gameState.gamePhase === "bidding"
                      ? "bidding"
                      : "playing"
                  );
                }
                break;
              case "player:joined":
                const joinedPlayer = message.payload as Player;
                console.log("Player joined (ws):", joinedPlayer);
                setPlayers((prev) => {
                  if (prev.includes(joinedPlayer.name)) return prev;
                  return [...prev, joinedPlayer.name];
                });
                break;
              case "player:left":
                const leftPlayerId = message.payload as string;
                console.log("Player left (ws):", leftPlayerId);
                if (currentRoom) {
                  const leftPlayerName = currentRoom.players.find(
                    (p: Player) => p.id === leftPlayerId
                  )?.name;
                  if (leftPlayerName) {
                    setPlayers((prev) =>
                      prev.filter((p) => p !== leftPlayerName)
                    );
                  }
                }
                break;
              case "game:started":
                const startedRoom = message.payload as GameRoom;
                console.log("Game started (ws):", startedRoom);
                setShowShuffleAnimation(true);
                setTimeout(() => {
                  setShowShuffleAnimation(false);
                  setGameStatus("bidding");
                }, 3000);
                break;
              case "game:state-updated":
                const updatedState = message.payload as GameState;
                console.log("Game state updated (ws):", updatedState);
                updateGameState({
                  ...updatedState,
                  trumpSuit: updatedState.trumpSuit || undefined,
                });
                if (updatedState.gamePhase === "playing") {
                  setGameStatus("playing");
                }
                break;
              case "error":
                console.error("[WS Server Error]:", message.payload);
                break;
              default:
                console.warn(
                  "[WS Client] Unhandled message type:",
                  message.type
                );
            }
          } catch (error) {
            console.error(
              "[WS Client] Error processing message:",
              error,
              "Data:",
              event.data
            );
          }
        };
      })
      .catch((error) => {
        console.error(
          "[WS Client] Failed to initialize WebSocket server:",
          error
        );
      });

    return () => {
      console.log("[WS Client] Cleaning up WebSocket connection");
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
      ws.current = null;
      setIsConnected(false);
    };
  }, [roomId, user]);

  useEffect(() => {
    if (!user) {
      setShowLoginModal(true);
    }
  }, [user]);

  function handleStartGame() {
    sendMessage({ type: "game:ready", payload: { roomId } });
  }

  function handleTrumpVote(suit: string) {
    if (userVote) return;
    setUserVote(suit);
    sendMessage({ type: "game:select-trump", payload: { roomId, suit } });
  }

  function handlePlayCard(card: Card) {
    sendMessage({ type: "game:play-card", payload: { roomId, card } });
  }

  function handleBid(bid: number) {
    sendMessage({ type: "game:bid", payload: { roomId, bid } });
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
    <div className="min-h-screen flex flex-col pt-16 pb-16">
      <VisualEffects enableGrain />
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 dark:opacity-30"
          style={{ backgroundImage: "url('/assets/game-table-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background" />
      </div>

      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm py-2">
        <div className="container mx-auto flex justify-between items-center px-4">
          <div className="flex items-center gap-4">
            <div className="bg-card/80 backdrop-blur-sm px-3 py-1 rounded-md border border-primary/30">
              <span className="text-sm font-medieval">Room: {roomId}</span>
            </div>
            <div className="bg-card/80 backdrop-blur-sm px-3 py-1 rounded-md border border-primary/30">
              <span className="text-sm font-medieval">
                Mode: {mode === "classic" ? "Classic" : "Frenzy"}
              </span>
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
            <ReplaySummary
              onClose={handleCloseReplay}
              replayData={getReplayData()}
            />
          </div>
        ) : (
          <div className="relative max-w-5xl mx-auto">
            {showShuffleAnimation && <CardShuffleAnimation />}

            {gameStatus === "waiting" && (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <h2 className="text-3xl font-medieval text-primary mb-6">
                  Waiting for Players
                </h2>
                <div className="mb-8">
                  <p className="text-lg mb-4">
                    Players in the room ({players.length}/4):
                  </p>
                  <ul className="space-y-2">
                    {players.map((player: string, index: number) => (
                      <li key={index} className="text-foreground/80">
                        {player}
                      </li>
                    ))}
                    {Array.from({ length: 4 - players.length }).map(
                      (_, index) => (
                        <li
                          key={`empty-${index}`}
                          className="text-muted-foreground"
                        >
                          Waiting for player...
                        </li>
                      )
                    )}
                  </ul>
                </div>

                <Button
                  className="medieval-button bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={players.length < 4 || !isConnected}
                  onClick={handleStartGame}
                >
                  {players.length < 4
                    ? "Waiting for more players..."
                    : "Start Game"}
                </Button>
              </div>
            )}

            {gameStatus === "bidding" && (
              <div className="h-full flex flex-col items-center justify-center p-8">
                <h2 className="text-3xl font-medieval text-primary mb-6">
                  Trump Suit Bidding
                </h2>
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
                onPlayCard={handlePlayCard}
                onBid={handleBid}
              />
            )}

            {gameStatus === "ended" && (
              <div className="mt-6 p-6 border-2 border-primary/30 rounded-lg bg-card/80 backdrop-blur-sm text-center">
                <h2 className="text-3xl font-medieval text-primary mb-4">
                  Game Over
                </h2>
                <p className="text-lg mb-6">
                  Congratulations! Your team has won the game.
                </p>
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
                    onClick={() => router.push("/game")}
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
  );
}
