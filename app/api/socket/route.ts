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
        handleDisconnect(ws);
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
  console.log(`[WSS] Broadcasting type ${message.type} to room ${roomId}`);
  roomClients.forEach((client, id) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageString);
      } catch (e) {
        console.error(`[WSS] Failed to send message to client ${id}`, e);
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
        `[WSS] Sent type ${message.type} to client ${clients.get(ws)?.id}`
      );
    } catch (e) {
      console.error(
        `[WSS] Failed to send message to client ${clients.get(ws)?.id}`,
        e
      );
    }
  }
}

// Handle room joining logic
function handleRoomJoin(ws: WebSocket, payload: JoinRoomPayload) {
  const { roomId, playerName } = payload;
  const clientInfo = clients.get(ws);
  if (!clientInfo || !roomId || !playerName) return;

  console.log(
    `[WSS] Join logic: ${playerName} (${clientInfo.id}) joining ${roomId}`
  );

  // Check if player is already in the room
  const existingRoom = rooms.get(roomId);
  if (existingRoom) {
    // Find if this player name already exists in the room
    for (const [existingClientId, existingWs] of existingRoom.entries()) {
      const existingClient = clients.get(existingWs);
      if (existingClient && existingClient.name === playerName) {
        // If this is a different connection for the same player, close the old one
        if (existingWs !== ws) {
          console.log(`[WSS] Closing old connection for player ${playerName}`);
          handleDisconnect(existingWs);
          existingWs.close();
        }
        break;
      }
    }
  }

  // Clean up any existing room connection for this websocket
  if (clientInfo.roomId) {
    handleDisconnect(ws);
  }

  clientInfo.name = playerName;
  clientInfo.roomId = roomId;

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map());
  }
  rooms.get(roomId)?.set(clientInfo.id, ws);
  console.log(
    `[WSS] Client ${
      clientInfo.id
    } added to room map for ${roomId}. Current room clients: ${
      rooms.get(roomId)?.size
    }`
  );

  try {
    const existingGameRoom = gameManager.getRoom(roomId);
    if (existingGameRoom && existingGameRoom.players.length >= 4) {
      console.warn(
        `[WSS] Room ${roomId} is full in GameManager. Rejecting join.`
      );
      sendToClient(ws, { type: "error", payload: `Room ${roomId} is full.` });
      rooms.get(roomId)?.delete(clientInfo.id);
      if (rooms.get(roomId)?.size === 0) rooms.delete(roomId);
      clients.delete(ws);
      ws.close();
      return;
    }

    // Add player to game manager if not already present
    const existingPlayer = existingGameRoom?.players.find(
      (p) => p.name === playerName
    );
    let roomState: GameRoom;

    if (!existingPlayer) {
      // Create room if it doesn't exist
      if (!existingGameRoom) {
        roomState = gameManager.findOrCreateRoom();
      } else {
        const player = gameManager.addPlayerToRoom(roomId, playerName);
        roomState = gameManager.getRoom(roomId)!;
      }
      console.log(
        `[WSS] Player ${playerName} added to GameManager for room ${roomId}`
      );
    } else {
      if (!existingGameRoom) {
        throw new Error("Unexpected state: existingGameRoom is undefined");
      }
      roomState = existingGameRoom;
      console.log(
        `[WSS] Player ${playerName} already exists in GameManager for room ${roomId}`
      );
    }

    sendToClient(ws, { type: "room:joined", payload: roomState });
    broadcast(roomId, { type: "room:updated", payload: roomState });
    broadcast(roomId, {
      type: "player:joined",
      payload: { id: clientInfo.id, name: playerName },
    });

    // Start game if room is full
    if (roomState.players.length === 4) {
      console.log(`[WSS] Room ${roomId} is full, starting game`);
      gameManager.startGame(roomId);
      const finalRoomState = gameManager.getRoom(roomId);
      if (finalRoomState) {
        broadcast(roomId, { type: "game:started", payload: finalRoomState });
        broadcast(roomId, {
          type: "game:state-updated",
          payload: finalRoomState.gameState,
        });
      }
    }
  } catch (error) {
    console.error(
      `[WSS] Error handling room join for ${playerName} in room ${roomId}:`,
      error
    );
    sendToClient(ws, {
      type: "error",
      payload: "Failed to join room. Please try again.",
    });
    rooms.get(roomId)?.delete(clientInfo.id);
    if (rooms.get(roomId)?.size === 0) rooms.delete(roomId);
    clients.delete(ws);
    ws.close();
  }
}

// Handle client disconnection
function handleDisconnect(ws: WebSocket) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;

  console.log(
    `[WSS] Client disconnected: ${clientInfo.id} (Name: ${clientInfo.name})`
  );

  const { roomId, id: clientId, name: playerName } = clientInfo;

  if (roomId && rooms.has(roomId)) {
    rooms.get(roomId)?.delete(clientId);
    console.log(`[WSS] Client ${clientId} removed from room map for ${roomId}`);
    if (rooms.get(roomId)?.size === 0) {
      console.log(`[WSS] Room ${roomId} is now empty, removing room map.`);
      rooms.delete(roomId);
    }
  }

  clients.delete(ws);

  if (roomId) {
    try {
      gameManager.removePlayerFromRoom(roomId, clientId);
      console.log(
        `[WSS] Player ${clientId} removed from GameManager room ${roomId}`
      );
      const updatedRoomState = gameManager.getRoom(roomId);
      if (updatedRoomState) {
        broadcast(roomId, { type: "player:left", payload: playerName });
        broadcast(roomId, { type: "room:updated", payload: updatedRoomState });
      }
    } catch (error) {
      console.error(
        `[WSS] Error removing player ${clientId} from GameManager room ${roomId}:`,
        error
      );
    }
  }
}

export async function GET(req: Request) {
  console.log(
    `[API Route /api/socket] Received ${req.method} request. Triggering setup if needed.`
  );

  if (!global.wss) {
    console.log(
      "[API Route /api/socket] WebSocket server not found, attempting setup..."
    );
    setupWebSocketServer();
  } else {
    console.log(
      "[API Route /api/socket] WebSocket server already running globally."
    );
  }

  return new NextResponse("WebSocket server setup process triggered", {
    status: 200,
  });
}

export async function POST(req: Request) {
  if (!global.wss) {
    return new NextResponse("WebSocket server not initialized", {
      status: 500,
    });
  }

  // Create a dummy socket for the WebSocket upgrade
  const dummySocket = {
    write: () => {},
    end: () => {},
    destroy: () => {},
  };

  return new Promise<Response>((resolve) => {
    try {
      // Convert the Request to a format that ws can handle
      const fakeReq = {
        headers: Object.fromEntries(req.headers.entries()),
        method: req.method,
        url: req.url,
      };

      global.wss?.handleUpgrade(
        fakeReq as any,
        dummySocket as any,
        Buffer.alloc(0),
        (ws: WebSocket) => {
          resolve(
            new Response(null, {
              status: 101,
              headers: {
                Upgrade: "websocket",
                Connection: "Upgrade",
              },
            })
          );
        }
      );
    } catch (error) {
      console.error("Error during WebSocket upgrade:", error);
      resolve(
        new Response("WebSocket upgrade failed", {
          status: 500,
        })
      );
    }
  });
}
