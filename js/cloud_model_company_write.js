// === cloud_model_company_write.js - WRITE ONLY helper for Model company sheet ===
// WRITE ONLY helper - triggered manually from console for now
console.log("✅ [cloud_model_company_write] loaded");

// Expose global function for writing company sheet to cloud
window.cloudModelCompanyWriteOnce = async function cloudModelCompanyWriteOnce(opts) {
  try {
    // Preconditions
    if (!window.SB) {
      console.warn("[CLOUD][WRITE][COMPANY] window.SB not available");
      return { ok: false, reason: "SB_not_available" };
    }

    // Get companyId
    const companyId = window.documentMeta?.companyId || 
                      (typeof window.companyScopeKey === "function" ? window.companyScopeKey() : null) ||
                      sessionStorage.getItem("companyId") ||
                      null;

    if (!companyId || String(companyId).trim() === "") {
      console.warn("[CLOUD][WRITE][COMPANY] companyId not found");
      return { ok: false, reason: "companyId_not_found" };
    }

    // Check if sheets and company sheet exist
    if (!window.sheets) {
      console.warn("[CLOUD][WRITE][COMPANY] window.sheets not found");
      return { ok: false, reason: "sheets_not_found" };
    }

    if (!window.sheets.company) {
      console.warn("[CLOUD][WRITE][COMPANY] window.sheets.company not found");
      return { ok: false, reason: "company_sheet_not_found" };
    }

    const companyIdStr = String(companyId).trim();
    const cloudId = `model_company__${companyIdStr}`;

    // Build payload
    const sheet = window.sheets.company;
    const payloadObj = sheet; // Only the company sheet, not all sheets
    let payloadText;
    
    try {
      payloadText = JSON.stringify(payloadObj || {});
    } catch (stringifyErr) {
      console.warn("[CLOUD][WRITE][COMPANY] failed to stringify sheet", stringifyErr.message);
      return { ok: false, reason: "stringify_failed", error: stringifyErr.message };
    }

    console.log("[CLOUD][WRITE][COMPANY] start", { 
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

        console.warn("[CLOUD][WRITE][COMPANY] error", { 
          companyId: companyIdStr, 
          id: cloudId, 
          msg: writeError.message, 
          code: writeError.code, 
          status: writeError.status 
        });

        return { ok: false, error: writeError.message, code: writeError.code, status: writeError.status };
      }

      // Success
      console.log("[CLOUD][WRITE][COMPANY] ok", { 
        companyId: companyIdStr, 
        id: cloudId 
      });

      return { ok: true };

    } catch (err) {
      // Catch any unexpected errors
      if (err.message && err.message.includes("Could not find the table")) {
        console.error("[CLOUD][HINT] Create table cloud_status (id text PK, payload text, updated_at timestamptz default now())");
      }

      console.warn("[CLOUD][WRITE][COMPANY] error", { 
        companyId: companyIdStr, 
        id: cloudId, 
        msg: err.message 
      });

      return { ok: false, error: err.message };
    }

  } catch (err) {
    // Outer catch for any errors in the function
    console.warn("[CLOUD][WRITE][COMPANY] unexpected error", err.message);
    return { ok: false, error: err.message };
  }
};
