// Script to check game_rooms table and its realtime configuration
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Missing Supabase credentials in .env file");
  console.error(
    "Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGameRoomsTable() {
  console.log("Checking game_rooms table and its configuration...");

  try {
    // Check if the game_rooms table exists
    const { data: tables, error: tablesError } = await supabase.rpc(
      "check_table_exists",
      { table_name: "game_rooms" }
    );

    if (tablesError) {
      console.error("Error fetching tables:", tablesError);
      return;
    }

    if (tables && tables.length > 0) {
      console.log("✅ game_rooms table exists");
    } else {
      console.log("❌ game_rooms table does not exist");
      console.log("Creating game_rooms table...");
      // You would need to run the SQL script here or manually create the table
    }

    // Check if game_rooms is in the realtime publication
    const { data: pubTables, error: pubTablesError } = await supabase
      .from("pg_publication_tables")
      .select("tablename")
      .eq("pubname", "supabase_realtime")
      .eq("tablename", "game_rooms");

    if (pubTablesError) {
      console.error("Error fetching publication tables:", pubTablesError);
      return;
    }

    if (pubTables && pubTables.length > 0) {
      console.log("✅ game_rooms table is in the realtime publication");
    } else {
      console.log("❌ game_rooms table is NOT in the realtime publication");
      console.log("This will prevent realtime updates from working properly");
    }

    // Check RLS policies
    const { data: policies, error: policiesError } = await supabase
      .from("pg_policies")
      .select("*")
      .eq("tablename", "game_rooms");

    if (policiesError) {
      console.error("Error fetching RLS policies:", policiesError);
      return;
    }

    if (policies && policies.length > 0) {
      console.log("✅ RLS policies exist for game_rooms table:");
      policies.forEach((policy, index) => {
        console.log(`  ${index + 1}. ${policy.policyname}`);
      });
    } else {
      console.log("❌ No RLS policies found for game_rooms table");
      console.log("This might prevent access to the table");
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
        host_id: "00000000-0000-0000-0000-000000000000", // Dummy ID
        game_state: { test: true },
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      })
      .select();

    if (roomError) {
      console.error("❌ Error creating test game room:", roomError);
      console.log("This confirms there's an issue with game room creation");

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
    console.error("Error checking game_rooms table:", error);
  }
}

// Run the check
checkGameRoomsTable();
