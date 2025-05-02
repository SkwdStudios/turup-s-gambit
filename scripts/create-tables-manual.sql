-- Create game_rooms table for real-time multiplayer functionality
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  host_id UUID REFERENCES auth.users(id),
  game_state JSONB DEFAULT '{}'::JSONB,
  status TEXT DEFAULT 'waiting',
  max_players INTEGER DEFAULT 4,
  current_players INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT FALSE,
  password TEXT DEFAULT NULL,
  game_mode TEXT DEFAULT 'classic'
);

-- Create RLS policies for game_rooms
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read game rooms
CREATE POLICY "Anyone can read game rooms"
  ON game_rooms FOR SELECT
  USING (true);

-- Allow authenticated users to create game rooms
CREATE POLICY "Authenticated users can create game rooms"
  ON game_rooms FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow room hosts to update their own rooms
CREATE POLICY "Room hosts can update their rooms"
  ON game_rooms FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id);

-- Create realtime publication for game_rooms
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE game_rooms;

-- Create function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_updated timestamp
CREATE TRIGGER update_game_rooms_last_updated
BEFORE UPDATE ON game_rooms
FOR EACH ROW
EXECUTE FUNCTION update_last_updated();

-- Create trump_votes table to track player votes for trump suit
CREATE TABLE IF NOT EXISTS trump_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES auth.users(id),
  suit TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, player_id)
);

-- Create RLS policies for trump_votes
ALTER TABLE trump_votes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read trump votes
CREATE POLICY "Authenticated users can read trump votes"
  ON trump_votes FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own votes
CREATE POLICY "Authenticated users can insert their own votes"
  ON trump_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player_id);

-- Create realtime publication for trump_votes
ALTER PUBLICATION supabase_realtime ADD TABLE trump_votes;

-- Create player_actions table to track game actions
CREATE TABLE IF NOT EXISTS player_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES game_rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  action_data JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies for player_actions
ALTER TABLE player_actions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read player actions
CREATE POLICY "Authenticated users can read player actions"
  ON player_actions FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert their own actions
CREATE POLICY "Authenticated users can insert their own actions"
  ON player_actions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player_id);

-- Create realtime publication for player_actions
ALTER PUBLICATION supabase_realtime ADD TABLE player_actions;