/* ============================================================
   BridgeUp deployment config.

   LOCAL DEMO MODE (default): leave supabaseUrl/supabaseAnonKey
   empty — accounts and progress live in each browser, and the
   demo cohort is seeded automatically.

   CAMPUS MODE: create a free Supabase project, run
   supabase/schema.sql in its SQL editor, then paste the two
   values from Project Settings → API below. Accounts, progress,
   tests, marks and materials become real and shared across
   every device on campus. The anon key is designed to be
   public — data access is enforced by row-level security.
   ============================================================ */

window.BRIDGEUP_CONFIG = {
  supabaseUrl: "https://oarejgsgvoynanuriyjt.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcmVqZ3Nndm95bmFudXJpeWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMzQ3NTIsImV4cCI6MjA5OTYxMDc1Mn0.mJz58GBWRJxCzOOM_v5N_OtJPop3JrjXIk48PRkPqKg",    // PASTE the "anon public" key here (Project Settings → API Keys, starts with eyJ… or sb_publishable_…)
  adminEmail: "theswagata1@gmail.com"   // this account signs in as admin
};
