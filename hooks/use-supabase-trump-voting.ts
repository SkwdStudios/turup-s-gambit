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

  const resetVotingState = useCallback(() => {
    console.log("[Trump Voting Hook] Resetting voting state");
    setTrumpVotes({ hearts: 0, diamonds: 0, clubs: 0, spades: 0 });
    setUserVote(null);
    setVotingComplete(false);
    setBotVotes({});
    setVoterIds(new Set());
    resetBotVotesTracking(); // Reset helper state as well
  }, []);

  // Effect to reset voting when game phase changes away from initial_deal
  useEffect(() => {
    if (currentRoom?.gameState.gamePhase !== "initial_deal") {
      resetVotingState();
    }
  }, [currentRoom?.gameState.gamePhase, resetVotingState]);

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
        if (currentRoom?.gameState.gamePhase === "initial_deal") {
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
    (suit: Suit) => {
      // Get the current game status from the Zustand store
      const { gameStatus } = useGameStore.getState();

      // Check if we're in a valid phase for voting (either initial_deal or bidding)
      const isValidPhase =
        gameStatus === "initial_deal" || gameStatus === "bidding";

      if (
        userVote ||
        votingComplete ||
        !currentRoom ||
        !isValidPhase ||
        !userId ||
        !channelRef.current
      ) {
        console.warn("[Trump Voting] Vote attempt blocked:", {
          userVote,
          votingComplete,
          storePhase: gameStatus,
          roomPhase: currentRoom?.gameState.gamePhase,
        });
        return false;
      }

      console.log(`[Trump Voting] User voting for ${suit}`);
      setUserVote(suit);

      // Send vote through Supabase Realtime
      try {
        channelRef.current.send({
          type: "broadcast",
          event: "trump-vote",
          payload: { roomId, suit, playerId: userId },
        });

        // Note: We don't immediately update local state since the broadcast
        // will be received by all clients including the sender

        return true;
      } catch (error) {
        console.error("[Trump Voting] Failed to send vote:", error);
        setUserVote(null);
        return false;
      }
    },
    [userVote, votingComplete, currentRoom, roomId, userId]
  );

  // Function to force any remaining bots to vote
  const handleForceBotVotes = useCallback(() => {
    // Get the current game status from the Zustand store
    const { gameStatus } = useGameStore.getState();

    // Check if we're in a valid phase for voting (either initial_deal or bidding)
    const isValidPhase =
      gameStatus === "initial_deal" || gameStatus === "bidding";

    if (!currentRoom || !isValidPhase || !channelRef.current) {
      console.warn("[Trump Voting] Cannot force bot votes now.", {
        storePhase: gameStatus,
        roomPhase: currentRoom?.gameState.gamePhase,
      });
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

    botsToVote.forEach((bot, index) => {
      setTimeout(() => {
        const randomSuit = suits[Math.floor(Math.random() * suits.length)];
        console.log(
          `[Trump Voting] Forcing bot ${bot.name} to vote for ${randomSuit}`
        );

        // Send through Realtime
        channelRef.current?.send({
          type: "broadcast",
          event: "trump-vote",
          payload: { roomId, suit: randomSuit, botId: bot.id },
        });
      }, 500 * (index + 1)); // Stagger votes
    });
  }, [currentRoom, roomId, botVotes]);

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
