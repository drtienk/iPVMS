console.log("✅ period_store.js loaded");

window.DEFS = window.DEFS || {};
window.DEFS.PERIOD = window.DEFS.PERIOD || {};

(function installPeriodStore(){

  // ---------------------------------------------------------
  // Storage key helpers
  // ---------------------------------------------------------
  function companyScopeKey() {
    try {
      const metaId =
        (window.documentMeta && window.documentMeta.companyId)
          ? window.documentMeta.companyId
          : "default";

      const id =
        (sessionStorage.getItem("companyId") || metaId || "default")
          .trim() || "default";

      return id;
    } catch {
      return "default";
    }
  }

  function periodListStorageKey() {
    return `miniExcel_period_list_v1__${companyScopeKey()}`;
  }

  // ---------------------------------------------------------
  // Normalize
  // ---------------------------------------------------------
  function normalizePeriod(yyyy, mm) {
    const y = String(yyyy || "").trim();
    let m = String(mm || "").trim();

    // allow "2023-01" / "2023/01" / "202301"
    if (!y && m) {
      const s = m.replace(/\s+/g, "");
      const m1 = s.match(/^(\d{4})[-/](\d{1,2})$/);
      const m2 = s.match(/^(\d{4})(\d{2})$/);
      if (m1) return `${m1[1]}-${String(m1[2]).padStart(2, "0")}`;
      if (m2) return `${m2[1]}-${m2[2]}`;
    }

    if (!y) return "";
    if (!m) return "";

    // strip non-digits
    m = m.replace(/[^\d]/g, "");
    if (!m) return "";

    const mm2 = String(Number(m)).padStart(2, "0");
    return `${y}-${mm2}`;
  }

  // ---------------------------------------------------------
  // Load / Save list
  // ---------------------------------------------------------
  function loadPeriodList() {
    try {
      const raw = localStorage.getItem(periodListStorageKey());
      const arr = raw ? JSON.parse(raw) : null;
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function savePeriodList(list) {
    try {
      const arr = Array.isArray(list) ? list : [];
      localStorage.setItem(periodListStorageKey(), JSON.stringify(arr));
    } catch {}
  }

  // ---------------------------------------------------------
  // Active period
  // ---------------------------------------------------------
  function setActivePeriod(p) {
    const v = String(p || "").trim();
    if (v) sessionStorage.setItem("activePeriod", v);
    else sessionStorage.removeItem("activePeriod");

    // keep also on window for convenience (app.js already has activePeriod var)
    try { window.activePeriod = v; } catch {}
    return v;
  }

  // ---------------------------------------------------------
  // Exports
  // ---------------------------------------------------------
  window.DEFS.PERIOD.companyScopeKey = companyScopeKey;
  window.DEFS.PERIOD.periodListStorageKey = periodListStorageKey;
  window.DEFS.PERIOD.normalizePeriod = normalizePeriod;
  window.DEFS.PERIOD.loadPeriodList = loadPeriodList;
  window.DEFS.PERIOD.savePeriodList = savePeriodList;
  window.DEFS.PERIOD.setActivePeriod = setActivePeriod;

  // ---------------------------------------------------------
  // Backward-compatible global aliases (only set if missing)
  // ---------------------------------------------------------
  if (!window.periodListStorageKey) window.periodListStorageKey = periodListStorageKey;
  if (!window.normalizePeriod) window.normalizePeriod = normalizePeriod;
  if (!window.loadPeriodList) window.loadPeriodList = loadPeriodList;
  if (!window.savePeriodList) window.savePeriodList = savePeriodList;
  if (!window.setActivePeriod) window.setActivePeriod = setActivePeriod;

})();
