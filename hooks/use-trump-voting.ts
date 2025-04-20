import { useState, useEffect, useCallback } from "react";
import { GameRoom } from "@/app/types/game";
import {
  triggerBotVoting,
  forceAllBotsToVote,
  resetBotVotesTracking,
} from "@/app/game/[roomId]/bot-voting-helper"; // Adjust path if needed

type SendMessageFunction = (message: any) => boolean;

export function useTrumpVoting(
  currentRoom: GameRoom | null,
  roomId: string,
  safeSendMessage: SendMessageFunction,
  userId: string | undefined // Pass user ID for identifying player votes
) {
  const [trumpVotes, setTrumpVotes] = useState<Record<string, number>>({
    hearts: 0,
    diamonds: 0,
    clubs: 0,
    spades: 0,
  });
  const [userVote, setUserVote] = useState<string | null>(null);
  const [votingComplete, setVotingComplete] = useState(false);
  const [botVotes, setBotVotes] = useState<Record<string, boolean>>({}); // Tracks which bot IDs have voted

  const resetVotingState = useCallback(() => {
    console.log("[Trump Voting Hook] Resetting voting state");
    setTrumpVotes({ hearts: 0, diamonds: 0, clubs: 0, spades: 0 });
    setUserVote(null);
    setVotingComplete(false);
    setBotVotes({});
    resetBotVotesTracking(); // Reset helper state as well
  }, []);

  // Effect to reset voting when game phase changes away from initial_deal
  useEffect(() => {
    if (currentRoom?.gameState.gamePhase !== "initial_deal") {
      resetVotingState();
    }
  }, [currentRoom?.gameState.gamePhase, resetVotingState]);

  // Effect to handle incoming trump vote messages
  useEffect(() => {
    const handleTrumpVoteMessage = (event: any) => {
      if (!event.data) return;
      try {
        const message =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (message.type === "game:trump-vote") {
          const { suit, botId, playerId } = message.payload;
          console.log(
            `[Trump Voting Hook] Received vote for ${suit}`,
            botId ? `from bot ${botId}` : `from player ${playerId}`
          );

          // Update vote counts (ensure not already complete)
          if (!votingComplete) {
            setTrumpVotes((prev) => {
              // Avoid double counting if message is somehow duplicated
              // This basic check assumes one vote per player/bot ID
              if (botId && botVotes[botId]) return prev;
              // We can't easily check for duplicate player votes here without tracking player IDs who voted
              const newVotes = { ...prev, [suit]: (prev[suit] || 0) + 1 };
              console.log(`[Trump Voting Hook] Updated vote counts:`, newVotes);
              return newVotes;
            });
          }

          // Mark bot as voted
          if (botId) {
            setBotVotes((prev) => {
              const newBotVotes = { ...prev, [botId]: true };
              console.log(
                `[Trump Voting Hook] Updated bot votes:`,
                newBotVotes
              );
              return newBotVotes;
            });
          }

          // Check for voting completion (deferred slightly)
          // Defer this check slightly to allow state updates to settle
          setTimeout(() => {
            setTrumpVotes((currentVotes) => {
              const totalVotes = Object.values(currentVotes).reduce(
                (sum, count) => sum + count,
                0
              );
              const expectedVotes = currentRoom?.players.length || 0;

              console.log(
                `[Trump Voting Hook] Total votes: ${totalVotes}, Expected: ${expectedVotes}`
              );

              if (
                expectedVotes > 0 &&
                totalVotes >= expectedVotes &&
                !votingComplete
              ) {
                console.log(`[Trump Voting Hook] Voting complete.`);
                setVotingComplete(true);
              }
              return currentVotes; // Return unchanged state
            });
          }, 100);
        }
      } catch (error) {
        console.error("[Trump Voting Hook] Error handling message:", error);
      }
    };

    if (currentRoom && currentRoom.gameState.gamePhase === "initial_deal") {
      console.log("[Trump Voting Hook] Setting up message listener.");
      window.addEventListener("message", handleTrumpVoteMessage);

      // Trigger initial bot voting attempt (with delay)
      const timerId = setTimeout(() => {
        if (
          currentRoom?.gameState.gamePhase === "initial_deal" &&
          !votingComplete
        ) {
          console.log("[Trump Voting Hook] Triggering initial bot voting.");
          triggerBotVoting(
            currentRoom,
            roomId,
            safeSendMessage,
            botVotes,
            setBotVotes,
            votingComplete
          );
        }
      }, 1500); // Delay to allow component mount and listener setup

      return () => {
        console.log("[Trump Voting Hook] Removing message listener.");
        window.removeEventListener("message", handleTrumpVoteMessage);
        clearTimeout(timerId);
      };
    }
  }, [currentRoom, roomId, safeSendMessage, botVotes, votingComplete]); // Dependencies

  // Function for the current user to cast their vote
  const handleVote = useCallback(
    (suit: string) => {
      if (
        userVote ||
        votingComplete ||
        !currentRoom ||
        currentRoom.gameState.gamePhase !== "initial_deal"
      ) {
        console.warn("[Trump Voting Hook] Vote attempt blocked:", {
          userVote,
          votingComplete,
          phase: currentRoom?.gameState.gamePhase,
        });
        return false; // Indicate vote was not sent
      }

      console.log(`[Trump Voting Hook] User voting for ${suit}`);
      setUserVote(suit); // Optimistically set user vote

      // Send vote message via websocket
      const success = safeSendMessage({
        type: "game:select-trump",
        payload: { roomId, suit, playerId: userId }, // Include player ID
      });

      if (success) {
        // Update local count immediately ONLY if send was successful
        // The message listener will handle the final count update and completion check
        setTrumpVotes((prev) => ({
          ...prev,
          [suit]: (prev[suit] || 0) + 1,
        }));
        return true; // Indicate vote was sent
      } else {
        console.error("[Trump Voting Hook] Failed to send user vote message.");
        setUserVote(null); // Revert optimistic update if sending failed
        return false; // Indicate vote failed
      }
    },
    [userVote, votingComplete, currentRoom, roomId, userId, safeSendMessage]
  );

  // Function to force any remaining bots to vote
  const handleForceBotVotes = useCallback(() => {
    if (!currentRoom || currentRoom.gameState.gamePhase !== "initial_deal") {
      console.warn("[Trump Voting Hook] Cannot force bot votes now.");
      return;
    }
    console.log("[Trump Voting Hook] Forcing remaining bots to vote.");
    forceAllBotsToVote(currentRoom, roomId, safeSendMessage);
  }, [currentRoom, roomId, safeSendMessage]);

  return {
    trumpVotes,
    userVote,
    votingComplete,
    botVotes, // Expose if needed for debugging or specific UI
    handleVote,
    handleForceBotVotes,
    resetVotingState, // Expose reset function
  };
}
