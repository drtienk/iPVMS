console.log('✅ [08] app_sheets_core loaded');

/* =========================================================
  MODULE: 08_SHEETS_CORE
  AREA: sheets data structure + meta helpers + defs apply (GLOBAL owner)
  NOTE:
    - This file may load BEFORE sheets_core_store.js
    - So we must read window.DEFS?.SHEETS_CORE lazily at call time
  SAFE TO REPLACE WHOLE MODULE
========================================================= */

(function installAppSheetsCore(){

  // ✅ core owner
  var sheets = window.sheets || {};
  window.sheets = sheets;

  function getDefAPI(){
    return window.DEFS?.SHEET_DEF || null;
  }

  // ✅ init default sheets (same behavior as before)
  (function initSheetsDefaults() {
    var DEFAPI = getDefAPI();

    var MODEL_DEF_MAP_LOCAL  = (window.DEFS?.MODEL_DEF_MAP || window.MODEL_DEF_MAP || {});
    var PERIOD_DEF_MAP_LOCAL = (window.DEFS?.PERIOD_DEF_MAP || window.PERIOD_DEF_MAP || {});

    var allKeys = [];
    if (DEFAPI?.listAllKeys) {
      allKeys = DEFAPI.listAllKeys();
    } else {
      var set = new Set([].concat(Object.keys(MODEL_DEF_MAP_LOCAL), Object.keys(PERIOD_DEF_MAP_LOCAL)));
      allKeys = Array.from(set);
    }

    allKeys.forEach(function(k){
      if (!sheets[k]) {
        var colsGuess = 3;

        if (DEFAPI?.getCols) {
          // default to model first, then period, keep same spirit as before
          colsGuess = DEFAPI.getCols("model", k, DEFAPI.getCols("period", k, 3));
        } else {
          colsGuess = (MODEL_DEF_MAP_LOCAL[k]?.cols || PERIOD_DEF_MAP_LOCAL[k]?.cols || 3);
        }

        sheets[k] = {
          title: "",
          headers: [],
          rows: 10,
          cols: colsGuess,
          data: []
        };
      }
    });
  })();

  // ✅ always fetch latest store at call time (avoid load order issue)
  function getCore(){
    return window.DEFS?.SHEETS_CORE;
  }

  // ✅ meta helpers (delegate to store if ready; otherwise ensure minimal structure)
  function ensureDafMeta(s) {
    var CORE = getCore();
    if (CORE?.ensureDafMeta) return CORE.ensureDafMeta(s);

    // fallback: minimal meta to prevent crashes
    s.meta = s.meta || {};
    s.meta.dafDesc = Array.isArray(s.meta.dafDesc) ? s.meta.dafDesc : [];
    s.meta.dafEnt  = Array.isArray(s.meta.dafEnt)  ? s.meta.dafEnt  : [];
    return s;
  }

  function ensureRowExplanations(s) {
    var CORE = getCore();
    if (CORE?.ensureRowExplanations) return CORE.ensureRowExplanations(s);

    // fallback: minimal structure
    s.meta = s.meta || {};
    s.meta.rowExplanations = Array.isArray(s.meta.rowExplanations) ? s.meta.rowExplanations : [];
    return s;
  }

  window.ensureDafMeta = ensureDafMeta;
  window.ensureRowExplanations = ensureRowExplanations;

  // ✅ activeSheet reads window.activeKey
  function activeSheet() {
    console.log("✅ [activeSheet] called, activeKey:", window.activeKey, "sheets keys:", Object.keys(sheets || {}));
    var k = window.activeKey || "company";
    var result = sheets[k];
    console.log("✅ [activeSheet] returning sheet for key:", k, "sheet exists:", !!result);
    return result;
  }
  window.activeSheet = activeSheet;

  function applySheetDefsByModeAndTrim() {
    var CORE = getCore();
    if (!CORE?.applySheetDefsByModeAndTrim) {
      console.warn("⚠️ SHEETS_CORE not ready yet: applySheetDefsByModeAndTrim skipped");
      return;
    }
    return CORE.applySheetDefsByModeAndTrim(sheets, window.activeMode || "model");
  }

  function resetSheetsToBlankForMode(mode) {
    var CORE = getCore();
    if (!CORE?.resetSheetsToBlankForMode) {
      console.warn("⚠️ SHEETS_CORE not ready yet: resetSheetsToBlankForMode skipped");
      return;
    }
    return CORE.resetSheetsToBlankForMode(sheets, mode);
  }

  window.applySheetDefsByModeAndTrim = applySheetDefsByModeAndTrim;
  window.resetSheetsToBlankForMode = resetSheetsToBlankForMode;

})();
 /* ======================= END MODULE: 08_SHEETS_CORE ======================= */
