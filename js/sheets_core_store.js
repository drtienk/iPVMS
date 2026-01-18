console.log("✅ sheets_core_store.js loaded");

window.DEFS = window.DEFS || {};
window.DEFS.SHEETS_CORE = window.DEFS.SHEETS_CORE || {};

(function installSheetsCoreStore(){

  // ctx will be injected later in Step 2 (so loading this file is safe)
  let ctx = {
    get activeMode(){ return window.activeMode || "model"; },
    get activeKey(){ return window.activeKey || "company"; },
    get MODEL_DEF_MAP(){ return window.MODEL_DEF_MAP || window.DEFS?.MODEL_DEF_MAP || {}; },
    get PERIOD_DEF_MAP(){ return window.PERIOD_DEF_MAP || window.DEFS?.PERIOD_DEF_MAP || {}; },
  };

  function init(nextCtx){
    if (nextCtx && typeof nextCtx === "object") ctx = Object.assign(ctx, nextCtx);
  }

  function ensureDafMeta(s) {
    if (!s.meta || typeof s.meta !== "object") s.meta = {};
    if (!Array.isArray(s.meta.dafDesc)) s.meta.dafDesc = [];
    if (!Array.isArray(s.meta.dafEnt))  s.meta.dafEnt  = [];
  }

  function ensureRowExplanations(s) {
    if (!Array.isArray(s.rowExplanations)) s.rowExplanations = [];
    while (s.rowExplanations.length < Math.min(20, s.rows)) s.rowExplanations.push("");
  }

  // ✅ Enforce single-row constraint for Period/exchange_rate
  function applySheetRowLimit(sheetKey, mode, gridData) {
    const m = (mode === "period") ? "period" : "model";
    const map = (m === "period") ? ctx.PERIOD_DEF_MAP : ctx.MODEL_DEF_MAP;
    const def = map?.[sheetKey];
    
    if (!def || !def.maxDataRows || !def.lockExtraRows) return;
    if (m !== "period" || sheetKey !== "company") return; // Only for Period/exchange_rate
    
    const s = gridData?.[sheetKey];
    if (!s) return;
    
    // Enforce maxDataRows: 1 (keep only row 0)
    if (s.rows > 1) {
      s.rows = 1;
    }
    
    // Truncate data array to 1 row (row index 0)
    if (Array.isArray(s.data)) {
      if (s.data.length > 1) {
        s.data = [s.data[0] || []];
      }
      // Ensure row 0 exists and has correct length
      if (!Array.isArray(s.data[0])) {
        s.data[0] = [];
      }
      while (s.data[0].length < s.cols) {
        s.data[0].push("");
      }
      if (s.data[0].length > s.cols) {
        s.data[0].length = s.cols;
      }
    } else {
      s.data = [Array(s.cols).fill("")];
    }
    
    // Ensure size helper if available
    if (typeof window.ensureSize === "function") {
      window.ensureSize(s);
    }
  }

  function _normHeader(v){
    return String(v || "").replace(/\s+/g, " ").trim();
  }

  // ✅ Model > Activity Center：補回第一欄 Business Unit（並右移資料）
  function migrateModelActivityCenterAddBU(s, def){
    try{
      if (!s || !def) return;
    } catch { return; }

    const want = _normHeader(def.headers?.[0]);
    if (want !== "Business Unit") return;

    const h0 = _normHeader(s.headers?.[0]);
    const hasBU = (Array.isArray(s.headers) && s.headers.some(h => _normHeader(h) === "Business Unit"));
    if (h0 === "Business Unit" || hasBU) return;

    const looksOld =
      (h0 === "Activity Center Code 1") ||
      (Array.isArray(s.headers) && s.headers.some(h => _normHeader(h) === "Activity Center Code 1"));

    if (!looksOld) return;

    if (!Array.isArray(s.headers)) s.headers = [];
    s.headers.splice(0, 0, "Business Unit");

    if (!Array.isArray(s.data)) s.data = [];
    for (let r=0; r<s.data.length; r++){
      if (!Array.isArray(s.data[r])) s.data[r] = [];
      s.data[r].splice(0, 0, "");
    }

    s.cols = Math.max(Number(s.cols||0), Number(def.cols||0));
    if (s.headers.length > s.cols) s.headers.length = s.cols;

    for (let r=0; r<s.data.length; r++){
      if (Array.isArray(s.data[r]) && s.data[r].length > s.cols) s.data[r].length = s.cols;
    }
  }

  // ✅ apply defs by current mode + trim
  function applySheetDefsByModeAndTrim(sheets, activeMode){
    const mode = (activeMode === "period") ? "period" : "model";
    const map = (mode === "period") ? ctx.PERIOD_DEF_MAP : ctx.MODEL_DEF_MAP;

    for (const k in sheets) {
      const def = map[k];
      if (!def) continue;

      const s = sheets[k];
      s.title = def.title;

      s.cols = Math.max(Number(s.cols || 0), Number(def.cols || 0));

      if (mode === "model" && k === "ac") {
        migrateModelActivityCenterAddBU(s, def);
        s.cols = Math.max(Number(s.cols || 0), Number(def.cols || 0));
      }

      if (!Array.isArray(s.headers)) s.headers = [];
      for (let c=0; c<def.headers.length; c++) {
        if (s.headers[c] == null || String(s.headers[c]).trim() === "") {
          s.headers[c] = def.headers[c] ?? ("Col " + (c+1));
        }
      }
      while (s.headers.length < s.cols) s.headers.push("");
      if (s.headers.length > s.cols) s.headers.length = s.cols;

      if (Array.isArray(s.data)) {
        for (let r=0; r<s.data.length; r++) {
          if (Array.isArray(s.data[r])) s.data[r].length = s.cols;
        }
      }

      if (mode === "period" && k === "daf") {
        ensureDafMeta(s);
        while (s.meta.dafDesc.length < s.cols) s.meta.dafDesc.push("");
        while (s.meta.dafEnt.length  < s.cols) s.meta.dafEnt  .push("");
        if (s.meta.dafDesc.length > s.cols) s.meta.dafDesc.length = s.cols;
        if (s.meta.dafEnt.length  > s.cols) s.meta.dafEnt.length  = s.cols;
      }
      
      // ✅ Enforce single-row constraint for Period/exchange_rate
      applySheetRowLimit(k, mode, sheets);
    }
  }

  function resetSheetsToBlankForMode(sheets, mode){
    const m = (mode === "period") ? "period" : "model";
    const map = (m === "period") ? ctx.PERIOD_DEF_MAP : ctx.MODEL_DEF_MAP;

    Object.keys(sheets).forEach(k => {
      const def = map[k];
      if (!def) return;

      const s = sheets[k];
      s.title = def.title;
      s.rows = 10;
      s.cols = def.cols;
      s.headers = Array.isArray(def.headers) ? def.headers.slice() : [];
      s.data = [];
      s.rowExplanations = [];

      if (m === "period" && k === "daf") {
        ensureDafMeta(s);
        s.meta.dafDesc = Array.from({length:s.cols}, (_,c)=> (c<3 ? "" : "Description of SAC"));
        s.meta.dafEnt  = Array.from({length:s.cols}, (_,c)=> (c<3 ? "" : "EDU"));
      }

      ensureRowExplanations(s);
    });

    applySheetDefsByModeAndTrim(sheets, m);
  }

  // exports
  window.DEFS.SHEETS_CORE.init = init;
  window.DEFS.SHEETS_CORE.ensureDafMeta = ensureDafMeta;
  window.DEFS.SHEETS_CORE.ensureRowExplanations = ensureRowExplanations;
  window.DEFS.SHEETS_CORE.applySheetDefsByModeAndTrim = applySheetDefsByModeAndTrim;
  window.DEFS.SHEETS_CORE.resetSheetsToBlankForMode = resetSheetsToBlankForMode;
  window.DEFS.SHEETS_CORE.applySheetRowLimit = applySheetRowLimit;
  window.applySheetRowLimit = applySheetRowLimit; // Global export for easy access

})();
