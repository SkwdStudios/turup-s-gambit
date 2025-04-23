// Helper functions for bot voting
import {
  isBotVotingInProgressState,
  setBotVotingState,
  isUIReadyState,
  executeWhenUIReady,
} from "@/lib/game-flow-manager";
import { useGameStore } from "@/stores/gameStore";
import { useUIStore } from "@/stores/uiStore";

// Type definition for message sending function
type SendMessageFn = (message: any) => Promise<boolean> | boolean;

// Global tracking of bot votes to prevent duplicates
// This persists across component re-renders
let globalBotVotes: Record<string, boolean> = {};
let lastVotingTimestamp = 0;
const VOTING_COOLDOWN = 3000; // 3 seconds cooldown between voting attempts

// At the top of the file, add an interface for Bot type
interface Bot {
  id: string;
  name: string;
  isBot?: boolean;
  [key: string]: any; // Allow for additional properties
}

/**
 * Reset the global bot votes tracking
 * Call this when starting a new game or when voting is complete
 */
export function resetBotVotesTracking() {
  globalBotVotes = {};
  setBotVotingState(false);
  lastVotingTimestamp = 0;
  console.log("[Bot Voting] Reset global bot votes tracking");
}

/**
 * Makes bots vote for trump suits
 * @param botPlayers Array of bot players
 * @param roomId Current room ID
 * @param sendMessage Function to send messages
 * @param botVotes Current bot votes state
 * @param setBotVotes Function to update bot votes state
 * @param currentRoom Current room state to check for already voted players
 */
export function makeBotVote(
  botPlayers: any[],
  roomId: string,
  sendMessage: (message: any) => void,
  botVotes: Record<string, boolean>,
  setBotVotes: (
    votes:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>)
  ) => void,
  currentRoom?: any
) {
  if (botPlayers.length === 0) return;

  // Available suits
  const suits = ["hearts", "diamonds", "clubs", "spades"];

  // Check if we have access to the current room state to verify already voted players
  const playersVoted = currentRoom?.gameState?.playersVoted || [];

  // Get all bot players that haven't voted yet (check local, global, and server state)
  const botsToVote = botPlayers.filter(
    (bot) =>
      !botVotes[bot.id] &&
      !globalBotVotes[bot.id] &&
      !playersVoted.includes(bot.id)
  );

  if (botsToVote.length === 0) {
    console.log(`[Bot Voting] All bots have already voted, nothing to do`);
    return; // All bots have voted
  }

  console.log(
    `[Bot Voting] ${botsToVote.length} bots need to vote:`,
    botsToVote.map((b) => b.name).join(", ")
  );
  console.log(`[Bot Voting] Current bot votes:`, botVotes);
  if (playersVoted.length > 0) {
    console.log(`[Bot Voting] Server-side players voted:`, playersVoted);
  }

  // Add a slight delay for each bot to make it seem more natural
  // Use a sequential approach with promises to ensure votes happen one after another
  const voteSequentially = async () => {
    for (let i = 0; i < botsToVote.length; i++) {
      const bot = botsToVote[i];

      // Wait a bit before each vote to make it seem natural
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Double-check if the game is still in initial_deal phase
      if (currentRoom?.gameState?.gamePhase !== "initial_deal") {
        console.log(
          `[Bot Voting] Game phase changed to ${currentRoom?.gameState?.gamePhase}, skipping remaining votes`
        );
        break;
      }

      // Double-check if this bot has already voted (could have happened in another component)
      if (botVotes[bot.id]) {
        console.log(
          `[Bot Voting] Bot ${bot.name} already voted locally, skipping`
        );
        continue;
      }

      // Also check server-side voted state if available
      if (currentRoom?.gameState?.playersVoted?.includes(bot.id)) {
        console.log(
          `[Bot Voting] Bot ${bot.name} already voted on server, skipping`
        );
        // Update local state to match server
        setBotVotes((prev) => ({ ...prev, [bot.id]: true }));
        continue;
      }

      // Choose a random suit for the bot to vote for
      const randomSuit = suits[Math.floor(Math.random() * suits.length)];
      console.log(
        `[Bot Voting] Bot ${bot.name} (${bot.id}) is voting for ${randomSuit}`
      );

      // Mark this bot as having voted BEFORE sending the message
      // This prevents race conditions where multiple votes might be sent

      // Update both local state and global tracking
      globalBotVotes[bot.id] = true;

      setBotVotes((prev) => {
        const newVotes = { ...prev, [bot.id]: true };
        console.log(`[Bot Voting] Updated bot votes:`, newVotes);
        return newVotes;
      });

      // Wait a bit to ensure state is updated
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        console.log(`[Bot Voting] Sending vote message for bot ${bot.name}`);
        sendMessage({
          type: "game:select-trump",
          payload: { roomId, suit: randomSuit, botId: bot.id },
        });

        // Wait a bit after sending to ensure the server has time to process
        await new Promise((resolve) => setTimeout(resolve, 400));
      } catch (error) {
        console.error(
          `[Bot Voting] Error sending vote for bot ${bot.name}:`,
          error
        );
      }
    }
  };

  // Start the sequential voting process
  voteSequentially().catch((error) => {
    console.error("[Bot Voting] Error in sequential voting:", error);
  });
}

/**
 * Detect bot players by name pattern
 * This is a fallback in case the isBot property is not set correctly
 */
export function detectBotsByName(players: any[]): any[] {
  // Common bot name patterns
  const botNamePatterns = [
    /^Merlin$/,
    /^Lancelot$/,
    /^Galahad$/,
    /^Guinevere$/,
    /^Arthur$/,
    /^Morgana$/,
  ];

  // Filter players whose names match bot patterns
  return players.filter((player) => {
    // If already marked as a bot, keep it
    if (player.isBot) return true;

    // Check if name matches any bot pattern
    return botNamePatterns.some((pattern) => pattern.test(player.name));
  });
}

/**
 * Force all bots to vote immediately with a small delay between each vote
 * Use this as a fallback when normal voting isn't working
 */
export function forceAllBotsToVote(
  currentRoom: any,
  roomId: string,
  sendMessage: (message: any) => void
) {
  if (!currentRoom) {
    console.log(`[Bot Voting] No current room, cannot force bot votes`);
    return;
  }

  // Only allow in initial_deal phase
  if (currentRoom.gameState.gamePhase !== "initial_deal") {
    console.log(
      `[Bot Voting] Not in initial_deal phase (current: ${currentRoom.gameState.gamePhase}), cannot force bot votes`
    );
    alert(
      `Cannot vote for trump when not in initial deal phase (current phase: ${currentRoom.gameState.gamePhase})`
    );
    return;
  }

  // Get all bot players - try both isBot property and name detection
  let botPlayers = currentRoom.players.filter((p: any) => p.isBot);

  // If no bots found by isBot property, try detecting by name
  if (botPlayers.length === 0) {
    console.log(
      `[Bot Voting] No bots found by isBot property, trying name detection`
    );
    botPlayers = detectBotsByName(currentRoom.players);
    console.log(
      `[Bot Voting] Name detection found ${botPlayers.length} potential bots`
    );
  }

  if (botPlayers.length === 0) {
    console.log(
      `[Bot Voting] No bot players found in the room by any detection method`
    );
    alert("No bot players found in the room");
    return;
  }

  // Check which bots have already voted to avoid duplicate votes
  const playersVoted = currentRoom.gameState.playersVoted || [];
  console.log(`[Bot Voting] Players who have already voted:`, playersVoted);

  const botsToVote = botPlayers.filter(
    (bot) => !playersVoted.includes(bot.id) && !globalBotVotes[bot.id]
  );

  if (botsToVote.length === 0) {
    console.log(`[Bot Voting] All bots have already voted`);
    alert("All bots have already voted");
    return;
  }

  console.log(
    `[Bot Voting] FORCING VOTES for ${botsToVote.length} bots:`,
    botsToVote.map((b: any) => `${b.name} (${b.id})`).join(", ")
  );

  // Available suits
  const suits = ["hearts", "diamonds", "clubs", "spades"];

  // Make bots vote one at a time with a delay between each to prevent race conditions
  botsToVote.forEach((bot, index) => {
    setTimeout(() => {
      // Double-check if the game is still in initial_deal phase
      if (currentRoom.gameState.gamePhase !== "initial_deal") {
        console.log(
          `[Bot Voting] Game phase changed to ${currentRoom.gameState.gamePhase}, skipping remaining votes`
        );
        return;
      }

      // Double-check if this bot has already voted (could have happened in another component)
      const updatedPlayersVoted = currentRoom.gameState.playersVoted || [];
      if (updatedPlayersVoted.includes(bot.id)) {
        console.log(`[Bot Voting] Bot ${bot.name} already voted, skipping`);
        return;
      }

      // Choose a random suit for the bot to vote for
      const randomSuit = suits[Math.floor(Math.random() * suits.length)];
      console.log(
        `[Bot Voting] FORCE: Bot ${bot.name} (${bot.id}) is voting for ${randomSuit}`
      );

      try {
        // Mark this bot as having voted in the global tracking
        globalBotVotes[bot.id] = true;

        // Send the vote
        sendMessage({
          type: "game:select-trump",
          payload: { roomId, suit: randomSuit, botId: bot.id },
        });
      } catch (error) {
        // If there's an error, remove the bot from the global tracking
        globalBotVotes[bot.id] = false;
        console.error(
          `[Bot Voting] Error sending vote for bot ${bot.name}:`,
          error
        );
      }
    }, index * 500); // Add a 500ms delay between each bot vote to prevent race conditions
  });
}

/**
 * Trigger bot voting if needed
 */
export async function triggerBotVoting(
  currentRoom: any,
  roomId: string,
  sendMessageFn: SendMessageFn,
  botVotes: Record<string, boolean> = {},
  setBotVotes: (votes: Record<string, boolean>) => void = () => {},
  votingComplete: boolean = false
) {
  if (!currentRoom) {
    console.warn("[Bot Voting] Cannot trigger bot voting: no room found");
    return;
  }

  // Skip if voting is already complete
  if (votingComplete) {
    console.log("[Bot Voting] Voting already complete, skipping bot voting");
    return;
  }

  // Get the gameStatus directly from the store for consistency
  const gameStatus = useGameStore.getState().gameStatus;

  // Ensure we're in a valid trump selection phase
  if (gameStatus !== "initial_deal" && gameStatus !== "bidding") {
    console.error(
      `[Bot Voting] Not in a valid trump selection phase (current: ${gameStatus}). Must be in initial_deal or bidding phase.`
    );
    return;
  }

  // Check if the UI is ready
  if (!isUIReadyState()) {
    console.log(
      `[Bot Voting] UI not ready yet, scheduling bot voting for later`
    );

    // Wait for UI to be ready
    executeWhenUIReady(() => {
      console.log(`[Bot Voting] UI ready, triggering bot voting`);
      triggerBotVoting(
        currentRoom,
        roomId,
        sendMessageFn,
        botVotes,
        setBotVotes,
        votingComplete
      );
    }, 500);

    return;
  }

  console.log(`[Bot Voting] Starting bot voting check...`);

  // Check if we've triggered bot voting in the last minute
  const now = Date.now();
  if (now - lastVotingTimestamp < 60000) {
    console.log(
      `[Bot Voting] Bot voting was already triggered recently, skipping`
    );
    return;
  }

  // Update the last voting timestamp
  lastVotingTimestamp = now;

  console.log(`[Bot Voting] Preparing to trigger bot voting...`);

  // Get bot players
  const botPlayers = detectBotsByName(currentRoom.players);
  if (botPlayers.length === 0) {
    console.log(`[Bot Voting] No bot players found, skipping bot voting`);
    return;
  }

  console.log(
    `[Bot Voting] Found ${botPlayers.length} bots. Triggering voting...`
  );

  // Trigger voting for each bot with a delay
  voteBots(
    botPlayers,
    roomId,
    sendMessageFn,
    globalBotVotes,
    (votes) => {
      globalBotVotes = votes;
      if (setBotVotes) setBotVotes(votes);
    },
    currentRoom
  );

  // Monitor voting after a delay to ensure all votes are cast
  setTimeout(() => {
    console.log(`[Bot Voting] Checking if all bots have voted...`);
    ensureAllBotsVoted(
      botPlayers,
      roomId,
      sendMessageFn,
      globalBotVotes,
      currentRoom
    );
  }, botPlayers.length * 1000 + 1000); // Allow enough time for all bots to vote
}

/**
 * Trigger voting for each bot with a delay
 */
function voteBots(
  botPlayers: Array<Bot>,
  roomId: string,
  sendMessage: SendMessageFn,
  botVotes: Record<string, boolean>,
  setBotVotes: (votes: Record<string, boolean>) => void,
  currentRoom: any
) {
  // Get the gameStatus directly from the store
  const gameStatus = useGameStore.getState().gameStatus;

  // Ensure we're in a valid trump selection phase
  if (gameStatus !== "initial_deal" && gameStatus !== "bidding") {
    console.error(
      `[Bot Voting] Not in a valid trump selection phase (current: ${gameStatus}). Must be in initial_deal or bidding phase.`
    );
    return;
  }

  // Process each bot with a delay
  botPlayers.forEach((bot: Bot, index: number) => {
    // Skip if bot has already voted
    if (botVotes[bot.id]) {
      console.log(`[Bot Voting] Bot ${bot.name} already voted, skipping`);
      return;
    }

    // Set a timeout to vote
    setTimeout(() => {
      // Double-check if bot has voted by the time this executes
      if (botVotes[bot.id]) {
        console.log(
          `[Bot Voting] Bot ${bot.name} voted while waiting, skipping`
        );
        return;
      }

      // Select a random suit
      const suits = ["hearts", "diamonds", "clubs", "spades"];
      const randomSuit = suits[Math.floor(Math.random() * suits.length)];

      console.log(`[Bot Voting] Bot ${bot.name} voting for ${randomSuit}`);

      // Mark this bot as having voted
      const updatedBotVotes = { ...botVotes };
      updatedBotVotes[bot.id] = true;
      setBotVotes(updatedBotVotes);

      // Send the vote message
      sendMessage({
        type: "game:trump-vote",
        payload: {
          roomId,
          suit: randomSuit,
          playerId: bot.id,
          botId: bot.id, // Include botId to identify bot votes
        },
      });
    }, index * 1000); // Stagger votes by 1 second each
  });
}

/**
 * Ensure all bots have voted
 */
function ensureAllBotsVoted(
  botPlayers: Array<Bot>,
  roomId: string,
  sendMessage: SendMessageFn,
  botVotes: Record<string, boolean>,
  currentRoom: any
) {
  // Get the gameStatus directly from the store
  const gameStatus = useGameStore.getState().gameStatus;

  // Get the list of bots that haven't voted yet
  const pendingBots = botPlayers.filter((bot: Bot) => !botVotes[bot.id]);

  // If all bots have voted or we're no longer in a valid trump selection phase, we're done
  if (
    pendingBots.length === 0 ||
    (gameStatus !== "initial_deal" && gameStatus !== "bidding")
  ) {
    console.log(
      `[Bot Voting] All bots have voted or phase changed, no action needed`
    );
    return;
  }

  // Process the remaining bots
  console.log(
    `[Bot Voting] ${pendingBots.length} bots haven't voted yet, ensuring they vote...`
  );
  voteBots(
    pendingBots,
    roomId,
    sendMessage,
    botVotes,
    (updatedVotes) => {
      // Copy updated votes to global tracking
      Object.keys(updatedVotes).forEach((key) => {
        globalBotVotes[key] = updatedVotes[key];
      });
    },
    currentRoom
  );
}
