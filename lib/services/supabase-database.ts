import {
  Game,
  GameMode,
  GameReplay,
  GameSession,
  GameStatus,
  Player,
  TrumpVote,
} from "@/types/game";
import { supabase } from "../supabase";

class SupabaseDatabaseService {
  private static instance: SupabaseDatabaseService;

  private constructor() {}

  public static getInstance(): SupabaseDatabaseService {
    if (!SupabaseDatabaseService.instance) {
      SupabaseDatabaseService.instance = new SupabaseDatabaseService();
    }
    return SupabaseDatabaseService.instance;
  }

  // User Operations
  async createUser(data: {
    username: string;
    email?: string;
    password?: string;
    avatar: string;
    isAnonymous?: boolean;
    discordId?: string;
    discordUsername?: string;
    discordAvatar?: string;
  }) {
    // Convert to Supabase's schema format (snake_case)
    const userData = {
      username: data.username,
      email: data.email,
      password: data.password,
      avatar: data.avatar,
      is_anonymous: data.isAnonymous,
      discord_id: data.discordId,
      discord_username: data.discordUsername,
      discord_avatar: data.discordAvatar,
    };

    const { data: user, error } = await supabase
      .from("users")
      .insert(userData)
      .select()
      .single();

    if (error) {
      console.error("Error creating user:", error);
      throw error;
    }

    return user;
  }

  async getUserById(id: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*, players(*), gamesCreated:games(*)")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching user by ID:", error);
      return null;
    }

    return data;
  }

  async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error) {
      console.error("Error fetching user by email:", error);
      return null;
    }

    return data;
  }

  async getUserByDiscordId(discordId: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("discord_id", discordId)
      .single();

    if (error) {
      console.error("Error fetching user by Discord ID:", error);
      return null;
    }

    return data;
  }

  // Game Operations
  async createGame(data: {
    roomId: string;
    mode: GameMode;
    creatorId: string;
  }) {
    const { data: game, error } = await supabase
      .from("games")
      .insert({
        room_id: data.roomId,
        mode: data.mode,
        creator_id: data.creatorId,
        status: GameStatus.WAITING,
      })
      .select("*, creator:users(*), players(*)")
      .single();

    if (error) {
      console.error("Error creating game:", error);
      throw error;
    }

    // Transform the response to match expected interface
    return this.mapGameResponse(game);
  }

  async getGameByRoomId(roomId: string) {
    const { data, error } = await supabase
      .from("games")
      .select(
        "*, creator:users(*), players(*, user:users(*)), session:game_sessions(*)"
      )
      .eq("room_id", roomId)
      .single();

    if (error) {
      console.error("Error fetching game by room ID:", error);
      return null;
    }

    return this.mapGameResponse(data);
  }

  async updateGameStatus(gameId: string, status: GameStatus, winner?: string) {
    const { data, error } = await supabase
      .from("games")
      .update({ status, winner })
      .eq("id", gameId)
      .select()
      .single();

    if (error) {
      console.error("Error updating game status:", error);
      throw error;
    }

    return this.mapGameResponse(data);
  }

  // Player Operations
  async addPlayerToGame(data: {
    userId: string;
    gameId: string;
    team: number;
    position: number;
  }) {
    const { data: player, error } = await supabase
      .from("players")
      .insert({
        user_id: data.userId,
        game_id: data.gameId,
        team: data.team,
        position: data.position,
      })
      .select("*, user:users(*), game:games(*)")
      .single();

    if (error) {
      console.error("Error adding player to game:", error);
      throw error;
    }

    return this.mapPlayerResponse(player);
  }

  // Game Session Operations
  async createGameSession(gameId: string) {
    const { data, error } = await supabase
      .from("game_sessions")
      .insert({ game_id: gameId })
      .select()
      .single();

    if (error) {
      console.error("Error creating game session:", error);
      throw error;
    }

    return this.mapGameSessionResponse(data);
  }

  async updateGameSession(
    sessionId: string,
    data: {
      currentTurn?: number;
      trumpSuit?: string;
      endedAt?: Date;
    }
  ) {
    const updateData: any = {};
    if (data.currentTurn !== undefined)
      updateData.current_turn = data.currentTurn;
    if (data.trumpSuit !== undefined) updateData.trump_suit = data.trumpSuit;
    if (data.endedAt !== undefined) updateData.ended_at = data.endedAt;

    const { data: session, error } = await supabase
      .from("game_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      console.error("Error updating game session:", error);
      throw error;
    }

    return this.mapGameSessionResponse(session);
  }

  // Game Replay Operations
  async createGameReplay(data: { gameId: string; moves: any; summary: any }) {
    const { data: replay, error } = await supabase
      .from("game_replays")
      .insert({
        game_id: data.gameId,
        moves: data.moves,
        summary: data.summary,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating game replay:", error);
      throw error;
    }

    return this.mapGameReplayResponse(replay);
  }

  async getGameReplay(gameId: string) {
    const { data, error } = await supabase
      .from("game_replays")
      .select("*")
      .eq("game_id", gameId)
      .single();

    if (error) {
      console.error("Error fetching game replay:", error);
      return null;
    }

    return this.mapGameReplayResponse(data);
  }

  // TrumpVote Operations
  async createTrumpVote(data: {
    room_id: string;
    player_id?: string;
    bot_id?: string;
    suit: string;
  }) {
    const { data: vote, error } = await supabase
      .from("trump_votes")
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error("Error creating trump vote:", error);
      throw error;
    }

    return vote;
  }

  async getTrumpVotesByRoomId(roomId: string) {
    const { data, error } = await supabase
      .from("trump_votes")
      .select("*")
      .eq("room_id", roomId);

    if (error) {
      console.error("Error fetching trump votes:", error);
      return [];
    }

    return data;
  }

  // Game Room Public Operations
  async createGameRoom(data: {
    id: string;
    creator_id?: string;
    is_public?: boolean;
    game_state?: any;
    players?: any[];
  }) {
    const { data: room, error } = await supabase
      .from("game_rooms_public")
      .insert({
        id: data.id,
        creator_id: data.creator_id,
        is_public: data.is_public ?? true,
        game_state: data.game_state ?? null,
        players: data.players ?? [],
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating game room:", error);
      throw error;
    }

    return room;
  }

  async getGameRoomById(id: string) {
    const { data, error } = await supabase
      .from("game_rooms_public")
      .select("*, creator:users(*)")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching game room:", error);
      return null;
    }

    return data;
  }

  async updateGameRoom(
    id: string,
    data: {
      last_activity?: Date;
      game_state?: any;
      players?: any[];
      is_public?: boolean;
    }
  ) {
    const { data: room, error } = await supabase
      .from("game_rooms_public")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating game room:", error);
      throw error;
    }

    return room;
  }

  async getPublicGameRooms() {
    const { data, error } = await supabase
      .from("game_rooms_public")
      .select("*, creator:users(*)")
      .eq("is_public", true)
      .order("last_activity", { ascending: false });

    if (error) {
      console.error("Error fetching public game rooms:", error);
      return [];
    }

    return data;
  }

  // Helper methods for mapping snake_case DB fields to camelCase for frontend
  private mapGameResponse(game: any): Game | null {
    if (!game) return null;

    return {
      id: game.id,
      roomId: game.room_id,
      mode: game.mode,
      status: game.status,
      winner: game.winner,
      createdAt: game.created_at,
      updatedAt: game.updated_at,
      creatorId: game.creator_id,
      creator: game.creator,
      players: Array.isArray(game.players)
        ? game.players.map((p: any) => this.mapPlayerResponse(p))
        : game.players,
      session: game.session ? this.mapGameSessionResponse(game.session) : null,
      replay: game.replay ? this.mapGameReplayResponse(game.replay) : null,
    };
  }

  private mapPlayerResponse(player: any): Player | null {
    if (!player) return null;

    return {
      id: player.id,
      team: player.team,
      position: player.position,
      joinedAt: player.joined_at,
      userId: player.user_id,
      gameId: player.game_id,
      user: player.user,
      game: player.game ? this.mapGameResponse(player.game) : undefined,
    } as Player;
  }

  private mapGameSessionResponse(session: any): GameSession | null {
    if (!session) return null;

    return {
      id: session.id,
      currentTurn: session.current_turn,
      trumpSuit: session.trump_suit,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      gameId: session.game_id,
      game: session.game ? this.mapGameResponse(session.game) : undefined,
    } as GameSession;
  }

  private mapGameReplayResponse(replay: any): GameReplay | null {
    if (!replay) return null;

    return {
      id: replay.id,
      moves: replay.moves,
      summary: replay.summary,
      createdAt: replay.created_at,
      gameId: replay.game_id,
      game: replay.game ? this.mapGameResponse(replay.game) : undefined,
    } as GameReplay;
  }
}

export const db = SupabaseDatabaseService.getInstance();
