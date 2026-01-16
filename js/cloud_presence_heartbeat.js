// === cloud_presence_heartbeat.js - Presence heartbeat write-only helper ===
console.log("✅ [cloud_presence_heartbeat] loaded");

// Export / attach one function only: window.presenceHeartbeatOnce()
window.presenceHeartbeatOnce = async function presenceHeartbeatOnce() {
  try {
    // Check window.SB exists; if not, log and return safely
    if (!window.SB) {
      console.log("[PRESENCE][WRITE] window.SB not available, skipping");
      return;
    }

    // Get company_id from sessionStorage
    const companyId = sessionStorage.getItem("companyId");
    if (!companyId) {
      console.log("[PRESENCE][WRITE] companyId not found in sessionStorage, skipping");
      return;
    }

    // Build minimal payload
    const payload = {
      company_id: companyId,
      ts: new Date().toISOString(),
      source: "heartbeat"
    };

    // Use deterministic id: presence_<companyId>
    const recordId = `presence_${companyId}`;

    // Write to Supabase using upsert (table: cloud_status)
    const { error } = await window.SB
      .from("cloud_status")
      .upsert({
        id: recordId,
        payload: JSON.stringify(payload)
      }, {
        onConflict: "id"
      });

    // Log success / failure with clear [PRESENCE][WRITE] prefix
    if (error) {
      console.log("[PRESENCE][WRITE] error:", error.message);
    } else {
      console.log("[PRESENCE][WRITE] ok");
    }
  } catch (err) {
    // Must never throw (catch all errors)
    console.log("[PRESENCE][WRITE] error:", err.message);
  }
};
