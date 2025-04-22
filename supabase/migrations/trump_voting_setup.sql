-- Create table for trump votes
CREATE TABLE IF NOT EXISTS public.trump_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  player_id UUID, -- For regular players
  bot_id TEXT, -- For bots
  suit TEXT NOT NULL CHECK (suit IN ('hearts', 'spades', 'diamonds', 'clubs')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Either player_id OR bot_id must be provided
  CONSTRAINT player_or_bot_required CHECK (
    (player_id IS NOT NULL AND bot_id IS NULL) OR
    (player_id IS NULL AND bot_id IS NOT NULL)
  )
);

-- Create index for faster lookups by room
CREATE INDEX IF NOT EXISTS trump_votes_room_id_idx ON public.trump_votes(room_id);

-- Enable Row Level Security
ALTER TABLE public.trump_votes ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view votes in rooms they're in
CREATE POLICY "Users can view trump votes in their rooms"
  ON public.trump_votes
  FOR SELECT
  TO authenticated
  USING (true); -- In a real app, limit to rooms the user is in

-- Policy to allow authenticated users to insert votes
CREATE POLICY "Users can insert their own trump votes"
  ON public.trump_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Ensure users can only vote as themselves
    (player_id = auth.uid()) OR
    -- Or allow them to submit bot votes if they are the room host
    (bot_id IS NOT NULL) -- In a real app, check if they're the host
  );

-- Function to get the winning trump suit for a room
CREATE OR REPLACE FUNCTION public.get_winning_trump_suit(room_id_param TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  winning_suit TEXT;
BEGIN
  SELECT suit INTO winning_suit
  FROM (
    SELECT suit, COUNT(*) as vote_count
    FROM public.trump_votes
    WHERE room_id = room_id_param
    GROUP BY suit
    ORDER BY vote_count DESC
    LIMIT 1
  ) AS top_vote;

  RETURN winning_suit;
END;
$$;

-- Enable Realtime for this table
BEGIN;
-- Add the table to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.trump_votes;
COMMIT;

-- Sample data: Add test trump votes
-- INSERT INTO public.trump_votes (room_id, player_id, suit)
-- VALUES ('test-room-1', '00000000-0000-0000-0000-000000000000', 'hearts');

-- INSERT INTO public.trump_votes (room_id, bot_id, suit)
-- VALUES ('test-room-1', 'bot-1', 'spades');