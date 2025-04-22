# Database Setup Guide

## Overview

This project uses Supabase as the database provider with Prisma as the ORM. The database schema is designed to support the game's core features including user management, game sessions, and replay functionality.

## Prerequisites

1. A Supabase account and project
2. Node.js 16.x or later
3. pnpm package manager

## Setup Steps

### 1. Environment Configuration

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL=https://bfzhqhktuyxlzhdymwwl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmemhxaGt0dXl4bHpoZHltd3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3ODIzOTgsImV4cCI6MjA1OTM1ODM5OH0.ccu8lO6UKUdGn1RPqMp5zmSC4E_9J3clBXsyJzpC1iE
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Database Migration

```bash
pnpm db:push
```

### 4. Generate Prisma Client

```bash
pnpm prisma generate
```

## Database Schema

### User Model

- Stores user information and authentication details
- Supports both anonymous and registered users
- Links to game participation through Player model

### Game Model

- Represents a game instance
- Tracks game mode, status, and winner
- Connected to players, session, and replay data
- Stores game phase (waiting, initial_deal, bidding, final_deal, playing, ended)
- Tracks trump votes and final trump suit selection

### Player Model

- Links users to games
- Tracks team assignment and position
- Enables many-to-many relationship between users and games
- Stores player's card hand
- Records trump suit votes

### GameSession Model

- Manages active game state
- Tracks current turn and trump suit
- Records game start and end times
- Stores current trump voting status
- Maintains record of all player actions

### GameReplay Model

- Stores game replay data
- Includes move history and game summary
- Enables post-game analysis
- Records trump selection phase for replay purposes

### TrumpVote Model

- Tracks player votes for trump suit
- Links to players and game sessions
- Records timestamp of votes
- Allows for analysis of voting patterns

## Realtime Data Storage

The application uses Supabase Realtime for synchronizing game state between players:

- Game state changes are broadcasted to all connected clients
- Trump selection votes are recorded in real-time
- Player actions are synchronized through the database and Supabase Realtime
- Game phase transitions are managed through database triggers

## Development Tools

### Prisma Studio

To view and edit data during development:

```bash
pnpm db:studio
```

## Production Deployment

1. Ensure environment variables are properly set in your deployment platform
2. Run database migrations during deployment:

```bash
pnpm prisma generate
pnpm db:push
```

## Notes

- The database schema is designed to be extensible for future features
- All timestamps are stored in UTC
- Foreign key relationships ensure data integrity
- Indexes are created automatically for optimal query performance
- The application uses Zustand for client-side state management, which syncs with the database via Supabase Realtime
