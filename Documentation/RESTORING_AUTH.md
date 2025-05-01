# Restoring Supabase Auth After Migration Issues

If your Prisma migrations have damaged or removed tables in the Supabase auth schema (such as `auth.users`), standard SQL queries cannot fix this issue. The auth schema is managed by Supabase internally.

## Option 1: Restore from a Backup

If you have a recent backup of your Supabase project (before the auth schema was damaged):

1. Go to the Supabase dashboard at https://app.supabase.com/
2. Select your project
3. Go to "Project Settings" → "Database" → "Backups"
4. Choose a backup point from before the schema was damaged
5. Restore your project from that backup
6. After restoration, run the `scripts/create-tables-manual.sql` script to set up your application tables

## Option 2: Reset the Project

If you don't have a usable backup, you'll need to reset your project:

1. Go to the Supabase dashboard
2. Select your project
3. Go to "Project Settings" → "General"
4. Scroll to the bottom and find "Danger Zone"
5. Select "Reset Project"

**Warning**: This will completely erase all your project data. Only do this if you have no important data or have exported what you need.

After resetting:

1. Run the `scripts/create-tables-manual.sql` script to set up your tables
2. Import any data you had exported or recreate necessary data

## Option 3: Create a New Project

If option 1 and 2 don't work, you can:

1. Create a new Supabase project
2. Update your environment variables to use the new project URL and API keys
3. Run the `scripts/create-tables-manual.sql` script on the new project
4. Set up any users, roles, and permissions needed

## Preventing Future Issues

To prevent damaging the auth schema in the future:

1. Never use Prisma or any other ORM to manage the `auth` schema tables
2. Keep your database migrations focused only on your application's tables
3. Use Supabase's provided APIs for auth operations instead of direct database manipulation
