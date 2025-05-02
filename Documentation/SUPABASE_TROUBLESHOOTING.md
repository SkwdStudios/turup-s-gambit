# Supabase Database Troubleshooting Guide

This guide provides solutions for common issues with the Supabase database configuration for Turup's Gambit.

## Common Errors

1. **Error fetching game room: `{}`**
2. **Error creating game room: `{}`**
3. **Failed to create game room**
4. **Invalid input syntax for type uuid: "ROOMID"**

These errors typically occur due to one of the following issues:

- Missing or incorrectly configured database tables
- Row Level Security (RLS) policy restrictions
- Foreign key constraints with the `host_id` field
- Realtime publication configuration issues
- Data type mismatch between the database schema and application code

## Quick Fix Instructions

### 1. Run the Database Fix Script

The easiest way to fix these issues is to run the provided SQL script in your Supabase dashboard:

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `scripts/fix-database-permissions.sql`
4. Paste and run the script in the SQL Editor

This script will:

- Create any missing tables with the correct structure
- Update RLS policies to be more permissive for development
- Make the `host_id` field nullable to avoid foreign key constraint issues
- Set up the realtime publication for all required tables
- **Fix the data type mismatch by using TEXT for room IDs instead of UUID**

### 2. Verify Your Environment Variables

Make sure your `.env.local` file contains the correct Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Restart Your Development Server

After making these changes, restart your Next.js development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

## Manual Fixes

If the quick fix doesn't resolve your issues, you may need to manually check and fix the following:

### 1. Check Database Tables

Ensure the following tables exist with the correct structure:

- `game_rooms`
- `trump_votes`
- `player_actions`

### 2. Check RLS Policies

For development, you may want to temporarily set more permissive RLS policies:

```sql
-- Example for game_rooms table
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read game rooms
CREATE POLICY "Anyone can read game rooms"
  ON game_rooms FOR SELECT
  USING (true);

-- Allow anyone to create game rooms
CREATE POLICY "Anyone can create game rooms"
  ON game_rooms FOR INSERT
  WITH CHECK (true);

-- Allow anyone to update game rooms
CREATE POLICY "Anyone can update game rooms"
  ON game_rooms FOR UPDATE
  USING (true);
```

### 3. Check Realtime Publication

Ensure the realtime publication includes all required tables:

```sql
-- Create or update the realtime publication
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE game_rooms, trump_votes, player_actions;
```

### 4. Make host_id Nullable

If you're having issues with the `host_id` foreign key constraint:

```sql
-- Alter the game_rooms table to make host_id nullable
ALTER TABLE game_rooms ALTER COLUMN host_id DROP NOT NULL;
```

## Code Improvements

The codebase has been updated to handle these issues more gracefully:

1. Better error logging in `supabase-database.ts`
2. Improved error handling in `gameActions.ts`
3. Validation of the `host_id` field to avoid foreign key constraint issues

## UUID vs TEXT Issue

If you encounter an error like:

```
Error: invalid input syntax for type uuid: "ROOMID"
```

This indicates a data type mismatch between the database schema and application code:

- The database was expecting a UUID format for the `id` field
- But the application is using text-based room IDs like "TROODZ"

The updated SQL script fixes this by:

1. Dropping existing tables to avoid conflicts
2. Recreating tables with `id` as TEXT type instead of UUID
3. Updating all foreign key references to use TEXT type

## Testing Your Fix

After applying the fixes, you can test if the issues are resolved by:

1. Creating a new game room
2. Joining an existing game room
3. Checking the browser console for any remaining errors

If you continue to experience issues, please check the Supabase dashboard logs for more detailed error information.
