# Supabase Realtime Implementation

## Overview

This document explains the implementation of Supabase Realtime for game communication in Turup's Gambit. We've optimized the real-time communication approach to leverage Supabase Realtime's websocket capabilities directly from the client when possible, while still preserving server-side validation for critical operations.

## Previous Implementation

In the previous implementation:

1. Every game action required an API call to the backend
2. The backend would then make Supabase Realtime updates
3. The backend would send responses back to clients
4. This created unnecessary latency and server load

This approach defeated the purpose of Supabase Realtime, which is designed for direct client-to-client communication through a managed websocket service.

## New Implementation

The new implementation:

1. Uses direct client-to-client communication through Supabase Realtime for most game actions
2. Only routes critical actions through the server for validation/processing
3. Provides fallback to the API when websocket connections fail
4. Maintains a consistent message delivery mechanism

### Game Flow and Message Types

The game progresses through several phases, each with specific message types:

1. **Waiting Room Phase**

   - `room:join` - Player joins the room
   - `room:leave` - Player leaves the room
   - `player:joined` - Broadcast when a player (or bot) joins
   - `game:start` - Host initiates game start (server-processed)

2. **Initial Deal Phase**

   - `game:started` - Confirms game has started
   - Cards are dealt to players (5 initial cards)
   - `game:trump-selection` - Trump selection popup is shown

3. **Trump Selection Process**

   - `game:select-trump` - Player selects a trump suit
   - `game:trump-vote` - Records a player's vote
   - `game:trump-selected` - Final trump suit is determined
   - Host can trigger `handleForceBotVotes` for bots

4. **Bidding & Final Deal Phases**

   - `game:bid` - Player places a bid
   - `game:final-deal` - Remaining cards are dealt

5. **Playing Phase**

   - `game:play-card` - Player plays a card
   - `game:card-played` - Confirms card has been played
   - `game:trick-complete` - A trick is completed

6. **Game End**
   - `game:over` - Game has ended with results

### Trump Selection Implementation

The trump selection process is a critical part of the game flow and demonstrates how realtime messaging is used effectively:

1. After initial cards are dealt, the `TrumpSelectionPopup` is shown via `useUIStore.getState().setShowTrumpPopup(true)`
2. Players analyze their hand and vote for a trump suit
3. When a player votes, the `handleTrumpVote` function is called:
   ```typescript
   const handleTrumpVote = (suit: string) => {
     // Send trump selection message
     useGameStore.getState().sendMessage({
       type: "game:select-trump",
       payload: {
         roomId,
         playerId: user.id,
         suit,
       },
     });
     // Update local state
     set({
       trumpSuit: suit,
       votingComplete: true,
       gameStatus: "bidding",
     });
   };
   ```
4. The vote is broadcasted to all players via Supabase Realtime
5. If the player is the host, they can force bot votes with the `handleForceBotVotes` function
6. Once voting is complete, the game transitions to the next phase

### Key Components

#### `useSupabaseRealtime` Hook

This custom hook manages the Supabase Realtime connection. It includes:

- Channel creation and management
- Message sending via Websocket or API
- Automatic reconnection handling
- Message queuing for retry
- Intelligent routing based on message type

#### Message Routing Logic

The hook determines how to send messages based on their type:

1. **Server-processed messages** - Messages that require validation or trigger server-side effects are routed through the API:

   - Room creation (`room:create`)
   - Game start (`game:start`)
   - Authentication events (`auth:*`)
   - Game end (`game:end`)

2. **Direct messages** - All other messages are sent directly through Supabase Realtime websockets:

   - Card plays
   - Trump selections
   - Player moves
   - Chat messages
   - State updates

3. **Fallback mechanism** - If websocket sending fails, the system automatically tries the API as a fallback

### State Management Integration

The realtime implementation is tightly integrated with Zustand stores:

1. **gameStore.ts**

   - Handles sending/receiving game messages
   - Manages game state transitions
   - Processes incoming messages and updates state
   - Provides methods for game actions that trigger messages

2. **uiStore.ts**
   - Controls modal visibility including trump selection popup
   - Manages loading states and animations during communication
   - Provides toast messages for communication events

### Channel Management

Channels are cached in a `Map` to prevent unnecessary recreation, improving performance and connection stability. Each channel is configured with:

- Broadcast to self (to receive your own messages)
- Presence tracking for improved reliability

### Error Handling and Recovery

The implementation includes:

- Automatic reconnection attempts
- Caching of failed messages for retry
- Exponential backoff for reconnection
- Clear logging for debugging
- Multiple delivery paths for reliability

## Security Considerations

Despite moving more communication to the client side, security is maintained by:

1. Routing critical operations through the server for validation
2. Using Supabase's built-in security features
3. Maintaining server-side state validation
4. Using authentication tokens for channel access

## Benefits

The new implementation provides several advantages:

1. **Lower latency** - Direct client-to-client communication reduces round-trip time
2. **Reduced server load** - Fewer API calls means less server processing
3. **Better scalability** - Supabase Realtime is designed to scale for many concurrent users
4. **Improved reliability** - Multiple fallback mechanisms ensure message delivery
5. **Better user experience** - Faster response times lead to smoother gameplay

## Implementation Details

### Message Processing in Game Store

The game store processes incoming messages to update game state:

```typescript
// Handle incoming messages in the Supabase Realtime channel
channel.on("broadcast", { event: "message" }, (payload) => {
  const message = payload.payload;

  // Process different message types
  switch (message.type) {
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

    // Other message types...
  }
});
```

### Trump Selection Popup Integration

The `TrumpSelectionPopup` component integrates with the realtime system by:

1. Reading player hand data from the game state
2. Displaying current votes from all players
3. Updating in real-time as votes come in
4. Allowing the host to force bot votes
5. Using a timeout mechanism to ensure the game progresses

## Future Improvements

Potential future enhancements include:

1. Implementing Presence for real-time player status updates
2. Adding conflict resolution for concurrent trump votes
3. Enhanced offline support with message queuing
4. Performance optimizations for mobile devices
5. Adding encryption for sensitive messages
6. Improved analytics for trump selection patterns

## Usage Example

```typescript
// In a game component
const { isConnected, sendMessage } = useSupabaseRealtime(roomId);

// Send a trump selection message
const selectTrump = (suit) => {
  sendMessage({
    type: "game:select-trump",
    payload: {
      roomId,
      playerId: currentUser.id,
      suit,
    },
  });
};

// Critical actions still go through the server
const startGame = () => {
  sendMessage({
    type: "game:start",
    payload: {
      roomId,
      gameMode,
    },
  });
};
```
