import { User as SupabaseUser } from "@supabase/supabase-js";
import { GameRoom, Player } from "@/app/types/game"; // Adjust path as needed

/**
 * Checks if the current user is the host of the game room.
 * Tries matching by username, name, email prefix, or if they are the first player
 * in a room without an assigned host.
 *
 * @param currentRoom - The current game room data.
 * @param user - The authenticated Supabase user object.
 * @param playersInRoom - The current list of player names/objects in the room.
 * @returns True if the user is determined to be the host, false otherwise.
 */
export function isPlayerHost(
  currentRoom: GameRoom | null,
  user: SupabaseUser | null,
  playersInRoom: (Player | string)[] // Can be full player objects or just names
): boolean {
  if (!currentRoom || !user) {
    return false;
  }

  const username = user.user_metadata?.username;
  const name = user.user_metadata?.name;
  const emailPrefix = user.email?.split("@")[0];

  const roomPlayers = currentRoom.players;

  // 1. Find player in the room matching the user (try different properties)
  let currentPlayerInRoom = roomPlayers.find((p) => p.name === username);
  if (!currentPlayerInRoom) {
    currentPlayerInRoom = roomPlayers.find((p) => p.name === name);
  }
  if (!currentPlayerInRoom && emailPrefix) {
    currentPlayerInRoom = roomPlayers.find((p) => p.name === emailPrefix);
  }
  // 4. Fallback: Check if the user matches any player currently tracked locally (less reliable)
  if (!currentPlayerInRoom && playersInRoom.length > 0) {
    const firstLocalPlayerName =
      typeof playersInRoom[0] === "string"
        ? playersInRoom[0]
        : playersInRoom[0].name;
    currentPlayerInRoom = roomPlayers.find(
      (p) => p.name === firstLocalPlayerName
    );
  }

  // 2. Check if the found player is the host
  if (currentPlayerInRoom) {
    return currentPlayerInRoom.isHost || false;
  }

  // 3. If no specific player found matching the user, check if this is the *only* player
  // and there's no designated host yet (implicit host)
  if (roomPlayers.length === 1 && !roomPlayers.some((p) => p.isHost)) {
    // Check if the single player's name matches any user identifiers
    const singlePlayer = roomPlayers[0];
    return (
      singlePlayer.name === username ||
      singlePlayer.name === name ||
      Boolean(emailPrefix && singlePlayer.name === emailPrefix)
    );
  }

  // 4. Final check: If the room has players, but no explicit host is marked,
  // assume the first player added is the host (common convention)
  // This part is less reliable and depends on server-side logic ensuring the first player *is* the host.
  /*
  if (roomPlayers.length > 0 && !roomPlayers.some(p => p.isHost)) {
      const firstPlayer = roomPlayers[0];
       // Check if the first player matches the current user
       return (
           firstPlayer.name === user.user_metadata?.username ||
           firstPlayer.name === user.user_metadata?.name ||
           (user.email && firstPlayer.name === user.email?.split("@")[0])
       );
   }
   */
  // Decided against the final check above as it might lead to incorrect host assignments
  // if the server doesn't guarantee the first player added is always the host.

  return false; // Default to false if no match found
}
