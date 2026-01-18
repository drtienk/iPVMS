console.log("✅ mode_storage_store.js loaded");

window.DEFS = window.DEFS || {};
window.DEFS.MODE_STORAGE = window.DEFS.MODE_STORAGE || {};

(function installModeStorageStore(){

  // ctx injected later (optional)
  let ctx = {
    get companyScopeKey(){ return window.companyScopeKey?.() || "default"; },
    get activePeriod(){ return (window.activePeriod || sessionStorage.getItem("activePeriod") || "").trim(); },
    get periodId(){ return (window.getActivePeriodId?.() || "").trim(); },
  };

  function init(nextCtx){
    if (nextCtx && typeof nextCtx === "object") ctx = Object.assign(ctx, nextCtx);
  }

  function storageKeyByMode(mode) {
    const scope = ctx.companyScopeKey;

    if (mode === "model") {
      return `miniExcel_autosave_model_v4__${scope}`;
    }

    // Use periodId (YYYY-MM format from activePeriod) for period mode
    const periodId = ctx.periodId || ctx.activePeriod;
    const safe = periodId ? String(periodId).trim() : "__NO_PERIOD__";
    return `miniExcel_autosave_period_v1__${scope}__${safe}`;
  }

  function saveToLocalByMode(mode, sheetsObj) {
    try {
      if (mode === "period") {
        const activePeriod = ctx.activePeriod;
        if (!activePeriod) return;
      }
      localStorage.setItem(storageKeyByMode(mode), JSON.stringify(sheetsObj || {}));
    } catch (err) {
      // let caller handle showErr if needed
      console.error(err);
    }
  }

  function loadFromLocalByMode(mode) {
    try {
      if (mode === "period") {
        const activePeriod = ctx.activePeriod;
        if (!activePeriod) return null;
      }
      const raw = localStorage.getItem(storageKeyByMode(mode));
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  function isMACDriverCol(mode, key, colIndex) {
    return mode === "period" && key === "act" && colIndex >= 3;
  }

  function isSACSupportCol(mode, key, colIndex) {
    return mode === "period" && key === "daf" && colIndex >= 3;
  }

  // exports
  window.DEFS.MODE_STORAGE.init = init;
  window.DEFS.MODE_STORAGE.storageKeyByMode = storageKeyByMode;
  window.DEFS.MODE_STORAGE.saveToLocalByMode = saveToLocalByMode;
  window.DEFS.MODE_STORAGE.loadFromLocalByMode = loadFromLocalByMode;
  window.DEFS.MODE_STORAGE.isMACDriverCol = isMACDriverCol;
  window.DEFS.MODE_STORAGE.isSACSupportCol = isSACSupportCol;

})();
