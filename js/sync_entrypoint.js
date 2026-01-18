// === sync_entrypoint.js - Single sync entry point (LOG ONLY) ===
console.log("✅ [sync_entrypoint] loaded");

// Define single sync entry function
window.syncCellChange = function syncCellChange(payload) {
  try {
    // Build safe object from payload
    const info = (payload && typeof payload === "object") ? payload : { value: payload };
    
    // Add timestamp field (safe, won't throw)
    info.ts = new Date().toISOString();
    
    // Log with exact prefix
    console.log("[SYNC][ENTRY]", info);
    
    return { ok: true, logged: true };
  } catch (err) {
    // Safety: never throw, always return
    console.warn("[SYNC][ENTRY] error (non-fatal)", err);
    return { ok: false, logged: false };
  }
};
