// === sync_entrypoint.js - Single sync entry point (LOG ONLY) ===
console.log("✅ [sync_entrypoint] loaded");

// Debounce guard for cloud write (Company only)
let __lastCompanyCloudWrite__ = 0;
const COMPANY_CLOUD_WRITE_DEBOUNCE_MS = 1500;

// Debounce guard for cloud write (Period/exchange_rate only)
let __lastPeriodExchangeRateCloudWrite__ = 0;
const PERIOD_EXCHANGE_RATE_CLOUD_WRITE_DEBOUNCE_MS = 1500;

// Define single sync entry function
window.syncCellChange = function syncCellChange(payload) {
  try {
    // Build safe object from payload
    const info = (payload && typeof payload === "object") ? payload : { value: payload };
    
    // Add timestamp field (safe, won't throw)
    info.ts = new Date().toISOString();
    
    // Log with exact prefix
    console.log("[SYNC][ENTRY]", info);
    
    // PART A: Wire cloud write for Model / Company
    try {
      const mode = String(info.mode || window.activeMode || "").trim();
      const key = String(info.key || window.activeKey || "").trim();
      
      if (mode === "model" && key === "company") {
        const now = Date.now();
        const timeSinceLastWrite = now - __lastCompanyCloudWrite__;
        
        if (timeSinceLastWrite >= COMPANY_CLOUD_WRITE_DEBOUNCE_MS) {
          __lastCompanyCloudWrite__ = now;
          console.log("[SYNC][COMPANY][CLOUD_WRITE] trigger");
          
          // Trigger cloud write asynchronously (non-blocking)
          if (typeof window.cloudModelCompanyWriteOnce === "function") {
            window.cloudModelCompanyWriteOnce().catch(err => {
              // Non-fatal: log only, don't throw
              console.warn("[SYNC][COMPANY][CLOUD_WRITE] error (non-fatal):", err.message || err);
            });
          } else {
            console.warn("[SYNC][COMPANY][CLOUD_WRITE] cloudModelCompanyWriteOnce not available");
          }
        } else {
          console.log("[SYNC][COMPANY][CLOUD_WRITE] skip (debounce)", { 
            timeSinceLastWrite, 
            remaining: COMPANY_CLOUD_WRITE_DEBOUNCE_MS - timeSinceLastWrite 
          });
        }
      }
    } catch (cloudWriteErr) {
      // Non-fatal: log only, don't block sync entry
      console.warn("[SYNC][COMPANY][CLOUD_WRITE] trigger error (non-fatal):", cloudWriteErr.message || cloudWriteErr);
    }

    // PART B: Wire cloud write for Period / exchange_rate
    try {
      const mode = String(info.mode || window.activeMode || "").trim();
      const key = String(info.key || window.activeKey || "").trim();
      
      if (mode === "period" && key === "exchange_rate") {
        const now = Date.now();
        const timeSinceLastWrite = now - __lastPeriodExchangeRateCloudWrite__;
        
        if (timeSinceLastWrite >= PERIOD_EXCHANGE_RATE_CLOUD_WRITE_DEBOUNCE_MS) {
          __lastPeriodExchangeRateCloudWrite__ = now;
          console.log("[SYNC][PERIOD][EXCHANGE_RATE][CLOUD_WRITE] trigger");
          
          // Trigger cloud write asynchronously (non-blocking)
          if (typeof window.cloudPeriodExchangeRateWriteOnce === "function") {
            window.cloudPeriodExchangeRateWriteOnce().catch(err => {
              // Non-fatal: log only, don't throw
              console.warn("[SYNC][PERIOD][EXCHANGE_RATE][CLOUD_WRITE] error (non-fatal):", err.message || err);
            });
          } else {
            console.warn("[SYNC][PERIOD][EXCHANGE_RATE][CLOUD_WRITE] cloudPeriodExchangeRateWriteOnce not available");
          }
        } else {
          console.log("[SYNC][PERIOD][EXCHANGE_RATE][CLOUD_WRITE] skip (debounce)", { 
            timeSinceLastWrite, 
            remaining: PERIOD_EXCHANGE_RATE_CLOUD_WRITE_DEBOUNCE_MS - timeSinceLastWrite 
          });
        }
      }
    } catch (cloudWriteErr) {
      // Non-fatal: log only, don't block sync entry
      console.warn("[SYNC][PERIOD][EXCHANGE_RATE][CLOUD_WRITE] trigger error (non-fatal):", cloudWriteErr.message || cloudWriteErr);
    }
    
    return { ok: true, logged: true };
  } catch (err) {
    // Safety: never throw, always return
    console.warn("[SYNC][ENTRY] error (non-fatal)", err);
    return { ok: false, logged: false };
  }
};
