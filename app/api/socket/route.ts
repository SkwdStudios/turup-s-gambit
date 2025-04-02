import { createServer, Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { NextResponse } from "next/server";
import { GameManager } from "@/app/lib/game-manager";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Card,
  Suit,
  GameRoom,
  Player,
} from "@/app/types/game";
import { v4 as uuidv4 } from "uuid";

// Type definitions for messages
interface BaseMessage {
  type: string;
  payload?: any;
}

interface JoinRoomPayload {
  roomId: string;
  playerName: string;
}

// Define global scope augmentation
declare global {
  var httpServer: HttpServer | undefined;
  var wss: WebSocketServer | undefined;
}

// Map to store clients per room
const rooms = new Map<string, Map<string, WebSocket>>();
// Map to store player info associated with a WebSocket instance
const clients = new Map<
  WebSocket,
  { id: string; name: string; roomId?: string }
>();

const PORT = process.env.SOCKET_PORT || 3001;
const gameManager = GameManager.getInstance();

function setupWebSocketServer() {
  console.log(
    `[WSS Setup] Attempting to set up WebSocket server on port ${PORT}...`
  );
  if (global.httpServer) {
    console.log(`[WSS Setup] Server already appears to be running.`);
    return;
  }

  try {
    const httpServer = createServer();
    global.httpServer = httpServer;

    const wss = new WebSocketServer({ server: httpServer });
    global.wss = wss;
    console.log("[WSS Setup] WebSocketServer instance created.");

    wss.on("connection", (ws: WebSocket) => {
      const clientId = uuidv4(); // Generate unique ID for this connection
      clients.set(ws, { id: clientId, name: "Unknown" });
      console.log(`[WSS ${PORT}] Client connected: ${clientId}`);

      ws.on("message", (message) => {
        try {
          const parsedMessage: BaseMessage = JSON.parse(message.toString());
          console.log(
            `[WSS ${PORT}] Received message type: ${parsedMessage.type} from ${clientId}`
          );

          switch (parsedMessage.type) {
            case "room:join":
              handleRoomJoin(ws, parsedMessage.payload as JoinRoomPayload);
              break;
            // --- Add cases for other message types ---
            // e.g., game:ready, game:bid, game:play-card, game:select-trump
            default:
              console.log(
                `[WSS ${PORT}] Unknown message type: ${parsedMessage.type}`
              );
          }
        } catch (error) {
          console.error(
            `[WSS ${PORT}] Failed to parse message or handle event:`,
            error
          );
          // Optionally send error back to client
          // ws.send(JSON.stringify({ type: 'error', payload: 'Invalid message format' }));
        }
      });

      ws.on("close", () => {
        handleDisconnect(ws);
      });

      ws.on("error", (error) => {
        console.error(
          `[WSS ${PORT}] WebSocket error for client ${clients.get(ws)?.id}:`,
          error
        );
        handleDisconnect(ws); // Treat error as disconnect
      });
    });

    httpServer.listen(PORT, () => {
      console.log(`[WSS Setup] WebSocket server listening on port ${PORT}`);
    });

    httpServer.on("error", (error) => {
      console.error(`[WSS Setup] HTTP Server error:`, error);
      if ((error as NodeJS.ErrnoException).code === "EADDRINUSE") {
        console.warn(`[WSS Setup] Port ${PORT} already in use.`);
      } else {
        global.httpServer = undefined;
        global.wss = undefined;
      }
    });
  } catch (error) {
    console.error("[WSS Setup] Error during server setup:", error);
    global.httpServer = undefined;
    global.wss = undefined;
  }
}

// Helper function to broadcast messages to a room
function broadcast(roomId: string, message: BaseMessage, sender?: WebSocket) {
  const roomClients = rooms.get(roomId);
  if (!roomClients) return;

  const messageString = JSON.stringify(message);
  console.log(
    `[WSS ${PORT}] Broadcasting type ${message.type} to room ${roomId}`
  );
  roomClients.forEach((client, id) => {
    // Send to all clients in the room except the sender, if specified
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageString);
      } catch (e) {
        console.error(
          `[WSS ${PORT}] Failed to send message to client ${id}`,
          e
        );
      }
    }
  });
}

// Helper function to send message to a specific client
function sendToClient(ws: WebSocket, message: BaseMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(message));
      console.log(
        `[WSS ${PORT}] Sent type ${message.type} to client ${
          clients.get(ws)?.id
        }`
      );
    } catch (e) {
      console.error(
        `[WSS ${PORT}] Failed to send message to client ${clients.get(ws)?.id}`,
        e
      );
    }
  }
}

// Handle room joining logic
function handleRoomJoin(ws: WebSocket, payload: JoinRoomPayload) {
  const { roomId, playerName } = payload;
  const clientInfo = clients.get(ws);
  if (!clientInfo || !roomId || !playerName) return; // Basic validation

  console.log(
    `[WSS ${PORT}] Join logic: ${playerName} (${clientInfo.id}) joining ${roomId}`
  );

  // Remove from previous room if any
  if (clientInfo.roomId) {
    handleDisconnect(ws); // Reuse disconnect logic to clean up old room
  }

  clientInfo.name = playerName;
  clientInfo.roomId = roomId;

  // Add to new room
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  rooms.get(roomId)?.set(clientInfo.id, ws);
  console.log(
    `[WSS ${PORT}] Client ${
      clientInfo.id
    } added to room map for ${roomId}. Current room clients: ${
      rooms.get(roomId)?.size
    }`
  );

  // --- Integrate with GameManager (replace Socket.IO logic) ---
  // This part needs careful mapping from ws concepts to your GameManager
  let roomState: GameRoom;
  try {
    const existingRoom = gameManager.getRoom(roomId);
    if (existingRoom && existingRoom.players.length >= 4) {
      console.warn(
        `[WSS ${PORT}] Room ${roomId} is full in GameManager. Rejecting join.`
      );
      sendToClient(ws, { type: "error", payload: `Room ${roomId} is full.` });
      // Clean up the client maps as well
      rooms.get(roomId)?.delete(clientInfo.id);
      if (rooms.get(roomId)?.size === 0) rooms.delete(roomId);
      clients.delete(ws); // Or reset clientInfo.roomId
      ws.close(); // Close the connection
      return;
    }

    roomState = existingRoom || gameManager.findOrCreateRoom(roomId); // Or findOrCreateRoom()
    // Important: GameManager needs adapting. It likely expects socket IDs.
    // We might need to pass clientInfo.id instead of a socket object.
    const gamePlayer = gameManager.addPlayerToRoom(
      roomState.id,
      playerName,
      clientInfo.id
    ); // Use our generated ID
    // No need to store ws instance in gameManager
    console.log(
      `[WSS ${PORT}] Player ${playerName} added to GameManager for room ${roomState.id}`
    );
  } catch (error) {
    console.error(
      `[WSS ${PORT}] Error interacting with GameManager during join:`,
      error
    );
    sendToClient(ws, {
      type: "error",
      payload:
        error instanceof Error ? error.message : "Failed to join game room.",
    });
    // Clean up client maps on error
    rooms.get(roomId)?.delete(clientInfo.id);
    if (rooms.get(roomId)?.size === 0) rooms.delete(roomId);
    clients.delete(ws);
    ws.close();
    return;
  }

  // Send confirmation to joining client
  const updatedRoomState = gameManager.getRoom(roomState.id);
  if (updatedRoomState) {
    sendToClient(ws, { type: "room:joined", payload: updatedRoomState });

    // Broadcast update to others in the room
    broadcast(roomId, { type: "room:updated", payload: updatedRoomState }, ws); // Send updated state
    broadcast(
      roomId,
      {
        type: "player:joined",
        payload: { id: clientInfo.id, name: clientInfo.name },
      },
      ws
    );

    // Check if game should start
    if (updatedRoomState.players.length === 4) {
      console.log(`[WSS ${PORT}] Room ${roomId} is full, starting game`);
      gameManager.startGame(roomState.id);
      // Need fresh state again after starting
      const finalRoomState = gameManager.getRoom(roomState.id);
      if (finalRoomState) {
        broadcast(roomId, { type: "game:started", payload: finalRoomState });
        broadcast(roomId, {
          type: "game:state-updated",
          payload: finalRoomState.gameState,
        });
      }
    }
  } else {
    console.error(
      `[WSS ${PORT}] Room ${roomState.id} not found in GameManager after updates!`
    );
    // Handle this inconsistency
  }
}

// Handle client disconnection
function handleDisconnect(ws: WebSocket) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;

  console.log(
    `[WSS ${PORT}] Client disconnected: ${clientInfo.id} (Name: ${clientInfo.name})`
  );

  const { roomId, id: clientId } = clientInfo;

  // Remove from room map
  if (roomId && rooms.has(roomId)) {
    rooms.get(roomId)?.delete(clientId);
    console.log(
      `[WSS ${PORT}] Client ${clientId} removed from room map for ${roomId}`
    );
    if (rooms.get(roomId)?.size === 0) {
      console.log(
        `[WSS ${PORT}] Room ${roomId} is now empty, removing room map.`
      );
      rooms.delete(roomId);
      // Optionally also remove from GameManager if empty
      // gameManager.removeRoomIfEmpty(roomId);
    }
  }

  // Remove from global client map
  clients.delete(ws);

  // --- Notify GameManager and other players ---
  if (roomId) {
    try {
      gameManager.removePlayerFromRoom(roomId, clientId);
      console.log(
        `[WSS ${PORT}] Player ${clientId} removed from GameManager room ${roomId}`
      );
      const updatedRoomState = gameManager.getRoom(roomId);
      if (updatedRoomState) {
        // Room might cease to exist if last player
        broadcast(roomId, { type: "player:left", payload: clientId });
        broadcast(roomId, { type: "room:updated", payload: updatedRoomState });
      }
    } catch (error) {
      console.error(
        `[WSS ${PORT}] Error removing player ${clientId} from GameManager room ${roomId}:`,
        error
      );
    }
  }
}

// API Route to trigger the setup
export async function GET(req: Request) {
  console.log(
    `[API Route /api/socket] Received ${req.method} request. Triggering setup if needed.`
  );
  if (!global.httpServer || !global.wss) {
    // Check wss too
    console.log(
      "[API Route /api/socket] WebSocket server not found or WSS missing, attempting setup..."
    );
    setupWebSocketServer();
  } else {
    console.log(
      "[API Route /api/socket] WebSocket server already running globally."
    );
  }
  return new NextResponse(
    "WebSocket server setup process triggered (check server logs and connect to port 3001)",
    {
      status: 200,
    }
  );
}

// Cleanup Interval (Optional)
// setInterval(() => {
//   console.log("Running stale room cleanup...");
//   // You might need to adapt gameManager's cleanup or implement one based on the 'rooms' map
//   // gameManager.cleanupStaleRooms();
// }, 30 * 60 * 1000);
