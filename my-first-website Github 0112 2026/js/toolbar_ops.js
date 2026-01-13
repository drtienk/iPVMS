// js/toolbar_ops.js
// ======================= BLOCK: 00_FILE_HEADER START =======================
console.log("✅ [toolbar_ops.js] loaded");

window.DEFS = window.DEFS || {};
window.DEFS.TOOLBAR_OPS = window.DEFS.TOOLBAR_OPS || {};

// ✅ GLOBAL: 讓任何檔案/任何位置呼叫都不會 ReferenceError
function _syncDelColBtnVisibility(){
  try{
    const btn = document.getElementById("delColBtn");
    if (btn) btn.style.display = "";
  } catch(_e){}
}
// 也掛到 window（保險）
window._syncDelColBtnVisibility = _syncDelColBtnVisibility;
// ======================= BLOCK: 00_FILE_HEADER END =======================


(function installToolbarOps(){
  // ======================= BLOCK: 01_INSTALL_GUARD_START =======================
  if (window.__TOOLBAR_OPS_INSTALLED__) return;
  window.__TOOLBAR_OPS_INSTALLED__ = true;

  let CTX = null;

  function bind(ctx){
    CTX = ctx || {};
  }
  // ======================= BLOCK: 01_INSTALL_GUARD_END =======================

// ======================= BLOCK: 02A_SYNC_DEL_COL_VISIBILITY_START =======================
function _syncDelColBtnVisibility(){
  try{
    // 你現在的策略：Delete Column 永遠顯示
    _forceShowDelColBtn();

    // 同步浮動 -Col UI（如果有裝）
    try{ _syncFloatingUI(); } catch(_e){}
  } catch(_e){}
}
// ======================= BLOCK: 02A_SYNC_DEL_COL_VISIBILITY_END =======================


  
     // ======================= BLOCK: 02_HELPERS_START =======================
  function _roleIsAdminFallback(){
    const role = String(sessionStorage.getItem("role") || "user").toLowerCase();
    return role === "admin";
  }

  function _getActiveMode(){
    return (CTX && CTX.activeMode) ? CTX.activeMode : (window.activeMode || "model");
  }
  function _getActiveKey(){
    return (CTX && CTX.activeKey) ? CTX.activeKey : (window.activeKey || "company");
  }
  function _getDefMapByMode(mode){
    if (mode === "period") {
      return (
        (CTX && CTX.PERIOD_DEF_MAP) ||
        window.PERIOD_DEF_MAP ||
        window.DEFS?.PERIOD_DEF_MAP ||
        {}
      );
    }
    return (
      (CTX && CTX.MODEL_DEF_MAP) ||
      window.MODEL_DEF_MAP ||
      window.DEFS?.MODEL_DEF_MAP ||
      {}
    );
  }

  function _minColsForActiveSheet(){
    const mode = _getActiveMode();
    const key  = _getActiveKey();
    const map  = _getDefMapByMode(mode);
    const def  = map?.[key];
    const v = Number(def?.cols);
    return Number.isFinite(v) && v > 0 ? v : 1;
  }

  // ✅ 永遠顯示 Delete Column button
  function _forceShowDelColBtn(){
    const $ = (CTX && CTX.$) ? CTX.$ : ((id)=>document.getElementById(id));
    const btn = $("delColBtn");
    if (!btn) return;
    btn.style.display = ""; // 強制顯示
  }

  // ✅ 硬保護：有人把它藏起來，就立刻顯示回來
  function _installDelColBtnKeeper(){
    if (window.__DEL_COL_BTN_KEEPER_INSTALLED__) return;
    window.__DEL_COL_BTN_KEEPER_INSTALLED__ = true;

    function tick(){
      try{ _forceShowDelColBtn(); } catch(_e){}
    }

    // 1) 立即做一次
    tick();

    // 2) 短時間多次補強（避免 init 後又被別人藏）
    let n = 0;
    const timer = setInterval(() => {
      n++;
      tick();
      if (n >= 50) clearInterval(timer); // 約 5 秒
    }, 100);

    // 3) 監聽 DOM 變動（有人改 style/class 時）
    try{
      const obs = new MutationObserver(() => tick());
      obs.observe(document.documentElement, { attributes:true, subtree:true, childList:true });
    } catch(_e){}
  }

  function _makeSafeSheetName(name, used) {
    let base = String(name ?? "").trim() || "Sheet";
    base = base.replace(/[\[\]\:\*\?\/\\]/g, " ").slice(0, 31);

    let finalName = base, i = 2;
    while (used.has(finalName)) {
      const suffix = ` ${i}`;
      finalName = base.slice(0, 31 - suffix.length) + suffix;
      i++;
    }
    used.add(finalName);
    return finalName;
  }

  function _sheetToAOA_NoRowNumber(s, sheetKey){
    const { ensureSize, activeMode, ensureDafMeta } = CTX;
    ensureSize(s);

    if (activeMode === "period" && sheetKey === "daf") {
      ensureDafMeta(s);

      const row1 = Array.from({ length: s.cols }, (_, c) => String(s.headers[c] ?? ""));
      const row2 = Array.from({ length: s.cols }, (_, c) => (c < 3 ? "" : String(s.meta.dafDesc[c] ?? "")));
      const row3 = Array.from({ length: s.cols }, (_, c) => (c < 3 ? "" : String(s.meta.dafEnt[c] ?? "")));

      const aoa = [row1, row2, row3];
      for (let r = 0; r < s.rows; r++) {
        aoa.push(Array.from({ length: s.cols }, (_, c) => (s.data[r][c] ?? "")));
      }
      return aoa;
    }

    const aoa = [];
    aoa.push(Array.from({ length: s.cols }, (_, c) => (s.headers[c] ?? "")));
    for (let r = 0; r < s.rows; r++) {
      aoa.push(Array.from({ length: s.cols }, (_, c) => (s.data[r][c] ?? "")));
    }
    return aoa;
  }
  // ======================= BLOCK: 02_HELPERS_END =======================



  // ======================= BLOCK: 02B_FLOATING_COL_UI_START =======================
  function _getSheet(){
    return (CTX && typeof CTX.activeSheet === "function")
      ? CTX.activeSheet()
      : (typeof window.activeSheet === "function" ? window.activeSheet() : null);
  }

  function _getRender(){
    return (CTX && typeof CTX.render === "function")
      ? CTX.render
      : (typeof window.render === "function" ? window.render : null);
  }

  function _save(){
    try{
      if (CTX && typeof CTX.saveToLocalByMode === "function") CTX.saveToLocalByMode(_getActiveMode());
    } catch {}
  }

  function _ensureHeadersLen(s){
    if (!Array.isArray(s.headers)) s.headers = [];
    while (s.headers.length < s.cols) s.headers.push("");
    if (s.headers.length > s.cols) s.headers.length = s.cols;
  }

  function _trimDataToCols(s){
    if (!Array.isArray(s.data)) return;
    for (let r=0; r<s.data.length; r++){
      if (Array.isArray(s.data[r])) s.data[r].length = s.cols;
    }
  }

  function _addCol(){
    const s = _getSheet();
    if (!s) return;

    s.cols = Number(s.cols||0) + 1;
    _ensureHeadersLen(s);

    try{ CTX?.ensureHeadersForActiveSheet?.(); } catch {}
    try{ CTX?.ensureSize?.(s); } catch {}

    const render = _getRender();
    if (render) render();
    _save();
    _syncFloatingUI();
  }

  function _delCol(){
    const s = _getSheet();
    if (!s) return;

    const minCols = _minColsForActiveSheet();
    if (Number(s.cols||0) <= Number(minCols||0)) return;

    s.cols = Number(s.cols||0) - 1;
    _ensureHeadersLen(s);

    // DAF meta trim（period/daf）
    try{
      if (_getActiveMode() === "period" && _getActiveKey() === "daf" && s.meta){
        if (Array.isArray(s.meta.dafDesc)) s.meta.dafDesc.length = s.cols;
        if (Array.isArray(s.meta.dafEnt))  s.meta.dafEnt.length  = s.cols;
      }
    } catch {}

    _trimDataToCols(s);

    const render = _getRender();
    if (render) render();
    _save();
    _syncFloatingUI();
  }

  function _syncFloatingUI(){
    const box = document.getElementById("__FLOAT_COL_BOX__");
    if (!box) return;

    const btnDel = document.getElementById("__FLOAT_COL_DEL__");
    const s = _getSheet();
    if (!btnDel || !s) return;

    const minCols = _minColsForActiveSheet();
    btnDel.style.display = (Number(s.cols||0) > Number(minCols||0)) ? "" : "none";
  }

  function _installFloatingColUI(){
    if (window.__FLOAT_COL_UI_INSTALLED__) return;
    window.__FLOAT_COL_UI_INSTALLED__ = true;

    const mount = () => {
      if (document.getElementById("__FLOAT_COL_BOX__")) { _syncFloatingUI(); return; }

      const box = document.createElement("div");
      box.id = "__FLOAT_COL_BOX__";
      box.style.position = "fixed";
      box.style.right = "14px";
      box.style.bottom = "14px";
      box.style.zIndex = "99999";
      box.style.background = "rgba(255,255,255,0.92)";
      box.style.border = "1px solid #ccc";
      box.style.borderRadius = "10px";
      box.style.padding = "8px";
      box.style.boxShadow = "0 6px 18px rgba(0,0,0,0.15)";
      box.style.fontFamily = "system-ui, -apple-system, Segoe UI, Arial";
      box.style.display = "flex";
      box.style.gap = "8px";
      box.style.alignItems = "center";

      const btnAdd = document.createElement("button");
      btnAdd.id = "__FLOAT_COL_ADD__";
      btnAdd.type = "button";
      btnAdd.textContent = "+ Col";
      btnAdd.style.padding = "6px 10px";
      btnAdd.style.borderRadius = "8px";
      btnAdd.style.border = "1px solid #999";
      btnAdd.style.cursor = "pointer";

      const btnDel = document.createElement("button");
      btnDel.id = "__FLOAT_COL_DEL__";
      btnDel.type = "button";
      btnDel.textContent = "- Col";
      btnDel.style.padding = "6px 10px";
      btnDel.style.borderRadius = "8px";
      btnDel.style.border = "1px solid #999";
      btnDel.style.cursor = "pointer";

      btnAdd.addEventListener("click", _addCol);
      btnDel.addEventListener("click", _delCol);

      box.appendChild(btnAdd);
      box.appendChild(btnDel);
      document.body.appendChild(box);

      _syncFloatingUI();

      // 任何 DOM 大改動後也同步一次（保險）
      try{
        const obs = new MutationObserver(() => _syncFloatingUI());
        obs.observe(document.documentElement, { childList:true, subtree:true });
      } catch {}
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount, { once:true });
    } else {
      mount();
    }
  }
  // ======================= BLOCK: 02B_FLOATING_COL_UI_END =======================



  // ======================= BLOCK: 03_BIND_TOOLBAR_EVENTS_START =======================
function bindToolbarEvents(){
  if (!CTX) return;

  _installFloatingColUI();
  if (bindToolbarEvents.__bound) return;
  bindToolbarEvents.__bound = true;

  const {
    $, on, t, lang, isAdmin,
    sheets, activeSheet,
    ensureHeadersForActiveSheet, ensureSize, ensureDafMeta,
    saveToLocalByMode, loadPeriodList, savePeriodList, setActivePeriod,
    applySheetDefsByModeAndTrim, resetSheetsToBlankForMode,
    isSheetVisible, openPeriodModal,
    storageKeyByMode, documentMeta,
    showErr, downloadTextFile, csvCell,
    render, refreshUI, setActive, ensureActiveKeyVisible
  } = CTX;

  _installDelColBtnKeeper();
  _forceShowDelColBtn();

  // -------------------------
  // Add Row
  // -------------------------
  on("addRowBtn","click", () => {
    const s = activeSheet();
    if (!s) return;

    s.rows += 1;
    render();
    saveToLocalByMode(CTX.activeMode);

    // ✅ 防呆呼叫（不再直接呼叫內部函式）
    window.DEFS?.TOOLBAR_OPS?.syncDelColBtnVisibility?.();
  });

  // -------------------------
  // Add Column
  // -------------------------
  on("addColBtn","click", () => {
    const s = activeSheet();
    if (!s) return;

    s.cols += 1;

    if (!Array.isArray(s.headers)) s.headers = [];
    while (s.headers.length < s.cols) s.headers.push("");

    ensureHeadersForActiveSheet();
    render();
    saveToLocalByMode(CTX.activeMode);

    // ✅ 防呆呼叫
    window.DEFS?.TOOLBAR_OPS?.syncDelColBtnVisibility?.();
  });

  // -------------------------
  // Delete Column (ALWAYS VISIBLE; just block at minCols)
  // -------------------------
  on("delColBtn","click", () => {
    _forceShowDelColBtn();

    const s = activeSheet();
    if (!s) return;

    const minCols = _minColsForActiveSheet();
    if (Number(s.cols || 0) <= Number(minCols || 0)) {
      alert(t("alert_min_cols")(minCols));
      return;
    }

    s.cols -= 1;
    if (Array.isArray(s.headers)) s.headers.length = s.cols;

    if (CTX.activeMode === "period" && CTX.activeKey === "daf" && s.meta) {
      if (Array.isArray(s.meta.dafDesc)) s.meta.dafDesc.length = s.cols;
      if (Array.isArray(s.meta.dafEnt))  s.meta.dafEnt.length  = s.cols;
    }

    if (Array.isArray(s.data)) {
      for (let r=0; r<s.data.length; r++){
        if (Array.isArray(s.data[r])) s.data[r].length = s.cols;
      }
    }

    render();
    saveToLocalByMode(CTX.activeMode);

    _forceShowDelColBtn();
  });

  // -------------------------
  // Clear Local
  // -------------------------
  on("clearLocalBtn","click", () => {
    try {
      if (CTX.activeMode === "period") {
        if (!CTX.activePeriod) {
          alert(lang==="en" ? "No Period selected, cannot clear." : "目前沒有選 Period，無法清除。");
          return;
        }
        localStorage.removeItem(storageKeyByMode("period"));
        resetSheetsToBlankForMode("period");
        saveToLocalByMode("period");
      } else {
        localStorage.removeItem(storageKeyByMode("model"));
        resetSheetsToBlankForMode("model");
        saveToLocalByMode("model");
      }

      applySheetDefsByModeAndTrim();
      ensureActiveKeyVisible();
      refreshUI();
      setActive(CTX.activeKey);

      // ✅ 防呆呼叫
      window.DEFS?.TOOLBAR_OPS?.syncDelColBtnVisibility?.();
    } catch (err) {
      showErr(err);
    }
  });
}
// ======================= BLOCK: 03_BIND_TOOLBAR_EVENTS_END =======================

// ======================= BLOCK: 04_EXPORTS_START =======================
window.DEFS.TOOLBAR_OPS.bind = bind;
window.DEFS.TOOLBAR_OPS.bindToolbarEvents = bindToolbarEvents;

// ✅ 防呆：就算你忘了放 _syncDelColBtnVisibility，也不會在載入時 ReferenceError
var _syncDelColBtnVisibility = function(){
  try{ _forceShowDelColBtn(); } catch(_e){}
  try{ _syncFloatingUI(); } catch(_e){}
};

window.DEFS.TOOLBAR_OPS.syncDelColBtnVisibility = _syncDelColBtnVisibility;
// ======================= BLOCK: 04_EXPORTS_END =======================


})();










