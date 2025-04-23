import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { GameRoom, Suit } from "@/app/types/game";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  triggerBotVoting,
  resetBotVotesTracking,
} from "@/app/game/[roomId]/bot-voting-helper";
import { useGameStore } from "@/stores/gameStore";

type SendMessageFunction = (message: any) => boolean;

interface TrumpVote {
  suit: Suit;
  playerId: string;
  botId?: string;
  roomId: string;
}

// Channel cache to prevent recreation
const channelCache = new Map<string, RealtimeChannel>();

export function useSupabaseTrumpVoting(
  currentRoom: GameRoom | null,
  roomId: string,
  userId: string | undefined
) {
  const [trumpVotes, setTrumpVotes] = useState<Record<string, number>>({
    hearts: 0,
    diamonds: 0,
    clubs: 0,
    spades: 0,
  });
  const [userVote, setUserVote] = useState<Suit | null>(null);
  const [votingComplete, setVotingComplete] = useState(false);
  const [botVotes, setBotVotes] = useState<Record<string, boolean>>({});
  const [voterIds, setVoterIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Helper function to update local vote state directly (used as fallback)
  const updateLocalVote = useCallback(
    (suit: Suit, voterId: string, skipVoterCheck: boolean = false) => {
      // If skipVoterCheck is true, we'll update the vote count directly
      // This is used when we've already added the voter to the set
      if (skipVoterCheck) {
        // Just update the vote count
        setTrumpVotes((prevVotes) => {
          const newVotes = {
            ...prevVotes,
            [suit]: (prevVotes[suit] || 0) + 1,
          };
          console.log(`[Trump Voting] Direct update of vote counts:`, newVotes);

          // Check if voting is complete
          const totalVotes = Object.values(newVotes).reduce(
            (sum, count) => sum + count,
            0
          );
          const expectedVotes = currentRoom?.players.length || 0;

          if (
            expectedVotes > 0 &&
            totalVotes >= expectedVotes &&
            !votingComplete
          ) {
            console.log(`[Trump Voting] Voting complete (direct update).`);
            setVotingComplete(true);
          }

          return newVotes;
        });
        return;
      }

      // Normal flow with voter check
      setVoterIds((prev) => {
        // If voter already voted, don't count again
        if (prev.has(voterId)) {
          console.log(
            `[Trump Voting] Voter ${voterId} already voted, skipping`
          );
          return prev;
        }

        // Add voter to set
        const newSet = new Set(prev);
        newSet.add(voterId);

        // Update vote counts
        setTrumpVotes((prevVotes) => {
          const newVotes = {
            ...prevVotes,
            [suit]: (prevVotes[suit] || 0) + 1,
          };
          console.log(`[Trump Voting] Direct update of vote counts:`, newVotes);

          // Check if voting is complete
          const totalVotes = Object.values(newVotes).reduce(
            (sum, count) => sum + count,
            0
          );
          const expectedVotes = currentRoom?.players.length || 0;

          if (
            expectedVotes > 0 &&
            totalVotes >= expectedVotes &&
            !votingComplete
          ) {
            console.log(`[Trump Voting] Voting complete (direct update).`);
            setVotingComplete(true);
          }

          return newVotes;
        });

        return newSet;
      });
    },
    [currentRoom, votingComplete]
  );

  const resetVotingState = useCallback(() => {
    console.log("[Trump Voting Hook] Resetting voting state");
    setTrumpVotes({ hearts: 0, diamonds: 0, clubs: 0, spades: 0 });
    setUserVote(null);
    setVotingComplete(false);
    setBotVotes({});
    setVoterIds(new Set());
    resetBotVotesTracking(); // Reset helper state as well
  }, []);

  // Effect to reset voting when game phase changes away from valid phases
  useEffect(() => {
    // Get gameStatus directly from the store for more reliability
    const { gameStatus } = useGameStore.getState();

    // Only reset if we're not in a valid trump selection phase
    if (gameStatus !== "initial_deal" && gameStatus !== "bidding") {
      resetVotingState();
    }
  }, [currentRoom?.gameState?.gamePhase, resetVotingState]);

  // Initialize the Supabase Realtime channel for trump voting
  useEffect(() => {
    if (!roomId || !currentRoom) return;

    const channelName = `trump-voting:${roomId}`;

    // Reuse channel if it already exists
    if (channelCache.has(channelName)) {
      console.log("[Trump Voting] Using cached Realtime channel");
      channelRef.current = channelCache.get(channelName)!;
      return;
    }

    console.log("[Trump Voting] Creating new Realtime channel");

    // Create a new channel for trump voting
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    });

    // Listen for trump vote messages
    channel.on("broadcast", { event: "trump-vote" }, (payload) => {
      const vote = payload.payload as TrumpVote;

      console.log(
        `[Trump Voting] Received vote for ${vote.suit}`,
        vote.botId ? `from bot ${vote.botId}` : `from player ${vote.playerId}`
      );

      // Update vote counts (ensure not already complete)
      if (!votingComplete) {
        // Track voter to prevent double counting
        const voterId = vote.botId || vote.playerId;

        setVoterIds((prev) => {
          // If voter already voted, don't count again
          if (prev.has(voterId)) return prev;

          // Add voter to set and update votes
          const newSet = new Set(prev);
          newSet.add(voterId);

          setTrumpVotes((prevVotes) => {
            const newVotes = {
              ...prevVotes,
              [vote.suit]: (prevVotes[vote.suit] || 0) + 1,
            };
            console.log(`[Trump Voting] Updated vote counts:`, newVotes);

            // Check if voting is complete
            const totalVotes = Object.values(newVotes).reduce(
              (sum, count) => sum + count,
              0
            );
            const expectedVotes = currentRoom?.players.length || 0;

            if (
              expectedVotes > 0 &&
              totalVotes >= expectedVotes &&
              !votingComplete
            ) {
              console.log(`[Trump Voting] Voting complete.`);
              setVotingComplete(true);

              // Determine winning suit
              let maxVotes = 0;
              let winningSuit: Suit | null = null;

              Object.entries(newVotes).forEach(([suit, count]) => {
                if (count > maxVotes) {
                  maxVotes = count;
                  winningSuit = suit as Suit;
                }
              });

              if (winningSuit) {
                // Broadcast final result
                channel.send({
                  type: "broadcast",
                  event: "trump-selected",
                  payload: {
                    roomId,
                    suit: winningSuit,
                    votes: newVotes,
                  },
                });
              }
            }

            return newVotes;
          });

          // If it's a bot vote, update bot votes tracking
          if (vote.botId) {
            setBotVotes((prev) => ({ ...prev, [vote.botId!]: true }));
          }

          return newSet;
        });
      }
    });

    // Listen for final trump selection
    channel.on("broadcast", { event: "trump-selected" }, (payload) => {
      console.log(`[Trump Voting] Trump suit selected:`, payload.payload);
      // Ensure voting is marked as complete
      setVotingComplete(true);
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log(`[Trump Voting] Channel status: ${status}`);

      if (status === "SUBSCRIBED") {
        // Trigger bot voting after channel is subscribed
        if (
          currentRoom?.gameState.gamePhase === "initial_deal" ||
          currentRoom?.gameState.gamePhase === "bidding"
        ) {
          setTimeout(() => {
            triggerBotVoting(
              currentRoom,
              roomId,
              (message: any) => {
                if (message.type === "game:select-trump") {
                  const { suit, botId } = message.payload;
                  // Convert to realtime broadcast
                  channel.send({
                    type: "broadcast",
                    event: "trump-vote",
                    payload: { suit, botId, roomId },
                  });
                  return true;
                }
                return false;
              },
              botVotes,
              setBotVotes,
              votingComplete
            );
          }, 1500);
        }
      }
    });

    // Store in cache and ref
    channelCache.set(channelName, channel);
    channelRef.current = channel;

    // Cleanup
    return () => {
      // We don't unsubscribe to maintain the connection
      // The channel will be reused if component remounts
    };
  }, [roomId, currentRoom, botVotes, votingComplete]);

  // Function for the current user to cast their vote
  const handleVote = useCallback(
    async (suit: Suit) => {
      if (!roomId || !userId) {
        console.error("[Trump Voting] Cannot vote: missing roomId or userId");
        return;
      }

      // Get store state and functions
      const { currentRoom, selectTrump, setVotingComplete } =
        useGameStore.getState();

      // Check if voting is still valid
      if (!currentRoom) {
        console.error("[Trump Voting] Cannot vote: no active room");
        return;
      }

      const gameStatus = useGameStore.getState().gameStatus;
      if (gameStatus !== "initial_deal" && gameStatus !== "bidding") {
        console.error(
          `[Trump Voting] Cannot vote: not in a valid trump selection phase (current: ${gameStatus}). Must be in initial_deal or bidding phase.`
        );
        return;
      }

      console.log(`[Trump Voting] User voting for ${suit}`);
      setUserVote(suit);

      // Check if we have a valid channel
      if (!channelRef.current) {
        console.error("[Trump Voting] Cannot vote: channel not established");
        return;
      }

      // Send the vote through the Supabase Realtime channel
      console.log(`[Trump Voting] Sending vote for ${suit} from ${userId}`);
      const result = await channelRef.current.send({
        type: "broadcast",
        event: "trump-vote",
        payload: {
          suit,
          playerId: userId,
          roomId,
        },
      });

      // Check if the vote was sent successfully
      if (result === "ok") {
        console.log("[Trump Voting] Vote sent successfully");

        // Update local state
        setUserVote(suit);

        // Add voter to the set
        setVoterIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(userId);
          return newSet;
        });

        // Update local state directly with skipVoterCheck=true since we already added the voter
        updateLocalVote(suit, userId, true);

        // After vote is processed:
        // Send the vote to the store as well
        selectTrump(suit);
        return true;
      } else {
        console.error("[Trump Voting] Failed to send vote:", result);
        return false;
      }
    },
    [roomId, userId, userVote, updateLocalVote, votingComplete]
  );

  // Function to force any remaining bots to vote
  const handleForceBotVotes = useCallback(async () => {
    if (!roomId) {
      console.error("[Trump Voting] Cannot force bot votes: missing roomId");
      return;
    }

    // Get current game state directly from store
    const { currentRoom, gameStatus } = useGameStore.getState();

    if (!currentRoom) {
      console.error("[Trump Voting] Cannot force bot votes: no active room");
      return;
    }

    // Check if we're in a valid trump selection phase
    if (gameStatus !== "initial_deal" && gameStatus !== "bidding") {
      console.error(
        `[Trump Voting] Not in a valid trump selection phase (current: ${gameStatus}). Must be in initial_deal or bidding phase.`
      );
      return;
    }

    console.log("[Trump Voting] Forcing remaining bots to vote.");

    // Get all bot players
    const botPlayers = currentRoom.players.filter((p) => p.isBot);
    if (botPlayers.length === 0) {
      console.log("[Trump Voting] No bots found in room");
      return;
    }

    // Get bots that haven't voted yet
    const botsToVote = botPlayers.filter((bot) => !botVotes[bot.id]);
    if (botsToVote.length === 0) {
      console.log("[Trump Voting] All bots have already voted");
      return;
    }

    // Force votes for remaining bots
    const suits = ["hearts", "diamonds", "clubs", "spades"] as Suit[];

    // Check if we have a valid channel
    if (!channelRef.current) {
      console.error(
        "[Trump Voting] Cannot force bot votes: channel not established"
      );
      return;
    }

    botsToVote.forEach((bot, index) => {
      setTimeout(() => {
        const randomSuit = suits[Math.floor(Math.random() * suits.length)];
        console.log(
          `[Trump Voting] Forcing bot ${bot.name} to vote for ${randomSuit}`
        );

        // Add bot to voter set first to prevent double counting
        setVoterIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(bot.id);
          return newSet;
        });

        // Update bot votes tracking
        setBotVotes((prev) => ({ ...prev, [bot.id]: true }));

        // Try to send through Realtime
        const sent = channelRef.current?.send({
          type: "broadcast",
          event: "trump-vote",
          payload: { roomId, suit: randomSuit, botId: bot.id },
        });

        // If sending failed or returned false, update local state directly as fallback
        if (!sent) {
          console.warn(
            "[Trump Voting] Bot vote Realtime send failed, using fallback"
          );
          updateLocalVote(randomSuit, bot.id, true); // skipVoterCheck=true
        } else {
          // Update local state directly with skipVoterCheck=true since we already added the voter
          updateLocalVote(randomSuit, bot.id, true);
        }
      }, 500 * (index + 1)); // Stagger votes
    });
  }, [roomId, botVotes, voterIds, updateLocalVote]);

  return {
    trumpVotes,
    userVote,
    votingComplete,
    botVotes,
    handleVote,
    handleForceBotVotes,
    resetVotingState,
  };
}
