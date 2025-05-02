// Script to check and fix database tables for the game
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Missing Supabase credentials in .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDatabaseTables() {
  console.log("Checking and fixing database tables...");

  try {
    // 1. Check if game_rooms table exists
    console.log("\nChecking game_rooms table...");
    const { data: gameRoomsData, error: gameRoomsError } = await supabase
      .from("game_rooms")
      .select("id")
      .limit(1);

    if (gameRoomsError) {
      console.error("❌ Error accessing game_rooms table:", gameRoomsError);

      if (gameRoomsError.code === "42P01") {
        console.log(
          "Table doesn't exist. You need to create it using the SQL script."
        );
        console.log(
          "Run the create-tables-manual.sql script in your Supabase dashboard SQL editor."
        );
      } else if (gameRoomsError.code === "42501") {
        console.log("Permission denied. This is likely an RLS policy issue.");
        console.log(
          "Make sure the RLS policies allow the anon key to access the table."
        );
      }
    } else {
      console.log("✅ game_rooms table exists and is accessible");
    }

    // 2. Check if trump_votes table exists
    console.log("\nChecking trump_votes table...");
    const { data: trumpVotesData, error: trumpVotesError } = await supabase
      .from("trump_votes")
      .select("id")
      .limit(1);

    if (trumpVotesError) {
      console.error("❌ Error accessing trump_votes table:", trumpVotesError);

      if (trumpVotesError.code === "42P01") {
        console.log(
          "Table doesn't exist. You need to create it using the SQL script."
        );
      } else if (trumpVotesError.code === "42501") {
        console.log("Permission denied. This is likely an RLS policy issue.");
      }
    } else {
      console.log("✅ trump_votes table exists and is accessible");
    }

    // 3. Check if player_actions table exists
    console.log("\nChecking player_actions table...");
    const { data: playerActionsData, error: playerActionsError } =
      await supabase.from("player_actions").select("id").limit(1);

    if (playerActionsError) {
      console.error(
        "❌ Error accessing player_actions table:",
        playerActionsError
      );

      if (playerActionsError.code === "42P01") {
        console.log(
          "Table doesn't exist. You need to create it using the SQL script."
        );
      } else if (playerActionsError.code === "42501") {
        console.log("Permission denied. This is likely an RLS policy issue.");
      }
    } else {
      console.log("✅ player_actions table exists and is accessible");
    }

    // 4. Check realtime publication
    console.log("\nChecking realtime publication...");
    console.log(
      "Note: This requires admin privileges and may not work with the anon key."
    );
    console.log(
      "If this fails, check the publication in the Supabase dashboard."
    );

    try {
      const { data: pubTables, error: pubTablesError } = await supabase.rpc(
        "get_publication_tables",
        { publication_name: "supabase_realtime" }
      );

      if (pubTablesError) {
        console.error(
          "❌ Error checking realtime publication:",
          pubTablesError
        );
        console.log(
          "You may need to check this manually in the Supabase dashboard."
        );
      } else if (pubTables && pubTables.length > 0) {
        console.log("✅ Realtime publication exists with tables:", pubTables);

        // Check if our tables are in the publication
        const requiredTables = ["game_rooms", "trump_votes", "player_actions"];
        const missingTables = requiredTables.filter(
          (table) => !pubTables.includes(table)
        );

        if (missingTables.length === 0) {
          console.log("✅ All required tables are in the realtime publication");
        } else {
          console.log(
            "❌ Missing tables in realtime publication:",
            missingTables
          );
          console.log(
            "You need to add these tables to the realtime publication."
          );
        }
      } else {
        console.log("❌ No tables found in realtime publication");
        console.log(
          "You need to create the realtime publication and add the required tables."
        );
      }
    } catch (error) {
      console.error("Error checking realtime publication:", error);
      console.log(
        "You may need to check this manually in the Supabase dashboard."
      );
    }

    // 5. Test creating a game room
    console.log("\nTesting game room creation...");
    const testRoomId = `test-${Date.now()}`;

    const { data: roomData, error: roomError } = await supabase
      .from("game_rooms")
      .insert({
        id: testRoomId,
        game_state: { test: true },
        status: "waiting",
        max_players: 4,
        current_players: 0,
        is_private: false,
        game_mode: "classic",
      })
      .select();

    if (roomError) {
      console.error("❌ Error creating test game room:", roomError);

      if (roomError.code === "23502") {
        console.log(
          "NOT NULL constraint violation. Check if all required fields are provided."
        );
        console.log(
          "Make sure host_id is nullable or provide a valid user ID."
        );
      } else if (roomError.code === "23503") {
        console.log(
          "Foreign key constraint violation. The host_id must reference a valid user."
        );
        console.log(
          "Try creating a room without a host_id if the column allows NULL values."
        );
      } else if (roomError.code === "42501") {
        console.log("Permission denied. This is likely an RLS policy issue.");
        console.log(
          "Make sure the RLS policies allow the anon key to insert into the table."
        );
      }
    } else {
      console.log("✅ Successfully created test game room:", roomData);

      // Clean up the test room
      const { error: deleteError } = await supabase
        .from("game_rooms")
        .delete()
        .eq("id", testRoomId);

      if (deleteError) {
        console.log("❌ Error deleting test game room:", deleteError);
      } else {
        console.log("✅ Successfully deleted test game room");
      }
    }

    console.log("\nDatabase check complete.");
    console.log("If you found issues, you may need to:");
    console.log(
      "1. Run the create-tables-manual.sql script in your Supabase dashboard"
    );
    console.log("2. Check and update RLS policies to allow proper access");
    console.log(
      "3. Ensure the realtime publication includes all required tables"
    );
  } catch (error) {
    console.error("Error checking database tables:", error);
  }
}

// Run the fix
fixDatabaseTables();
