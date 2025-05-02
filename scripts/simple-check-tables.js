// Simple script to check if game_rooms table exists and test operations
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

async function checkTables() {
  console.log("Checking Supabase tables...");
  console.log(`URL: ${supabaseUrl}`);

  try {
    // Try to query the game_rooms table directly
    console.log("\nAttempting to query game_rooms table...");
    const { data: rooms, error: roomsError } = await supabase
      .from("game_rooms")
      .select("*")
      .limit(5);

    if (roomsError) {
      console.error("❌ Error querying game_rooms table:", roomsError);
    } else {
      console.log("✅ Successfully queried game_rooms table");
      console.log(`Found ${rooms.length} rooms`);
      if (rooms.length > 0) {
        console.log("Sample room:", rooms[0]);
      }
    }

    // Try to query the trump_votes table
    console.log("\nAttempting to query trump_votes table...");
    const { data: votes, error: votesError } = await supabase
      .from("trump_votes")
      .select("*")
      .limit(5);

    if (votesError) {
      console.error("❌ Error querying trump_votes table:", votesError);
    } else {
      console.log("✅ Successfully queried trump_votes table");
      console.log(`Found ${votes.length} votes`);
    }

    // Try to query the player_actions table
    console.log("\nAttempting to query player_actions table...");
    const { data: actions, error: actionsError } = await supabase
      .from("player_actions")
      .select("*")
      .limit(5);

    if (actionsError) {
      console.error("❌ Error querying player_actions table:", actionsError);
    } else {
      console.log("✅ Successfully queried player_actions table");
      console.log(`Found ${actions.length} actions`);
    }

    // Try to create a test game room
    const testRoomId = `test-${Date.now()}`;
    console.log(
      `\nAttempting to create a test game room with ID: ${testRoomId}`
    );

    const { data: room, error: roomError } = await supabase
      .from("game_rooms")
      .insert({
        id: testRoomId,
        game_state: { test: true },
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      })
      .select();

    if (roomError) {
      console.error("❌ Error creating test game room:", roomError);

      if (roomError.code === "42501") {
        console.log("This appears to be a permissions issue with RLS policies");
      } else if (roomError.code === "23503") {
        console.log("This appears to be a foreign key constraint issue");
        console.log("The host_id must reference a valid user in auth.users");
      }
    } else {
      console.log("✅ Successfully created test game room");
      console.log(room);

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
  } catch (error) {
    console.error("Error checking tables:", error);
  }
}

// Run the check
checkTables();
