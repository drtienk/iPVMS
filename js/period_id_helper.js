// === period_id_helper.js - Helper to use activePeriod (YYYY-MM) as periodId ===
console.log("✅ [period_id_helper] loaded");

// Helper functions to use activePeriod (YYYY-MM) as periodId
window.getActivePeriodId = function getActivePeriodId() {
  // Return YYYY-MM string from activePeriod
  return sessionStorage.getItem("activePeriod") || 
         document.getElementById("periodSelect")?.value || 
         (window.activePeriod || "").trim() || 
         "";
};

window.setActivePeriodId = function setActivePeriodId(v) {
  // Keep in sync with activePeriod
  const periodStr = String(v || "").trim();
  if (periodStr) {
    sessionStorage.setItem("activePeriod", periodStr);
    try { window.activePeriod = periodStr; } catch {}
    // Also update periodSelect if it exists
    const sel = document.getElementById("periodSelect");
    if (sel) sel.value = periodStr;
  } else {
    sessionStorage.removeItem("activePeriod");
    try { window.activePeriod = ""; } catch {}
  }
  return periodStr;
};
