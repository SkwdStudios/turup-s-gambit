import { db as supabaseDb } from "../services/supabase-database";
import { supabase } from "../supabase";
import { v4 as uuidv4 } from "uuid";

export const db = {
  users: {
    findByEmail: async (email: string) => {
      return supabaseDb.getUserByEmail(email);
    },
    findById: async (id: string) => {
      return supabaseDb.getUserById(id);
    },
    usernameExists: async (username: string) => {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();
      return !!data;
    },
    createAnonymous: async (username: string) => {
      const { data, error } = await supabase
        .from("users")
        .insert({
          id: uuidv4(),
          username,
          avatar: `/placeholder.svg?height=200&width=200&text=${username.charAt(
            0
          )}`,
          is_anonymous: true,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating anonymous user:", error);
        throw error;
      }

      return data;
    },
    create: async (userData: any) => {
      // Convert camelCase to snake_case for Supabase
      const supabaseUserData = {
        id: uuidv4(),
        username: userData.username,
        email: userData.email,
        avatar: userData.avatar,
        is_anonymous: false,
        discord_id: userData.discordId,
        discord_username: userData.discordUsername,
        discord_avatar: userData.discordAvatar,
      };

      const { data, error } = await supabase
        .from("users")
        .insert(supabaseUserData)
        .select()
        .single();

      if (error) {
        console.error("Error creating user:", error);
        throw error;
      }

      return data;
    },
  },
  games: {
    create: async (gameData: any) => {
      // First create the game
      const { data: game, error: gameError } = await supabase
        .from("games")
        .insert({
          id: uuidv4(),
          room_id: gameData.roomId,
          mode: gameData.mode,
          creator_id: gameData.creatorId,
          status: gameData.status,
        })
        .select()
        .single();

      if (gameError) {
        console.error("Error creating game:", gameError);
        throw gameError;
      }

      // Then add players
      const playerPromises = gameData.players.map(
        async (userId: string, index: number) => {
          const { data: player, error: playerError } = await supabase
            .from("players")
            .insert({
              user_id: userId,
              game_id: game.id,
              team: Math.floor(index / 2) + 1,
              position: index + 1,
            })
            .select()
            .single();

          if (playerError) {
            console.error("Error creating player:", playerError);
            throw playerError;
          }

          return player;
        }
      );

      const players = await Promise.all(playerPromises);

      // Return the game with players
      return {
        ...game,
        players,
      };
    },
    findByRoomId: async (roomId: string) => {
      return supabaseDb.getGameByRoomId(roomId);
    },
    findByUserId: async (userId: string) => {
      const { data, error } = await supabase
        .from("games")
        .select(
          "*, players!inner(*), session:game_sessions(*), replay:game_replays(*)"
        )
        .eq("players.user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error finding games by user ID:", error);
        return [];
      }

      return data;
    },
    update: async (id: string, data: any) => {
      // Convert camelCase to snake_case for Supabase
      const updateData: any = {};
      Object.entries(data).forEach(([key, value]) => {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        updateData[snakeKey] = value;
      });

      const { data: updatedGame, error } = await supabase
        .from("games")
        .update(updateData)
        .eq("id", id)
        .select(
          "*, players(*), session:game_sessions(*), replay:game_replays(*)"
        )
        .single();

      if (error) {
        console.error("Error updating game:", error);
        throw error;
      }

      return updatedGame;
    },
    createSession: async (gameId: string) => {
      return supabaseDb.createGameSession(gameId);
    },
    createReplay: async (gameId: string, moves: any, summary: any) => {
      return supabaseDb.createGameReplay({ gameId, moves, summary });
    },
  },
};
