# Supabase Realtime Implementation

## Overview

This document explains the implementation of Supabase Realtime for game communication in Turup's Gambit. We've optimized the real-time communication approach to leverage Supabase Realtime's websocket capabilities directly from the client when possible, while still preserving server-side validation for critical operations.

## Current Implementation

The current implementation:

1. Uses direct client-to-client communication through Supabase Realtime for most game actions
2. Only routes critical actions through the server for validation/processing
3. Provides fallback to the API when websocket connections fail
4. Maintains a consistent message delivery mechanism
5. Implements reconnection logic with exponential backoff
6. Uses channel caching to improve performance and stability

### Game Flow and Message Types

The game progresses through several phases, each with specific message types:

1. **Waiting Room Phase**

   - `room:join` - Player joins the room
   - `room:leave` - Player leaves the room
   - `player:joined` - Broadcast when a player (or bot) joins
   - `game:start` - Host initiates game start (server-processed)

2. **Initial Deal Phase**

   - `game:started` - Confirms game has started
   - `game:deal-initial` - Initial 5 cards are dealt to players
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
   - `game:trick-winner` - Announces the winner of a trick

6. **Game End**
   - `game:over` - Game has ended with results
   - `game:replay-available` - Replay data is ready

### Key Components

#### `useSupabaseRealtime` Hook

This custom hook manages the Supabase Realtime connection. It includes:

- Channel creation and management
- Message sending via Websocket or API
- Automatic reconnection handling
- Message queuing for retry
- Intelligent routing based on message type
- Connection state monitoring

```typescript
export function useSupabaseRealtime(roomId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messageQueue, setMessageQueue] = useState<Message[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttempts = useRef(0);

  // Connection initialization and management
  useEffect(() => {
    if (!roomId) return;

    const setupChannel = async () => {
      // Channel setup and connection logic
    };

    setupChannel();

    return () => {
      // Cleanup logic
    };
  }, [roomId]);

  // Message sending function
  const sendMessage = useCallback(
    async (message: Message) => {
      if (isCriticalMessage(message.type)) {
        // Send via API for validation
        return sendViaAPI(message);
      }

      if (isConnected && channelRef.current) {
        try {
          // Send via websocket
          await channelRef.current.send({
            type: "broadcast",
            event: "message",
            payload: message,
          });
          return true;
        } catch (error) {
          // Handle errors and try fallback
          console.error("Failed to send via websocket:", error);
          return sendViaAPI(message);
        }
      } else {
        // Queue message for later or use API fallback
        queueMessage(message);
        return sendViaAPI(message);
      }
    },
    [isConnected, roomId]
  );

  return {
    isConnected,
    sendMessage,
    // Other useful properties
  };
}
```

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
- Connection status monitoring

```typescript
// Channel cache implementation
const channelCache = new Map<string, RealtimeChannel>();

// Function to get or create a channel
function getOrCreateChannel(roomId: string): RealtimeChannel {
  const cacheKey = `room:${roomId}`;

  if (channelCache.has(cacheKey)) {
    return channelCache.get(cacheKey)!;
  }

  const channel = supabase.channel(cacheKey, {
    config: {
      broadcast: { self: true },
      presence: { key: "user_id" },
    },
  });

  channelCache.set(cacheKey, channel);
  return channel;
}
```

### Error Handling and Recovery

The implementation includes:

- Automatic reconnection attempts with exponential backoff
- Caching of failed messages for retry
- Clear logging for debugging
- Multiple delivery paths for reliability
- Connection status monitoring

```typescript
// Reconnection logic with exponential backoff
const reconnect = async () => {
  if (reconnectAttempts.current > MAX_RECONNECT_ATTEMPTS) {
    console.error("Max reconnection attempts reached");
    return;
  }

  const delay = Math.min(
    BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current),
    MAX_RECONNECT_DELAY
  );

  console.log(
    `Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`
  );

  await new Promise((resolve) => setTimeout(resolve, delay));
  reconnectAttempts.current++;

  setupChannel();
};
```

## Debugging Tools

To aid in development and troubleshooting, the implementation includes debugging tools:

1. **Connection monitoring**:

   ```typescript
   useEffect(() => {
     console.log(
       `Realtime connection status: ${
         isConnected ? "Connected" : "Disconnected"
       }`
     );
   }, [isConnected]);
   ```

2. **Message logging**:

   ```typescript
   // Log all incoming messages
   channel.on("broadcast", { event: "message" }, (payload) => {
     console.debug("Received message:", payload.payload);
     // Process message
   });
   ```

3. **Connection event tracing**:
   ```typescript
   channel
     .on("system", { event: "connected" }, () => {
       console.debug("Connected to realtime");
       setIsConnected(true);
     })
     .on("system", { event: "disconnected" }, () => {
       console.debug("Disconnected from realtime");
       setIsConnected(false);
     });
   ```

## Testing Realtime Implementation

The `scripts/test-realtime.js` file provides a utility for testing the realtime implementation:

```javascript
// Sample usage
const testRealtime = async () => {
  const roomId = "test-room-123";
  const channel = supabase.channel(`room:${roomId}`);

  channel
    .on("broadcast", { event: "message" }, (payload) => {
      console.log("Received message:", payload.payload);
    })
    .subscribe();

  // Send a test message
  await channel.send({
    type: "broadcast",
    event: "message",
    payload: {
      type: "test:message",
      data: { text: "Hello from test script" },
    },
  });
};

testRealtime();
```

## Security Considerations

Despite moving more communication to the client side, security is maintained by:

1. Routing critical operations through the server for validation
2. Using Supabase's built-in security features including Row-Level Security
3. Maintaining server-side state validation
4. Using authentication tokens for channel access

## Performance Optimizations

1. **Channel Caching**:

   - Reuse channels for the same room to prevent connection churn
   - Clear unused channels to prevent memory leaks

2. **Message Batching**:

   - Combine multiple state updates in a single message when possible
   - Reduce the frequency of state broadcasts for non-critical updates

3. **Selective Subscriptions**:

   - Subscribe only to events relevant to the current game phase
   - Unsubscribe from unnecessary events when changing phases

4. **Connection Status Awareness**:
   - Update UI based on connection status
   - Prevent actions that require connectivity when disconnected

## Future Improvements

Potential future enhancements include:

1. Implementing Presence for real-time player status updates
2. Adding conflict resolution for concurrent actions
3. Enhanced offline support with message queuing
4. Performance optimizations for mobile devices
5. Adding encryption for sensitive messages
6. Improved analytics for gameplay patterns

## Troubleshooting Common Issues

1. **Connection Drops**:

   - Check network connectivity
   - Verify Supabase project status
   - Review browser console for connection errors

2. **Message Delivery Failures**:

   - Ensure channel subscription is active
   - Check message format and payload structure
   - Verify authentication state

3. **State Synchronization Issues**:

   - Compare client and server state
   - Check for missed messages during disconnection
   - Verify message processing logic

4. **Performance Problems**:
   - Monitor message volume and frequency
   - Check for excessive rerendering in React components
   - Optimize state updates to reduce unnecessary broadcasts
