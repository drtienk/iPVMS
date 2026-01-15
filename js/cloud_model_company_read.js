// === cloud_model_company_read.js - Read-only cloud pull for Model company sheet ===
console.log("✅ [cloud_model_company_read] loaded");

// Expose global function for one-time cloud read
window.cloudModelCompanyTryReadOnce = async function cloudModelCompanyTryReadOnce(opts) {
  try {
    // Preconditions
    if (!window.SB) {
      console.log("[CLOUD][READ][COMPANY] window.SB not available, skip cloud read");
      return;
    }

    if (window.activeMode !== "model") {
      console.log("[CLOUD][READ][COMPANY] activeMode is not 'model', skip cloud read");
      return;
    }

    // Get companyId
    const companyId = window.documentMeta?.companyId || 
                      (typeof window.companyScopeKey === "function" ? window.companyScopeKey() : null) ||
                      sessionStorage.getItem("companyId") ||
                      null;

    if (!companyId || String(companyId).trim() === "") {
      console.log("[CLOUD][READ][COMPANY] companyId not found, skip cloud read");
      return;
    }

    const companyIdStr = String(companyId).trim();
    const cloudId = `model_company__${companyIdStr}`;

    console.log("[CLOUD][READ][COMPANY] query", { companyId: companyIdStr, id: cloudId });

    // Read from Supabase
    try {
      const { data: rowData, error: readError } = await window.SB
        .from("cloud_status")
        .select("payload")
        .eq("id", cloudId)
        .maybeSingle();

      if (readError) {
        // Check if it's a "no rows" error (expected when no cloud data)
        const isNoRowError = 
          readError.code === "PGRST116" ||
          readError.status === 406 ||
          readError.message?.includes("No rows") ||
          readError.message?.includes("Results contain 0 rows") ||
          readError.message?.includes("JSON object requested, multiple (or no) rows returned");

        if (isNoRowError) {
          console.log("[CLOUD][READ][COMPANY] no data in cloud, keep local", { 
            companyId: companyIdStr, 
            id: cloudId, 
            reason: "no_row" 
          });
          return;
        }

        // Check if table is missing
        if (readError.message && readError.message.includes("Could not find the table")) {
          console.error("[CLOUD][HINT] Create table cloud_status (id text PK, payload text, updated_at timestamptz default now())");
          console.warn("[CLOUD][READ][COMPANY] error, fallback local", { 
            companyId: companyIdStr, 
            id: cloudId, 
            msg: readError.message, 
            code: readError.code, 
            status: readError.status 
          });
          return;
        }

        // Other errors
        console.warn("[CLOUD][READ][COMPANY] error, fallback local", { 
          companyId: companyIdStr, 
          id: cloudId, 
          msg: readError.message, 
          code: readError.code, 
          status: readError.status 
        });
        return;
      }

      // Check if row exists and has payload
      if (!rowData || !rowData.payload) {
        console.log("[CLOUD][READ][COMPANY] no data in cloud, keep local", { 
          companyId: companyIdStr, 
          id: cloudId, 
          reason: "empty_payload" 
        });
        return;
      }

      const payloadStr = String(rowData.payload).trim();
      if (payloadStr === "") {
        console.log("[CLOUD][READ][COMPANY] no data in cloud, keep local", { 
          companyId: companyIdStr, 
          id: cloudId, 
          reason: "empty_payload" 
        });
        return;
      }

      // Parse JSON safely
      let parsed;
      try {
        parsed = JSON.parse(payloadStr);
      } catch (parseErr) {
        console.warn("[CLOUD][READ][COMPANY] failed to parse payload JSON, fallback local", parseErr.message);
        return;
      }

      // Extract company sheet data
      // Accept either: { company: {...} } or just {...}
      const companySheetFromCloud = parsed.company ? parsed.company : parsed;

      // Validate it's an object
      if (!companySheetFromCloud || typeof companySheetFromCloud !== "object" || Array.isArray(companySheetFromCloud)) {
        console.warn("[CLOUD][READ][COMPANY] payload is not a valid sheet object, fallback local");
        return;
      }

      // Ensure window.sheets and window.sheets.company exist
      if (!window.sheets) {
        window.sheets = {};
      }
      if (!window.sheets.company) {
        window.sheets.company = {};
      }

      // Apply cloud data to in-memory sheets
      Object.assign(window.sheets.company, companySheetFromCloud);

      // Call helper functions if available
      if (typeof window.ensureHeadersForActiveSheet === "function") {
        try {
          window.ensureHeadersForActiveSheet();
        } catch (err) {
          console.warn("[CLOUD][READ][COMPANY] ensureHeadersForActiveSheet error", err.message);
        }
      }

      if (typeof window.render === "function") {
        try {
          window.render();
        } catch (err) {
          console.warn("[CLOUD][READ][COMPANY] render error", err.message);
        }
      }

      // Log success
      console.log("[CLOUD][READ][COMPANY] applied cloud data", { 
        companyId: companyIdStr, 
        bytes: payloadStr.length 
      });

    } catch (err) {
      // Catch any unexpected errors
      if (err.message && err.message.includes("Could not find the table")) {
        console.error("[CLOUD][HINT] Create table cloud_status (id text PK, payload text, updated_at timestamptz default now())");
      }
      console.warn("[CLOUD][READ][COMPANY] error, fallback local", err.message);
    }

  } catch (err) {
    // Outer catch for any errors in the function
    console.warn("[CLOUD][READ][COMPANY] unexpected error, fallback local", err.message);
  }
};
