// === sync_entrypoint.js - Single sync entry point (LOG ONLY) ===
console.log("✅ [sync_entrypoint] loaded");

// Define single sync entry function
window.syncCellChange = function syncCellChange(payload) {
  try {
    // Log the sync entry with structured format
    console.log("[SYNC][ENTRY]", payload || {});
    
    return { ok: true, logged: true };
  } catch (err) {
    // Safety: never throw, always return
    console.warn("[SYNC][ENTRY] error (non-fatal):", err.message);
    return { ok: false, logged: false, error: err.message };
  }
};
