import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import { GameStoreState } from "./types";
import { createGameActions } from "./gameActions";
import { createGameStateUpdates } from "./gameStateUpdates";
import { createRealtimeFunctions } from "./realtime";
import { StoreApi } from "zustand";

// Define a properly typed set function to avoid TypeScript errors
type SetState = (
  partial:
    | Partial<GameStoreState>
    | ((state: GameStoreState) => Partial<GameStoreState>),
  replace?: boolean
) => void;

// Define a properly typed get function
type GetState = () => GameStoreState;

export const useGameStore = create<GameStoreState>()(
  devtools(
    persist(
      (set, get) => {
        // Cast set and get to the proper types for our helper functions
        const typedSet = set as SetState;
        const typedGet = get as GetState;

        return {
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
          teamAssignments: {}, // Empty team assignments object
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

          // Combine all functions from different modules
          ...createGameActions(typedGet, typedSet),
          ...createGameStateUpdates(typedGet, typedSet),
          ...createRealtimeFunctions(typedGet, typedSet),
        };
      },
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
          playedCards: state.playedCards,
          players: state.players,
        }),
      }
    )
  )
);
