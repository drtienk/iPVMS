// === cloud_period_exchange_rate_write.js - WRITE ONLY helper for Period exchange_rate sheet ===
console.log("✅ [cloud_period_exchange_rate_write] loaded");

// Expose global function for writing exchange_rate sheet to cloud
window.cloudPeriodExchangeRateWriteNow = async function cloudPeriodExchangeRateWriteNow(reason) {
  // DIAG: Log function entry
  console.log("[DIAG][PERIOD_EXCHANGE_RATE][WRITE_TRIGGERED]", { 
    reason: reason,
    companyId: sessionStorage.getItem("companyId") || window.documentMeta?.companyId || "unknown",
    sheetKey: "exchange_rate",
    mode: window.activeMode || "unknown",
    activeKey: window.activeKey || "unknown",
    t: Date.now()
  });

  try {
    // Preconditions
    if (!window.SB) {
      console.warn("[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] window.SB not available");
      return { ok: false, reason: "SB_not_available" };
    }

    // Get companyId
    const companyId = window.documentMeta?.companyId || 
                      (typeof window.companyScopeKey === "function" ? window.companyScopeKey() : null) ||
                      sessionStorage.getItem("companyId") ||
                      null;

    if (!companyId || String(companyId).trim() === "") {
      console.warn("[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] companyId not found");
      return { ok: false, reason: "companyId_not_found" };
    }

    // Check if sheets and exchange_rate sheet exist
    if (!window.sheets) {
      console.warn("[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] window.sheets not found");
      return { ok: false, reason: "sheets_not_found" };
    }

    if (!window.sheets.exchange_rate) {
      console.warn("[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] window.sheets.exchange_rate not found");
      return { ok: false, reason: "exchange_rate_sheet_not_found" };
    }

    const companyIdStr = String(companyId).trim();
    const cloudId = `period_exchange_rate__${companyIdStr}`;

    // Build payload
    const sheet = window.sheets.exchange_rate;
    const payloadObj = sheet; // Only the exchange_rate sheet, not all sheets
    let payloadText;
    
    try {
      payloadText = JSON.stringify(payloadObj || {});
    } catch (stringifyErr) {
      console.warn("[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] failed to stringify sheet", stringifyErr.message);
      return { ok: false, reason: "stringify_failed", error: stringifyErr.message };
    }

    console.log("[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] start", { 
      companyId: companyIdStr, 
      id: cloudId, 
      bytes: payloadText.length 
    });

    // Write to Supabase
    try {
      const { error: writeError } = await window.SB
        .from("cloud_status")
        .upsert(
          { 
            id: cloudId, 
            payload: payloadText 
          }, 
          { 
            onConflict: "id" 
          }
        );

      if (writeError) {
        // Check if table is missing
        if (writeError.message && writeError.message.includes("Could not find the table")) {
          console.error("[CLOUD][HINT] Create table cloud_status (id text PK, payload text, updated_at timestamptz default now())");
        }

        console.warn("[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] error", { 
          companyId: companyIdStr, 
          id: cloudId, 
          msg: writeError.message, 
          code: writeError.code, 
          status: writeError.status 
        });

        return { ok: false, error: writeError.message, code: writeError.code, status: writeError.status };
      }

      // Success
      console.log("[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] ok", { id: cloudId });

      return { ok: true };

    } catch (err) {
      // Catch any unexpected errors
      if (err.message && err.message.includes("Could not find the table")) {
        console.error("[CLOUD][HINT] Create table cloud_status (id text PK, payload text, updated_at timestamptz default now())");
      }

      console.warn("[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] error", { 
        companyId: companyIdStr, 
        id: cloudId, 
        msg: err.message 
      });

      return { ok: false, error: err.message };
    }

  } catch (err) {
    // Outer catch for any errors in the function
    console.warn("[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] unexpected error", err.message);
    return { ok: false, error: err.message };
  }
};
