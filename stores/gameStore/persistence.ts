// Function to fetch room state from Supabase
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
