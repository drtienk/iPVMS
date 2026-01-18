// === cloud_period_exchange_rate_read.js - Read-only cloud pull for Period exchange_rate sheet ===
console.log("✅ [cloud_period_exchange_rate_read] loaded");

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

    if (window.activeKey !== "exchange_rate") {
      return done({ ok: false, step: "precondition", reason: "activeKey_not_exchange_rate" });
    }

    // Get companyId
    const companyId = window.documentMeta?.companyId || 
                      (typeof window.companyScopeKey === "function" ? window.companyScopeKey() : null) ||
                      sessionStorage.getItem("companyId") ||
                      null;

    if (!companyId || String(companyId).trim() === "") {
      return done({ ok: false, step: "precondition", reason: "companyId_not_found" });
    }

    const companyIdStr = String(companyId).trim();
    const cloudId = `period_exchange_rate__${companyIdStr}`;
    const marker = Date.now().toString(36).slice(-6);

    console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] query", { marker, companyId: companyIdStr, id: cloudId });

    // Read from Supabase
    try {
      const { data: rowData, error: readError } = await window.SB
        .from("cloud_status")
        .select("payload, updated_at")
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
          console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] found=false (no_row)");
          return done({ 
            ok: false, 
            step: "no_data", 
            reason: "no_row", 
            companyId: companyIdStr, 
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
          id: cloudId,
          code: readError.code,
          status: readError.status
        });
      }

      // Check if row exists and has payload
      if (!rowData || !rowData.payload) {
        console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] found=false (empty_payload)");
        return done({ 
          ok: false, 
          step: "no_data", 
          reason: "empty_payload", 
          companyId: companyIdStr, 
          id: cloudId 
        });
      }

      const payloadStr = String(rowData.payload).trim();
      if (payloadStr === "") {
        console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] found=false (empty_payload_string)");
        return done({ 
          ok: false, 
          step: "no_data", 
          reason: "empty_payload", 
          companyId: companyIdStr, 
          id: cloudId 
        });
      }

      // Parse JSON safely
      console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] parse:start", { marker, payloadLen: payloadStr.length });

      let parsed;
      try {
        parsed = JSON.parse(payloadStr);
      } catch (parseErr) {
        console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] parse:fail", { marker, companyId: companyIdStr, id: cloudId }, parseErr);
        return done({ 
          ok: false, 
          step: "parse_fail", 
          companyId: companyIdStr, 
          id: cloudId 
        });
      }

      // Extract exchange_rate sheet data
      // Accept either: { exchange_rate: {...} } or just {...}
      const exchangeRateSheetFromCloud = parsed.exchange_rate ? parsed.exchange_rate : parsed;

      // Validate it's an object
      if (!exchangeRateSheetFromCloud || typeof exchangeRateSheetFromCloud !== "object" || Array.isArray(exchangeRateSheetFromCloud)) {
        console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] payload is not a valid sheet object, fallback local", { marker });
        return done({ 
          ok: false, 
          step: "validation_fail", 
          reason: "not_valid_sheet_object", 
          companyId: companyIdStr, 
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
          id: cloudId 
        });
      }

      // Fingerprint helper
      function fpExchangeRate() {
        const hasExchangeRate = !!(window.sheets && window.sheets.exchange_rate);
        return {
          hasExchangeRate: hasExchangeRate,
          len: hasExchangeRate ? JSON.stringify(window.sheets.exchange_rate).length : 0,
          rowCount: hasExchangeRate && Array.isArray(window.sheets.exchange_rate.data) ? window.sheets.exchange_rate.data.length : 0,
          firstRow: hasExchangeRate && Array.isArray(window.sheets.exchange_rate.data) && window.sheets.exchange_rate.data.length > 0 
            ? window.sheets.exchange_rate.data[0]?.slice(0, 3) : null
        };
      }

      // Conservative merge helper - only fill empty cells, never overwrite non-empty local cells
      function conservativeMerge(localSheet, cloudSheet) {
        if (!localSheet || !cloudSheet) return cloudSheet;
        if (!Array.isArray(localSheet.data) || !Array.isArray(cloudSheet.data)) return cloudSheet;
        
        // Create a copy of local sheet
        const merged = JSON.parse(JSON.stringify(localSheet));
        
        // Ensure merged.data exists and is an array
        if (!Array.isArray(merged.data)) {
          merged.data = [];
        }
        
        // Merge data: only fill empty cells
        for (let r = 0; r < Math.max(localSheet.data.length, cloudSheet.data.length); r++) {
          if (!Array.isArray(merged.data[r])) {
            merged.data[r] = [];
          }
          
          const localRow = Array.isArray(localSheet.data[r]) ? localSheet.data[r] : [];
          const cloudRow = Array.isArray(cloudSheet.data[r]) ? cloudSheet.data[r] : [];
          
          for (let c = 0; c < Math.max(localRow.length, cloudRow.length); c++) {
            const localValue = String(localRow[c] || "").trim();
            const cloudValue = String(cloudRow[c] || "").trim();
            
            // Only fill if local is empty and cloud has value
            if (localValue === "" && cloudValue !== "") {
              merged.data[r][c] = cloudRow[c];
            } else if (localValue !== "") {
              // Keep local value
              merged.data[r][c] = localRow[c];
            } else if (cloudValue !== "") {
              // Local doesn't exist, use cloud
              merged.data[r][c] = cloudRow[c];
            }
          }
        }
        
        // Merge other properties (headers, meta, etc.) conservatively
        if (cloudSheet.headers && Array.isArray(cloudSheet.headers)) {
          if (!Array.isArray(merged.headers) || merged.headers.length === 0) {
            merged.headers = cloudSheet.headers;
          } else {
            // Merge headers: only fill empty
            for (let i = 0; i < Math.max(merged.headers.length, cloudSheet.headers.length); i++) {
              if ((!merged.headers[i] || String(merged.headers[i]).trim() === "") && 
                  cloudSheet.headers[i] && String(cloudSheet.headers[i]).trim() !== "") {
                merged.headers[i] = cloudSheet.headers[i];
              }
            }
          }
        }
        
        if (cloudSheet.cols !== undefined && (merged.cols === undefined || merged.cols === 0)) {
          merged.cols = cloudSheet.cols;
        }
        
        if (cloudSheet.rows !== undefined && (merged.rows === undefined || merged.rows === 0)) {
          merged.rows = cloudSheet.rows;
        }
        
        return merged;
      }

      // Check if local sheet has any non-empty cells
      function hasNonEmptyLocalCells(sheet) {
        if (!sheet || !Array.isArray(sheet.data)) return false;
        for (let r = 0; r < sheet.data.length; r++) {
          const row = sheet.data[r];
          if (!Array.isArray(row)) continue;
          for (let c = 0; c < row.length; c++) {
            const cellValue = String(row[c] || "").trim();
            if (cellValue !== "") return true;
          }
        }
        return false;
      }

      // Apply cloud data to in-memory sheets
      try {
        const fpBefore = fpExchangeRate();
        const cloudLen = JSON.stringify(exchangeRateSheetFromCloud).length;
        const cloudRowCount = Array.isArray(exchangeRateSheetFromCloud.data) ? exchangeRateSheetFromCloud.data.length : 0;
        const cloudUpdatedAt = rowData.updated_at ? new Date(rowData.updated_at).getTime() : null;
        const localHasNonEmpty = hasNonEmptyLocalCells(window.sheets.exchange_rate);
        
        console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] BEFORE merge", { marker, fpBefore, cloudLen, cloudRowCount, cloudUpdatedAt, localHasNonEmpty });

        // Guard: Skip if cloud data is stale/empty compared to current in-memory data
        const currentLen = (window.sheets && window.sheets.exchange_rate) ? JSON.stringify(window.sheets.exchange_rate).length : 0;
        const currentRowCount = Array.isArray(window.sheets.exchange_rate?.data) ? window.sheets.exchange_rate.data.length : 0;

        // Guard rules (apply in order)
        if (!exchangeRateSheetFromCloud || exchangeRateSheetFromCloud === null || exchangeRateSheetFromCloud === undefined) {
          console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] found=false (null_or_undefined)");
          return done({
            ok: true,
            step: "skip_apply_stale",
            companyId: companyIdStr,
            id: cloudId,
            reason: "null_or_undefined"
          });
        }

        if (cloudRowCount === 0) {
          console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] found=false (cloudRowCount_zero)");
          return done({
            ok: true,
            step: "skip_apply_stale",
            companyId: companyIdStr,
            id: cloudId,
            reason: "cloudRowCount_zero"
          });
        }

        // Strict guard: If local has non-empty cells, only apply cloud if it's clearly newer (using updated_at if available)
        if (localHasNonEmpty) {
          // If cloud has updated_at, check if it's recent (within last 5 minutes) - assume it's newer
          // Otherwise, use conservative merge (only fill empty cells)
          const now = Date.now();
          const fiveMinutesAgo = now - (5 * 60 * 1000);
          const shouldApplyCloud = cloudUpdatedAt && cloudUpdatedAt > fiveMinutesAgo;
          
          if (!shouldApplyCloud) {
            // Use conservative merge: only fill empty cells, never overwrite non-empty local cells
            console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] found=true (conservative merge, local has data)");
            const merged = conservativeMerge(window.sheets.exchange_rate, exchangeRateSheetFromCloud);
            Object.assign(window.sheets.exchange_rate, merged);
          } else {
            // Cloud is clearly newer (recent updated_at), but still use conservative merge for safety
            console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] found=true (cloud newer, conservative merge)");
            const merged = conservativeMerge(window.sheets.exchange_rate, exchangeRateSheetFromCloud);
            Object.assign(window.sheets.exchange_rate, merged);
          }
        } else {
          // Local is empty, safe to apply cloud
          if (cloudLen < currentLen && currentLen > 0) {
            console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] found=false (cloudLen_smaller)");
            return done({
              ok: true,
              step: "skip_apply_stale",
              companyId: companyIdStr,
              id: cloudId,
              reason: "cloudLen_smaller"
            });
          }
          console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] found=true (local empty, apply cloud)");
          Object.assign(window.sheets.exchange_rate, exchangeRateSheetFromCloud);
        }

        const fpAfter = fpExchangeRate();
        console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] AFTER merge", { marker, fpBefore, fpAfter });
      } catch (assignErr) {
        console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] apply:assign_fail", { marker }, assignErr);
        return done({ 
          ok: false, 
          step: "assign_fail", 
          companyId: companyIdStr, 
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
        const fpBeforeRender = fpExchangeRate();
        console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] BEFORE render", { marker, fpBeforeRender });
        window.render?.();
        const fpAfterRender = fpExchangeRate();
        console.log("[CLOUD][READ][PERIOD][EXCHANGE_RATE] AFTER render", { marker, fpBeforeRender, fpAfterRender });
      } catch (e) {
        console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] post:render_fail", { marker }, e);
      }

      // Log success (already logged above with found=true/false)

      return done({ 
        ok: true, 
        step: "applied", 
        companyId: companyIdStr, 
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
      const cloudId = `period_exchange_rate__${companyIdStr}`;
      console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] error, fallback local", { companyId: companyIdStr, id: cloudId }, err);
      return done({ 
        ok: false, 
        step: "read_flow_error", 
        companyId: companyIdStr, 
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
    const cloudId = companyIdStr !== "unknown" ? `period_exchange_rate__${companyIdStr}` : "unknown";
    console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] unexpected error (fallback local)", { companyId: companyIdStr, id: cloudId }, err);
    return done({ 
      ok: false, 
      step: "unexpected_error", 
      companyId: companyIdStr, 
      id: cloudId 
    });
  }
};
