-- Fix database tables and permissions for the game

-- 1. Drop existing tables if they exist to recreate with correct structure
DROP TABLE IF EXISTS trump_votes;
DROP TABLE IF EXISTS player_actions;
DROP TABLE IF EXISTS game_rooms;

-- 2. Make sure the game_rooms table exists with the correct structure
-- Using TEXT for id instead of UUID to match application code
CREATE TABLE IF NOT EXISTS game_rooms (
  id TEXT PRIMARY KEY, -- Changed from UUID to TEXT
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  host_id UUID REFERENCES auth.users(id) NULL, -- Make host_id nullable
  game_state JSONB DEFAULT '{}'::JSONB,
  status TEXT DEFAULT 'waiting',
  max_players INTEGER DEFAULT 4,
  current_players INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  password TEXT DEFAULT NULL,
  game_mode TEXT DEFAULT 'classic'
);

-- 2. Fix RLS policies for game_rooms
-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can read game rooms" ON game_rooms;
DROP POLICY IF EXISTS "Authenticated users can create game rooms" ON game_rooms;
DROP POLICY IF EXISTS "Room hosts can update their rooms" ON game_rooms;
DROP POLICY IF EXISTS "Anyone can update game rooms" ON game_rooms;

-- Enable RLS on the table
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- Create more permissive policies for development
-- Allow anyone to read game rooms
CREATE POLICY "Anyone can read game rooms"
  ON game_rooms FOR SELECT
  USING (true);

-- Allow anyone to create game rooms (for development)
CREATE POLICY "Anyone can create game rooms"
  ON game_rooms FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update game rooms (for development)
CREATE POLICY "Anyone can update game rooms"
  ON game_rooms FOR UPDATE
  USING (true);

-- 3. Make sure the trump_votes table exists with the correct structure
CREATE TABLE IF NOT EXISTS trump_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT REFERENCES game_rooms(id) ON DELETE CASCADE, -- Changed from UUID to TEXT
  player_id UUID REFERENCES auth.users(id) NULL, -- Make player_id nullable for bot support
  suit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, player_id)
);

-- 4. Fix RLS policies for trump_votes
-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can read trump votes" ON trump_votes;
DROP POLICY IF EXISTS "Authenticated users can insert their own votes" ON trump_votes;
DROP POLICY IF EXISTS "Anyone can read trump votes" ON trump_votes;
DROP POLICY IF EXISTS "Anyone can insert trump votes" ON trump_votes;

-- Enable RLS on the table
ALTER TABLE trump_votes ENABLE ROW LEVEL SECURITY;

-- Create more permissive policies for development
-- Allow anyone to read trump votes
CREATE POLICY "Anyone can read trump votes"
  ON trump_votes FOR SELECT
  USING (true);

-- Allow anyone to insert trump votes (for development)
CREATE POLICY "Anyone can insert trump votes"
  ON trump_votes FOR INSERT
  WITH CHECK (true);

-- 5. Make sure the player_actions table exists with the correct structure
CREATE TABLE IF NOT EXISTS player_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id TEXT REFERENCES game_rooms(id) ON DELETE CASCADE, -- Changed from UUID to TEXT
  player_id UUID REFERENCES auth.users(id) NULL, -- Make player_id nullable for bot support
  action_type TEXT NOT NULL,
  action_data JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Fix RLS policies for player_actions
-- First, drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can read player actions" ON player_actions;
DROP POLICY IF EXISTS "Authenticated users can insert their own actions" ON player_actions;
DROP POLICY IF EXISTS "Anyone can read player actions" ON player_actions;
DROP POLICY IF EXISTS "Anyone can insert player actions" ON player_actions;

-- Enable RLS on the table
ALTER TABLE player_actions ENABLE ROW LEVEL SECURITY;

-- Create more permissive policies for development
-- Allow anyone to read player actions
CREATE POLICY "Anyone can read player actions"
  ON player_actions FOR SELECT
  USING (true);

-- Allow anyone to insert player actions (for development)
CREATE POLICY "Anyone can insert player actions"
  ON player_actions FOR INSERT
  WITH CHECK (true);

-- 7. Set up realtime publication
-- First, drop the existing publication if it exists
DROP PUBLICATION IF EXISTS supabase_realtime;

-- Create a new publication with all the required tables
CREATE PUBLICATION supabase_realtime FOR TABLE game_rooms, trump_votes, player_actions;

-- 8. Create function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger to update last_updated timestamp
DROP TRIGGER IF EXISTS update_game_rooms_last_updated ON game_rooms;
CREATE TRIGGER update_game_rooms_last_updated
BEFORE UPDATE ON game_rooms
FOR EACH ROW
EXECUTE FUNCTION update_last_updated();

-- 10. Add a comment to indicate the script has been run
COMMENT ON TABLE game_rooms IS 'Game rooms table with fixed permissions';