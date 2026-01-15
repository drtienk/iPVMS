// === cloud_status.js - Cloud presence test helper ===
console.log("✅ [cloud_status] loaded");

// Always expose cloudStatusTest (even if Supabase SDK is missing)
if (typeof window === "undefined" || !window.supabase) {
  console.warn("[cloud_status] window.supabase not found - Supabase SDK not loaded");
  window.cloudStatusTest = async function cloudStatusTest() {
    console.warn("[cloud_status] Supabase SDK not loaded");
  };
} else {
  // Create Supabase client (same config as login.html)
  const SUPABASE_URL = "https://nbaebhfnvkgcapoxddkq.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iYWViaGZudmtnY2Fwb3hkZGtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MjQ0MzQsImV4cCI6MjA4NDAwMDQzNH0.xFc5NhCwRApgq_f-hp3pBkJZOz6YHhm8mR67xz9Do6g";
  
  let sb = null;
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error("[cloud_status] Failed to create Supabase client:", err);
  }

  // Expose global test function
  window.cloudStatusTest = async function cloudStatusTest() {
    console.log("[CLOUD][TEST] start");
    
    if (!sb) {
      console.error("[CLOUD][TEST] Supabase client not available");
      return;
    }

    try {
      // Check auth session (optional, just observe)
      try {
        const { data: sessionData } = await sb.auth.getSession();
        const hasSession = !!sessionData?.session;
        console.log("[CLOUD][TEST] hasSession =", hasSession);
      } catch (sessionErr) {
        console.warn("[CLOUD][TEST] getSession error:", sessionErr.message);
      }

      // Write: upsert to cloud_status table
      const testPayload = JSON.stringify({
        ts: Date.now(),
        note: "test"
      });
      
      try {
        const { error: writeError } = await sb
          .from("cloud_status")
          .upsert({
            id: "hello",
            payload: testPayload
          }, {
            onConflict: "id"
          });

        if (writeError) {
          console.log("[CLOUD][WRITE] error", writeError.message);
        } else {
          console.log("[CLOUD][WRITE] ok");
        }
      } catch (writeErr) {
        console.log("[CLOUD][WRITE] error", writeErr.message);
      }

      // Read: select from cloud_status table
      try {
        const { data: readData, error: readError } = await sb
          .from("cloud_status")
          .select("*")
          .eq("id", "hello")
          .single();

        if (readError) {
          console.log("[CLOUD][READ] error", readError.message);
        } else {
          console.log("[CLOUD][READ] ok", readData);
        }
      } catch (readErr) {
        console.log("[CLOUD][READ] error", readErr.message);
      }

    } catch (err) {
      console.error("[CLOUD][TEST] unexpected error:", err);
    }
  };
}
