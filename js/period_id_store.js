// === period_id_store.js - Period ID (P1/P2/P3) management ===
console.log("✅ period_id_store.js loaded");

window.DEFS = window.DEFS || {};
window.DEFS.PERIOD_ID = window.DEFS.PERIOD_ID || {};

(function installPeriodIdStore(){

  const PERIOD_IDS = ["P1", "P2", "P3"];
  const STORAGE_KEY = "periodId";

  function getActivePeriodId() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) || "";
    } catch {
      return "";
    }
  }

  function setActivePeriodId(id) {
    const validId = PERIOD_IDS.includes(String(id).trim().toUpperCase()) 
      ? String(id).trim().toUpperCase() 
      : "";
    
    try {
      if (validId) {
        sessionStorage.setItem(STORAGE_KEY, validId);
        window.periodId = validId;
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
        window.periodId = "";
      }
      return validId;
    } catch {
      return "";
    }
  }

  function getAvailablePeriodIds() {
    return PERIOD_IDS.slice();
  }

  // Exports
  window.DEFS.PERIOD_ID.getActivePeriodId = getActivePeriodId;
  window.DEFS.PERIOD_ID.setActivePeriodId = setActivePeriodId;
  window.DEFS.PERIOD_ID.getAvailablePeriodIds = getAvailablePeriodIds;

  // Global helpers
  window.getActivePeriodId = getActivePeriodId;
  window.setActivePeriodId = setActivePeriodId;

})();
