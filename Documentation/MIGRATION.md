# Migration from Prisma to Supabase

This document outlines the migration from Prisma ORM to direct Supabase JS SDK calls for database access.

## Why We Migrated

The migration was necessary due to the following reasons:

1. Authentication issues with Prisma trying to manage Supabase's auth schema
2. Complexity in managing schema updates across both Prisma and Supabase
3. Better alignment with Supabase's ecosystem by using their native JS SDK

## What Changed

- Removed all Prisma dependencies and configuration files
- Replaced the `DatabaseService` with a `SupabaseDatabaseService` that uses Supabase SDK directly
- Consolidated all database access to use only `SupabaseDatabaseService` (removed the wrapper `DatabaseService`)
- Created type definitions in `/types` to replace Prisma-generated types
- Maintained the same API interface for backward compatibility

## Implementation Details

### Database Access

Instead of Prisma's ORM approach:

```typescript
// Old with Prisma
const user = await prisma.user.findUnique({
  where: { id },
  include: {
    players: true,
    gamesCreated: true,
  },
});
```

We now use Supabase's query builder:

```typescript
// New with Supabase
const { data, error } = await supabase
  .from("users")
  .select("*, players(*), gamesCreated:games(*)")
  .eq("id", id)
  .single();
```

### Authentication

Authentication uses Supabase's auth system, with several improvements:

1. **OAuth Providers**: Discord and Google sign-in support
2. **Email Authentication**: Email + password sign-in and registration
3. **Anonymous Authentication**: Allow users to try the game without requiring personal information

#### Anonymous Authentication

We've implemented anonymous authentication using Supabase's `signInAnonymously` method:

```typescript
export const signInAnonymously = async (username: string) => {
  // Create anonymous user in Supabase auth
  const { data, error } = await supabaseAuth.auth.signInAnonymously();

  // Update the user's metadata to include the provided username
  if (data.user) {
    await supabaseAuth.auth.updateUser({
      data: {
        username,
        name: username,
      },
    });
  }

  return data;
};
```

Our authentication store (`authStore.ts`) preserves the anonymous status when using Supabase auth:

```typescript
// Mark anonymous users appropriately
const isAnonymous = !provider && !supabaseUser.email;

// When updating users from auth state changes
if (currentUser?.isAnonymous) {
  authUser.isAnonymous = true;
}
```

## Schema Standardization

During the migration, we standardized the database schema to follow Supabase's naming conventions:

1. All table names now use `snake_case` instead of `PascalCase`:

   - `Game` → `games`
   - `Player` → `players`
   - `GameSession` → `game_sessions`
   - `GameReplay` → `game_replays`

2. All column names now use `snake_case` instead of `camelCase`:
   - `roomId` → `room_id`
   - `gameId` → `game_id`
   - `userId` → `user_id`
   - `creatorId` → `creator_id`
   - etc.

The database service automatically handles the conversion between these naming conventions, so your TypeScript code can continue to use camelCase while the database uses snake_case.

## Checking Database Schema

We've created utility scripts to help verify and fix your database schema:

1. Check if required tables exist:

   ```bash
   node scripts/check-tables.js
   ```

2. Create or update tables to match the expected schema:

   ```bash
   node scripts/apply-migration.js
   ```

## Creating Database Tables

Due to security restrictions with client-side JavaScript, you'll need to create the tables manually in the Supabase dashboard:

1. Log in to your Supabase dashboard at https://app.supabase.com/
2. Select your project "Turup's Gambit"
3. Go to the SQL Editor tab
4. Copy the entire contents of the `scripts/create-tables-manual.sql` file
5. Paste it into the SQL Editor
6. Click "Run" to execute the SQL

This script:

- Creates all required tables with proper snake_case naming
- Adds necessary indexes for performance
- Sets up automatic timestamp updates
- Enables Row Level Security (RLS) on all tables
- Creates basic security policies
- Sets up a users view for mapping between auth.users and your app's expectations

After running the script, verify that the tables were created correctly:

```bash
node scripts/check-tables.js
```

## How to Run the Migration

1. Run the cleanup script:

   ```bash
   chmod +x scripts/remove-prisma.sh
   ./scripts/remove-prisma.sh
   ```

2. Reinstall dependencies:

   ```bash
   npm install
   # or
   pnpm install
   ```

3. Start the application:
   ```bash
   npm run dev
   ```

## Troubleshooting

If you encounter any issues, check:

1. Supabase connection - Verify your Supabase URL and API keys
2. Database schema - Ensure your Supabase database schema matches the expected structure
3. RLS policies - Check that row-level security policies are correctly configured

If you encounter issues after migration:

1. **Missing Tables**: Run the `apply-migration.js` script to create all required tables
2. **Naming Conflicts**: Ensure your database uses snake_case for all tables and columns
3. **Type Errors**: Make sure types defined in `/types` match the shape of data returned from Supabase

## References

- [Supabase JS Documentation](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth/overview)
- [Supabase Anonymous Auth Guide](https://supabase.com/docs/guides/auth/auth-anonymous)
