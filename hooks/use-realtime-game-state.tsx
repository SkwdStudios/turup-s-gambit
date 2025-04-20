"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { useSupabaseRealtime } from "./use-supabase-realtime";
import type { BroadcastMessage } from "./use-supabase-realtime";
import { GameRoom, Player, GameState } from "@/app/types/game";
import { useSupabaseAuth } from "./use-supabase-auth";

interface GameStateContextType {
  currentRoom: GameRoom | null;
  players: string[];
  isConnected: boolean;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  updateGameState: (newState: Partial<GameState>) => void;
  playCard: (card: any) => void;
  placeBid: (bid: number) => void;
  selectTrump: (suit: string) => void;
  sendMessage: (message: BroadcastMessage) => Promise<boolean>;
}

const GameStateContext = createContext<GameStateContextType | undefined>(
  undefined
);

export function RealtimeGameStateProvider({
  children,
  roomId,
}: {
  children: ReactNode;
  roomId: string;
}) {
  const { user } = useSupabaseAuth();
  const { isConnected, sendMessage, messages, setMessages } =
    useSupabaseRealtime(roomId);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [players, setPlayers] = useState<string[]>([]);

  // Process incoming messages
  useEffect(() => {
    if (messages.length === 0) return;

    // Get the latest message
    const latestMessage = messages[messages.length - 1];
    console.log("[GameState] Processing message:", latestMessage);

    // Skip processing if we don't have a valid message
    if (!latestMessage || typeof latestMessage !== "object") {
      console.warn("[GameState] Invalid message received", latestMessage);
      return;
    }

    switch (latestMessage.type) {
      case "room:join":
        // This is an outgoing message, no need to handle
        break;

      case "room:joined":
        console.log("[GameState] Joined room:", latestMessage.payload);
        if (latestMessage.payload) {
          // When joining a room, use the complete room state from the server
          setCurrentRoom((prevRoom) => {
            // If we don't have a room yet, use the payload directly
            if (!prevRoom) {
              // Make sure to update the players list
              if (
                latestMessage.payload.players &&
                Array.isArray(latestMessage.payload.players)
              ) {
                setPlayers(
                  latestMessage.payload.players.map((p: Player) => p.name)
                );
              }
              return latestMessage.payload;
            }

            // If we already have a room, merge the new data but PRESERVE existing players
            // and add any new ones from the payload
            const existingPlayers = prevRoom.players || [];
            const newPlayers = latestMessage.payload.players || [];

            // Combine players, avoiding duplicates
            const combinedPlayers = [...existingPlayers];

            // Add new players that don't already exist
            for (const newPlayer of newPlayers) {
              const exists = combinedPlayers.some(
                (p) => p.name === newPlayer.name
              );
              if (!exists) {
                combinedPlayers.push(newPlayer);
              }
            }

            const updatedRoom = {
              ...latestMessage.payload,
              players: combinedPlayers,
            };

            // Update the players list
            if (updatedRoom.players && Array.isArray(updatedRoom.players)) {
              setPlayers(updatedRoom.players.map((p: Player) => p.name));
            }

            return updatedRoom;
          });
        }
        break;

      case "room:updated":
        console.log("[GameState] Room updated:", latestMessage.payload);
        if (latestMessage.payload) {
          // When room is updated, use the complete room state from the server
          setCurrentRoom((prevRoom) => {
            // If we don't have a room yet, use the payload directly
            if (!prevRoom) {
              // Make sure to update the players list
              if (
                latestMessage.payload.players &&
                Array.isArray(latestMessage.payload.players)
              ) {
                setPlayers(
                  latestMessage.payload.players.map((p: Player) => p.name)
                );
              }
              return latestMessage.payload;
            }

            // If we already have a room, merge the new data but PRESERVE existing players
            // and add any new ones from the payload
            const existingPlayers = prevRoom.players || [];
            const newPlayers = latestMessage.payload.players || [];

            // Combine players, avoiding duplicates
            const combinedPlayers = [...existingPlayers];

            // Add new players that don't already exist
            for (const newPlayer of newPlayers) {
              const exists = combinedPlayers.some(
                (p) => p.name === newPlayer.name
              );
              if (!exists) {
                combinedPlayers.push(newPlayer);
              }
            }

            const updatedRoom = {
              ...latestMessage.payload,
              players: combinedPlayers,
            };

            // Update the players list
            if (updatedRoom.players && Array.isArray(updatedRoom.players)) {
              setPlayers(updatedRoom.players.map((p: Player) => p.name));
            }

            return updatedRoom;
          });
        }
        break;

      case "room:full-state":
        console.log(
          "[GameState] Received full room state:",
          latestMessage.payload
        );
        if (latestMessage.payload) {
          // This is a complete state update - use it as the source of truth
          setCurrentRoom((prevRoom) => {
            // If we don't have a room yet, use the payload directly
            if (!prevRoom) {
              if (
                latestMessage.payload.players &&
                Array.isArray(latestMessage.payload.players)
              ) {
                setPlayers(
                  latestMessage.payload.players.map((p: Player) => p.name)
                );
              }
              return latestMessage.payload;
            }

            // Use the server's complete state, but preserve any local properties not in the payload
            const updatedRoom = {
              ...prevRoom,
              ...latestMessage.payload,
              // Always use the server's player list as the source of truth
              players: latestMessage.payload.players || [],
            };

            // Update the players list
            if (updatedRoom.players && Array.isArray(updatedRoom.players)) {
              setPlayers(updatedRoom.players.map((p: Player) => p.name));
            }

            return updatedRoom;
          });

          // Store the room state in localStorage for persistence across refreshes
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem(
                `room-${latestMessage.payload.id}`,
                JSON.stringify(latestMessage.payload)
              );
            }
          } catch (e) {
            console.error(
              "[GameState] Failed to store room state in localStorage:",
              e
            );
          }
        }
        break;

      case "player:joined":
        // Use a more stable approach to handle player joins
        console.log("[GameState] Player joined:", latestMessage.payload);

        // Skip processing if we've already processed this exact message
        const msgId = JSON.stringify(latestMessage.payload);
        if (processedMessagesRef.current.has(msgId)) {
          console.log("[GameState] Skipping duplicate player:joined message");
          break;
        }

        // Mark this message as processed
        processedMessagesRef.current.add(msgId);

        // Limit the size of the processed messages set
        if (processedMessagesRef.current.size > 100) {
          // Keep only the last 50 messages
          processedMessagesRef.current = new Set(
            Array.from(processedMessagesRef.current).slice(-50)
          );
        }

        if (currentRoom && latestMessage.payload) {
          // Extract player name from payload - handle both formats
          const playerName =
            latestMessage.payload.name || latestMessage.payload.playerName;
          if (!playerName) {
            console.warn(
              "[GameState] Player joined without a name",
              latestMessage.payload
            );
            break;
          }

          // Get player ID from payload or generate a consistent one
          const playerId =
            latestMessage.payload.id ||
            `player_${playerName
              .replace(/\s+/g, "_")
              .toLowerCase()}_${Math.random().toString(36).substring(2, 6)}`;
          const isHost = latestMessage.payload.isHost || false;
          const isBot = latestMessage.payload.isBot || false;

          const playerExists = currentRoom.players.some(
            (p) => p.name === playerName
          );

          if (!playerExists) {
            console.log("[GameState] Adding new player to room:", playerName);
            // Check if this is the first player (should be host)
            const shouldBeHost = currentRoom.players.length === 0 || isHost;

            const newPlayer = {
              id: playerId,
              name: playerName,
              hand: [],
              score: 0,
              isReady: false,
              isHost: shouldBeHost,
              isBot: isBot,
            };

            console.log(
              "Adding player to room:",
              playerName,
              "isHost:",
              shouldBeHost
            );

            setCurrentRoom((prevRoom) => {
              // Double-check to prevent race conditions
              if (!prevRoom) return currentRoom;

              // Check if player already exists by name
              const existingPlayerIndex = prevRoom.players.findIndex(
                (p) => p.name === playerName
              );

              if (existingPlayerIndex >= 0) {
                // Update the existing player with any new information
                const updatedPlayers = [...prevRoom.players];
                updatedPlayers[existingPlayerIndex] = {
                  ...updatedPlayers[existingPlayerIndex],
                  id: playerId, // Use the ID from the message
                  isHost: isHost, // Update host status
                  isBot: isBot, // Update bot status
                };

                return {
                  ...prevRoom,
                  players: updatedPlayers,
                };
              }

              // Add the new player
              return {
                ...prevRoom,
                players: [...prevRoom.players, newPlayer],
              };
            });

            setPlayers((prev) => {
              if (prev.includes(playerName)) return prev;
              return [...prev, playerName];
            });

            // Store the updated room state in localStorage
            try {
              if (typeof window !== "undefined" && currentRoom) {
                const updatedRoom = {
                  ...currentRoom,
                  players: [...currentRoom.players, newPlayer],
                };
                localStorage.setItem(
                  `room-${currentRoom.id}`,
                  JSON.stringify(updatedRoom)
                );
              }
            } catch (e) {
              console.error(
                "[GameState] Failed to store room state in localStorage:",
                e
              );
            }
          } else {
            console.log(
              "[GameState] Player already exists in room:",
              playerName
            );

            // Update the player's information if needed
            setCurrentRoom((prevRoom) => {
              if (!prevRoom) return currentRoom;

              const playerIndex = prevRoom.players.findIndex(
                (p) => p.name === playerName
              );
              if (playerIndex >= 0) {
                const updatedPlayers = [...prevRoom.players];
                updatedPlayers[playerIndex] = {
                  ...updatedPlayers[playerIndex],
                  id: playerId, // Use the ID from the message
                  isHost: isHost, // Update host status
                  isBot: isBot, // Update bot status
                };

                return {
                  ...prevRoom,
                  players: updatedPlayers,
                };
              }

              return prevRoom;
            });
          }
        } else if (!currentRoom && latestMessage.payload) {
          // If we don't have a room yet, create one with this player
          const playerName =
            latestMessage.payload.name || latestMessage.payload.playerName;
          if (!playerName) {
            console.warn(
              "[GameState] Player joined without a name",
              latestMessage.payload
            );
            break;
          }

          const playerId =
            latestMessage.payload.id ||
            `player_${playerName
              .replace(/\s+/g, "_")
              .toLowerCase()}_${Math.random().toString(36).substring(2, 6)}`;
          const isBot = latestMessage.payload.isBot || false;

          // Always make the first player the host
          const newPlayer = {
            id: playerId,
            name: playerName,
            hand: [],
            score: 0,
            isReady: false,
            isHost: true, // First player is always host
            isBot: isBot,
          };

          console.log("Creating new room with host:", playerName);

          const roomId = latestMessage.payload.roomId;
          if (!roomId) {
            console.warn(
              "[GameState] Player joined without a roomId",
              latestMessage.payload
            );
            break;
          }

          const newRoom = {
            id: roomId,
            players: [newPlayer],
            gameState: {
              currentTurn: null,
              trumpSuit: null,
              currentBid: 0,
              currentBidder: null,
              trickCards: {},
              roundNumber: 0,
              gamePhase: "waiting" as const,
            },
            createdAt: Date.now(),
            lastActivity: Date.now(),
          };

          setCurrentRoom(newRoom);
          setPlayers([playerName]);

          // Store the room state in localStorage
          try {
            if (typeof window !== "undefined") {
              localStorage.setItem(`room-${roomId}`, JSON.stringify(newRoom));
            }
          } catch (e) {
            console.error(
              "[GameState] Failed to store room state in localStorage:",
              e
            );
          }
        }
        break;

      case "player:left":
        console.log("[GameState] Player left:", latestMessage.payload);
        if (currentRoom && latestMessage.payload) {
          const playerName =
            typeof latestMessage.payload === "string"
              ? latestMessage.payload
              : latestMessage.payload.name || latestMessage.payload.playerName;

          if (!playerName) {
            console.warn(
              "[GameState] Player left without a name",
              latestMessage.payload
            );
            break;
          }

          setCurrentRoom({
            ...currentRoom,
            players: currentRoom.players.filter((p) => p.name !== playerName),
          });

          setPlayers((prev) => prev.filter((name) => name !== playerName));
        }
        break;

      case "game:started":
        console.log("[GameState] Game started:", latestMessage.payload);
        if (latestMessage.payload) {
          setCurrentRoom(latestMessage.payload);
        }
        break;

      case "game:state-updated":
        console.log("[GameState] Game state updated:", latestMessage.payload);
        if (currentRoom && latestMessage.payload) {
          setCurrentRoom({
            ...currentRoom,
            gameState: latestMessage.payload,
          });
        }
        break;

      case "game:trump-vote":
        console.log("[GameState] Trump vote received:", latestMessage.payload);
        // A player or bot has voted for a trump suit
        // Forward this message to the UI via window.postMessage
        if (typeof window !== "undefined") {
          console.log("[GameState] Broadcasting trump vote to UI");
          window.postMessage(latestMessage, window.location.origin);
        }
        break;

      case "game:trump-selected":
        console.log("[GameState] Trump suit selected:", latestMessage.payload);
        // Update the game state with the selected trump suit
        if (currentRoom) {
          setCurrentRoom((prevRoom) => {
            if (!prevRoom) return currentRoom;
            return {
              ...prevRoom,
              gameState: {
                ...prevRoom.gameState,
                trumpSuit: latestMessage.payload.suit,
                gamePhase: "playing",
              },
            };
          });
        }
        break;

      case "game:select-trump":
        // We don't need to handle this message type in the client
        // It's only used by the server
        console.log(
          "[GameState] Ignoring game:select-trump message, handled by server"
        );
        break;

      case "game:play-card":
        // This is an outgoing message, no need to handle it directly
        console.log(
          "[GameState] Outgoing play card message:",
          latestMessage.payload
        );
        break;

      case "game:card-played":
        // A player has played a card
        console.log("[GameState] Card played:", latestMessage.payload);
        if (currentRoom && latestMessage.payload) {
          const { playerId, card } = latestMessage.payload;

          // Update the game state with the played card
          setCurrentRoom((prevRoom) => {
            if (!prevRoom) return currentRoom;

            // Add the card to the trick cards
            const updatedTrickCards = {
              ...prevRoom.gameState.trickCards,
              [playerId]: card,
            };

            // Update the game state
            return {
              ...prevRoom,
              gameState: {
                ...prevRoom.gameState,
                trickCards: updatedTrickCards,
              },
            };
          });

          // Forward this message to the UI via window.postMessage
          if (typeof window !== "undefined") {
            console.log("[GameState] Broadcasting card played to UI");
            window.postMessage(latestMessage, window.location.origin);
          }
        }
        break;

      default:
        console.log("[GameState] Unknown message type:", latestMessage.type);
    }
  }, [messages]);

  // Join a room - completely removed to prevent any manual joining
  // We'll only use the auto-join mechanism
  const joinRoom = (_roomId: string, _playerName: string) => {
    // This function is intentionally disabled to prevent duplicate joins
    console.log("[GameState] Manual room joining is disabled");
    return;
  };

  // Leave a room
  const leaveRoom = () => {
    if (!isConnected || !currentRoom) {
      console.warn("[GameState] Cannot leave room, not connected or no room");
      return;
    }

    sendMessage({
      type: "room:leave",
      payload: { roomId },
    });

    setCurrentRoom(null);
    setPlayers([]);
  };

  // Start the game
  const startGame = () => {
    if (!isConnected || !currentRoom) {
      console.warn("[GameState] Cannot start game, not connected or no room");
      return;
    }

    sendMessage({
      type: "game:ready",
      payload: { roomId },
    });
  };

  // Update game state
  const updateGameState = (newState: Partial<GameState>) => {
    if (!isConnected || !currentRoom) {
      console.warn(
        "[GameState] Cannot update game state, not connected or no room"
      );
      return;
    }

    sendMessage({
      type: "game:state-updated",
      payload: newState,
    });
  };

  // Play a card
  const playCard = (card: any) => {
    if (!isConnected || !currentRoom) {
      console.warn("[GameState] Cannot play card, not connected or no room");
      return;
    }

    // Get the current user's player ID if available
    let playerId = null;
    if (user && currentRoom.players) {
      const currentPlayer = currentRoom.players.find(
        (p) =>
          p.name === user.username ||
          p.name === user.name ||
          (user.email && p.name === user.email.split("@")[0])
      );
      if (currentPlayer) {
        playerId = currentPlayer.id;
      }
    }

    if (!playerId) {
      console.warn("[GameState] Cannot play card, player ID not found");
      return;
    }

    console.log(`[GameState] Playing card for player: ${playerId}`, card);

    sendMessage({
      type: "game:play-card",
      payload: { roomId, card, playerId },
    });
  };

  // Place a bid
  const placeBid = (bid: number) => {
    if (!isConnected || !currentRoom) {
      console.warn("[GameState] Cannot place bid, not connected or no room");
      return;
    }

    sendMessage({
      type: "game:bid",
      payload: { roomId, bid },
    });
  };

  // Select trump suit
  const selectTrump = (suit: string) => {
    if (!isConnected || !currentRoom) {
      console.warn("[GameState] Cannot select trump, not connected or no room");
      return;
    }

    // Get the current user's player ID if available
    let playerId = null;
    if (user && currentRoom.players) {
      const currentPlayer = currentRoom.players.find(
        (p) =>
          p.name === user.username ||
          p.name === user.name ||
          (user.email && p.name === user.email.split("@")[0])
      );
      if (currentPlayer) {
        playerId = currentPlayer.id;
      }
    }

    console.log(
      `[GameState] Selecting trump suit: ${suit} for player: ${
        playerId || "unknown"
      }`
    );

    sendMessage({
      type: "game:select-trump",
      payload: { roomId, suit, playerId },
    });
  };

  // Use global variables to track state and prevent infinite loops
  // This is a workaround to prevent infinite loops with React's state/refs
  const joinedRoomsRef = useRef<Record<string, boolean>>({});
  const processedMessagesRef = useRef<Set<string>>(new Set());

  // Load room state from localStorage on mount
  useEffect(() => {
    if (!roomId) return;

    try {
      if (typeof window !== "undefined") {
        const savedRoomState = localStorage.getItem(`room-${roomId}`);
        if (savedRoomState) {
          const parsedState = JSON.parse(savedRoomState);
          console.log(
            "[GameState] Loaded room state from localStorage:",
            parsedState
          );

          // Set the room state from localStorage
          setCurrentRoom(parsedState);

          // Update the players list
          if (parsedState.players && Array.isArray(parsedState.players)) {
            setPlayers(parsedState.players.map((p: Player) => p.name));
          }
        }
      }
    } catch (e) {
      console.error(
        "[GameState] Failed to load room state from localStorage:",
        e
      );
    }
  }, [roomId]);

  // Poll for updates if not connected
  useEffect(() => {
    if (isConnected || !roomId) return;

    console.log("[GameState] Not connected, polling for updates...");

    // Set up polling interval
    const pollInterval = setInterval(async () => {
      try {
        // Fetch pending messages from the API
        const response = await fetch(`/api/realtime?roomId=${roomId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.messages && Array.isArray(data.messages)) {
            console.log(`[GameState] Polled ${data.messages.length} messages`);

            // Process each message
            for (const message of data.messages) {
              setMessages((prev: BroadcastMessage[]) => [...prev, message]);
            }
          }
        }
      } catch (error) {
        console.error("[GameState] Error polling for updates:", error);
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      // Clean up polling
      clearInterval(pollInterval);
    };
  }, [isConnected, roomId]);

  // Auto-join room when connected - but only once
  useEffect(() => {
    // Skip if not connected or no room ID
    if (!isConnected || !roomId) return;

    // Get player name - handle both logged in users and anonymous users
    let playerName = "";
    let userIdentifier = "guest";

    if (user) {
      // For logged in users, use their email username
      playerName = user.email?.split("@")[0] || user.name || "Anonymous";
      userIdentifier = user.email || user.id || "guest";
    } else {
      // For anonymous users, generate a random name if none exists
      // Use a try-catch to handle server-side rendering where localStorage isn't available
      try {
        playerName =
          (typeof window !== "undefined" &&
            localStorage.getItem("guestName")) ||
          `Guest_${Math.floor(Math.random() * 1000)}`;
        // Store the guest name in localStorage for persistence
        if (typeof window !== "undefined") {
          localStorage.setItem("guestName", playerName);
        }
      } catch (e) {
        // Fallback for server-side rendering
        playerName = `Guest_${Math.floor(Math.random() * 1000)}`;
      }
      userIdentifier = playerName;
    }

    // Check if we've already joined this specific room
    const roomKey = `${roomId}-${userIdentifier}`;
    if (joinedRoomsRef.current[roomKey]) {
      console.log(
        `[GameState] Already joined room ${roomId}, skipping auto-join`
      );
      return;
    }

    // Mark this room as joined immediately to prevent multiple joins
    joinedRoomsRef.current[roomKey] = true;

    console.log("[GameState] Auto-joining room as:", playerName);

    // First, create the room if it doesn't exist
    // This helps prevent the "Room not found" error
    const joinRoom = async () => {
      try {
        console.log("[GameState] Creating/joining room:", roomId);

        // First, try to create the room
        // This will succeed if the room doesn't exist, or return an error if it does
        const createResult = await sendMessage({
          type: "room:create",
          payload: {
            roomId,
            playerName,
            isHost: true, // First player to create the room is the host
          },
        });

        console.log(
          "[GameState] Room creation result:",
          createResult ? "Success" : "Failed"
        );

        // Wait a bit to ensure the room is created
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Send player:joined message
        const joinPlayerResult = await sendMessage({
          type: "player:joined",
          payload: {
            playerName,
            roomId,
            isHost: currentRoom ? currentRoom.players.length === 0 : true,
          },
        });

        console.log(
          "[GameState] Player joined result:",
          joinPlayerResult ? "Success" : "Failed"
        );

        // Wait a bit to ensure the player is added
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Also send room:join message directly with isHost flag
        const joinRoomResult = await sendMessage({
          type: "room:join",
          payload: {
            roomId,
            playerName,
            isHost: currentRoom ? currentRoom.players.length === 0 : true,
          },
        });

        console.log(
          "[GameState] Room join result:",
          joinRoomResult ? "Success" : "Failed"
        );

        // Wait a bit to ensure the join is processed
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Request a full state update from the server
        const stateResult = await sendMessage({
          type: "room:request-state",
          payload: { roomId },
        });

        console.log(
          "[GameState] State request result:",
          stateResult ? "Success" : "Failed"
        );
      } catch (error) {
        console.error("[GameState] Error joining room:", error);
      }
    };

    // Start the join process with a slight delay
    setTimeout(() => {
      joinRoom();
    }, 500);

    // Clean up function - we intentionally don't reset the joined flag
    // to prevent rejoining during the component's lifecycle
  }, [isConnected, user, roomId, sendMessage]);

  const value = {
    currentRoom,
    players,
    isConnected,
    joinRoom,
    leaveRoom,
    startGame,
    updateGameState,
    playCard,
    placeBid,
    selectTrump,
    sendMessage,
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useRealtimeGameState() {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error(
      "useRealtimeGameState must be used within a RealtimeGameStateProvider"
    );
  }
  return context;
}
