// === cloud_model_company_read.js - Read-only cloud pull for Model company sheet ===
console.log("✅ [cloud_model_company_read] loaded");

// Expose global function for one-time cloud read
window.cloudModelCompanyTryReadOnce = async function cloudModelCompanyTryReadOnce(opts) {
  // Helper to standardize returns
  function done(ret) {
    console.log("[CLOUD][READ][COMPANY] done", ret);
    return ret;
  }

  try {
    // Preconditions
    if (!window.SB) {
      return done({ ok: false, step: "precondition", reason: "SB_not_available" });
    }

    if (window.activeMode !== "model") {
      return done({ ok: false, step: "precondition", reason: "activeMode_not_model" });
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
    const cloudId = `model_company__${companyIdStr}`;
    const marker = Date.now().toString(36).slice(-6);

    console.log("[CLOUD][READ][COMPANY] query", { marker, companyId: companyIdStr, id: cloudId });

    // Read from Supabase
    try {
      const { data: rowData, error: readError } = await window.SB
        .from("cloud_status")
        .select("payload")
        .eq("id", cloudId)
        .maybeSingle();

      console.log("[CLOUD][READ][COMPANY] result", { 
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
            id: cloudId 
          });
        }

        // Check if table is missing
        if (readError.message && readError.message.includes("Could not find the table")) {
          console.error("[CLOUD][HINT] Create table cloud_status (id text PK, payload text, updated_at timestamptz default now())");
        }

        // Other errors
        console.warn("[CLOUD][READ][COMPANY] error, fallback local", { 
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
        return done({ 
          ok: false, 
          step: "no_data", 
          reason: "empty_payload", 
          companyId: companyIdStr, 
          id: cloudId 
        });
      }

      // Parse JSON safely
      console.log("[CLOUD][READ][COMPANY] parse:start", { marker, payloadLen: payloadStr.length });

      let parsed;
      try {
        parsed = JSON.parse(payloadStr);
      } catch (parseErr) {
        console.warn("[CLOUD][READ][COMPANY] parse:fail", { marker, companyId: companyIdStr, id: cloudId }, parseErr);
        return done({ 
          ok: false, 
          step: "parse_fail", 
          companyId: companyIdStr, 
          id: cloudId 
        });
      }

      // Extract company sheet data
      // Accept either: { company: {...} } or just {...}
      const companySheetFromCloud = parsed.company ? parsed.company : parsed;

      // Validate it's an object
      if (!companySheetFromCloud || typeof companySheetFromCloud !== "object" || Array.isArray(companySheetFromCloud)) {
        console.warn("[CLOUD][READ][COMPANY] payload is not a valid sheet object, fallback local", { marker });
        return done({ 
          ok: false, 
          step: "validation_fail", 
          reason: "not_valid_sheet_object", 
          companyId: companyIdStr, 
          id: cloudId 
        });
      }

      // Check if target exists before applying
      if (!window.sheets || !window.sheets.company) {
        console.warn("[CLOUD][READ][COMPANY] apply:missing_target", { 
          marker, 
          hasSheets: !!window.sheets, 
          hasCompany: !!window.sheets?.company 
        });
        return done({ 
          ok: false, 
          step: "apply_missing_target", 
          companyId: companyIdStr, 
          id: cloudId 
        });
      }

      // Fingerprint helper
      function fpCompany() {
        const hasCompany = !!(window.sheets && window.sheets.company);
        return {
          hasCompany: hasCompany,
          len: hasCompany ? JSON.stringify(window.sheets.company).length : 0,
          rowCount: hasCompany && Array.isArray(window.sheets.company.data) ? window.sheets.company.data.length : 0,
          firstRow: hasCompany && Array.isArray(window.sheets.company.data) && window.sheets.company.data.length > 0 
            ? window.sheets.company.data[0]?.slice(0, 3) : null
        };
      }

      // Apply cloud data to in-memory sheets
      try {
        const fpBefore = fpCompany();
        const cloudLen = JSON.stringify(companySheetFromCloud).length;
        const cloudRowCount = Array.isArray(companySheetFromCloud.data) ? companySheetFromCloud.data.length : 0;
        console.log("[DIAG][CLOUD][READ][COMPANY] BEFORE Object.assign", { marker, fpBefore, cloudLen, cloudRowCount });

        Object.assign(window.sheets.company, companySheetFromCloud);

        const fpAfter = fpCompany();
        console.log("[DIAG][CLOUD][READ][COMPANY] AFTER Object.assign", { marker, fpBefore, fpAfter });
      } catch (assignErr) {
        console.warn("[CLOUD][READ][COMPANY] apply:assign_fail", { marker }, assignErr);
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
        console.warn("[CLOUD][READ][COMPANY] post:ensureHeaders_fail", { marker }, e);
      }

      try {
        const fpBeforeRender = fpCompany();
        console.log("[DIAG][CLOUD][READ][COMPANY] BEFORE render", { marker, fpBeforeRender });
        window.render?.();
        const fpAfterRender = fpCompany();
        console.log("[DIAG][CLOUD][READ][COMPANY] AFTER render", { marker, fpBeforeRender, fpAfterRender });
      } catch (e) {
        console.warn("[CLOUD][READ][COMPANY] post:render_fail", { marker }, e);
      }

      // Log success
      console.log("[CLOUD][READ][COMPANY] applied cloud data", { 
        marker, 
        companyId: companyIdStr, 
        id: cloudId, 
        bytes: payloadStr.length 
      });

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
      const cloudId = `model_company__${companyIdStr}`;
      console.warn("[CLOUD][READ][COMPANY] error, fallback local", { companyId: companyIdStr, id: cloudId }, err);
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
      console.log("[CLOUD][READ][COMPANY] done", ret);
      return ret;
    }
    const companyIdStr = window.documentMeta?.companyId || 
                         (typeof window.companyScopeKey === "function" ? window.companyScopeKey() : null) ||
                         sessionStorage.getItem("companyId") ||
                         "unknown";
    const cloudId = companyIdStr !== "unknown" ? `model_company__${companyIdStr}` : "unknown";
    console.warn("[CLOUD][READ][COMPANY] unexpected error (fallback local)", { companyId: companyIdStr, id: cloudId }, err);
    return done({ 
      ok: false, 
      step: "unexpected_error", 
      companyId: companyIdStr, 
      id: cloudId 
    });
  }
};
