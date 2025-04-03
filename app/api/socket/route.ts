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

  let roomState: GameRoom;
  try {
    const existingRoom = gameManager.getRoom(roomId);
    if (existingRoom && existingRoom.players.length >= 4) {
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

    roomState = existingRoom || gameManager.findOrCreateRoom(roomId);
    const gamePlayer = gameManager.addPlayerToRoom(
      roomState.id,
      playerName,
      clientInfo.id
    );
    console.log(
      `[WSS] Player ${playerName} added to GameManager for room ${roomState.id}`
    );
  } catch (error) {
    console.error(
      `[WSS] Error interacting with GameManager during join:`,
      error
    );
    sendToClient(ws, {
      type: "error",
      payload:
        error instanceof Error ? error.message : "Failed to join game room.",
    });
    rooms.get(roomId)?.delete(clientInfo.id);
    if (rooms.get(roomId)?.size === 0) rooms.delete(roomId);
    clients.delete(ws);
    ws.close();
    return;
  }

  const updatedRoomState = gameManager.getRoom(roomState.id);
  if (updatedRoomState) {
    sendToClient(ws, { type: "room:joined", payload: updatedRoomState });
    broadcast(roomId, { type: "room:updated", payload: updatedRoomState }, ws);
    broadcast(
      roomId,
      {
        type: "player:joined",
        payload: { id: clientInfo.id, name: clientInfo.name },
      },
      ws
    );

    if (updatedRoomState.players.length === 4) {
      console.log(`[WSS] Room ${roomId} is full, starting game`);
      gameManager.startGame(roomState.id);
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
      `[WSS] Room ${roomState.id} not found in GameManager after updates!`
    );
  }
}

// Handle client disconnection
function handleDisconnect(ws: WebSocket) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;

  console.log(
    `[WSS] Client disconnected: ${clientInfo.id} (Name: ${clientInfo.name})`
  );

  const { roomId, id: clientId } = clientInfo;

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
        broadcast(roomId, { type: "player:left", payload: clientId });
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

  const { socket, response } = await new Promise<{
    socket: any;
    response: any;
  }>((resolve) => {
    global.wss?.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
      resolve({
        socket: ws,
        response: new NextResponse(null, { status: 101 }),
      });
    });
  });

  return response;
}
