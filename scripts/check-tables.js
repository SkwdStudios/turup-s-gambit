// Script to check if required tables exist in Supabase
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: Missing Supabase credentials in .env file");
  console.error(
    "Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Tables to check
const requiredTables = ["game_rooms", "trump_votes", "player_actions"];

async function checkTables() {
  console.log("Checking for required tables in Supabase...");

  try {
    // Query the information schema to get a list of tables
    const { data, error } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public");

    if (error) {
      throw error;
    }

    // Extract table names
    const existingTables = data.map((table) => table.table_name);
    console.log("Existing tables:", existingTables.join(", "));

    // Check which required tables are missing
    const missingTables = requiredTables.filter(
      (table) => !existingTables.includes(table)
    );

    if (missingTables.length === 0) {
      console.log("✅ All required tables exist!");
      return true;
    } else {
      console.log("❌ Missing tables:", missingTables.join(", "));
      console.log("\nTo create the missing tables:");
      console.log("1. Go to the Supabase dashboard");
      console.log("2. Navigate to the SQL Editor");
      console.log("3. Run the SQL from scripts/create-tables-manual.sql");
      return false;
    }
  } catch (error) {
    console.error("Error checking tables:", error.message);
    return false;
  }
}

// Run the check
checkTables()
  .then((result) => {
    if (!result) {
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
