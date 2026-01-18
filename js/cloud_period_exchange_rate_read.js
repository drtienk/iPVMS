// === cloud_period_exchange_rate_read.js - Read-only cloud pull for Period exchange_rate sheet ===
console.log("✅ [cloud_period_exchange_rate_read] loaded");

// Guard to prevent repeated reads per (companyId, periodId)
const __PERIOD_EXCHANGE_RATE_READ_GUARD__ = new Set();

// Helper: Check if local sheet has any non-empty data
function sheetHasAnyData(sheet) {
  if (!sheet) return false;
  
  // Check if local sheet has any rows
  if (!Array.isArray(sheet.data) || sheet.data.length === 0) {
    return false; // Empty local sheet, no data
  }
  
  // Check if any cell in local sheet has non-empty value
  for (let r = 0; r < sheet.data.length; r++) {
    const row = sheet.data[r];
    if (!Array.isArray(row)) continue;
    
    for (let c = 0; c < row.length; c++) {
      const cellValue = String(row[c] || "").trim();
      if (cellValue !== "") {
        return true; // Local has data
      }
    }
  }
  
  return false; // Local is completely empty
}

// Expose global function for one-time cloud read
window.cloudPeriodExchangeRateTryReadOnce = async function cloudPeriodExchangeRateTryReadOnce(opts) {
  // Helper to standardize returns
  function done(ret) {
    console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] done", ret);
    return ret;
  }

  try {
    // Preconditions
    if (!window.SB) {
      return done({ ok: false, step: "precondition", reason: "SB_not_available" });
    }

    if (window.activeMode !== "period") {
      return done({ ok: false, step: "precondition", reason: "activeMode_not_period" });
    }

    // Get companyId and periodId
    const companyId = window.documentMeta?.companyId || 
                      (typeof window.companyScopeKey === "function" ? window.companyScopeKey() : null) ||
                      sessionStorage.getItem("companyId") ||
                      null;

    if (!companyId || String(companyId).trim() === "") {
      return done({ ok: false, step: "precondition", reason: "companyId_not_found" });
    }

    const periodId = (typeof window.getActivePeriodId === "function") ? window.getActivePeriodId() : null;

    if (!periodId || String(periodId).trim() === "") {
      return done({ ok: false, step: "precondition", reason: "periodId_not_found" });
    }

    const companyIdStr = String(companyId).trim();
    const periodIdStr = String(periodId).trim();
    const cloudId = `period__${companyIdStr}__${periodIdStr}__exchange_rate`;
    const guardKey = `${companyIdStr}__${periodIdStr}`;
    const marker = Date.now().toString(36).slice(-6);

    // Guard: Skip if already read for this (companyId, periodId) combination
    if (__PERIOD_EXCHANGE_RATE_READ_GUARD__.has(guardKey)) {
      return done({ ok: true, step: "skip_already_read", companyId: companyIdStr, periodId: periodIdStr, id: cloudId });
    }

    console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] query", { marker, companyId: companyIdStr, periodId: periodIdStr, id: cloudId });

    // Read from Supabase
    try {
      const { data: rowData, error: readError } = await window.SB
        .from("cloud_status")
        .select("payload")
        .eq("id", cloudId)
        .maybeSingle();

      console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] result", { 
        marker, 
        hasError: !!readError, 
        status: readError?.status, 
        code: readError?.code, 
        hasData: !!rowData, 
        payloadLen: (rowData?.payload || "").length 
      });

      if (readError) {
        // Check if it's a "no rows" error (expected when no cloud data)
        const isNoRowError = 
          readError.code === "PGRST116" ||
          readError.status === 406 ||
          readError.message?.includes("No rows") ||
          readError.message?.includes("Results contain 0 rows") ||
          readError.message?.includes("JSON object requested, multiple (or no) rows returned");

        if (isNoRowError) {
          return done({ 
            ok: false, 
            step: "no_data", 
            reason: "no_row", 
            companyId: companyIdStr,
            periodId: periodIdStr,
            id: cloudId 
          });
        }

        // Check if table is missing
        if (readError.message && readError.message.includes("Could not find the table")) {
          console.error("[CLOUD][HINT] Create table cloud_status (id text PK, payload text, updated_at timestamptz default now())");
        }

        // Other errors
        console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] error, fallback local", { 
          marker,
          companyId: companyIdStr,
          periodId: periodIdStr,
          id: cloudId, 
          msg: readError.message, 
          code: readError.code, 
          status: readError.status 
        });
        
        return done({ 
          ok: false, 
          step: "read_error", 
          reason: readError.message, 
          companyId: companyIdStr,
          periodId: periodIdStr,
          id: cloudId,
          code: readError.code,
          status: readError.status
        });
      }

      // Check if row exists and has payload
      if (!rowData || !rowData.payload) {
        return done({ 
          ok: false, 
          step: "no_data", 
          reason: "empty_payload", 
          companyId: companyIdStr,
          periodId: periodIdStr,
          id: cloudId 
        });
      }

      const payloadStr = String(rowData.payload).trim();
      if (payloadStr === "") {
        return done({ 
          ok: false, 
          step: "no_data", 
          reason: "empty_payload", 
          companyId: companyIdStr,
          periodId: periodIdStr,
          id: cloudId 
        });
      }

      // Parse JSON safely
      console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] parse:start", { marker, payloadLen: payloadStr.length });

      let parsed;
      try {
        parsed = JSON.parse(payloadStr);
      } catch (parseErr) {
        console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] parse:fail", { marker, companyId: companyIdStr, periodId: periodIdStr, id: cloudId }, parseErr);
        return done({ 
          ok: false, 
          step: "parse_fail", 
          companyId: companyIdStr,
          periodId: periodIdStr,
          id: cloudId 
        });
      }

      // Extract exchange_rate sheet data
      const exchangeRateSheetFromCloud = parsed;

      // Validate it's an object
      if (!exchangeRateSheetFromCloud || typeof exchangeRateSheetFromCloud !== "object" || Array.isArray(exchangeRateSheetFromCloud)) {
        console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] payload is not a valid sheet object, fallback local", { marker });
        return done({ 
          ok: false, 
          step: "validation_fail", 
          reason: "not_valid_sheet_object", 
          companyId: companyIdStr,
          periodId: periodIdStr,
          id: cloudId 
        });
      }

      // Check if target exists before applying
      if (!window.sheets || !window.sheets.exchange_rate) {
        console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] apply:missing_target", { 
          marker, 
          hasSheets: !!window.sheets, 
          hasExchangeRate: !!window.sheets?.exchange_rate 
        });
        return done({ 
          ok: false, 
          step: "apply_missing_target", 
          companyId: companyIdStr,
          periodId: periodIdStr,
          id: cloudId 
        });
      }

      // Apply cloud data to in-memory sheets
      try {
        // STRICT local-newer protection: Check if local has any non-empty cell
        if (sheetHasAnyData(window.sheets.exchange_rate)) {
          console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] SKIP apply (local_has_data)", {
            marker, companyId: companyIdStr, periodId: periodIdStr, id: cloudId, reason: "local_has_data"
          });
          // Mark as read (even though we skipped) to prevent repeated attempts
          __PERIOD_EXCHANGE_RATE_READ_GUARD__.add(guardKey);
          return done({
            ok: true,
            step: "skip_apply_local_has_data",
            companyId: companyIdStr,
            periodId: periodIdStr,
            id: cloudId,
            reason: "local_has_data"
          });
        }

        Object.assign(window.sheets.exchange_rate, exchangeRateSheetFromCloud);

        // Mark as read to prevent repeated reads
        __PERIOD_EXCHANGE_RATE_READ_GUARD__.add(guardKey);

        console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] applied", { 
          marker, 
          companyId: companyIdStr,
          periodId: periodIdStr,
          id: cloudId, 
          bytes: payloadStr.length 
        });
      } catch (assignErr) {
        console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] apply:assign_fail", { marker }, assignErr);
        return done({ 
          ok: false, 
          step: "assign_fail", 
          companyId: companyIdStr,
          periodId: periodIdStr,
          id: cloudId 
        });
      }

      // Call helper functions if available (do NOT throw)
      try {
        window.ensureHeadersForActiveSheet?.();
      } catch (e) {
        console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] post:ensureHeaders_fail", { marker }, e);
      }

      try {
        window.render?.();
      } catch (e) {
        console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] post:render_fail", { marker }, e);
      }

      return done({ 
        ok: true, 
        step: "applied", 
        companyId: companyIdStr,
        periodId: periodIdStr,
        id: cloudId, 
        bytes: payloadStr.length 
      });

    } catch (err) {
      // Catch any unexpected errors in read/parse/apply flow
      if (err.message && err.message.includes("Could not find the table")) {
        console.error("[CLOUD][HINT] Create table cloud_status (id text PK, payload text, updated_at timestamptz default now())");
      }
      const companyIdStr = window.documentMeta?.companyId || 
                           (typeof window.companyScopeKey === "function" ? window.companyScopeKey() : null) ||
                           sessionStorage.getItem("companyId") ||
                           "unknown";
      const periodIdStr = (typeof window.getActivePeriodId === "function") ? window.getActivePeriodId() : "unknown";
      const cloudId = `period__${companyIdStr}__${periodIdStr}__exchange_rate`;
      console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] error, fallback local", { companyId: companyIdStr, periodId: periodIdStr, id: cloudId }, err);
      return done({ 
        ok: false, 
        step: "read_flow_error", 
        companyId: companyIdStr,
        periodId: periodIdStr,
        id: cloudId 
      });
    }

  } catch (err) {
    // Outer catch for any errors in the function
    function done(ret) {
      console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] done", ret);
      return ret;
    }
    const companyIdStr = window.documentMeta?.companyId || 
                         (typeof window.companyScopeKey === "function" ? window.companyScopeKey() : null) ||
                         sessionStorage.getItem("companyId") ||
                         "unknown";
    const periodIdStr = (typeof window.getActivePeriodId === "function") ? window.getActivePeriodId() : "unknown";
    const cloudId = companyIdStr !== "unknown" ? `period__${companyIdStr}__${periodIdStr}__exchange_rate` : "unknown";
    console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] unexpected error (fallback local)", { companyId: companyIdStr, periodId: periodIdStr, id: cloudId }, err);
    return done({ 
      ok: false, 
      step: "unexpected_error", 
      companyId: companyIdStr,
      periodId: periodIdStr,
      id: cloudId 
    });
  }
};
