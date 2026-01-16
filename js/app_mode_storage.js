console.log("✅ [09] app_mode_storage loaded");

/* =========================================================
  MODULE: 09_MODE_STORAGE
  AREA: mode-based storage + header rules (GLOBAL owner)
  NOTE:
    - Provide BOTH window.xxx and global function names
    - Read window.DEFS.MODE_STORAGE lazily
  SAFE TO REPLACE WHOLE MODULE
========================================================= */

(function installAppModeStorage(){

  function getStore(){
    return window.DEFS?.MODE_STORAGE;
  }

  function storageKeyByMode(mode){
    return getStore()?.storageKeyByMode?.(mode);
  }

  function saveToLocalByMode(mode){
    try {
      getStore()?.saveToLocalByMode?.(mode, window.sheets);
      
      // Trigger sync entrypoint (non-fatal, log only)
      try {
        if (typeof window.syncCellChange === "function") {
          console.log("[SYNC][HOOK] saveToLocalByMode -> syncCellChange", { mode, key: window.activeKey });
          window.syncCellChange({
            reason: "local-autosave",
            mode: mode,
            key: window.activeKey,
            companyId: window.documentMeta?.companyId || window.companyScopeKey?.(),
            ts: new Date().toISOString()
          });
        }
      } catch (syncErr) {
        // Non-fatal: sync failure should not break local save
        console.warn("[SYNC][HOOK] syncCellChange error (non-fatal):", syncErr.message);
      }
    } catch (err) {
      window.showErr?.(err);
    }
  }

  function loadFromLocalByMode(mode){
    try {
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

      // Log BEFORE applying
      const fpBefore = fpCompany();
      const parsed = getStore()?.loadFromLocalByMode?.(mode);
      if (!parsed) {
        console.log("[DIAG][loadFromLocalByMode] no parsed data", { mode, fpBefore });
        return;
      }
      const keysToApply = Object.keys(parsed);
      console.log("[DIAG][loadFromLocalByMode] BEFORE apply", { mode, keysToApply, fpBefore });

      const sheets = window.sheets || {};
      for (const k in parsed) {
        if (sheets[k]) Object.assign(sheets[k], parsed[k]);
      }

      // Log AFTER applying
      const fpAfter = fpCompany();
      console.log("[DIAG][loadFromLocalByMode] AFTER apply", { mode, keysToApply, fpBefore, fpAfter });
    } catch (err) {
      window.showErr?.(err);
    }
  }

  function isMACDriverCol(mode, key, colIndex){
    return getStore()?.isMACDriverCol?.(mode, key, colIndex);
  }

  function isSACSupportCol(mode, key, colIndex){
    return getStore()?.isSACSupportCol?.(mode, key, colIndex);
  }

  function ensureHeadersForActiveSheet(){
    const s = window.activeSheet?.();
    if (!s) return;

    if (!Array.isArray(s.headers)) s.headers = [];
    while (s.headers.length < s.cols) s.headers.push("");

    const activeMode = window.activeMode;
    const activeKey  = window.activeKey;

    // Period > act
    if (activeMode === "period" && activeKey === "act") {
      for (let c = 0; c < s.cols; c++) {
        if (!isMACDriverCol(activeMode, activeKey, c)) continue;
        const cur = String(s.headers[c] ?? "").trim();
        if (cur === "" || /^Col\s+\d+$/i.test(cur)) s.headers[c] = "Fill your Driver Code here";
      }
    }

    // Period > daf
    if (activeMode === "period" && activeKey === "daf") {
      window.ensureDafMeta?.(s);
      while (s.meta.dafDesc.length < s.cols) s.meta.dafDesc.push("");
      while (s.meta.dafEnt.length  < s.cols) s.meta.dafEnt.push("");

      for (let c = 0; c < s.cols; c++) {
        if (!isSACSupportCol(activeMode, activeKey, c)) continue;

        const top = String(s.headers[c] ?? "").trim();
        if (top === "" || /^Col\s+\d+$/i.test(top)) s.headers[c] = "Fill your SAC Code";

        const d = String(s.meta.dafDesc[c] ?? "").trim();
        if (d === "" || /^Col\s+\d+$/i.test(d)) s.meta.dafDesc[c] = "Description of SAC";

        const e = String(s.meta.dafEnt[c] ?? "").trim();
        if (e === "" || /^Col\s+\d+$/i.test(e)) s.meta.dafEnt[c] = "EDU";
      }
    }

    // Model mode: 通用補欄名（新增欄位自動補 Col N）
    if (activeMode === "model") {
      const modelMap = window.MODEL_DEF_MAP || window.DEFS?.MODEL_DEF_MAP || {};
      const def = modelMap[activeKey] || {};
      const defCols = Number(def.cols) || 1;
      const changedCols = [];

      for (let c = defCols; c < s.cols; c++) {
        const cur = String(s.headers[c] ?? "").trim();
        if (cur === "" || /^Col\s+\d+$/i.test(cur)) {
          s.headers[c] = `Col ${c + 1}`;
          changedCols.push(c);
        }
      }

      if (changedCols.length > 0) {
        console.log("✅ [ensureHeadersForActiveSheet]", { activeMode, activeKey, defCols, changedCols });
      }
    }
  }

  // ✅ expose as window.*
  window.storageKeyByMode = storageKeyByMode;
  window.saveToLocalByMode = saveToLocalByMode;
  window.loadFromLocalByMode = loadFromLocalByMode;
  window.ensureHeadersForActiveSheet = ensureHeadersForActiveSheet;

  // ✅ ALSO expose as "global function names" (backward compatible with init() calling them)
  // (Assign to window already makes them callable globally, but we do explicit aliases to be safe)
  window.storageKeyByMode = window.storageKeyByMode;
  window.saveToLocalByMode = window.saveToLocalByMode;
  window.loadFromLocalByMode = window.loadFromLocalByMode;
  window.ensureHeadersForActiveSheet = window.ensureHeadersForActiveSheet;

})();
