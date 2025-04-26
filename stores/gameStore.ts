import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { GameRoom, Player, GameState, Card, Suit } from "@/app/types/game";
import { devtools } from "zustand/middleware";
import { useAuthStore } from "./authStore";
import { useUIStore } from "./uiStore";
import { toast } from "sonner";

// Card deck helper functions
function createDeck(): Card[] {
  const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
  ] as const;

  const deck: Card[] = [];
  let id = 1;

  suits.forEach((suit) => {
    ranks.forEach((rank) => {
      deck.push({
        id: `${rank}_of_${suit}`,
        suit,
        rank,
      });
    });
  });

  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  // Create a copy of the deck to avoid mutating the original
  const shuffled = [...deck];

  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// Helper function to determine the winner of a trick
function determineTrickWinner(
  trick: Card[],
  trumpSuit: Suit | null
): { playerId: string; playerName: string } {
  // This is a simplified version - in a real game, you'd need to track which player played which card
  // and have more sophisticated logic based on game rules

  // For now, just select the highest card of the leading suit or trump
  if (trick.length === 0) {
    return { playerId: "", playerName: "Unknown" };
  }

  // Get the lead suit (the suit of the first card played)
  const leadSuit = trick[0].suit;

  // Get the rank ordering for comparing cards
  const rankOrder = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
  ];

  // Find the highest card based on game rules
  let winningCard = trick[0];
  let winningPlayerIndex = 0;

  for (let i = 1; i < trick.length; i++) {
    const card = trick[i];
    const isTrump = trumpSuit && card.suit === trumpSuit;
    const isWinningCardTrump = trumpSuit && winningCard.suit === trumpSuit;

    // If current card is trump and winning card is not, current card wins
    if (isTrump && !isWinningCardTrump) {
      winningCard = card;
      winningPlayerIndex = i;
    }
    // If both cards are trump or neither is trump, compare based on rank
    else if (
      (isTrump && isWinningCardTrump) ||
      (!isTrump && !isWinningCardTrump)
    ) {
      // If same suit, compare ranks
      if (card.suit === winningCard.suit) {
        const cardRankIndex = rankOrder.indexOf(card.rank);
        const winningRankIndex = rankOrder.indexOf(winningCard.rank);

        if (cardRankIndex > winningRankIndex) {
          winningCard = card;
          winningPlayerIndex = i;
        }
      }
      // If current card follows lead suit and winning card doesn't, current card wins
      else if (card.suit === leadSuit && winningCard.suit !== leadSuit) {
        winningCard = card;
        winningPlayerIndex = i;
      }
    }
  }

  // In a real implementation, you'd map the winning player index to a real player
  // For now, just return a placeholder
  return {
    playerId: `player-${winningPlayerIndex}`,
    playerName: `Player ${winningPlayerIndex + 1}`,
  };
}

// Helper function to get the next player
function getNextPlayer(currentPlayer: string): string {
  // This is a simplified version - in a real game, you'd need to determine the next player
  // based on the current player and the order of play

  // For now, just return a placeholder for the next player
  // In a real implementation, you'd map to the next player in order
  return currentPlayer === "Player 1"
    ? "Player 2"
    : currentPlayer === "Player 2"
    ? "Player 3"
    : currentPlayer === "Player 3"
    ? "Player 4"
    : "Player 1";
}

export type GameMode = "classic" | "frenzy";
export type GameStatus =
  | "waiting"
  | "initial_deal"
  | "bidding"
  | "final_deal"
  | "playing"
  | "finished";

export interface GameStoreState {
  // Room and players data
  roomId: string | null;
  currentRoom: GameRoom | null;
  players: Player[];
  isLoading: boolean;
  isConnected: boolean;
  userId: string | null;

  // Game configuration
  gameMode: GameMode;

  // Core game state
  gameStatus: GameStatus;
  trumpSuit: Suit | null;
  currentTrick: Card[];
  scores: { royals: number; rebels: number };
  currentPlayer: string;

  // Add this new field for team assignments
  teamAssignments: Record<string, "royals" | "rebels">;

  // Additional game state
  specialPowers?: Record<string, boolean>;
  remainingDeck?: Card[];

  // UI state flags
  showShuffleAnimation: boolean;
  initialCardsDeal: boolean;
  statusMessage: string | null;
  isAddingBots: boolean;
  isPhaseTransitioning: boolean;
  phaseTransitionMessage: string;
  isGameBoardReady: boolean;
  votingComplete: boolean;
  trumpSelectionInProgress: boolean;

  // Add this to track played cards per player
  playedCards: Record<string, string[]>; // playerId -> array of card IDs played

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
  updateGameState: (newState: any) => void;
  setStatusMessage: (message: string | null) => void;
  setIsAddingBots: (value: boolean) => void;
  setTrumpSuit: (suit: Suit) => void;
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

  // Add a new action to set team assignments
  setTeamAssignments: (teams: Record<string, "royals" | "rebels">) => void;

  // Add a new action to update played cards
  updatePlayedCards: (playerId: string, cardId: string) => void;
}

export const useGameStore = create<GameStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        // Default state
        roomId: null,
        currentRoom: null,
        players: [],
        gameMode: "classic",
        gameStatus: "waiting",
        isLoading: true,
        isConnected: false,
        userId: null,

        trumpSuit: null,
        currentTrick: [],
        scores: { royals: 0, rebels: 0 },
        currentPlayer: "",
        teamAssignments: {}, // Add empty team assignments object
        specialPowers: undefined,
        remainingDeck: undefined,
        playedCards: {}, // Initialize the played cards tracking

        showShuffleAnimation: false,
        initialCardsDeal: false,
        statusMessage: null,
        isAddingBots: false,
        isPhaseTransitioning: false,
        phaseTransitionMessage: "",
        isGameBoardReady: false,
        votingComplete: false,
        trumpSelectionInProgress: false,

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

        setGameStatus: (gameStatus) => {
          console.log(`[GameStore] Setting game status to ${gameStatus}`);
          set({ gameStatus });

          // Also update the gameState in currentRoom to keep it in sync
          const currentRoom = get().currentRoom;
          if (currentRoom && currentRoom.gameState) {
            set({
              currentRoom: {
                ...currentRoom,
                gameState: {
                  ...currentRoom.gameState,
                  gamePhase: gameStatus,
                },
              },
            });
          }

          console.log("[GameStore] Game status set to:", get().gameStatus);
        },

        setRoomId: (roomId) => set({ roomId }),

        setLoading: (isLoading) => set({ isLoading }),

        setConnected: (isConnected) => set({ isConnected }),

        // Game actions
        joinRoom: async (roomId, playerName) => {
          const user = useAuthStore.getState().user;
          const { currentRoom, players, gameStatus } = get();

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

          // Preserve current gameStatus if it's not waiting - this means we've restored state
          const preserveGameStatus = gameStatus !== "waiting";
          console.log(
            `[GameStore] Current gameStatus: ${gameStatus}, preserving: ${preserveGameStatus}`
          );

          // Either use existing players or create a new list if there are no existing players
          const existingPlayers = players.length > 0 ? [...players] : [];

          // Check if our user is already in the players list
          const userExists = existingPlayers.some((p) => p.id === user.id);

          // Create the current user player object
          const currentUserPlayer = {
            id: user.id,
            name: user.username,
            isHost: existingPlayers.length === 0, // Only be host if first player
            isBot: false,
            isReady: true,
            hand: [],
            score: 0,
          };

          // If we have existing players but user isn't in the list, add them
          if (existingPlayers.length > 0 && !userExists) {
            existingPlayers.push(currentUserPlayer);
          }

          // Prepare the player list
          const updatedPlayers =
            existingPlayers.length > 0 ? existingPlayers : [currentUserPlayer];

          console.log("[GameStore] Updated players list:", updatedPlayers);

          // For now, we'll just simulate joining a room
          const mockRoom: GameRoom = {
            id: roomId,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            players: updatedPlayers,
            gameState: {
              currentTurn: null,
              trumpSuit: get().trumpSuit, // Preserve trump suit
              currentBid: 0,
              currentBidder: null,
              trickCards: {},
              roundNumber: 0,
              gamePhase: preserveGameStatus ? gameStatus : "waiting",
              teams: {
                royals: [],
                rebels: [],
              },
              scores: get().scores, // Preserve scores
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

          set((state) => ({
            currentRoom: mockRoom,
            players: updatedPlayers,
            isLoading: false,
            isConnected: true,
            // Preserve the current gameStatus if we've recovered state
            gameStatus: preserveGameStatus ? state.gameStatus : "waiting",
          }));

          // Send join message to the server
          const joinSuccess = await get().sendMessage({
            type: "room:join",
            payload: {
              roomId,
              player: {
                id: user.id,
                name: user.username,
                isHost: existingPlayers.length === 0, // Only be host if first player
                isBot: false,
                isReady: true,
              },
              playerName: user.username, // Add explicit playerName field
              playerId: user.id, // Add explicit playerId field
              // Include the current game state so other clients can sync
              currentGameStatus: get().gameStatus,
              preservedState: preserveGameStatus,
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
          const { currentRoom, players } = get();

          if (!currentRoom) {
            console.error("[GameStore] No active room, cannot start game");
            return;
          }

          // Validation: Make sure we have enough players
          if (players.length < 4) {
            console.error(
              `[GameStore] Not enough players to start (${players.length}/4)`
            );
            return;
          }

          console.log("[GameStore] Starting game...");

          // Initialize team assignments if they don't exist
          if (Object.keys(get().teamAssignments).length === 0) {
            const teams: Record<string, "royals" | "rebels"> = {};

            players.forEach((player, index) => {
              // Even indices (0, 2) are Royals, odd indices (1, 3) are Rebels
              teams[player.name] = index % 2 === 0 ? "royals" : "rebels";
            });

            set({ teamAssignments: teams });
            console.log("[GameStore] Created initial team assignments:", teams);
          }

          // Set the game status to initial deal and enable shuffle animation
          set({
            gameStatus: "initial_deal",
            initialCardsDeal: true, // Explicitly set initialCardsDeal to true
            showShuffleAnimation: true,
          });

          console.log(
            "[GameStore] Game status set to initial_deal, initialCardsDeal=true"
          );

          // Ensure all players have the same gameState, using a real-time message
          get().sendMessage({
            type: "game:start",
            payload: {
              roomId: currentRoom.id,
              gamePhase: "initial_deal",
              initialCardsDeal: true,
              teamAssignments: get().teamAssignments, // Send team assignments to all players
            },
          });
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
              "Merlin",
              "Lancelot",
              "Galahad",
              "Guinevere",
              "Arthur",
              "Morgana",
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
            }

            // Update local state with the new players
            set({ players: newPlayers });
            set({
              currentRoom: {
                id: roomId,
                gameState: get().currentRoom?.gameState || {
                  currentTurn: null,
                  trumpSuit: null,
                  currentBid: 0,
                  currentBidder: null,
                  trickCards: {},
                  roundNumber: 0,
                  gamePhase: "waiting",
                  teams: { royals: [], rebels: [] },
                  scores: { royals: 0, rebels: 0 },
                  consecutiveTricks: { royals: 0, rebels: 0 },
                  lastTrickWinner: null,
                  dealerIndex: 0,
                  trumpCaller: null,
                },
                createdAt: get().currentRoom?.createdAt || Date.now(),
                lastActivity: Date.now(),
                players: newPlayers,
              },
            });

            console.log("Add bots currentRoom : ", get().currentRoom);
            console.log("Add bots currentRoom : ", get().players);

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
          const {
            roomId,
            currentRoom,
            currentPlayer,
            gameStatus,
            currentTrick,
          } = get();
          const user = useAuthStore.getState().user;

          // Extract UI methods before any state changes
          const uiStore = useUIStore.getState();
          const { showToast, setCardPlayLoading, setPlayingCardId } = uiStore;

          if (!roomId || !currentRoom || !user) {
            console.error("[GameStore] Cannot play card, no active room");
            return;
          }

          // Check if the game is in the playing phase
          if (gameStatus !== "playing") {
            console.error(
              `[GameStore] Cannot play card when not in playing phase (current: ${gameStatus})`
            );

            // Provide more helpful message based on current phase
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
              case "finished":
                errorMessage = "Game has finished. Please start a new game.";
                break;
              default:
                errorMessage = `Cannot play card yet. Current phase: ${gameStatus}`;
            }

            showToast(errorMessage, "warning");
            return;
          }

          // Check if it's the user's turn - currentPlayer should be the username
          if (currentPlayer && currentPlayer !== user.username) {
            console.error(
              `[GameStore] Not your turn. Current player: ${currentPlayer}`
            );
            showToast(
              `Not your turn. Current player: ${currentPlayer}`,
              "warning"
            );
            return;
          }

          // Check if this is a duplicate play
          const isCardAlreadyInTrick = currentTrick.some(
            (c) =>
              c.id === card.id && c.suit === card.suit && c.rank === card.rank
          );

          if (isCardAlreadyInTrick) {
            console.log(
              "[GameStore] Card already in current trick, ignoring duplicate play"
            );
            return;
          }

          // Set loading state while card is being played
          setCardPlayLoading(true);
          // Convert card ID to a number if needed for the UI store
          const numericCardId =
            typeof card.id === "string"
              ? parseInt(card.id.replace(/\D/g, ""), 10) || 0
              : 0;
          setPlayingCardId(numericCardId);

          // Update played cards for this user
          if (user && card.id) {
            get().updatePlayedCards(user.id, card.id);
          }

          // Send play card message to the server
          get().sendMessage({
            type: "game:play-card",
            payload: {
              roomId,
              playerId: user.id,
              playerName: user.username,
              card,
              gamePhase: gameStatus,
            },
          });

          // Also update the local state to reflect the played card
          const updatedTrick = [...currentTrick, card];
          set({ currentTrick: updatedTrick });

          // Update player's hand
          set((state) => ({
            players: state.players.map((p) => {
              if (p.id === user.id) {
                // Remove the played card from the player's hand
                return {
                  ...p,
                  hand: p.hand.filter((c) => c.id !== card.id),
                };
              }
              return p;
            }),
          }));
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

        selectTrump: (suit: Suit) => {
          const { currentRoom, userId } = get();
          if (!currentRoom || !userId) {
            console.error(
              "[GameStore] Cannot start trump selection: no active room or user"
            );
            return;
          }

          // Just send out a message that voting is underway
          toast.info(`Trump selection started! Vote for your preferred suit.`);

          // Set the selection phase
          set({ trumpSelectionInProgress: true });
        },

        // Add a new function to set the trump suit from voting results
        setTrumpSuit: (suit: Suit) => {
          const { currentRoom } = get();
          if (!currentRoom) {
            console.error("[GameStore] Cannot set trump suit: no active room");
            return;
          }

          // Mark selection as complete and set the trump suit
          set({
            trumpSuit: suit,
            trumpSelectionInProgress: false,
            gameStatus: "bidding", // Move to bidding phase after trump is selected
          });

          console.log(`[GameStore] Trump suit set to ${suit}`);
          toast.success(`Trump suit selected: ${suit}`);
        },

        // Game state update helpers
        updateGameState: (newState) => {
          set((state) => {
            // Create an updated room with the new game state
            const updatedRoom = state.currentRoom
              ? {
                  ...state.currentRoom,
                  gameState: {
                    ...state.currentRoom.gameState,
                    ...newState,
                  },
                }
              : null;

            // Update all the relevant direct state properties
            // to keep the state synchronized
            const updatedState: Partial<GameStoreState> = {
              currentRoom: updatedRoom,
            };

            // Process special update fields
            if (newState.updateField === "game_end") {
              console.log(
                "[GameStore] Game end signal received, updating game status to finished"
              );
              updatedState.gameStatus = "finished";
              // Also set it in gamePhase for consistency
              if (updatedRoom) {
                updatedRoom.gameState.gamePhase = "finished";
              }
            }

            // Map fields from newState to the top-level state
            if (newState.trumpSuit !== undefined) {
              updatedState.trumpSuit = newState.trumpSuit;
            }

            if (newState.gamePhase !== undefined) {
              updatedState.gameStatus = newState.gamePhase as GameStatus;
            }

            if (newState.scores !== undefined) {
              updatedState.scores = newState.scores;
            }

            if (newState.currentTurn !== undefined) {
              updatedState.currentPlayer = newState.currentTurn;
            }

            return updatedState;
          });
        },

        setStatusMessage: (message) => set({ statusMessage: message }),

        setIsAddingBots: (isAddingBots) => set({ isAddingBots }),

        setCurrentTrick: (trick: Card[]) => {
          set({ currentTrick: trick });

          // Also update in the room gameState
          const currentRoom = get().currentRoom;
          if (currentRoom) {
            // Update the gameState with the current trick
            set({
              currentRoom: {
                ...currentRoom,
                gameState: {
                  ...currentRoom.gameState,
                  trickCards: Object.fromEntries(
                    trick.map((card, index) => [index.toString(), card])
                  ), // Convert array to object for Supabase
                },
              },
            });
          }
        },

        setCurrentPlayer: (currentPlayer) => {
          set({ currentPlayer });

          // Also update in the room gameState
          const currentRoom = get().currentRoom;
          if (currentRoom) {
            set({
              currentRoom: {
                ...currentRoom,
                gameState: {
                  ...currentRoom.gameState,
                  currentTurn: currentPlayer,
                },
              },
            });
          }
        },

        updateScores: (scores) => {
          set({ scores });

          // Also update in the room gameState
          const currentRoom = get().currentRoom;
          if (currentRoom) {
            set({
              currentRoom: {
                ...currentRoom,
                gameState: {
                  ...currentRoom.gameState,
                  scores,
                },
              },
            });
          }
        },

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

            // Create the enhanced message with proper payload
            const enhancedMessage = {
              type: message.type,
              payload: enhancedPayload,
            };

            // Use supabase directly for real-time communication
            const { supabase } = await import("@/lib/supabase");

            // First attempt: send via API endpoint for security-critical operations
            const requiresServerProcessing =
              message.type === "room:create" ||
              message.type.includes("auth:") ||
              message.type === "game:end";

            let success = false;

            if (requiresServerProcessing) {
              // Use the server API for critical operations that need validation
              const response = await fetch("/api/realtime", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(enhancedMessage),
              });

              if (response.ok) {
                success = true;
                console.log("[GameStore] Message sent successfully via API");
              } else {
                console.error("[GameStore] API error:", await response.text());
              }
            } else {
              // Use Supabase Realtime directly for non-critical operations
              try {
                // Create channel name based on room ID
                const channelName = `room:${roomId}`;
                const channel = supabase.channel(channelName);

                // Send message directly through Supabase Realtime
                const result = await channel.send({
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
                  console.error(
                    "[GameStore] Failed to send via Supabase Realtime"
                  );

                  // Fallback to API if direct channel send fails
                  const response = await fetch("/api/realtime", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(enhancedMessage),
                  });

                  if (response.ok) {
                    success = true;
                    console.log(
                      "[GameStore] Message sent successfully via API (fallback)"
                    );
                  }
                }
              } catch (error) {
                console.error(
                  "[GameStore] Error with Supabase Realtime:",
                  error
                );
              }
            }

            // Update connection status based on message success
            if (!success) {
              set({ isConnected: false });
              // Show a connection lost toast
              const uiStore = useUIStore.getState();
              uiStore.showToast("Connection issue. Please try again.", "error");
            }

            return success;
          } catch (error) {
            console.error("[GameStore] Error sending message:", error);
            const uiStore = useUIStore.getState();
            uiStore.showToast(
              "Error sending message. Please try again.",
              "error"
            );
            return false;
          }
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
                    let preservedGameState = false;

                    // Check if we have a valid payload
                    if (!message.payload) {
                      console.warn(
                        "[GameStore] Received player:joined message with empty payload:",
                        message
                      );
                      break;
                    }

                    // Check if this message contains preserved game state
                    if (message.payload.preservedState === true) {
                      console.log(
                        "[GameStore] Player rejoined with preserved state:",
                        message.payload.currentGameStatus
                      );
                      preservedGameState = true;
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

                    // Check if we have team assignments but the new player doesn't have one
                    if (
                      Object.keys(get().teamAssignments).length > 0 &&
                      playerObject &&
                      playerObject.name &&
                      !get().teamAssignments[playerObject.name]
                    ) {
                      // Get current players in each team
                      const royalPlayers = Object.entries(
                        get().teamAssignments
                      ).filter(([_, team]) => team === "royals").length;
                      const rebelPlayers = Object.entries(
                        get().teamAssignments
                      ).filter(([_, team]) => team === "rebels").length;

                      // Assign to the team with fewer players, or if equal, alternate
                      const team =
                        royalPlayers < rebelPlayers
                          ? "royals"
                          : royalPlayers > rebelPlayers
                          ? "rebels"
                          : Object.keys(get().teamAssignments).length % 2 === 0
                          ? "royals"
                          : "rebels";

                      // Update team assignments
                      set((state) => ({
                        teamAssignments: {
                          ...state.teamAssignments,
                          [playerObject.name]: team,
                        },
                      }));

                      console.log(
                        `[GameStore] Assigned player ${playerObject.name} to team ${team}`
                      );
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

                      // If player has rejoined with preserved state, respect their current game status
                      const updatedState: Partial<GameStoreState> = {
                        players: [...currentPlayers, playerObject],
                      };

                      // If player rejoined with preserved state and this is not the first player,
                      // update our game state to match if it's in a more advanced phase
                      if (
                        preservedGameState &&
                        message.payload.currentGameStatus
                      ) {
                        const currentStatus = state.gameStatus;
                        const incomingStatus =
                          message.payload.currentGameStatus;

                        // Game Status priority: finished > playing > final_deal > bidding > initial_deal > waiting
                        const statusPriority: Record<GameStatus, number> = {
                          waiting: 0,
                          initial_deal: 1,
                          bidding: 2,
                          final_deal: 3,
                          playing: 4,
                          finished: 5,
                        };

                        // Only update if incoming status has higher priority
                        if (
                          statusPriority[incomingStatus as GameStatus] >
                          statusPriority[currentStatus]
                        ) {
                          console.log(
                            `[GameStore] Updating game status from ${currentStatus} to ${incomingStatus} based on rejoined player state`
                          );
                          updatedState.gameStatus =
                            incomingStatus as GameStatus;
                        }
                      }

                      return updatedState;
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

                    // Check if the message contains team assignments
                    if (message.payload.teamAssignments) {
                      console.log(
                        "[GameStore] Received team assignments from host:",
                        message.payload.teamAssignments
                      );
                      set({ teamAssignments: message.payload.teamAssignments });
                    }

                    // Deal initial cards to players
                    const deck = createDeck();
                    const shuffledDeck = shuffleDeck(deck);

                    // For the initial deal, each player gets 5 cards
                    const initialHands: Record<string, Card[]> = {};

                    // Get all players including the current user
                    const allPlayers = get().players;

                    // Deal 5 cards to each player
                    allPlayers.forEach((player, playerIndex) => {
                      initialHands[player.id] = shuffledDeck.slice(
                        playerIndex * 5,
                        (playerIndex + 1) * 5
                      );
                    });

                    // Update players with their initial hands
                    set((state) => {
                      const updatedPlayers = state.players.map((player) => ({
                        ...player,
                        hand: initialHands[player.id] || [],
                      }));

                      return {
                        players: updatedPlayers,
                      };
                    });

                    // Set remaining deck for final deal after trump selection
                    set({
                      remainingDeck: shuffledDeck.slice(allPlayers.length * 5),
                    });

                    console.log("[GameStore] Initial cards dealt to players");

                    // Show the trump selection popup after a longer delay to ensure state is updated
                    setTimeout(() => {
                      set({
                        showShuffleAnimation: false,
                        statusMessage:
                          "Initial 5 cards dealt. Select trump suit.",
                      });

                      // Log the current players state before showing popup
                      console.log(
                        "[GameStore] Player hands before showing popup:",
                        get().players.map((p) => ({
                          id: p.id,
                          name: p.name,
                          handLength: p.hand?.length || 0,
                        }))
                      );

                      // Show trump selection popup
                      useUIStore.getState().setShowTrumpPopup(true);
                    }, 3000); // Increase from 2000 to 3000 ms

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

                    // Check if this card is already in the current trick
                    const isDuplicatePlay = get().currentTrick.some(
                      (c) =>
                        c.id === playedCard.id &&
                        c.suit === playedCard.suit &&
                        c.rank === playedCard.rank
                    );

                    if (isDuplicatePlay) {
                      console.log(
                        "[GameStore] Duplicate card play detected, ignoring:",
                        playedCard
                      );
                      break;
                    }

                    console.log(
                      "[GameStore] Adding card to current trick:",
                      playedCard
                    );

                    // Create a deep copy of the current trick to avoid race conditions
                    const updatedTrick = [...get().currentTrick, playedCard];

                    // Get current player information
                    const currentUser = useAuthStore.getState().user;
                    const isCurrentUserPlaying =
                      currentUser &&
                      (message.payload.playerId === currentUser.id ||
                        message.payload.playerName === currentUser.username);

                    // Update player hands and the game state in one atomic operation
                    set((state) => {
                      // 1. Create updated player list with card removed from hand
                      const updatedPlayers = state.players.map((p) => {
                        // If this player played the card, remove it from their hand
                        if (
                          currentUser &&
                          (p.id === currentUser.id ||
                            p.name === currentUser.username) &&
                          isCurrentUserPlaying
                        ) {
                          console.log(
                            `[GameStore] Removing card ${playedCard.id} from ${p.name}'s hand`
                          );
                          return {
                            ...p,
                            hand: Array.isArray(p.hand)
                              ? p.hand.filter((c) => c.id !== playedCard.id)
                              : [],
                          };
                        }
                        return p;
                      });

                      // 2. Return a single atomic state update
                      return {
                        // Update the current trick with the played card
                        currentTrick: updatedTrick,
                        // Update the players array with the modified hand
                        players: updatedPlayers,
                      };
                    });

                    // Reset UI state for card play
                    if (isCurrentUserPlaying) {
                      const uiStore = useUIStore.getState();
                      uiStore.setPlayingCardId(null);
                      uiStore.setCardPlayLoading(false);
                    }

                    // Process trick completion logic
                    if (updatedTrick.length === 4) {
                      console.log(
                        "[GameStore] Trick complete, resolving winner"
                      );

                      // Simple trick resolution logic - just pick a winner
                      const trickWinner = determineTrickWinner(
                        updatedTrick,
                        get().trumpSuit
                      );

                      setTimeout(() => {
                        set({
                          currentTrick: [],
                          statusMessage: `${trickWinner.playerName} won the trick!`,
                        });

                        // Move to the next player (in a real game, this would be the trick winner)
                        const nextPlayerName = currentUser?.username || "";

                        setTimeout(() => {
                          set({
                            currentPlayer: nextPlayerName,
                            statusMessage: `Your turn to play!`,
                          });

                          // Clear status after a delay
                          setTimeout(() => {
                            set({ statusMessage: null });
                          }, 2000);
                        }, 1500);
                      }, 1500);
                    } else {
                      // Set current player to the current user's username
                      const currentUser = useAuthStore.getState().user;

                      // DO NOT create a test deck - use the player's existing hand
                      // Just update the game status and current player
                      set({
                        gameStatus: "playing",
                        statusMessage: "Game started! Your turn to play...",
                        // Set current player to actual username instead of "Player 1"
                        currentPlayer: currentUser?.username || "",
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
                    useUIStore
                      .getState()
                      .showToast(
                        "All cards dealt. Game starting soon...",
                        "info"
                      );

                    // Deal the remaining 8 cards to each player from the remainingDeck
                    const remainingCards = get().remainingDeck;
                    if (remainingCards && remainingCards.length >= 32) {
                      // 8 cards * 4 players = 32
                      console.log(
                        "[GameStore] Dealing remaining 8 cards to each player"
                      );

                      // Get all players
                      const allPlayers = get().players;

                      // Create object to hold the additional cards for each player
                      const additionalCards: Record<string, Card[]> = {};

                      // Deal 8 more cards to each player
                      allPlayers.forEach((player, playerIndex) => {
                        additionalCards[player.id] = remainingCards.slice(
                          playerIndex * 8,
                          (playerIndex + 1) * 8
                        );
                        console.log(
                          `[GameStore] Dealing 8 more cards to ${player.name} (ID: ${player.id})`
                        );
                      });

                      // Update players with their complete hands (5 initial + 8 more = 13 total)
                      set((state) => {
                        const updatedPlayers = state.players.map((player) => {
                          const playerAdditionalCards =
                            additionalCards[player.id] || [];
                          const updatedHand = [
                            ...player.hand,
                            ...playerAdditionalCards,
                          ];
                          console.log(
                            `[GameStore] Updated ${player.name}'s hand: ${player.hand.length} + ${playerAdditionalCards.length} = ${updatedHand.length} cards`
                          );
                          return {
                            ...player,
                            hand: updatedHand,
                          };
                        });

                        return {
                          players: updatedPlayers,
                          // Clear the remaining deck as it's now been dealt
                          remainingDeck: undefined,
                        };
                      });
                    } else {
                      console.error(
                        "[GameStore] No remaining cards to deal or insufficient cards",
                        remainingCards
                      );
                    }

                    // Automatically transition to playing phase after a delay
                    setTimeout(() => {
                      // First check if we're still in final_deal phase (to avoid race conditions)
                      if (get().gameStatus === "final_deal") {
                        set({
                          gameStatus: "playing",
                          statusMessage: "Game started! Your turn to play...",
                        });

                        // Show toast notification
                        useUIStore
                          .getState()
                          .showToast(
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
                      // Set current player to the current user's username
                      const currentUser = useAuthStore.getState().user;

                      // DO NOT create a test deck - use the properly dealt cards
                      // that should already be in the player's hand (5 initial + 8 after trump)

                      // Just update the game status and current player
                      set((state) => {
                        // Log the current player hands to verify they have the correct number of cards
                        console.log(
                          "[GameStore] Player hands when entering playing phase:",
                          state.players.map((p) => ({
                            id: p.id,
                            name: p.name,
                            handLength: p.hand?.length || 0,
                          }))
                        );

                        return {
                          gameStatus: "playing",
                          initialCardsDeal: false, // Important: Explicitly set initialCardsDeal to false
                          statusMessage: "Game started! Your turn to play...",
                          // Set current player to actual username instead of "Player 1"
                          currentPlayer: currentUser?.username || "",
                        };
                      });

                      // Force a refresh of the game board via a custom event
                      // This needs to run on the client side only
                      try {
                        if (typeof window !== "undefined") {
                          console.log(
                            "[GameStore] Dispatching force refresh event for playing state"
                          );
                          window.dispatchEvent(
                            new CustomEvent("game:refreshState", {
                              detail: {
                                source: "realtime",
                                phase: "playing",
                              },
                            })
                          );
                        }
                      } catch (error) {
                        console.error(
                          "[GameStore] Error dispatching refresh event:",
                          error
                        );
                      }
                    }
                    break;

                  case "game:over":
                    // Game has ended
                    set({
                      gameStatus: "finished",
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

        // Add setter for team assignments
        setTeamAssignments: (teams) => set({ teamAssignments: teams }),

        // Add the new action to update played cards
        updatePlayedCards: (playerId, cardId) => {
          set((state) => {
            // Get current played cards for this player or initialize empty array
            const currentPlayedCards = state.playedCards[playerId] || [];

            // Add the new card if it's not already in the array
            if (!currentPlayedCards.includes(cardId)) {
              return {
                playedCards: {
                  ...state.playedCards,
                  [playerId]: [...currentPlayedCards, cardId],
                },
              };
            }
            return state; // No change if card was already played
          });
        },
      }),
      {
        name: "turup-game-store",
        storage: createJSONStorage(() => localStorage),
        // Expand persistence to include critical game state and team assignments
        partialize: (state) => ({
          roomId: state.roomId,
          gameMode: state.gameMode,
          gameStatus: state.gameStatus,
          trumpSuit: state.trumpSuit,
          currentTrick: state.currentTrick,
          scores: state.scores,
          initialCardsDeal: state.initialCardsDeal,
          teamAssignments: state.teamAssignments,
          playedCards: state.playedCards, // Add playedCards to persisted state
          players: state.players, // Add players to persisted state
        }),
      }
    )
  )
);

// Update the fetchRoomStateFromSupabase function to include players
export const fetchRoomStateFromSupabase = async (roomId: string) => {
  if (!roomId) return null;

  console.log(
    `[GameStore] Fetching current state for room ${roomId} from Supabase`
  );

  try {
    // In a real implementation, this would query Supabase for the room state
    // For now, let's simulate a delay and return a mock state based on what's stored
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Get stored game status from local storage if available
    const storedState = localStorage.getItem("game-storage");
    let savedStatus = "waiting";
    let savedTrumpSuit = null;
    let savedScores = { royals: 0, rebels: 0 };
    let savedTeamAssignments = {};
    let savedPlayers = [];

    if (storedState) {
      try {
        const parsed = JSON.parse(storedState);
        if (parsed.state) {
          savedStatus = parsed.state.gameStatus || "waiting";
          savedTrumpSuit = parsed.state.trumpSuit;
          savedScores = parsed.state.scores || { royals: 0, rebels: 0 };
          savedTeamAssignments = parsed.state.teamAssignments || {};
          savedPlayers = parsed.state.players || [];
        }
      } catch (e) {
        console.error("[GameStore] Error parsing stored state:", e);
      }
    }

    console.log(`[GameStore] Recovered saved game status: ${savedStatus}`);
    console.log(
      `[GameStore] Recovered team assignments:`,
      savedTeamAssignments
    );
    console.log(`[GameStore] Recovered players:`, savedPlayers);

    // Use the saved status to create a properly shaped response
    const gameState = {
      currentTurn: null,
      trumpSuit: savedTrumpSuit,
      currentBid: 0,
      currentBidder: null,
      trickCards: {},
      roundNumber: 0,
      gamePhase: savedStatus,
      teams: {
        royals: [],
        rebels: [],
      },
      scores: savedScores,
      consecutiveTricks: {
        royals: 0,
        rebels: 0,
      },
      lastTrickWinner: null,
      dealerIndex: 0,
      trumpCaller: null,
    };

    return {
      roomState: {
        id: roomId,
        createdAt: Date.now() - 3600000, // Simulate room created 1 hour ago
        lastActivity: Date.now(),
        gameState: gameState,
        players: savedPlayers, // Use recovered players instead of empty array
      },
      gameStatus: savedStatus,
      teamAssignments: savedTeamAssignments,
      players: savedPlayers, // Return players separately
    };
  } catch (error) {
    console.error("[GameStore] Error fetching room state:", error);
    return null;
  }
};
