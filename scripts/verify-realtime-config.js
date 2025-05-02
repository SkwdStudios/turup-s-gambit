// Script to verify Supabase realtime configuration
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

async function verifyRealtimeConfig() {
  console.log("Verifying Supabase realtime configuration...");

  try {
    // Check if the tables exist
    const { data: tables, error: tablesError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .in("table_name", [
        "game_rooms_public",
        "trump_votes",
        "players",
        "game_sessions",
        "player_actions",
      ]);

    if (tablesError) {
      console.error("Error fetching tables:", tablesError);
      return;
    }

    const existingTables = tables.map((table) => table.table_name);
    console.log("Found tables:", existingTables);

    // Check realtime publication
    const { data: publications, error: pubError } = await supabase
      .from("pg_publication")
      .select("pubname")
      .eq("pubname", "supabase_realtime");

    if (pubError) {
      console.error("Error fetching publications:", pubError);
      return;
    }

    if (publications && publications.length > 0) {
      console.log("Found realtime publication:", publications[0].pubname);
    } else {
      console.log("No realtime publication found");
    }

    // Check publication tables
    const { data: pubTables, error: pubTablesError } = await supabase
      .from("pg_publication_tables")
      .select("tablename")
      .eq("pubname", "supabase_realtime");

    if (pubTablesError) {
      console.error("Error fetching publication tables:", pubTablesError);
      return;
    }

    if (pubTables && pubTables.length > 0) {
      const realtimeTables = pubTables.map((table) => table.tablename);
      console.log("Tables in realtime publication:", realtimeTables);

      // Check if our required tables are in the publication
      const requiredTables = [
        "game_rooms_public",
        "trump_votes",
        "players",
        "game_sessions",
        "player_actions",
      ];
      const missingTables = requiredTables.filter(
        (table) => !realtimeTables.includes(table)
      );

      if (missingTables.length === 0) {
        console.log("✅ All required tables are in the realtime publication");
      } else {
        console.log(
          "❌ Missing tables in realtime publication:",
          missingTables
        );
      }
    } else {
      console.log("No tables found in realtime publication");
    }

    // Test realtime subscription
    console.log("\nTesting realtime subscription...");
    const channel = supabase.channel("test-channel");

    channel
      .on("presence", { event: "sync" }, () => {
        console.log("Presence sync event received");
      })
      .on("broadcast", { event: "test" }, (payload) => {
        console.log("Broadcast event received:", payload);
      })
      .subscribe((status) => {
        console.log("Subscription status:", status);

        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to realtime channel");

          // Clean up after 2 seconds
          setTimeout(() => {
            console.log("Cleaning up...");
            supabase.removeChannel(channel);
            console.log("Verification complete");
            process.exit(0);
          }, 2000);
        }
      });
  } catch (error) {
    console.error("Error verifying realtime configuration:", error);
  }
}

// Run the verification
verifyRealtimeConfig();
