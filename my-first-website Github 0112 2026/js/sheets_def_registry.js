console.log("✅ [sheets_def_registry.js] loaded");

/* =========================================================
  MODULE: 07A_SHEET_DEF_REGISTRY
  AREA: Single entry to read sheet defs (NO behavior change)
  GOAL:
    - Provide one official way to read MODEL/PERIOD sheet defs
    - Avoid scattered fallbacks (window.MODEL_DEF_MAP, etc.)
  NOTE:
    - This file MUST load AFTER defs.js
  SAFE TO REPLACE WHOLE FILE
========================================================= */

window.DEFS = window.DEFS || {};
window.DEFS.SHEET_DEF = window.DEFS.SHEET_DEF || {};

(function installSheetDefRegistry(){

  function getModelMap(){
    return window.DEFS?.MODEL_DEF_MAP || window.MODEL_DEF_MAP || {};
  }

  function getPeriodMap(){
    return window.DEFS?.PERIOD_DEF_MAP || window.PERIOD_DEF_MAP || {};
  }

  // ✅ official: get def by mode + key
  function getDef(mode, key){
    var m = (mode === "period") ? getPeriodMap() : getModelMap();
    return m[key] || null;
  }

  // ✅ official: list all known keys from both maps
  function listAllKeys(){
    var mk = Object.keys(getModelMap());
    var pk = Object.keys(getPeriodMap());
    var set = {};
    mk.forEach(function(k){ set[k] = true; });
    pk.forEach(function(k){ set[k] = true; });
    return Object.keys(set);
  }

  // ✅ official: get column count safely
  function getCols(mode, key, fallbackCols){
    var d = getDef(mode, key);
    return (d && d.cols) ? d.cols : (fallbackCols || 3);
  }

  // ✅ official: get headers safely
  function getHeaders(mode, key){
    var d = getDef(mode, key);
    return (d && Array.isArray(d.headers)) ? d.headers : [];
  }

  window.DEFS.SHEET_DEF.getDef = getDef;
  window.DEFS.SHEET_DEF.listAllKeys = listAllKeys;
  window.DEFS.SHEET_DEF.getCols = getCols;
  window.DEFS.SHEET_DEF.getHeaders = getHeaders;

})();
