# Database Setup Guide

## Overview

This project uses Supabase as the database provider with PostgreSQL as the underlying database engine. The database schema is designed to support the game's core features including user management, game sessions, and replay functionality.

## Prerequisites

1. A Supabase account and project
2. Node.js 18.x or later
3. pnpm package manager

## Setup Steps

### 1. Environment Configuration

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
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
- Tracks user statistics and preferences

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
- Tracks bidding history

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

### Card Model

- Represents individual cards in the deck
- Tracks card suit, value, and ownership
- Records play history and trick association
- Used for game state reconstruction

### Trick Model

- Represents a single trick in the game
- Tracks cards played in the trick
- Records winner and point value
- Links to game session

## Realtime Data Storage

The application uses Supabase Realtime for synchronizing game state between players:

- Game state changes are broadcasted to all connected clients
- Trump selection votes are recorded in real-time
- Player actions are synchronized through the database and Supabase Realtime
- Game phase transitions are managed through database triggers

## Database Functions and Triggers

Several PostgreSQL functions and triggers ensure game integrity:

- `on_trump_vote`: Trigger that updates game state when a trump vote is cast
- `on_card_play`: Trigger that validates card play and updates game state
- `on_game_end`: Trigger that calculates final scores and updates player statistics
- `get_valid_moves`: Function that returns valid card plays for a player

## Development Tools

### Prisma Studio

To view and edit data during development:

```bash
pnpm db:studio
```

### Database Migrations

To create a new migration after schema changes:

```bash
pnpm prisma migrate dev --name your-migration-name
```

## Production Deployment

1. Ensure environment variables are properly set in your deployment platform
2. Run database migrations during deployment:

```bash
pnpm prisma generate
pnpm db:push
```

## Security Considerations

- Row-level security policies restrict access to user data
- Authentication tokens are required for database access
- Validation is performed on both client and server
- Sensitive operations require server-side verification

## Performance Optimization

- Indexes are created on frequently queried fields
- Query optimization for common game operations
- Connection pooling for efficient database access
- Caching strategies for frequently accessed data

## Backup and Recovery

- Regular database backups through Supabase
- Point-in-time recovery options
- Game state snapshots for resilience

## Notes

- The database schema is designed to be extensible for future features
- All timestamps are stored in UTC
- Foreign key relationships ensure data integrity
- Indexes are created automatically for optimal query performance
- The application uses Zustand for client-side state management, which syncs with the database via Supabase Realtime
