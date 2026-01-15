// === sb_client_singleton.js - Single Supabase client instance ===
// Prevents "Multiple GoTrueClient instances detected" warning

// Check if singleton already exists
if (window.SB) {
  console.log("[SB] singleton reused");
} else {
  // Check if Supabase SDK is available
  if (typeof window === "undefined" || !window.supabase) {
    console.warn("[SB] window.supabase not found - Supabase SDK not loaded");
  } else {
    // Create Supabase client (same config as login.html / cloud_status.js / company_cloud_stub.js)
    const SUPABASE_URL = "https://nbaebhfnvkgcapoxddkq.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iYWViaGZudmtnY2Fwb3hkZGtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MjQ0MzQsImV4cCI6MjA4NDAwMDQzNH0.xFc5NhCwRApgq_f-hp3pBkJZOz6YHhm8mR67xz9Do6g";
    
    try {
      window.SB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log("[SB] singleton created");
    } catch (err) {
      console.error("[SB] Failed to create Supabase client:", err);
    }
  }
}
