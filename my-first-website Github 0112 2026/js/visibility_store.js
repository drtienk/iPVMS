console.log("✅ visibility_store.js loaded");

window.DEFS = window.DEFS || {};
window.DEFS.VISIBILITY = window.DEFS.VISIBILITY || {};

(function installVisibilityStore(){

  // =========================================================
  // Company scope
  // =========================================================
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

  function visibilityStorageKey() {
    return `miniExcel_sheet_visibility_v1__${companyScopeKey()}`;
  }

  // =========================================================
  // Default visibility
  // =========================================================
  function defaultVisibility() {
    const TAB_CONFIG =
      window.TAB_CONFIG ||
      window.DEFS?.TABS?.TAB_CONFIG ||
      [];

    const allKeys = new Set((TAB_CONFIG || []).map(t => t.key));

    const model = {};
    const period = {};

    allKeys.forEach(k => {
      model[k] = true;
      period[k] = true;
    });

    return { model, period };
  }

  // =========================================================
  // Load / Save
  // =========================================================
  function loadVisibility() {
    try {
      const raw = localStorage.getItem(visibilityStorageKey());
      const parsed = raw ? JSON.parse(raw) : null;

      const base = defaultVisibility();

      ["model", "period"].forEach(m => {
        const incoming = parsed?.[m] || {};
        Object.keys(base[m]).forEach(k => {
          if (typeof incoming[k] === "boolean") {
            base[m][k] = incoming[k];
          }
        });
      });

      return base;
    } catch {
      return defaultVisibility();
    }
  }

  function saveVisibility(sheetVisibility) {
    try {
      localStorage.setItem(
        visibilityStorageKey(),
        JSON.stringify(sheetVisibility)
      );
    } catch {}
  }

  // =========================================================
  // Query helpers
  // =========================================================
  function isSheetVisible(sheetVisibility, mode, key) {
    const TAB_CONFIG =
      window.TAB_CONFIG ||
      window.DEFS?.TABS?.TAB_CONFIG ||
      [];

    if (!sheetVisibility) return false;

    const tabInfo = (TAB_CONFIG || []).find(t => t.key === key);

    if (mode === "model" && tabInfo?.periodOnly) return false;

    return !!sheetVisibility?.[mode]?.[key];
  }

  function ensureActiveKeyVisible(sheetVisibility, activeMode, activeKey) {
    if (isSheetVisible(sheetVisibility, activeMode, activeKey)) {
      return activeKey;
    }

    const TAB_CONFIG =
      window.TAB_CONFIG ||
      window.DEFS?.TABS?.TAB_CONFIG ||
      [];

    const first = (TAB_CONFIG || [])
      .map(t => t.key)
      .find(k => isSheetVisible(sheetVisibility, activeMode, k));

    return first || "company";
  }

  // =========================================================
  // Exports (store API)
  // =========================================================
  window.DEFS.VISIBILITY.companyScopeKey = companyScopeKey;
  window.DEFS.VISIBILITY.visibilityStorageKey = visibilityStorageKey;
  window.DEFS.VISIBILITY.defaultVisibility = defaultVisibility;
  window.DEFS.VISIBILITY.loadVisibility = loadVisibility;
  window.DEFS.VISIBILITY.saveVisibility = saveVisibility;
  window.DEFS.VISIBILITY.isSheetVisible = isSheetVisible;
  window.DEFS.VISIBILITY.ensureActiveKeyVisible = ensureActiveKeyVisible;

  // =========================================================
  // Backward-compatible global aliases
  // （讓 app.js 舊 MODULE 可以直接 delegate，不會炸）
  // =========================================================
  if (!window.companyScopeKey) {
    window.companyScopeKey = companyScopeKey;
  }

  if (!window.visibilityStorageKey) {
    window.visibilityStorageKey = visibilityStorageKey;
  }

  if (!window.defaultVisibility) {
    window.defaultVisibility = defaultVisibility;
  }

  if (!window.loadVisibility) {
    window.loadVisibility = loadVisibility;
  }

  if (!window.saveVisibility) {
    window.saveVisibility = saveVisibility;
  }

  if (!window.isSheetVisible) {
    window.isSheetVisible = isSheetVisible;
  }

  if (!window.ensureActiveKeyVisible) {
    window.ensureActiveKeyVisible = ensureActiveKeyVisible;
  }

})();
