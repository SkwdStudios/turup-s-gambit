import { Card, GameRoom, Player, Suit } from "@/app/types/game";
import { useAuthStore } from "../authStore";
import { useUIStore } from "../uiStore";
import { toast } from "sonner";
import { createDeck, shuffleDeck } from "./cardUtils";
import { GameStatus, GameStoreState } from "./types";

export const createGameActions = (
  get: () => GameStoreState,
  set: (
    partial:
      | Partial<GameStoreState>
      | ((state: GameStoreState) => Partial<GameStoreState>),
    replace?: boolean
  ) => void
) => ({
  // Basic setters
  setRoom: (room: GameRoom | null) => set({ currentRoom: room }),

  setPlayers: (players: Player[]) => set({ players }),

  setGameMode: (gameMode: "classic" | "frenzy") => {
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

  setGameStatus: (gameStatus: GameStatus) => {
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

  setRoomId: (roomId: string | null) => set({ roomId }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setConnected: (isConnected: boolean) => set({ isConnected }),

  // Core game actions
  joinRoom: async (roomId: string, playerName: string) => {
    const user = useAuthStore.getState().user;
    const { currentRoom, players, gameStatus } = get();

    if (!user) {
      console.error("[GameStore] Cannot join room, no user is logged in");
      return;
    }

    // Check if we're already in this room
    if (currentRoom?.id === roomId && players.some((p) => p.id === user.id)) {
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

    // Import the database service
    const { SupabaseDatabase } = await import(
      "@/lib/services/supabase-database"
    );

    try {
      // Check if the room exists in the database
      let gameRoom = await SupabaseDatabase.getGameRoom(roomId);

      // If the room doesn't exist, create it
      if (!gameRoom) {
        console.log(`[GameStore] Room ${roomId} doesn't exist, creating it`);
        gameRoom = await SupabaseDatabase.createGameRoom(
          roomId,
          user.id,
          get().gameMode
        );

        if (!gameRoom) {
          console.error("[GameStore] Failed to create game room");
          toast.error("Failed to create game room. Please try again.");
          set({ isLoading: false });
          return;
        }
      }
    } catch (error) {
      console.error("[GameStore] Error checking/creating game room:", error);
      toast.error("Error joining game. Please try again.");
      set({ isLoading: false });
      return;
    }

    // Declare updatedRoom variable outside the try block so it's accessible in the set function
    let updatedRoom = null;

    try {
      // Add the current player to the room
      const addPlayerResult = await SupabaseDatabase.addPlayerToRoom(
        roomId,
        currentUserPlayer
      );

      if (!addPlayerResult) {
        console.error("[GameStore] Failed to add player to room");
        toast.error("Failed to join game room. Please try again.");
        set({ isLoading: false });
        return;
      }

      // Get the updated room state
      updatedRoom = await SupabaseDatabase.getGameRoom(roomId);

      if (!updatedRoom) {
        console.error("[GameStore] Failed to get updated room state");
        toast.error("Failed to retrieve game room data. Please try again.");
        set({ isLoading: false });
        return;
      }
    } catch (error) {
      console.error("[GameStore] Error adding player to room:", error);
      toast.error("Error joining game. Please try again.");
      set({ isLoading: false });
      return;
    }

    // Make sure we have a valid updatedRoom before setting state
    if (!updatedRoom) {
      console.error("[GameStore] No valid room data available");
      toast.error("Failed to join game. Please try again.");
      set({ isLoading: false });
      return;
    }

    set((state) => ({
      currentRoom: updatedRoom,
      players: updatedRoom.players || updatedPlayers,
      isLoading: false,
      isConnected: true,
      // Preserve the current gameStatus if we've recovered state
      gameStatus: preserveGameStatus
        ? state.gameStatus
        : updatedRoom.gameState.gamePhase || "waiting",
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

  leaveRoom: async () => {
    const { roomId, currentRoom } = get();
    const user = useAuthStore.getState().user;

    if (roomId && currentRoom && user) {
      // Send leave message
      get().sendMessage({
        type: "room:leave",
        payload: {
          roomId,
          playerId: user.id,
        },
      });

      try {
        // Import the database service
        const { SupabaseDatabase } = await import(
          "@/lib/services/supabase-database"
        );

        // Remove the player from the room in the database
        await SupabaseDatabase.removePlayerFromRoom(roomId, user.id);

        console.log(
          `[GameStore] Player ${user.username} removed from room ${roomId}`
        );
      } catch (error) {
        console.error("[GameStore] Error removing player from room:", error);
      }
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
      const botsNeeded = Math.min(4 - currentPlayerCount, botNames.length);

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

  playCard: async (card: Card) => {
    const { roomId, currentRoom, currentPlayer, gameStatus, currentTrick } =
      get();
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
      showToast(`Not your turn. Current player: ${currentPlayer}`, "warning");
      return;
    }

    // Check if this is a duplicate play
    const isCardAlreadyInTrick = currentTrick.some(
      (c) => c.id === card.id && c.suit === card.suit && c.rank === card.rank
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

    try {
      // Import the database service
      const { SupabaseDatabase } = await import(
        "@/lib/services/supabase-database"
      );

      // Record the player action in the database
      await SupabaseDatabase.recordPlayerAction(roomId, user.id, "play-card", {
        card,
        gamePhase: gameStatus,
        timestamp: new Date().toISOString(),
      });

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
    } catch (error) {
      console.error("[GameStore] Error recording player action:", error);
    }

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

  placeBid: (bid: number) => {
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
});
