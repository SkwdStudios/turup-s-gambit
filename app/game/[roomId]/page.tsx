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
import { ProtectedRoute } from "@/components/protected-route";
import { GameControls } from "@/components/game-controls";
import { GameInfo } from "@/components/game-info";

interface BaseMessage {
  type: string;
  payload?: any;
  suit?: string;
}

interface GameRoomPageProps {
  params: Promise<{
    roomId: string;
  }>;
}

export default function GameRoomPage({ params }: GameRoomPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resolvedParams = React.use(params);
  const roomId = resolvedParams.roomId;
  const mode = searchParams?.get("mode") || "classic";

  const [showReplay, setShowReplay] = useState(false);
  const [gameStatus, setGameStatus] = useState<
    "waiting" | "initial_deal" | "bidding" | "final_deal" | "playing" | "ended"
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
  const [allPlayersJoined, setAllPlayersJoined] = useState(false);
  const [trumpSuit, setTrumpSuit] = useState<string | null>(null);

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
        const wsUrl = `${wsProto}${window.location.hostname}:3001/api/socket`;

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
            const data = JSON.parse(event.data);
            console.log(`[WS Client] Received message type: ${data.type}`);

            switch (data.type) {
              case "room:joined":
                console.log("[WS Client] Joined room:", data.room);
                setCurrentRoom(data.room);
                setPlayers(data.room.players.map((p: Player) => p.id));
                break;

              case "player:joined":
                console.log("[WS Client] Player joined:", data.player);
                setPlayers((prev) => [...prev, data.player.id]);
                break;

              case "player:left":
                console.log("[WS Client] Player left:", data.playerId);
                setPlayers((prev) => prev.filter((id) => id !== data.playerId));
                setAllPlayersJoined(false);
                break;

              case "game:start":
                if (players.length === 4) {
                  setAllPlayersJoined(true);
                  setGameStatus("initial_deal");
                  setShowShuffleAnimation(true);

                  setTimeout(() => {
                    setInitialCardsDeal(true);
                    setShowShuffleAnimation(false);
                    setGameStatus("bidding");
                  }, 3000);
                }
                break;

              case "game:trump_vote":
                console.log("[WS Client] Trump vote:", data);
                setTrumpVotes((prev) => ({
                  ...prev,
                  [data.suit]: (prev[data.suit] || 0) + 1,
                }));
                break;

              case "game:trump_selected":
                console.log("[WS Client] Trump selected:", data.suit);
                setTrumpSuit(data.suit);
                setVotingComplete(true);
                updateGameState({ trumpSuit: data.suit });

                setTimeout(() => {
                  setGameStatus("final_deal");
                  setShowShuffleAnimation(true);

                  setTimeout(() => {
                    setInitialCardsDeal(false);
                    setShowShuffleAnimation(false);
                    setGameStatus("playing");
                  }, 3000);
                }, 2000);
                break;

              case "game:card_played":
                console.log("[WS Client] Card played:", data);
                break;

              case "game:ended":
                console.log("[WS Client] Game ended:", data);
                setGameStatus("ended");
                break;

              default:
                console.log("[WS Client] Unknown message type:", data.type);
            }
          } catch (error) {
            console.error("[WS Client] Error parsing message:", error);
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
  }, [roomId, user, players.length]);

  useEffect(() => {
    if (!user) {
      setShowLoginModal(true);
    }
  }, [user]);

  function handleStartGame() {
    sendMessage({ type: "game:ready", payload: { roomId } });
  }

  // Handle trump voting
  const handleTrumpVote = (suit: string) => {
    if (userVote || votingComplete) return;

    setUserVote(suit);
    sendMessage({
      type: "game:trump_vote",
      suit,
    });

    // For demo purposes, simulate other players voting
    setTimeout(() => {
      const otherSuits = ["hearts", "diamonds", "clubs", "spades"].filter(
        (s) => s !== suit
      );
      const randomSuit =
        otherSuits[Math.floor(Math.random() * otherSuits.length)];

      sendMessage({
        type: "game:trump_vote",
        suit: randomSuit,
      });

      // Simulate server selecting trump
      setTimeout(() => {
        sendMessage({
          type: "game:trump_selected",
          suit: Math.random() > 0.5 ? suit : randomSuit,
        });
      }, 2000);
    }, 1000);
  };

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
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {gameStatus === "waiting" && (
              <div className="w-full max-w-md p-6 border-2 border-primary/30 rounded-lg bg-card/90 backdrop-blur-sm text-center">
                <h2 className="text-2xl font-medieval mb-4">
                  Waiting for Players
                </h2>
                <p className="mb-4">
                  Share this room with friends to start the game
                </p>
                <div className="flex justify-center mb-4">
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
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={`h-24 border-2 rounded-lg flex items-center justify-center ${
                        index < players.length
                          ? "border-primary bg-primary/10"
                          : "border-muted bg-muted/10"
                      }`}
                    >
                      {index < players.length ? (
                        <span className="font-medieval">{players[index]}</span>
                      ) : (
                        <span className="text-muted-foreground">Empty</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {players.length}/4 players joined
                </p>
              </div>
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
          <div className="space-y-8">
            <GameInfo roomId={roomId} />
            <GameControls roomId={roomId} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
