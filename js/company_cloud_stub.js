// === company_cloud_stub.js - Company cloud stub helper ===
console.log("✅ [company_cloud_stub] loaded");

// Always expose cloudCompanyEnsure (even if Supabase SDK is missing)
window.cloudCompanyEnsure = async function cloudCompanyEnsure(companyId, companyName) {
  console.log("[COMPANY][TEST] start", { companyId, companyName });

  // Validate companyId
  if (!companyId || String(companyId).trim() === "") {
    console.error("[COMPANY][TEST] companyId is required");
    return;
  }

  // Check if Supabase SDK is available
  if (typeof window === "undefined" || !window.supabase) {
    console.warn("[COMPANY][TEST] window.supabase not found - Supabase SDK not loaded");
    return;
  }

  // Create Supabase client (same config as login.html / cloud_status.js)
  const SUPABASE_URL = "https://nbaebhfnvkgcapoxddkq.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iYWViaGZudmtnY2Fwb3hkZGtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MjQ0MzQsImV4cCI6MjA4NDAwMDQzNH0.xFc5NhCwRApgq_f-hp3pBkJZOz6YHhm8mR67xz9Do6g";

  let sb = null;
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.error("[COMPANY][TEST] Failed to create Supabase client:", err);
    return;
  }

  try {
    // Observe session (optional, just observe)
    try {
      const { data: sessionData } = await sb.auth.getSession();
      const hasSession = !!sessionData?.session;
      console.log("[COMPANY][TEST] hasSession =", hasSession);
    } catch (sessionErr) {
      console.warn("[COMPANY][TEST] getSession error:", sessionErr.message);
    }

    // Write: upsert to cloud_companies table
    try {
      const { error: writeError } = await sb
        .from("cloud_companies")
        .upsert({
          company_id: companyId,
          company_name: companyName || null
        }, {
          onConflict: "company_id"
        });

      if (writeError) {
        console.log("[COMPANY][WRITE] error", writeError.message);
        if (writeError.message && writeError.message.includes("Could not find the table")) {
          console.error("[COMPANY][HINT] Table 'cloud_companies' does not exist. Please create it in Supabase Dashboard.");
        }
      } else {
        console.log("[COMPANY][WRITE] ok");
      }
    } catch (writeErr) {
      console.log("[COMPANY][WRITE] error", writeErr.message);
      if (writeErr.message && writeErr.message.includes("Could not find the table")) {
        console.error("[COMPANY][HINT] Table 'cloud_companies' does not exist. Please create it in Supabase Dashboard.");
      }
    }

    // Read: select from cloud_companies table
    try {
      const { data: readData, error: readError } = await sb
        .from("cloud_companies")
        .select("*")
        .eq("company_id", companyId)
        .single();

      if (readError) {
        console.log("[COMPANY][READ] error", readError.message);
        if (readError.message && readError.message.includes("Could not find the table")) {
          console.error("[COMPANY][HINT] Table 'cloud_companies' does not exist. Please create it in Supabase Dashboard.");
        }
      } else {
        console.log("[COMPANY][READ] ok", readData);
      }
    } catch (readErr) {
      console.log("[COMPANY][READ] error", readErr.message);
      if (readErr.message && readErr.message.includes("Could not find the table")) {
        console.error("[COMPANY][HINT] Table 'cloud_companies' does not exist. Please create it in Supabase Dashboard.");
      }
    }

  } catch (err) {
    console.error("[COMPANY][TEST] unexpected error:", err);
  }
};
