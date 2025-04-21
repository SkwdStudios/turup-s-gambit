import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { GameRoom, Player, GameState, Card, Suit } from "@/app/types/game";
import { devtools } from "zustand/middleware";
import { useAuthStore } from "./authStore";
import { useUIStore } from "./uiStore";

export type GameMode = "classic" | "frenzy";
export type GameStatus =
  | "waiting"
  | "initial_deal"
  | "bidding"
  | "final_deal"
  | "playing"
  | "ended";

interface GameStoreState {
  // Game state
  currentRoom: GameRoom | null;
  players: Player[];
  gameMode: GameMode;
  gameStatus: GameStatus;
  isLoading: boolean;
  isConnected: boolean;
  roomId: string | null;

  // Gameplay state
  trumpSuit: Suit | null;
  currentTrick: Card[];
  scores: { royals: number; rebels: number };
  currentPlayer: string;
  specialPowers?: Record<string, boolean>;

  // UI state flags for game flow
  showShuffleAnimation: boolean;
  initialCardsDeal: boolean;
  statusMessage: string | null;
  isAddingBots: boolean;
  isPhaseTransitioning: boolean;
  phaseTransitionMessage: string;
  isGameBoardReady: boolean;
  votingComplete: boolean;

  // Actions
  setRoom: (room: GameRoom | null) => void;
  setPlayers: (players: Player[]) => void;
  setGameMode: (mode: GameMode) => void;
  setGameStatus: (status: GameStatus) => void;
  setRoomId: (roomId: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setConnected: (isConnected: boolean) => void;

  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  leaveRoom: () => void;
  startGame: () => void;
  playCard: (card: Card) => void;
  placeBid: (bid: number) => void;
  selectTrump: (suit: Suit) => void;
  addBots: () => Promise<void>;

  // Game state update helpers
  updateGameState: (newState: Partial<GameState>) => void;
  setStatusMessage: (message: string | null) => void;
  setIsAddingBots: (value: boolean) => void;
  setTrumpSuit: (suit: Suit | null) => void;
  setCurrentTrick: (trick: Card[]) => void;
  setCurrentPlayer: (player: string) => void;
  updateScores: (newScores: { royals: number; rebels: number }) => void;

  // Game flow helpers
  setShowShuffleAnimation: (show: boolean) => void;
  setInitialCardsDeal: (value: boolean) => void;
  setIsPhaseTransitioning: (value: boolean) => void;
  setPhaseTransitionMessage: (message: string) => void;
  setIsGameBoardReady: (value: boolean) => void;
  setVotingComplete: (value: boolean) => void;

  // Real-time communication
  sendMessage: (message: any) => Promise<boolean>;
  subscribeToRealtime: () => Promise<void>;
}

export const useGameStore = create<GameStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Default state
        currentRoom: null,
        players: [],
        gameMode: "classic",
        gameStatus: "waiting",
        isLoading: true,
        isConnected: false,
        roomId: null,

        trumpSuit: null,
        currentTrick: [],
        scores: { royals: 0, rebels: 0 },
        currentPlayer: "",
        specialPowers: undefined,

        showShuffleAnimation: false,
        initialCardsDeal: false,
        statusMessage: null,
        isAddingBots: false,
        isPhaseTransitioning: false,
        phaseTransitionMessage: "",
        isGameBoardReady: false,
        votingComplete: false,

        // Basic setters
        setRoom: (room) => set({ currentRoom: room }),

        setPlayers: (players) => set({ players }),

        setGameMode: (gameMode) => {
          set({
            gameMode,
            specialPowers:
              gameMode === "frenzy"
                ? {
                    doubleTrump: true,
                    swapCard: true,
                  }
                : undefined,
          });
        },

        setGameStatus: (gameStatus) => set({ gameStatus }),

        setRoomId: (roomId) => set({ roomId }),

        setLoading: (isLoading) => set({ isLoading }),

        setConnected: (isConnected) => set({ isConnected }),

        // Game actions
        joinRoom: async (roomId, playerName) => {
          const user = useAuthStore.getState().user;
          const { currentRoom, players } = get();

          if (!user) {
            console.error("[GameStore] Cannot join room, no user is logged in");
            return;
          }

          // Check if we're already in this room
          if (
            currentRoom?.id === roomId &&
            players.some((p) => p.id === user.id)
          ) {
            console.log(
              `[GameStore] Already joined room ${roomId}, not joining again`
            );
            return;
          }

          console.log(`[GameStore] Joining room ${roomId} as ${user.username}`);

          set({
            roomId,
            isLoading: true,
          });

          // In a real implementation, this would connect to Supabase realtime
          // or other websocket connection

          // For now, we'll just simulate joining a room
          const mockRoom: GameRoom = {
            id: roomId,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            players: [
              {
                id: user.id,
                name: user.username,
                isHost: true,
                isBot: false,
                isReady: true,
                hand: [],
                score: 0,
              },
            ],
            gameState: {
              currentTurn: null,
              trumpSuit: null,
              currentBid: 0,
              currentBidder: null,
              trickCards: {},
              roundNumber: 0,
              gamePhase: "waiting",
              teams: {
                royals: [],
                rebels: [],
              },
              scores: {
                royals: 0,
                rebels: 0,
              },
              consecutiveTricks: {
                royals: 0,
                rebels: 0,
              },
              lastTrickWinner: null,
              dealerIndex: 0,
              trumpCaller: null,
            },
          };

          // Simulate delay for network request
          await new Promise((resolve) => setTimeout(resolve, 500));

          set({
            currentRoom: mockRoom,
            players: mockRoom.players,
            isLoading: false,
            isConnected: true,
            gameStatus: "waiting",
          });

          // Send join message to the server
          const joinSuccess = await get().sendMessage({
            type: "room:join",
            payload: {
              roomId,
              player: {
                id: user.id,
                name: user.username,
                isHost: true, // First player is host
                isBot: false,
                isReady: true,
              },
              playerName: user.username, // Add explicit playerName field
              playerId: user.id, // Add explicit playerId field
            },
          });

          if (!joinSuccess) {
            console.error("[GameStore] Failed to send join message to server");
          }

          // Subscribe to realtime updates for this room
          await get().subscribeToRealtime();
        },

        leaveRoom: () => {
          const { roomId, currentRoom } = get();
          const user = useAuthStore.getState().user;

          if (roomId && currentRoom && user) {
            // Send leave message (in real implementation)
            get().sendMessage({
              type: "room:leave",
              payload: {
                roomId,
                playerId: user.id,
              },
            });
          }

          set({
            currentRoom: null,
            players: [],
            roomId: null,
            isConnected: false,
            gameStatus: "waiting",
            trumpSuit: null,
            currentTrick: [],
            scores: { royals: 0, rebels: 0 },
            currentPlayer: "",
            showShuffleAnimation: false,
            initialCardsDeal: false,
            statusMessage: null,
          });
        },

        startGame: async () => {
          const { roomId, currentRoom, players } = get();
          const user = useAuthStore.getState().user;
          const { showToast } = useUIStore.getState();

          if (!roomId || !currentRoom) {
            console.error("[GameStore] Cannot start game, no active room");
            showToast("Cannot start game: No active room", "error");
            return;
          }

          if (!user || !user.id) {
            console.error(
              "[GameStore] Cannot start game, user not authenticated"
            );
            showToast("Cannot start game: Please log in first", "error");
            return;
          }

          // Check if user is the host
          const isHost = currentRoom.players.some(
            (player) => player.id === user.id && player.isHost
          );

          if (!isHost) {
            console.error("[GameStore] Only the host can start the game");
            showToast("Only the host can start the game", "error");
            return;
          }

          // Check if there are enough players
          if (players.length < 4) {
            console.error(
              `[GameStore] Not enough players to start game (${players.length}/4)`
            );
            showToast(
              `Not enough players to start game (${players.length}/4). Need 4 players.`,
              "error"
            );
            return;
          }

          console.log(
            `[GameStore] Starting game in room ${roomId} with mode ${
              get().gameMode
            }`
          );

          try {
            // Send start game message
            const messageResult = await get().sendMessage({
              type: "game:start",
              payload: {
                roomId: roomId, // Make sure roomId is included in the payload
                gameMode: get().gameMode,
                playerId: user.id,
                playerName: user.username || "Player",
              },
            });

            if (!messageResult) {
              console.error("[GameStore] Failed to send start game message");
              showToast("Failed to start game. Please try again.", "error");
              return;
            }

            // Update local state
            set({
              gameStatus: "initial_deal",
              showShuffleAnimation: true,
              initialCardsDeal: true,
              statusMessage: "Game starting... Dealing initial cards",
            });

            showToast("Game starting! Dealing initial cards...", "success");

            // Simulate initial deal after animation
            // First show the shuffle animation for the initial 5 cards
            setTimeout(() => {
              set({
                showShuffleAnimation: false,
                statusMessage: "Initial 5 cards dealt. Select trump suit.",
              });

              // Give a moment for the cards to be visible before showing trump selection
              setTimeout(() => {
                // Now the trump selection popup should appear
                useUIStore.getState().setShowTrumpPopup(true);
              }, 1000);
            }, 2000);
          } catch (error) {
            console.error("[GameStore] Error starting game:", error);
            showToast("Error starting game. Please try again.", "error");
          }
        },

        // Add bots to fill the room
        addBots: async () => {
          const { roomId, currentRoom, players } = get();
          const user = useAuthStore.getState().user;

          if (!roomId || !currentRoom || !user) {
            console.error("[GameStore] Cannot add bots, no active room");
            return;
          }

          // Check if user is the host
          const isHost = currentRoom.players.some(
            (player) => player.id === user.id && player.isHost
          );

          if (!isHost) {
            console.error("[GameStore] Only the host can add bots");
            return;
          }

          // Set loading state
          set({ isAddingBots: true });

          try {
            const botNames = [
              "Sir Botcelot",
              "Lady Bytesalot",
              "Duke Datasmith",
              "Count Codeworth",
            ];
            const currentPlayerCount = players.length;
            const botsNeeded = Math.min(
              4 - currentPlayerCount,
              botNames.length
            );

            const newPlayers = [...players];

            // Add bots one by one with a slight delay between each
            for (let i = 0; i < botsNeeded; i++) {
              const botName = botNames[i];
              // Ensure each bot has a truly unique ID by using a timestamp with milliseconds
              // and a random component
              const timestamp = Date.now();
              const random = Math.floor(Math.random() * 10000);
              const botId = `bot_${timestamp}_${random}_${i}`;

              // Create a bot player
              const botPlayer: Player = {
                id: botId,
                name: botName,
                isHost: false,
                isBot: true,
                isReady: true,
                hand: [],
                score: 0,
              };

              console.log(
                `[GameStore] Adding bot ${botName} with ID ${botId} to room ${roomId}`
              );

              // Add to local state
              newPlayers.push(botPlayer);

              // Send message to add bot to the room with the correct payload structure
              const result = await get().sendMessage({
                type: "player:joined",
                payload: {
                  id: botId,
                  name: botName,
                  isHost: false,
                  isBot: true,
                  isReady: true,
                  roomId,
                  // Don't include player or playerName/playerId fields to avoid confusion
                },
              });

              console.log(
                `[GameStore] Bot ${botName} add message result: ${
                  result ? "success" : "failed"
                }`
              );

              // Slight delay between adding bots
              await new Promise((resolve) => setTimeout(resolve, 500));
            }

            // Update local state with the new players
            set({ players: newPlayers });

            // If room is now full, enable start game
            if (newPlayers.length === 4) {
              set({
                statusMessage: "Room is full. Start the game when ready.",
              });

              // Clear message after a delay
              setTimeout(() => {
                set({ statusMessage: null });
              }, 3000);
            }
          } catch (error) {
            console.error("[GameStore] Error adding bots:", error);
          } finally {
            // Reset loading state
            set({ isAddingBots: false });
          }
        },

        playCard: (card) => {
          const { roomId, currentRoom, currentPlayer, gameStatus } = get();
          const user = useAuthStore.getState().user;
          const { showToast } = useUIStore.getState();

          if (!roomId || !currentRoom || !user) {
            console.error("[GameStore] Cannot play card, no active room");
            return;
          }

          // Check if the game is in the playing phase
          if (gameStatus !== "playing") {
            console.error(
              `[GameStore] Cannot play card when not in playing phase (current: ${gameStatus})`
            );

            // Provide a more helpful message based on the current phase
            let errorMessage = "";
            switch (gameStatus) {
              case "initial_deal":
                errorMessage =
                  "Please wait for the initial 5 cards to be dealt and select a trump suit first.";
                break;
              case "bidding":
                errorMessage =
                  "Trump suit has been selected. Please wait for the remaining 8 cards to be dealt.";
                break;
              case "final_deal":
                errorMessage =
                  "Dealing remaining 8 cards. Please wait for the game to start.";
                break;
              case "ended":
                errorMessage = "Game has ended. Please start a new game.";
                break;
              default:
                errorMessage = `Cannot play card yet. Current phase: ${gameStatus}`;
            }

            showToast(errorMessage, "warning");
            return;
          }

          // Check if it's the user's turn
          if (currentPlayer !== user.username && currentPlayer !== "") {
            console.error(
              `[GameStore] Not your turn. Current player: ${currentPlayer}`
            );
            showToast(
              `Not your turn. Current player: ${currentPlayer}`,
              "warning"
            );
            return;
          }

          // Send play card message (in real implementation)
          get().sendMessage({
            type: "game:play-card",
            payload: {
              roomId,
              playerId: user.id,
              card,
              gamePhase: gameStatus, // Include the current game phase in the payload
            },
          });

          // Update current trick (in real app, this would come from the server)
          const updatedTrick = [...get().currentTrick, card];
          set({
            currentTrick: updatedTrick,
          });

          // If trick is complete (4 cards), determine winner
          if (updatedTrick.length === 4) {
            setTimeout(() => {
              set({ currentTrick: [] });
            }, 1500);
          }
        },

        placeBid: (bid) => {
          const { roomId, currentRoom } = get();
          const user = useAuthStore.getState().user;

          if (!roomId || !currentRoom || !user) {
            console.error("[GameStore] Cannot place bid, no active room");
            return;
          }

          // Send bid message (in real implementation)
          get().sendMessage({
            type: "game:bid",
            payload: {
              roomId,
              playerId: user.id,
              bid,
            },
          });
        },

        selectTrump: (suit) => {
          const { roomId, currentRoom } = get();
          const user = useAuthStore.getState().user;
          const { setShowTrumpPopup, showToast } = useUIStore.getState();

          if (!roomId || !currentRoom || !user) {
            console.error("[GameStore] Cannot select trump, no active room");
            return;
          }

          // Send trump selection message (in real implementation)
          get().sendMessage({
            type: "game:select-trump",
            payload: {
              roomId,
              playerId: user.id,
              suit,
            },
          });

          // Update local state (in real app, this would be confirmed by the server)
          set({
            trumpSuit: suit,
            votingComplete: true,
            gameStatus: "bidding",
          });

          // Show toast notification
          showToast(`Trump suit selected: ${suit}`, "success");

          // Simulate transition to next phase after a short delay
          setTimeout(() => {
            // Close the trump selection popup
            setShowTrumpPopup(false);

            // Move to final deal phase
            set({
              gameStatus: "final_deal",
              initialCardsDeal: false,
              statusMessage: "Dealing remaining 8 cards...",
            });

            // Show toast notification
            showToast("Dealing remaining 8 cards...", "info");

            // Then to playing phase after a longer delay to ensure all transitions complete
            setTimeout(() => {
              // First check if we're still in final_deal phase (to avoid race conditions)
              if (get().gameStatus === "final_deal") {
                set({
                  gameStatus: "playing",
                  statusMessage: "Game started! Your turn to play...",
                });

                // Show toast notification
                showToast("Game started! Your turn to play...", "success");

                // Broadcast that we're in playing phase
                // Only send this message if we're the host to avoid multiple messages
                const user = useAuthStore.getState().user;
                const currentRoom = get().currentRoom;
                const isHost = currentRoom?.players.some(
                  (player) => player.id === user?.id && player.isHost
                );

                if (isHost) {
                  console.log(
                    "[GameStore] Host is broadcasting game:playing-started"
                  );
                  get().sendMessage({
                    type: "game:playing-started",
                    payload: {
                      roomId,
                      gamePhase: "playing",
                    },
                  });
                }

                // Clear status message after a delay
                setTimeout(() => {
                  set({ statusMessage: null });
                }, 2000);
              }
            }, 5000); // Increased delay to ensure all transitions complete
          }, 2000);
        },

        // Game state update helpers
        updateGameState: (newState) => {
          set((state) => {
            // First update the currentRoom.gameState if it exists
            const updatedRoom = state.currentRoom
              ? {
                  ...state.currentRoom,
                  gameState: {
                    ...state.currentRoom.gameState,
                    ...newState,
                  },
                }
              : null;

            // Then update the individual state fields
            return {
              currentRoom: updatedRoom,
              ...(newState.trumpSuit !== undefined && {
                trumpSuit: newState.trumpSuit,
              }),
              ...(newState.gamePhase !== undefined && {
                gameStatus: newState.gamePhase as GameStatus,
              }),
              ...(newState.scores !== undefined && { scores: newState.scores }),
            };
          });
        },

        setStatusMessage: (message) => set({ statusMessage: message }),

        setIsAddingBots: (isAddingBots) => set({ isAddingBots }),

        setTrumpSuit: (trumpSuit) => set({ trumpSuit }),

        setCurrentTrick: (currentTrick) => set({ currentTrick }),

        setCurrentPlayer: (currentPlayer) => set({ currentPlayer }),

        updateScores: (newScores) => set({ scores: newScores }),

        // Game flow helpers
        setShowShuffleAnimation: (showShuffleAnimation) =>
          set({ showShuffleAnimation }),

        setInitialCardsDeal: (initialCardsDeal) => set({ initialCardsDeal }),

        setIsPhaseTransitioning: (isPhaseTransitioning) =>
          set({ isPhaseTransitioning }),

        setPhaseTransitionMessage: (phaseTransitionMessage) =>
          set({ phaseTransitionMessage }),

        setIsGameBoardReady: (isGameBoardReady) => set({ isGameBoardReady }),

        setVotingComplete: (votingComplete) => set({ votingComplete }),

        // Real-time communication implementation
        sendMessage: async (message) => {
          console.log("[GameStore] Sending message:", message);
          let success = false;

          // Get current room ID and user info
          const { roomId } = get();
          const user = useAuthStore.getState().user;
          const { showToast } = useUIStore.getState();

          if (!roomId) {
            console.error("[GameStore] Cannot send message: No active room ID");
            showToast("Cannot send message: No active room", "error");
            return false;
          }

          if (!user || !user.id) {
            console.error(
              "[GameStore] Cannot send message: No authenticated user or missing user ID"
            );
            showToast("Cannot send message: Authentication issue", "error");
            return false;
          }

          try {
            // Ensure proper payload structure based on message type
            let enhancedPayload = {
              ...message.payload,
              roomId: message.payload?.roomId || roomId,
            };

            // Only add player info if this is not a bot message
            if (!message.payload?.isBot) {
              enhancedPayload.playerName =
                message.payload?.playerName || user.username || "Player";
              enhancedPayload.playerId = message.payload?.playerId || user.id;
            }

            // For player:joined messages, ensure player object is properly structured
            if (message.type === "player:joined") {
              // For bot messages, don't add a player object to avoid confusion
              if (
                !message.payload?.isBot &&
                (!enhancedPayload.player ||
                  typeof enhancedPayload.player !== "object")
              ) {
                // Make sure we have valid player ID and name
                const playerId = enhancedPayload.playerId || user.id;
                const playerName =
                  enhancedPayload.playerName || user.username || "Player";

                if (!playerId) {
                  console.error(
                    "[GameStore] Cannot create player object: Missing player ID"
                  );
                  return false;
                }

                enhancedPayload.player = {
                  id: playerId,
                  name: playerName,
                  isHost: enhancedPayload.isHost || false,
                  isBot: enhancedPayload.isBot || false,
                  isReady: true,
                  hand: [],
                  score: 0,
                };
              }
            }

            // First attempt: send via API endpoint for reliability
            const response = await fetch("/api/realtime", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ...message,
                roomId: enhancedPayload.roomId,
                playerName: enhancedPayload.playerName,
                playerId: enhancedPayload.playerId,
                // Include additional essential fields for the API
                type: message.type,
                payload: enhancedPayload,
              }),
            });

            if (response.ok) {
              success = true;
              console.log("[GameStore] Message sent successfully via API");
            } else {
              let errorText = "Unknown error";
              try {
                errorText = await response.text();
                // Try to parse as JSON to get a more detailed error message
                try {
                  const errorJson = JSON.parse(errorText);
                  if (errorJson.error) {
                    errorText = errorJson.error;
                    showToast(`Error: ${errorJson.error}`, "error");
                  }
                } catch (parseError) {
                  // If it's not valid JSON, use the raw text
                }
              } catch (readError) {
                console.error(
                  "[GameStore] Error reading API response:",
                  readError
                );
              }

              console.error("[GameStore] API error:", errorText);

              // If API fails, fall back to direct Supabase Realtime
              try {
                // Import dynamically to avoid server-side import issues
                const { supabase } = await import("@/lib/supabase");

                // Create channel name based on room ID
                const channelName = `room:${roomId}`;

                // Ensure the message has player info before sending directly
                const enhancedMessage = {
                  ...message,
                  payload: enhancedPayload,
                };

                // Send message through Supabase Realtime directly
                const result = await supabase.channel(channelName).send({
                  type: "broadcast",
                  event: "message",
                  payload: enhancedMessage,
                });

                if (result === "ok") {
                  success = true;
                  console.log(
                    "[GameStore] Message sent successfully via Supabase Realtime"
                  );
                } else {
                  showToast(
                    "Failed to send message through realtime channel",
                    "error"
                  );
                }
              } catch (supabaseError) {
                console.error(
                  "[GameStore] Supabase realtime error:",
                  supabaseError
                );
                showToast("Communication error. Please try again.", "error");
              }
            }
          } catch (error) {
            console.error("[GameStore] Error sending message:", error);
            showToast("Error sending message. Please try again.", "error");
          }

          // Update connection status based on message success
          if (!success) {
            set({ isConnected: false });
            // Show a connection lost toast
            showToast("Connection lost. Please refresh the page.", "error");
          }

          return success;
        },

        subscribeToRealtime: async () => {
          const { roomId } = get();

          if (!roomId) {
            console.error("[GameStore] Cannot subscribe: No active room ID");
            return;
          }

          try {
            // Import dynamically to avoid server-side import issues
            const { supabase } = await import("@/lib/supabase");

            // Create and subscribe to the room channel
            const channelName = `room:${roomId}`;
            const channel = supabase.channel(channelName, {
              config: {
                broadcast: { self: false },
                presence: { key: "" }, // Enable presence for connection reliability
              },
            });

            // Handle different message types
            channel.on("broadcast", { event: "message" }, (payload) => {
              try {
                if (!payload || !payload.payload) {
                  console.warn("[GameStore] Received empty broadcast payload");
                  return;
                }

                const message = payload.payload;
                console.log("[GameStore] Received realtime message:", message);

                // Check for valid message structure before processing
                if (!message || typeof message !== "object") {
                  console.warn(
                    "[GameStore] Received empty or invalid message payload:",
                    payload
                  );
                  return;
                }

                // Check for valid message type
                if (!message.type || typeof message.type !== "string") {
                  console.warn(
                    "[GameStore] Message missing type property:",
                    message
                  );
                  return;
                }

                // Set connected status to true since we're receiving messages
                set({ isConnected: true });

                // Process message based on type
                switch (message.type) {
                  case "player:joined":
                    // Enhanced safety check for message payload structure
                    // The payload can either be a player object directly or contain a nested player property
                    let playerObject = null;

                    // Check if we have a valid payload
                    if (!message.payload) {
                      console.warn(
                        "[GameStore] Received player:joined message with empty payload:",
                        message
                      );
                      break;
                    }

                    // Handle both payload formats: direct player object or nested player object
                    if (
                      message.payload.player &&
                      typeof message.payload.player === "object"
                    ) {
                      // If payload has a player field, use it
                      playerObject = message.payload.player;
                    } else if (message.payload.id && message.payload.name) {
                      // If payload itself has player properties, treat it as the player
                      playerObject = message.payload;
                    } else {
                      console.warn(
                        "[GameStore] Invalid player:joined message format:",
                        message
                      );
                      break;
                    }

                    // Ensure the player has an id before attempting to filter
                    if (!playerObject.id) {
                      console.warn(
                        "[GameStore] Player object is missing id:",
                        playerObject
                      );
                      break;
                    }

                    set((state) => {
                      // Additional safety check for state.players
                      const currentPlayers = Array.isArray(state.players)
                        ? state.players
                        : [];

                      // Check if player already exists
                      const playerExists = currentPlayers.some(
                        (p) => p && p.id && p.id === playerObject.id
                      );

                      // If player already exists, don't add them again
                      if (playerExists) {
                        console.log(
                          `[GameStore] Player ${playerObject.name} already exists, not adding duplicate`
                        );
                        return state; // Return unchanged state
                      }

                      // Add the new player
                      return {
                        players: [...currentPlayers, playerObject],
                      };
                    });
                    break;

                  case "player:left":
                    // Safety check for playerId
                    const playerId = message.payload?.playerId;
                    if (!playerId) {
                      console.error(
                        "[GameStore] Missing playerId in player:left message:",
                        message
                      );
                      break;
                    }

                    set((state) => {
                      // Additional safety check for state.players
                      const currentPlayers = Array.isArray(state.players)
                        ? state.players
                        : [];

                      return {
                        players: currentPlayers.filter(
                          (p) => p && p.id && p.id !== playerId
                        ),
                      };
                    });
                    break;

                  case "game:start":
                    // Handle game start message
                    set({
                      gameStatus: "initial_deal",
                      showShuffleAnimation: true,
                      initialCardsDeal: true,
                      statusMessage: "Game starting... Dealing initial cards",
                    });
                    break;

                  case "game:play-card":
                  case "game:card-played":
                    // Update current trick when a card is played
                    const playedCard = message.payload.card;
                    if (!playedCard) {
                      console.error(
                        "[GameStore] Received card played message without card:",
                        message
                      );
                      break;
                    }

                    set((state) => ({
                      currentTrick: [...state.currentTrick, playedCard],
                    }));

                    // If this is the current player, reset the playing card state
                    const currentUser = useAuthStore.getState().user;
                    if (
                      currentUser &&
                      message.payload.playerId === currentUser.id
                    ) {
                      set({
                        playingCardId: null,
                        cardPlayLoading: false,
                      });
                    }
                    break;

                  case "game:select-trump":
                  case "game:trump-vote":
                    // Update trump suit when selected
                    const selectedSuit = message.payload.suit;
                    set({
                      trumpSuit: selectedSuit,
                      votingComplete: true,
                    });
                    break;

                  case "game:trump-selected":
                    // Trump has been selected by all players
                    if (message.payload && message.payload.suit) {
                      set({
                        trumpSuit: message.payload.suit,
                        votingComplete: true,
                        gameStatus: "bidding",
                      });
                    }
                    break;

                  case "game:update":
                  case "game:state-updated":
                    // Generic game state update
                    if (message.payload.gameState) {
                      // If we received a nested gameState object
                      get().updateGameState(message.payload.gameState);
                    } else if (
                      message.payload &&
                      typeof message.payload === "object"
                    ) {
                      // If we received the gameState directly
                      get().updateGameState(message.payload);
                    } else {
                      console.error(
                        "[GameStore] Received invalid game state update:",
                        message.payload
                      );
                    }
                    break;

                  case "game:started":
                    // Safety check for game data
                    if (!message.payload) {
                      console.error(
                        "[GameStore] Received empty game:started message"
                      );
                      break;
                    }

                    console.log(
                      "[GameStore] Received game:started message:",
                      message.payload
                    );

                    // Handle both formats: either the room object directly or a nested game object
                    if (message.payload.gameState) {
                      // If we received the full room object
                      set((state: GameStoreState) => ({
                        ...state,
                        currentRoom: message.payload,
                        gameStatus: "initial_deal",
                        showShuffleAnimation: true,
                        initialCardsDeal: true,
                        statusMessage: "Game starting... Dealing initial cards",
                        isGameStarted: true,
                      }));
                    } else if (message.payload.game) {
                      // If we received a nested game object
                      set((state: GameStoreState) => ({
                        ...state,
                        currentGame: message.payload.game,
                        isGameStarted: true,
                      }));
                    } else {
                      console.error(
                        "[GameStore] Received invalid game:started message format:",
                        message.payload
                      );
                    }
                    break;

                  case "game:updated":
                    // Safety check for game data
                    if (!message.payload) {
                      console.error(
                        "[GameStore] Received empty game:updated message"
                      );
                      break;
                    }

                    console.log(
                      "[GameStore] Received game:updated message:",
                      message.payload
                    );

                    // Handle both formats: either the room object directly or a nested game object
                    if (message.payload.gameState) {
                      // If we received the full room object
                      set((state: GameStoreState) => ({
                        ...state,
                        currentRoom: message.payload,
                      }));
                    } else if (message.payload.game) {
                      // If we received a nested game object
                      const updatedGame = message.payload.game;
                      set((state: GameStoreState) => ({
                        ...state,
                        currentGame: updatedGame,
                      }));
                    } else {
                      console.error(
                        "[GameStore] Received invalid game:updated message format:",
                        message.payload
                      );
                    }
                    break;

                  case "game:final-deal":
                    // Final cards have been dealt
                    set({
                      gameStatus: "final_deal",
                      initialCardsDeal: false,
                      statusMessage: "All cards dealt. Game starting soon...",
                    });

                    // Show toast notification
                    showToast("All cards dealt. Game starting soon...", "info");

                    // Automatically transition to playing phase after a delay
                    setTimeout(() => {
                      // First check if we're still in final_deal phase (to avoid race conditions)
                      if (get().gameStatus === "final_deal") {
                        set({
                          gameStatus: "playing",
                          statusMessage: "Game started! Your turn to play...",
                        });

                        // Show toast notification
                        showToast(
                          "Game started! Your turn to play...",
                          "success"
                        );

                        // Clear status message after a delay
                        setTimeout(() => {
                          set({ statusMessage: null });
                        }, 2000);
                      }
                    }, 5000); // Increased delay to ensure all transitions complete
                    break;

                  case "game:playing-started":
                    // Game has started playing phase
                    console.log(
                      "[GameStore] Received game:playing-started message"
                    );

                    // Only update if we're not already in playing phase
                    if (get().gameStatus !== "playing") {
                      set({
                        gameStatus: "playing",
                        statusMessage: "Game started! Your turn to play...",
                      });

                      // Show toast notification
                      showToast(
                        "Game started! Your turn to play...",
                        "success"
                      );

                      // Clear status message after a delay
                      setTimeout(() => {
                        set({ statusMessage: null });
                      }, 2000);
                    }
                    break;

                  case "game:over":
                    // Game has ended
                    set({
                      gameStatus: "ended",
                      statusMessage: message.payload?.winner
                        ? `Game over! ${
                            message.payload.winner === "royals"
                              ? "Royals"
                              : "Rebels"
                          } win!`
                        : "Game over!",
                    });
                    break;

                  default:
                    console.log(
                      "[GameStore] Unhandled message type:",
                      message.type
                    );
                }
              } catch (error) {
                console.error(
                  "[GameStore] Error processing realtime message:",
                  error
                );
              }
            });

            // Handle presence updates (players online status)
            channel.on("presence", { event: "sync" }, () => {
              const state = channel.presenceState();
              console.log("[GameStore] Presence state updated:", state);
            });

            // Subscribe to the channel
            channel.subscribe((status) => {
              console.log("[GameStore] Channel subscription status:", status);

              if (status === "SUBSCRIBED") {
                set({ isConnected: true });
              } else if (
                status === "CHANNEL_ERROR" ||
                status === "CLOSED" ||
                status === "TIMED_OUT"
              ) {
                set({ isConnected: false });
              }
            });
          } catch (error) {
            console.error("[GameStore] Error subscribing to realtime:", error);
            set({ isConnected: false });
          }
        },
      }),
      {
        name: "game-storage",
        storage: createJSONStorage(() => localStorage),
        // Only persist a subset of the state to avoid storage bloat
        partialize: (state) => ({
          roomId: state.roomId,
          gameMode: state.gameMode,
        }),
      }
    )
  )
);
