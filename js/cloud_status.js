// === cloud_status.js - Cloud presence test helper ===
console.log("✅ [cloud_status] loaded");

// Always expose cloudStatusTest (even if Supabase SDK is missing)
if (typeof window === "undefined" || !window.supabase) {
  console.warn("[cloud_status] window.supabase not found - Supabase SDK not loaded");
  window.cloudStatusTest = async function cloudStatusTest() {
    console.warn("[cloud_status] Supabase SDK not loaded");
  };
} else {
  // Expose global test function
  window.cloudStatusTest = async function cloudStatusTest() {
    console.log("[CLOUD][TEST] start");
    
    // Use singleton Supabase client
    const sb = window.SB;
    if (!sb) {
      console.error("[CLOUD][TEST] window.SB not available - ensure sb_client_singleton.js is loaded");
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
          if (writeError.message && writeError.message.includes("Could not find the table")) {
            console.error("[CLOUD][HINT] Table 'cloud_status' does not exist. Please create it in Supabase Dashboard.");
          }
        } else {
          console.log("[CLOUD][WRITE] ok");
        }
      } catch (writeErr) {
        console.log("[CLOUD][WRITE] error", writeErr.message);
        if (writeErr.message && writeErr.message.includes("Could not find the table")) {
          console.error("[CLOUD][HINT] Table 'cloud_status' does not exist. Please create it in Supabase Dashboard.");
        }
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
          if (readError.message && readError.message.includes("Could not find the table")) {
            console.error("[CLOUD][HINT] Table 'cloud_status' does not exist. Please create it in Supabase Dashboard.");
          }
        } else {
          console.log("[CLOUD][READ] ok", readData);
        }
      } catch (readErr) {
        console.log("[CLOUD][READ] error", readErr.message);
        if (readErr.message && readErr.message.includes("Could not find the table")) {
          console.error("[CLOUD][HINT] Table 'cloud_status' does not exist. Please create it in Supabase Dashboard.");
        }
      }

    } catch (err) {
      console.error("[CLOUD][TEST] unexpected error:", err);
    }
  };
}
