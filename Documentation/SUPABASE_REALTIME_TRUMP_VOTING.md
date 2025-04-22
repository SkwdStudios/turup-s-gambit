# Supabase Realtime Trump Voting System

This document explains the implementation of the trump voting system using Supabase Realtime for Turup's Gambit.

## Overview

The trump voting system allows players to vote for their preferred trump suit during the initial deal phase of the game. Previously, this was implemented using a mock system with window messages. The new implementation uses Supabase Realtime for proper real-time updates across all connected clients.

## Components

The system consists of the following components:

1. **Database schema**: Tables and policies in Supabase
2. **Realtime channels**: For broadcasting and receiving votes
3. **React hooks**: For managing state and interactions
4. **UI components**: For displaying votes and allowing user interaction

## Database Schema

The system uses a `trump_votes` table in Supabase with the following structure:

```sql
CREATE TABLE public.trump_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  player_id UUID, -- For regular players
  bot_id TEXT, -- For bots
  suit TEXT NOT NULL CHECK (suit IN ('hearts', 'spades', 'diamonds', 'clubs')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Either player_id OR bot_id must be provided
  CONSTRAINT player_or_bot_required CHECK (
    (player_id IS NOT NULL AND bot_id IS NULL) OR
    (player_id IS NULL AND bot_id IS NOT NULL)
  )
);
```

Row Level Security (RLS) policies are applied to ensure players can only vote as themselves and see votes for rooms they're in.

## Realtime Implementation

1. **Channel Creation**: When the game enters the initial deal phase, a Supabase Realtime channel is created for trump voting with a unique channel name based on the room ID: `trump-voting:{roomId}`.

2. **Broadcasting Votes**: When a player votes, their selection is broadcast through this channel to all connected clients.

3. **Bot Voting**: Bots also participate in voting, with their votes broadcast through the same channel.

4. **Vote Counting**: The system tracks votes for each suit and detects when voting is complete.

5. **Final Selection**: Once all players have voted, the winning suit is determined and broadcast to all players.

## React Hook (useSupabaseTrumpVoting)

The main hook `useSupabaseTrumpVoting` manages the entire voting process:

```typescript
export function useSupabaseTrumpVoting(
  currentRoom: GameRoom | null,
  roomId: string,
  userId: string | undefined
) {
  // State for votes, completion, etc.

  // Effect to handle vote messages

  // Function to cast a vote

  // Function to force bot votes

  return {
    trumpVotes, // Current vote counts
    userVote, // The current user's vote
    votingComplete, // Whether voting is complete
    handleVote, // Function to cast a vote
    handleForceBotVotes, // Function to force bots to vote
    resetVotingState, // Function to reset voting state
  };
}
```

## User Interface

The `TrumpSelectionPopup` component provides the interface for voting:

- Displays the current vote counts for each suit
- Shows the user's current vote
- Allows the user to vote for a suit if they haven't already
- For hosts, provides a button to force bots to vote
- Shows voting results when complete

## Bot Implementation

1. Bots are triggered to vote automatically after a short delay when the trump voting phase begins
2. The room host can force any remaining bots to vote if needed

## Integration with Game Logic

The trump voting system integrates with the existing game logic:

1. Voting begins during the `initial_deal` phase
2. Once voting is complete, the winning suit is set as the trump suit
3. The game then proceeds to deal the remaining cards

## Performance Considerations

- The system uses a channel cache to prevent recreation of channels
- It handles duplicate votes by tracking voter IDs
- Bot votes are staggered to prevent overwhelming the server

## Maintenance and Upgrades

When making changes to the trump voting system:

1. Ensure database migrations are applied via the `supabase/migrations` folder
2. Test changes with both human players and bots
3. Verify error handling, especially for edge cases like reconnections
4. Consider the user experience, ensuring voting is intuitive and responsive

## Troubleshooting

Common issues and solutions:

- **Votes not being registered**: Check network connectivity and Supabase Realtime status
- **Bot votes not triggering**: Verify the bot voting helper functions are working
- **Duplicate votes**: Ensure the voter tracking system is functioning properly
- **Supabase connectivity**: Check the console for Realtime connection errors

## Future Improvements

Potential improvements to consider:

1. **Analytics**: Track voting patterns to improve game balance
2. **Offline support**: Allow voting to continue if a player temporarily disconnects
3. **Custom voting rules**: Allow different voting systems for different game modes
4. **Vote timers**: Add a timeout to force move to the next phase if players are inactive
