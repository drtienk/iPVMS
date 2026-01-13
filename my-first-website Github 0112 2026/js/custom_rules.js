console.log("🔥🔥🔥 LOADED custom_rules.js VERSION = 2026-01-13 STEP5-NC-DELEGATE");

/* =========================================================
  FILE: custom_rules.js
  檔案：custom_rules.js

  GOAL:
    Put all frequently-changed rules here (NOT core engine)
    將所有「經常需要變動的規則」集中放在此檔案
    （不包含核心引擎邏輯）

  SECTIONS / 區塊說明:
    A) Actions / Toolbar visibility
       A) 動作 / 工具列顯示控制

    B) Activity Center (buttons / required / locks)
       B) Activity Center（按鈕 / 必填欄位 / 鎖定規則）

    C) Checks (validation rules)
       C) 檢查（資料驗證規則）

  NOTE / 注意事項:
    - app.js must be loaded BEFORE this file
      必須先載入 app.js，再載入本檔案

    - Keep modules grouped so you can find them fast
      請依功能將模組分組，方便快速查找與維護

========================================================= */

/* =========================================================
   ✅ DEBUG BADGE (畫面可見驗證)
========================================================= */
(function installDebugBadge(){
  // ✅ 建立固定小方塊在畫面右下角
  const badge = document.createElement("div");
  badge.id = "dbgBadge";
  badge.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #3b82f6;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-family: monospace;
    z-index: 99999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    cursor: pointer;
    user-select: none;
  `;
  
  const timestamp = new Date().toLocaleTimeString("zh-TW", { hour12: false });
  let clickCount = 0;
  
  badge.textContent = `custom_rules loaded ${timestamp} | Clicks: ${clickCount}`;
  
  // ✅ 插入到頁面（如果 body 還沒準備好，延遲插入）
  function insertBadge(){
    if (document.body) {
      document.body.appendChild(badge);
    } else {
      setTimeout(insertBadge, 10);
    }
  }
  insertBadge();
  
  // ✅ 全域 click capture：每次點擊任何地方，數字 +1
  document.addEventListener("click", function(e){
    clickCount++;
    badge.textContent = `custom_rules loaded ${timestamp} | Clicks: ${clickCount}`;
  }, true); // capture=true 捕捉階段
  
  console.log("✅ [custom_rules] Debug badge installed");
})();

console.log("custom_rules.js loaded - v2026-01-10a");

// ✅ HARD-REGISTER: ensure window.CHECKS_BY_SHEET has keys
window.CHECKS_BY_SHEET = window.CHECKS_BY_SHEET || {};
window.CHECKS_BY_SHEET.nc = function checkNormalCapacityDelegate(){
  const fn = window.DEFS?.CHECKS?.normalCapacity;
  if (typeof fn !== "function") {
    return { ok:false, type:"err", msg:(lang==="en"
      ? "Normal Capacity rule not loaded: window.DEFS.CHECKS.normalCapacity"
      : "Normal Capacity 規則尚未載入：window.DEFS.CHECKS.normalCapacity") };
  }
  return fn();
};


/* =========================
   A) Actions dropdown binder
========================= */

/* =========================================================
  MODULE: 15B_ACTION_MENU_BINDER
  AREA: bind Actions dropdown -> trigger existing buttons
  CHANGE:
   - Remove Delete Column from Actions dropdown
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
(function bindActionMenu(){
  // ✅ 使用全域的 $ 函數（從 utils.js 透過 utils_globals.js 暴露）
  const $ = window.DEFS?.UTILS?.$ || window.$ || ((id) => document.getElementById(id));

  function trigger(id){
    const el = $(id);
    if (!el) {
      console.warn("[Actions] button not found:", id);
      return;
    }
    el.click();
  }

  const MAP = {
    export_csv:  "exportCsvBtn",
    export_xlsx: "exportXlsxBtn",
    export_json: "exportJsonBtn",
    import_json: "importJsonBtn",
    clear_local: "clearLocalBtn",
    // ✅ delete_col removed
  };

  function removeDeleteOption(){
    const menu = $("actionMenu");
    if (!menu) return;
    // 移除 value="delete_col"
    menu.querySelectorAll('option[value="delete_col"]').forEach(opt => opt.remove());
  }

  function ensureBound(){
    const menu = $("actionMenu");
    if (!menu) return;

    if (menu.dataset.bound === "1") return;
    menu.dataset.bound = "1";

    // ✅ 先移除 delete_col 選項
    removeDeleteOption();

    menu.addEventListener("change", () => {
      const v = String(menu.value || "").trim();
      menu.value = ""; // reset 回 Actions
      if (!v) return;

      // ✅ 若 value 直接就是按鈕 id（例如 exportCsvBtn）
      if ($(v)) { trigger(v); return; }

      // ✅ 若 value 是我們的 key（export_csv）
      const btnId = MAP[v];
      if (btnId) { trigger(btnId); return; }

      console.warn("[Actions] unknown action value:", v);
    });
  }

  window.addEventListener("DOMContentLoaded", ensureBound);
  setTimeout(ensureBound, 0);
  setTimeout(ensureBound, 200);
})();
 /* ======================= END MODULE: 15B_ACTION_MENU_BINDER ======================= */


 /* =========================================================
  MODULE: 20_PERSIST_ACTIVE_TAB
  AREA: Persist last active sheet (STORE ONLY; no restore on load)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
(function persistActiveTabStoreOnly(){

  const KEY_MODEL  = "lastActiveKey_model";
  const KEY_PERIOD = "lastActiveKey_period";

  function getMode(){ try { return (typeof activeMode !== "undefined") ? activeMode : "model"; } catch { return "model"; } }
  function getKey(){  try { return (typeof activeKey  !== "undefined") ? activeKey  : "company"; } catch { return "company"; } }

  function storeKey(mode, key){
    try{
      const k = String(key || "company");
      if (mode === "period") sessionStorage.setItem(KEY_PERIOD, k);
      else sessionStorage.setItem(KEY_MODEL, k);
    } catch {}
  }

  // ✅ Hook setActive：每次切分頁就記住
  (function hookSetActive(){
    function tryHook(){
      if (typeof window.setActive !== "function") return false;
      if (window.setActive.__persistTabStoreOnlyHooked) return true;

      const _orig = window.setActive;
      window.setActive = function(nextKey){
        const ret = _orig.apply(this, arguments);
        try { storeKey(getMode(), getKey()); } catch {}
        return ret;
      };
      window.setActive.__persistTabStoreOnlyHooked = true;
      return true;
    }
    tryHook(); setTimeout(tryHook,0); setTimeout(tryHook,200); setTimeout(tryHook,800);
  })();

  // ✅ Hook switchMode：切換模式前也記住
  (function hookSwitchMode(){
    function tryHook(){
      if (typeof window.switchMode !== "function") return false;
      if (window.switchMode.__persistTabStoreOnlyHooked) return true;

      const _orig = window.switchMode;
      window.switchMode = function(nextMode){
        try { storeKey(getMode(), getKey()); } catch {}
        return _orig.apply(this, arguments);
      };
      window.switchMode.__persistTabStoreOnlyHooked = true;
      return true;
    }
    tryHook(); setTimeout(tryHook,0); setTimeout(tryHook,200); setTimeout(tryHook,800);
  })();

})();
 /* ======================= END MODULE: 20_PERSIST_ACTIVE_TAB ======================= */



/* =========================
   A) Toolbar visibility rules
========================= */

 /* =========================================================
  MODULE: 15C_TOOLBAR_VISIBILITY (SIMPLE)
  AREA: keep toolbar only 3 buttons; others hidden
        AND: Delete Column ALWAYS visible (never auto-hide)
  RULE:
    - delColBtn 永遠顯示
    - 能不能刪 / 到最小提示 => 交給 toolbar_ops.js 的 click handler 處理
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
// ======================= MODULE 15C_TOOLBAR_VISIBILITY START =======================
(function toolbarVisibilityGuard(){

  const KEEP_VISIBLE = new Set(["addRowBtn","addColBtn","checkBtn","delColBtn"]); // ✅ 把 delColBtn 加進來
  const HIDE_IDS = [
    "exportCsvBtn",
    "exportXlsxBtn",
    "exportJsonBtn",
    "importJsonBtn",
    "clearLocalBtn",
    "importJsonFile"
  ];

  function hideEl(id){
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = "none";
    el.dataset.__forceHidden = "1";
  }

  function showEl(id){
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = "";
  }

  function applyToolbarVisibility(){
    // hide the ones you don't want
    HIDE_IDS.forEach(hideEl);

    // show the ones you keep (including Delete Column)
    KEEP_VISIBLE.forEach(showEl);

    // ✅ 再保險：永遠顯示 delColBtn（不要再被藏）
    const delBtn = document.getElementById("delColBtn");
    if (delBtn) delBtn.style.display = "";
  }

  window.addEventListener("DOMContentLoaded", () => {
    applyToolbarVisibility();
    setTimeout(applyToolbarVisibility, 50);
    setTimeout(applyToolbarVisibility, 300);
  });

  // Hook refreshUI/render: keep it visible even after UI refresh
  const _refreshUI = window.refreshUI;
  if (typeof _refreshUI === "function") {
    window.refreshUI = function(){
      const ret = _refreshUI.apply(this, arguments);
      try { applyToolbarVisibility(); } catch {}
      return ret;
    };
  }

  const _render = window.render;
  if (typeof _render === "function") {
    window.render = function(){
      const ret = _render.apply(this, arguments);
      try { applyToolbarVisibility(); } catch {}
      return ret;
    };
  }

  // ✅ still keep other buttons hidden, but NEVER hide delColBtn
  setInterval(() => {
    for (const id of HIDE_IDS){
      const el = document.getElementById(id);
      if (el && el.style.display !== "none") hideEl(id);
    }
    // ✅ keep Delete Column always visible
    const delBtn = document.getElementById("delColBtn");
    if (delBtn) delBtn.style.display = "";
  }, 800);

})();
// ======================= MODULE 15C_TOOLBAR_VISIBILITY END =======================



  /* =========================================================
  MODULE: 12I_AC_CODE_N_BUTTONS (ALLOCATION-LEFT + EN LABEL)
  AREA: Model > Activity Center (key: ac)
  FEATURE:
    - Add/Remove Activity Center Code n + Description n columns
    - Insert BEFORE "Allocation" column (to the left of Allocation)
    - Code4 is always to the right of Code3 (and still left of Allocation)
    - Buttons injected into toolbar (next to Add Column)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
(function acCodeNButtons_AllocLeft(){

  const TARGET_MODE = "model";
  const TARGET_KEY  = "ac";

  function getMode(){ try { return (typeof activeMode !== "undefined") ? activeMode : ""; } catch { return ""; } }
  function getKey(){  try { return (typeof activeKey  !== "undefined") ? activeKey  : ""; } catch { return ""; } }
  function isTarget(){ return getMode() === TARGET_MODE && getKey() === TARGET_KEY; }

  function norm(s){ return String(s || "").replace(/\s+/g, " ").trim(); }

  function getSheet(){
    try { return (typeof activeSheet === "function") ? activeSheet() : null; } catch { return null; }
  }

  function ensureUI(){
    let wrap = document.getElementById("acCodeNBar");
    if (wrap) return wrap;

    const toolbar = document.querySelector(".toolbar");
    if (!toolbar) return null;

    wrap = document.createElement("span");
    wrap.id = "acCodeNBar";
    wrap.style.gap = "8px";
    wrap.style.alignItems = "center";
    wrap.style.flexWrap = "wrap";
    wrap.style.marginLeft = "8px";
    wrap.style.display = "inline-flex";

    // ✅ English labels
    wrap.innerHTML = `
      <button type="button" id="btnAddAcCodeN" class="btn-ok" style="padding:6px 10px;">Add Activity Center Code n</button>
      <button type="button" id="btnDelAcCodeN" class="btn-danger" style="padding:6px 10px;">Remove Activity Center Code n</button>
    `;

    const addColBtn = document.getElementById("addColBtn");
    if (addColBtn && addColBtn.parentElement === toolbar) {
      addColBtn.insertAdjacentElement("afterend", wrap);
    } else {
      toolbar.appendChild(wrap);
    }

    wrap.querySelector("#btnAddAcCodeN")?.addEventListener("click", addNextPair);
    wrap.querySelector("#btnDelAcCodeN")?.addEventListener("click", removeLastPair);

    return wrap;
  }

  function showHideUI(){
    const wrap = ensureUI();
    if (!wrap) return;
    wrap.style.display = isTarget() ? "inline-flex" : "none";
  }

  function parseCodeNHeader(h){
    const t = norm(h);
    const m = t.match(/^Activity\s*Center\s*Code\s*(\d+)$/i);
    return m ? Number(m[1]) : null;
  }
  function parseDescNHeader(h){
    const t = norm(h);
    const m = t.match(/^Description\s*(\d+)$/i);
    return m ? Number(m[1]) : null;
  }

  function getMaxN(headers){
    let max = 2;
    (headers || []).forEach(h => {
      const n1 = parseCodeNHeader(h);
      const n2 = parseDescNHeader(h);
      if (Number.isFinite(n1)) max = Math.max(max, n1);
      if (Number.isFinite(n2)) max = Math.max(max, n2);
    });
    return max;
  }

  function findAllocationIndex(headers){
    const idx = (headers || []).findIndex(h => norm(h).toLowerCase() === "allocation");
    return (idx >= 0) ? idx : (headers ? headers.length : 0);
  }

  function addNextPair(){
    if (!isTarget()) return;
    const s = getSheet(); if (!s) return;

    if (!Array.isArray(s.headers)) s.headers = [];
    if (!Array.isArray(s.data)) s.data = [];

    const nextN = getMaxN(s.headers) + 1;

    const codeH = `Activity Center Code ${nextN}`;
    const descH = `Description ${nextN}`;

    // ✅ insert BEFORE Allocation
    const insertAt = findAllocationIndex(s.headers);

    // ensure each row has cols length
    for (let r=0; r<s.data.length; r++){
      if (!Array.isArray(s.data[r])) s.data[r] = [];
      while (s.data[r].length < s.cols) s.data[r].push("");
    }

    s.headers.splice(insertAt, 0, codeH, descH);
    for (let r=0; r<s.data.length; r++){
      s.data[r].splice(insertAt, 0, "", "");
    }

    s.cols = Number(s.cols || 0) + 2;

    if (typeof render === "function") render();
    if (typeof saveToLocalByMode === "function") saveToLocalByMode(getMode());
  }

  function removeLastPair(){
    if (!isTarget()) return;
    const s = getSheet(); if (!s) return;
    if (!Array.isArray(s.headers)) return;

    const maxN = getMaxN(s.headers);
    if (maxN < 3) return;

    const codeH = `Activity Center Code ${maxN}`;
    const descH = `Description ${maxN}`;

    const iCode = s.headers.findIndex(h => norm(h).toLowerCase() === norm(codeH).toLowerCase());
    const iDesc = s.headers.findIndex(h => norm(h).toLowerCase() === norm(descH).toLowerCase());
    const idxs = [iCode, iDesc].filter(i => i >= 0).sort((a,b)=>a-b);
    if (idxs.length !== 2) return;

    for (let k=idxs.length-1; k>=0; k--){
      const idx = idxs[k];
      s.headers.splice(idx, 1);
      if (Array.isArray(s.data)){
        for (let r=0; r<s.data.length; r++){
          if (Array.isArray(s.data[r])) s.data[r].splice(idx, 1);
        }
      }
      s.cols = Math.max(1, Number(s.cols || 0) - 1);
    }

    if (typeof render === "function") render();
    if (typeof saveToLocalByMode === "function") saveToLocalByMode(getMode());
  }

  function tryHook(fnName){
    const fn = window[fnName];
    if (typeof fn !== "function" || fn.__acCodeNAllocLeftHooked) return false;

    window[fnName] = function(){
      const ret = fn.apply(this, arguments);
      try { showHideUI(); } catch {}
      return ret;
    };
    window[fnName].__acCodeNAllocLeftHooked = true;
    return true;
  }

  function boot(){
    ensureUI();
    showHideUI();
    ["render","refreshUI","setActive","switchMode","setLang","applyLangUI"].forEach(tryHook);
  }

  window.addEventListener("DOMContentLoaded", boot);
  setTimeout(boot, 0);
  setTimeout(boot, 200);
  setTimeout(boot, 800);
  setTimeout(boot, 1500);

  setInterval(() => {
    try { ensureUI(); showHideUI(); } catch {}
  }, 600);

})();
  /* ======================= END  MODULE: 12I_AC_CODE_N_BUTTONS (ALLOCATION-LEFT + EN LABEL)======================= */


/* =========================
   B) Activity Center rules
========================= */


  /* =========================================================
  MODULE: 12H_AC_REQUIRED_AND_CELL_LOCK  (UPDATED)
  AREA: Model > Activity Center (key: ac)
  CHANGE (this update):
   - Required columns (BU / Code1 / Allocation): apply req-col tint on header + ALL rows
   - Missing red outline (req-missing): ONLY on Row 1 (r===0)
   - Keep Code1/Code2 mutual lock
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
(function acRequiredAndCellLock(){

  const TARGET_MODE = "model";
  const TARGET_KEY  = "ac";

  // required columns (by header name)
  const REQUIRED_HEADERS = new Set([
    "Business Unit",
    "Activity Center Code 1",
    "Allocation"
  ]);

  // tag so we only clear what this module adds
  const TAG_REQ = "ac-req";

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }

  function isTarget(){
    return (typeof activeMode !== "undefined"
      && typeof activeKey !== "undefined"
      && activeMode === TARGET_MODE
      && activeKey === TARGET_KEY);
  }

  function getSheet(){
    try { return (typeof activeSheet === "function") ? activeSheet() : null; }
    catch { return null; }
  }

  function ensureStyleOnce(){
    if (document.getElementById("acLockStyle")) return;
    const st = document.createElement("style");
    st.id = "acLockStyle";
    st.textContent = `
      td.cell-disabled{
        background:#f3f4f6 !important;
        color:#9ca3af !important;
        cursor:not-allowed !important;
      }
    `;
    document.head.appendChild(st);
  }

  function findColIndexByHeader(sheet, headerName){
    const h = norm(headerName);
    const headers = Array.isArray(sheet?.headers) ? sheet.headers : [];
    for (let i=0; i<headers.length; i++){
      if (norm(headers[i]) === h) return i;
    }
    return -1;
  }

  // fallback indices based on your current layout
  function getIndexes(sheet){
    return {
      bu:  Math.max(findColIndexByHeader(sheet,"Business Unit"), 0),
      c1:  Math.max(findColIndexByHeader(sheet,"Activity Center Code 1"), 1),
      c2:  Math.max(findColIndexByHeader(sheet,"Activity Center Code 2"), 3),
      all: Math.max(findColIndexByHeader(sheet,"Allocation"), 5),
    };
  }

  function clearMyReqMarks(){
    const head = document.getElementById("gridHead");
    const body = document.getElementById("gridBody");
    head?.querySelectorAll(`th.${TAG_REQ}`).forEach(el => el.classList.remove("req-col", TAG_REQ));
    body?.querySelectorAll(`td.${TAG_REQ}`).forEach(el => el.classList.remove("req-col", TAG_REQ));
    body?.querySelectorAll(`td.ac-miss`).forEach(td => td.classList.remove("req-missing","ac-miss"));
  }

  /* =========================
     Required column tint:
     - header + ALL rows add req-col
     Missing:
     - ONLY Row 1 (r===0) gets req-missing if blank
  ========================== */
  function applyRequiredMarks(sheet, idx){
    const head = document.getElementById("gridHead");
    const body = document.getElementById("gridBody");
    if (!head || !body) return;

    // clear only mine first (do not remove others)
    head.querySelectorAll(`th.${TAG_REQ}`).forEach(el => el.classList.remove("req-col", TAG_REQ));
    body.querySelectorAll(`td.${TAG_REQ}`).forEach(el => el.classList.remove("req-col", TAG_REQ));
    body.querySelectorAll(`td.ac-miss`).forEach(td => td.classList.remove("req-missing","ac-miss"));

    // header row is default header => first <tr>, and th index offset +1 due to corner
    const tr = head.querySelector("tr");
    if (tr){
      [idx.bu, idx.c1, idx.all].forEach(c => {
        const th = tr.children?.[c + 1];
        if (th){
          th.classList.add("req-col", TAG_REQ);
        }
      });
    }

    // ALL rows: tint required columns
    [idx.bu, idx.c1, idx.all].forEach(c => {
      body.querySelectorAll(`td[data-c="${c}"]`).forEach(td => {
        td.classList.add("req-col", TAG_REQ);
      });
    });

    // ONLY row 1: missing red outline if blank
    const r = 0;
    [idx.bu, idx.c1, idx.all].forEach(c => {
      const td = body.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
      if (!td) return;
      const v = String(td.textContent || "").trim();
      if (v === "") td.classList.add("req-missing","ac-miss");
    });
  }

  /* =========================
     Mutual lock Code1 / Code2
  ========================== */
  function tdAt(r,c){
    const body = document.getElementById("gridBody");
    return body?.querySelector(`td[data-r="${r}"][data-c="${c}"]`) || null;
  }

  function setDisabled(td, disabled){
    if (!td) return;
    if (disabled){
      td.classList.add("cell-disabled");
      td.contentEditable = "false";
    } else {
      td.classList.remove("cell-disabled");
      td.contentEditable = "true";
    }
  }

  function applyRowLock(r, idx){
    const tdC1 = tdAt(r, idx.c1);
    const tdC2 = tdAt(r, idx.c2);
    if (!tdC1 || !tdC2) return;

    const v1 = String(tdC1.textContent || "").trim();
    const v2 = String(tdC2.textContent || "").trim();

    if (v1 && !v2){
      setDisabled(tdC2, true);
      setDisabled(tdC1, false);
    } else if (v2 && !v1){
      setDisabled(tdC1, true);
      setDisabled(tdC2, false);
    } else {
      setDisabled(tdC1, false);
      setDisabled(tdC2, false);
    }
  }

  function applyAll(){
    if (!isTarget()){
      clearMyReqMarks();
      return;
    }
    const sheet = getSheet();
    if (!sheet) return;

    ensureStyleOnce();

    const idx = getIndexes(sheet);
    applyRequiredMarks(sheet, idx);

    const rows = Number(sheet.rows || 0);
    for (let r=0; r<rows; r++){
      applyRowLock(r, idx);
    }
  }

  // live update on input
  document.addEventListener("input", () => {
    requestAnimationFrame(() => {
      try { applyAll(); } catch {}
    });
  }, true);

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { try { applyAll(); } catch {} }, 0);
    setTimeout(() => { try { applyAll(); } catch {} }, 200);
  });

  // Hook render (so column tint stays after re-render)
  (function hookRender(){
    function tryHook(){
      if (typeof window.render !== "function") return false;
      if (window.render.__acReqLockHooked) return true;

      const _orig = window.render;
      window.render = function(){
        const ret = _orig.apply(this, arguments);
        try { applyAll(); } catch {}
        return ret;
      };
      window.render.__acReqLockHooked = true;
      return true;
    }
    tryHook(); setTimeout(tryHook, 0); setTimeout(tryHook, 200); setTimeout(tryHook, 800);
  })();

})();

 /* ======================= END  MODULE: 12H_AC_REQUIRED_AND_CELL_LOCK  (UPDATED)======================= */


 
 /* =========================
   C) Checks / Validation rules
========================= */

/* =========================================================
  MODULE: 15A_CHECKS
  AREA: per-sheet validation checks (per-tab memory + auto hide/show)
  CHANGE:
   - Model > Activity Center (ac) checks: Rules 1–13 (multi-error list + jump)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */

/* ========== UI helpers ========== */
function _statusKey(mode, key){ return `${mode}|${key}`; }
const CHECK_STATUS_STORE = {}; // { "model|company": {type,title,msg}, ... }

function setCheckStatusForCurrentSheet(type, title, msg){
  // ✅ DEBUG: 顯示 UI 渲染指示器
  if (window.updateDebugIndicator) {
    window.updateDebugIndicator("UI RENDER: " + type + " - " + (msg || "").substring(0, 25));
  }
  
  const k = _statusKey(activeMode, activeKey);
  CHECK_STATUS_STORE[k] = { type: type||"ok", title: title||"Check", msg: msg||"" };
  applyCheckStatusVisibility();
}

function clearCheckStatusForCurrentSheet(){
  const k = _statusKey(activeMode, activeKey);
  delete CHECK_STATUS_STORE[k];
  applyCheckStatusVisibility();
}

function applyCheckStatusVisibility(){
  let box = document.getElementById("checkStatus");
  let tEl = document.getElementById("checkStatusTitle");
  let mEl = document.getElementById("checkStatusMsg");
  
  // ✅ DEBUG: 檢查 DOM 節點狀態
  if (window.updateDebugIndicator) {
    const domStatus = "Box:" + (box ? "✓" : "✗") + " Title:" + (tEl ? "✓" : "✗") + " Msg:" + (mEl ? "✓" : "✗");
    const current = document.getElementById("checkDebugIndicator")?.textContent || "";
    window.updateDebugIndicator(current.replace("DEBUG: ", "") + " | DOM:" + domStatus);
  }
  
  // ✅ 如果找不到元素，動態建立狀態框
  if (!box || !tEl || !mEl) {
    // 尋找插入位置：優先插入在 toolbar 之前，否則插入在 body 最上方
    const toolbar = document.querySelector(".toolbar");
    const insertBefore = toolbar || document.body.firstChild;
    const parent = toolbar ? toolbar.parentElement : document.body;
    
    // 建立外層容器
    if (!box) {
      box = document.createElement("div");
      box.id = "checkStatus";
      box.className = "panel";
      box.style.display = "none";
      box.style.marginTop = "10px";
      box.style.padding = "12px";
      box.style.border = "2px solid";
      box.style.borderRadius = "6px";
      
      // 建立內部結構
      const innerDiv = document.createElement("div");
      innerDiv.style.display = "flex";
      innerDiv.style.justifyContent = "space-between";
      innerDiv.style.alignItems = "flex-start";
      innerDiv.style.gap = "10px";
      
      const contentDiv = document.createElement("div");
      
      // 建立標題元素
      if (!tEl) {
        tEl = document.createElement("div");
        tEl.id = "checkStatusTitle";
        tEl.style.fontWeight = "800";
        tEl.style.marginBottom = "6px";
        contentDiv.appendChild(tEl);
      }
      
      // 建立訊息元素
      if (!mEl) {
        mEl = document.createElement("div");
        mEl.id = "checkStatusMsg";
        mEl.style.whiteSpace = "pre-wrap";
        mEl.style.lineHeight = "1.7";
        contentDiv.appendChild(mEl);
      }
      
      innerDiv.appendChild(contentDiv);
      
      // 建立關閉按鈕
      const closeBtn = document.getElementById("checkStatusClose");
      if (!closeBtn) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.id = "checkStatusClose";
        btn.className = "btn-gray";
        btn.style.padding = "6px 10px";
        btn.textContent = (typeof lang !== "undefined" && lang === "en") ? "Close" : "關閉";
        innerDiv.appendChild(btn);
        
        // 綁定關閉按鈕事件
        btn.addEventListener("click", clearCheckStatusForCurrentSheet);
      } else {
        innerDiv.appendChild(closeBtn);
      }
      
      box.appendChild(innerDiv);
      
      // 插入到頁面
      if (insertBefore && parent) {
        parent.insertBefore(box, insertBefore);
      } else {
        document.body.insertBefore(box, document.body.firstChild);
      }
      
      // 重新取得元素（確保是 DOM 中的元素）
      box = document.getElementById("checkStatus");
      tEl = document.getElementById("checkStatusTitle");
      mEl = document.getElementById("checkStatusMsg");
    } else {
      // 如果 box 存在但內部元素不存在，建立內部元素
      // 先檢查 box 內部是否已有結構
      let innerDiv = box.querySelector("div[style*='display:flex']");
      if (!innerDiv) {
        innerDiv = document.createElement("div");
        innerDiv.style.display = "flex";
        innerDiv.style.justifyContent = "space-between";
        innerDiv.style.alignItems = "flex-start";
        innerDiv.style.gap = "10px";
        box.appendChild(innerDiv);
      }
      
      let contentDiv = innerDiv.querySelector("div:first-child");
      if (!contentDiv) {
        contentDiv = document.createElement("div");
        innerDiv.insertBefore(contentDiv, innerDiv.firstChild);
      }
      
      if (!tEl) {
        tEl = document.createElement("div");
        tEl.id = "checkStatusTitle";
        tEl.style.fontWeight = "800";
        tEl.style.marginBottom = "6px";
        contentDiv.appendChild(tEl);
      }
      if (!mEl) {
        mEl = document.createElement("div");
        mEl.id = "checkStatusMsg";
        mEl.style.whiteSpace = "pre-wrap";
        mEl.style.lineHeight = "1.7";
        contentDiv.appendChild(mEl);
      }
      
      // 確保關閉按鈕存在
      let closeBtn = document.getElementById("checkStatusClose");
      if (!closeBtn) {
        closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.id = "checkStatusClose";
        closeBtn.className = "btn-gray";
        closeBtn.style.padding = "6px 10px";
        closeBtn.textContent = (typeof lang !== "undefined" && lang === "en") ? "Close" : "關閉";
        innerDiv.appendChild(closeBtn);
        closeBtn.addEventListener("click", clearCheckStatusForCurrentSheet);
      }
      
      // 重新取得元素
      tEl = document.getElementById("checkStatusTitle");
      mEl = document.getElementById("checkStatusMsg");
    }
    
    // 如果還是找不到，直接返回（不應該發生）
    if (!box || !tEl || !mEl) {
      console.warn("Failed to create checkStatus elements");
      return;
    }
  }

  const k = _statusKey(activeMode, activeKey);
  const item = CHECK_STATUS_STORE[k];

  if (!item){
    box.style.display = "none";
    return;
  }

  // ✅ 顯示狀態框
  box.style.display = "block";
  tEl.textContent = item.title || "Check";
  mEl.textContent = item.msg || "";

  // ✅ 根據類型設定顏色（綠色=成功，黃色=警告，紅色=錯誤）
  const type = item.type || "ok";
  if (type === "ok") {
    box.style.borderColor = "#86efac"; // 綠色邊框
    box.style.background = "#f0fdf4";  // 淺綠色背景
    box.style.color = "#166534";       // 深綠色文字
  } else if (type === "warn") {
    box.style.borderColor = "#f59e0b"; // 黃色邊框
    box.style.background = "#fffbeb";  // 淺黃色背景
    box.style.color = "#92400e";       // 深黃色文字
  } else {
    box.style.borderColor = "#ef4444"; // 紅色邊框
    box.style.background = "#fee2e2";  // 淺紅色背景
    box.style.color = "#991b1b";       // 深紅色文字
  }
  
  // ✅ 確保結果區塊可見（強制顯示）
  box.style.visibility = "visible";
  box.style.opacity = "1";
  
  // ✅ 滾動到結果區塊（確保使用者能看到）
  try {
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch(e) {
    // 如果 scrollIntoView 不支援，使用 scrollTop
    try {
      const rect = box.getBoundingClientRect();
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        window.scrollTo({ top: box.offsetTop - 20, behavior: "smooth" });
      }
    } catch(e2) {}
  }
}

on("checkStatusClose","click", clearCheckStatusForCurrentSheet);

/* ========== small helpers ========== */
function _normHeader(x){
  return String(x||"").replace(/\s+/g," ").trim();
}
function _findColIndexByHeader(sheetKey, headerName){
  const s = sheets?.[sheetKey];
  if (!s) return -1;
  const target = _normHeader(headerName);
  const headers = Array.isArray(s.headers) ? s.headers : [];
  for (let i=0; i<headers.length; i++){
    if (_normHeader(headers[i]) === target) return i;
  }
  return -1;
}
function _collectUniqueColValues(sheetKey, colIdx){
  const s = sheets?.[sheetKey];
  if (!s || colIdx < 0) return new Set();
  ensureSize(s);

  const out = new Set();
  const rows = Number(s.rows || 0);
  for (let r=0; r<rows; r++){
    const v = String(s.data?.[r]?.[colIdx] ?? "").trim();
    if (v) out.add(v); // ✅ case-sensitive
  }
  return out;
}
function _isParenOnlyText(v){
  const t = String(v || "").trim();
  return /^\(.*\)$/.test(t);
}

/* ✅ Code parser for Rule 11–13 */
function _parseCode(code){
  const t = String(code || "").trim();
  const m = t.match(/^([A-Za-z])(\d{3})$/);
  if (!m) return null;
  return {
    raw: t,
    letter: m[1],                // keep case-sensitive
    num3: Number(m[2]),           // 100 / 110 / 120 ...
    prefix2: t.slice(0, 2)        // e.g., "D1" (Rule 11/12)
  };
}

/* ✅ 跳到指定 cell（如需導引） */
function gotoCell(target){
  if (!target) return;

  const needMode = target.mode || activeMode;
  const needKey  = target.key  || activeKey;

  if (needMode !== activeMode) switchMode(needMode);
  else refreshUI();

  requestAnimationFrame(() => {
    setActive(needKey);
    requestAnimationFrame(() => {
      focusCell(Number(target.r||0), Number(target.c||0));
    });
  });
}

/* =========================================================
   ✅ CHECK RULES
========================================================= */
const CHECKS_BY_SHEET = {

  /* (Keep your original Company check) */
  company: function checkCompanySheet(){
    if (activeMode !== "model") {
      return { ok:true, type:"warn", msg: (lang==="en" ? "Skipped (Period mode)." : "略過（Period 模式不檢查）。") };
    }

    const sysName = String(documentMeta?.companyName || "").trim();
    if (!sysName) {
      return {
        ok:false, type:"err",
        msg: (lang==="en"
          ? "System Company Name is empty. (No companyName from login/sessionStorage)"
          : "系統指定的公司名稱是空的（登入沒有帶 companyName 或 sessionStorage 沒有值）。"
        ),
        goto: { mode:"model", key:"company", r:0, c:0 }
      };
    }

    const a1 = String(sheets?.company?.data?.[0]?.[0] ?? "").trim();
    if (a1 !== sysName) {
      return {
        ok:false, type:"warn",
        msg: (lang==="en"
          ? `Company Name mismatch!\nSystem: ${sysName}\nA1: ${a1 || "(empty)"}\n\nPlease correct Model > Company > A1.`
          : `公司名稱不一致！\n系統指定：${sysName}\nA1：${a1 || "（空白）"}\n\n請修正 Model > Company > A1。`
        ),
        goto: { mode:"model", key:"company", r:0, c:0 }
      };
    }

    return { ok:true, type:"ok", msg: (lang==="en" ? "Company sheet check passed." : "Company 分頁檢查通過。") };
  },

  /* =========================================================
     ✅ Model > Activity Center (key: ac) FULL CHECK
     Rules:
      1) BU (if filled) must exist in Model > BU sheet (case-sensitive)
      2) Row 1 must have any info
      3) If Code1 has value, Code2 must be blank (same row)
      4) Allocation must exist in Model > DAF "Driver Name or Allocation" (case-sensitive)
      5) Allocation like "(...)" => ignore rule 4
      7) If Code1 or Code2 has value, BU is required
      8) Code1 cannot duplicate (case-sensitive exact match)
      9) Code2 cannot duplicate (case-sensitive exact match)
     10) No code can appear in BOTH Code1 and Code2 anywhere (cross-column conflict)
     11/12) If Code1 at row r is blank but Code2 at row r has value,
            then Code2.prefix2 must equal prefix2 of the nearest previous non-empty Code1.
            Example: parent D100 => children D110/D120/... ok (prefix2 "D1"), but D210 wrong.
     13) Logical order / continuity:
          - Code1 non-empty rows must be consecutive letters with SAME num3 (A100,B100,C100,...)
          - Code2 under same parent must be consecutive by +10 in num3 (D110,D120,D130,...) and same prefix2
     Output:
      - list ALL errors
      - jump to first error cell
  ========================================================= */
  ac: function checkModelActivityCenter(){

    if (activeMode !== "model") {
      return { ok:true, type:"warn", msg: (lang==="en" ? "Skipped (Period mode)." : "略過（Period 模式不檢查）。") };
    }

    const sAC  = sheets?.ac;
    const sBU  = sheets?.bu;
    const sDAF = sheets?.daf;

    if (!sAC || !sBU || !sDAF) {
      return {
        ok:false, type:"err",
        msg: (lang==="en"
          ? "Missing required sheets: ac / bu / daf."
          : "缺少必要分頁：ac / bu / daf。"
        )
      };
    }

    ensureSize(sAC);
    ensureSize(sBU);
    ensureSize(sDAF);

    // ---- column indexes (header-first, fallback to fixed) ----
    // (fallback based on your current layout)
    const idxBU_ac = (_findColIndexByHeader("ac","Business Unit") >= 0) ? _findColIndexByHeader("ac","Business Unit") : 0;
    const idxC1_ac = (_findColIndexByHeader("ac","Activity Center Code 1") >= 0) ? _findColIndexByHeader("ac","Activity Center Code 1") : 1;
    const idxC2_ac = (_findColIndexByHeader("ac","Activity Center Code 2") >= 0) ? _findColIndexByHeader("ac","Activity Center Code 2") : 3;
    const idxAlloc = (_findColIndexByHeader("ac","Allocation") >= 0) ? _findColIndexByHeader("ac","Allocation") : 5;

    const idxBU_bu = (_findColIndexByHeader("bu","Business Unit") >= 0) ? _findColIndexByHeader("bu","Business Unit") : 0;
    const idxDAFDriver = (_findColIndexByHeader("daf","Driver Name or Allocation") >= 0) ? _findColIndexByHeader("daf","Driver Name or Allocation") : 1;

    // ---- sets ----
    const buSet  = _collectUniqueColValues("bu", idxBU_bu);          // case-sensitive
    const dafSet = _collectUniqueColValues("daf", idxDAFDriver);     // case-sensitive

    function acVal(r,c){
  const v = String(sAC.data?.[r]?.[c] ?? "").trim();
  // ✅ Rule 6: any "(...)" means "ignore / skip checks" => treat as blank
  if (_isParenOnlyText(v)) return "";
  return v;
}


    const errors = []; // {r,c,msg}

    const rowsAC = Number(sAC.rows || 0);

    // Rule 2: first row must have any info
    (function ruleFirstRowHasInfo(){
      const row = sAC.data?.[0] || [];
      const any = row.some(v => String(v ?? "").trim() !== "");
      if (!any){
        errors.push({
          r:0, c:0,
          msg: (lang==="en"
            ? "Rule 2: Row 1 must contain some information (cannot be completely empty)."
            : "規則 2：第一列一定要有資訊（不能整列空白）。"
          )
        });
      }
    })();

    // collect code arrays
    const code1Arr = new Array(rowsAC).fill("");
    const code2Arr = new Array(rowsAC).fill("");

    // trackers for duplicates
    const code1Seen = new Map(); // value -> first row
    const code2Seen = new Map(); // value -> first row
    const code1Set = new Set();
    const code2Set = new Set();

    // For Rule 11/12/13
    let lastParentCode1 = "";          // nearest previous non-empty code1 (raw)
    let lastParentParsed = null;       // parsed parent
    let lastChildParsed = null;        // for continuity within same parent

    // For Code1 order (Rule 13)
    let prevCode1Parsed = null;
    let prevCode1Row = -1;

    // For Code2 continuity (Rule 13)
    let prevCode2Parsed = null;
    let prevCode2Row = -1;
    let prevCode2ParentPrefix2 = "";   // reset when parent changes

    // Pass: per-row checks + duplicate tracking + hierarchy/order
    for (let r=0; r<rowsAC; r++){
      const bu    = acVal(r, idxBU_ac);
      const code1 = acVal(r, idxC1_ac);
      const code2 = acVal(r, idxC2_ac);
      const alloc = acVal(r, idxAlloc);

      code1Arr[r] = code1;
      code2Arr[r] = code2;

      const hasCode = (code1 !== "" || code2 !== "");

      // Rule 7: if code1 or code2 has value => BU required
      if (hasCode && bu === ""){
        errors.push({
          r, c: idxBU_ac,
          msg: (lang==="en"
            ? `Rule 7: Row ${r+1} requires Business Unit when Code 1/2 has value. (Code1="${code1}", Code2="${code2}")`
            : `規則 7：第 ${r+1} 列只要 Code 1/2 有值，就必須填 Business Unit。（Code1="${code1}", Code2="${code2}"）`
        )
        });
      }

      // Rule 1: if BU filled => must exist in BU sheet (case-sensitive)
      if (bu !== "" && !buSet.has(bu)){
        errors.push({
          r, c: idxBU_ac,
          msg: (lang==="en"
            ? `Rule 1: Row ${r+1} Business Unit "${bu}" is not in Model > Business Unit (case-sensitive). Example: "abc" ≠ "ABC".`
            : `規則 1：第 ${r+1} 列 Business Unit「${bu}」不在 Model > Business Unit 清單中（大小寫需完全一致）。例：「abc」≠「ABC」。`
        )
        });
      }

      // Rule 3: if Code1 has value => Code2 must be blank (same row)
      if (code1 !== "" && code2 !== ""){
        errors.push({
          r, c: idxC2_ac,
          msg: (lang==="en"
            ? `Rule 3: Row ${r+1} Code 2 must be blank when Code 1 has value. (Code1="${code1}", Code2="${code2}")`
            : `規則 3：第 ${r+1} 列只要 Code 1 有值，Code 2 必須為空白。（Code1="${code1}", Code2="${code2}"）`
        )
        });
      }

      // Rule 4 & 5: Allocation must exist in DAF set, unless "(...)" then ignore
      if (alloc !== "" && !_isParenOnlyText(alloc)){
        if (!dafSet.has(alloc)){
          errors.push({
            r, c: idxAlloc,
            msg: (lang==="en"
              ? `Rule 4: Row ${r+1} Allocation "${alloc}" not found in Model > Driver and Allocation Formula > "Driver Name or Allocation" (case-sensitive).`
              : `規則 4：第 ${r+1} 列 Allocation「${alloc}」不在 Model > Driver and Allocation Formula 分頁的「Driver Name or Allocation」清單中（大小寫需完全一致）。`
          )
          });
        }
      }

      // Rule 8: Code1 duplicates (ignore blank)
      if (code1 !== ""){
        if (code1Seen.has(code1)){
          const firstR = code1Seen.get(code1);
          errors.push({
            r, c: idxC1_ac,
            msg: (lang==="en"
              ? `Rule 8: Code 1 duplicate "${code1}" at Row ${r+1} (first seen at Row ${firstR+1}).`
              : `規則 8：Code 1「${code1}」重複：第 ${r+1} 列（第一次出現在第 ${firstR+1} 列）。`
          )
          });
        } else {
          code1Seen.set(code1, r);
        }
        code1Set.add(code1);
      }

      // Rule 9: Code2 duplicates (ignore blank)
      if (code2 !== ""){
        if (code2Seen.has(code2)){
          const firstR = code2Seen.get(code2);
          errors.push({
            r, c: idxC2_ac,
            msg: (lang==="en"
              ? `Rule 9: Code 2 duplicate "${code2}" at Row ${r+1} (first seen at Row ${firstR+1}).`
              : `規則 9：Code 2「${code2}」重複：第 ${r+1} 列（第一次出現在第 ${firstR+1} 列）。`
          )
          });
        } else {
          code2Seen.set(code2, r);
        }
        code2Set.add(code2);
      }

      // ============================
      // Rule 11/12: parent-child prefix2
      // ============================
      if (code1 !== ""){
        // update parent
        lastParentCode1 = code1;
        lastParentParsed = _parseCode(code1);
        lastChildParsed = null; // new parent resets child continuity base
      } else {
        // code1 blank, if code2 has value, it must match parent prefix2
        if (code2 !== ""){
          const child = _parseCode(code2);
          if (!lastParentParsed){
            errors.push({
              r, c: idxC2_ac,
              msg: (lang==="en"
                ? `Rule 11/12: Row ${r+1} has Code 2 "${code2}" but there is no previous Code 1 as parent.`
                : `規則 11/12：第 ${r+1} 列 Code 2「${code2}」有值，但上方找不到上一個 Code 1 作為父層。`
            )
            });
          } else if (!child){
            errors.push({
              r, c: idxC2_ac,
              msg: (lang==="en"
                ? `Rule 11/12: Row ${r+1} Code 2 "${code2}" format invalid. Expected like D110 (Letter + 3 digits).`
                : `規則 11/12：第 ${r+1} 列 Code 2「${code2}」格式不正確，需像 D110（英文 + 3 位數字）。`
            )
            });
          } else {
            // prefix2 must match parent prefix2 (case-sensitive)
            if (child.prefix2 !== lastParentParsed.prefix2){
              errors.push({
                r, c: idxC2_ac,
                msg: (lang==="en"
                  ? `Rule 11/12: Row ${r+1} Code 2 "${code2}" must belong to parent Code 1 "${lastParentCode1}" (prefix2 must match: "${lastParentParsed.prefix2}").`
                  : `規則 11/12：第 ${r+1} 列 Code 2「${code2}」必須屬於父層 Code 1「${lastParentCode1}」（前兩碼需相同：${lastParentParsed.prefix2}）。`
              )
              });
            }
          }
        }
      }

      // ============================
      // Rule 13 (part 1): Code1 logical order across non-empty Code1 rows
      // - consecutive letters (A->B->C...)
      // - same num3 (100 stays 100)
      // ============================
      if (code1 !== ""){
        const cur = _parseCode(code1);
        if (!cur){
          errors.push({
            r, c: idxC1_ac,
            msg: (lang==="en"
              ? `Rule 13: Row ${r+1} Code 1 "${code1}" format invalid. Expected like A100 (Letter + 3 digits).`
              : `規則 13：第 ${r+1} 列 Code 1「${code1}」格式不正確，需像 A100（英文 + 3 位數字）。`
          )
          });
        } else if (prevCode1Parsed){
          const expectLetter = String.fromCharCode(prevCode1Parsed.letter.charCodeAt(0) + 1);
          const sameNum = (cur.num3 === prevCode1Parsed.num3);
          const letterOk = (cur.letter === expectLetter);

          if (!(sameNum && letterOk)){
            errors.push({
              r, c: idxC1_ac,
              msg: (lang==="en"
                ? `Rule 13: Code 1 order broken at Row ${r+1}. Expected "${expectLetter}${String(prevCode1Parsed.num3).padStart(3,"0")}" after Row ${prevCode1Row+1} (${prevCode1Parsed.raw}), but got "${code1}".`
                : `規則 13：Code 1 連續順序錯誤：第 ${r+1} 列。上一個 Code 1 在第 ${prevCode1Row+1} 列為「${prevCode1Parsed.raw}」，理論上下一個應為「${expectLetter}${String(prevCode1Parsed.num3).padStart(3,"0")}」，但目前是「${code1}」。`
            )
            });
          }
        }
        prevCode1Parsed = cur;
        prevCode1Row = r;

        // new parent => reset Code2 continuity expectation group
        prevCode2Parsed = null;
        prevCode2Row = -1;
        prevCode2ParentPrefix2 = cur ? cur.prefix2 : "";
      }

      // ============================
      // Rule 13 (part 2): Code2 continuity under same parent
      // - only check when code2 exists
      // - must share parent's prefix2 (already checked by rule 11/12 for blank code1 rows)
      // - consecutive by +10 (D110->D120->D130...)
      // ============================
      if (code2 !== ""){
        const cur2 = _parseCode(code2);
        // If invalid format, also flag as Rule13 (format) to be explicit
        if (!cur2){
          errors.push({
            r, c: idxC2_ac,
            msg: (lang==="en"
              ? `Rule 13: Row ${r+1} Code 2 "${code2}" format invalid. Expected like D110 (Letter + 3 digits).`
              : `規則 13：第 ${r+1} 列 Code 2「${code2}」格式不正確，需像 D110（英文 + 3 位數字）。`
          )
          });
        } else {
          // Determine current parent prefix2 (nearest previous Code1 parsed)
          const parentPrefix2 = lastParentParsed ? lastParentParsed.prefix2 : "";

          // If we have previous code2 within SAME parent prefix2, enforce +10 continuity
          if (prevCode2Parsed && prevCode2ParentPrefix2 === parentPrefix2 && parentPrefix2){
            // must share prefix2 with previous (also implies same parent)
            const samePrefix2 = (cur2.prefix2 === prevCode2Parsed.prefix2) && (cur2.prefix2 === parentPrefix2);
            const diff = cur2.num3 - prevCode2Parsed.num3;

            if (!(samePrefix2 && diff === 10)){
              errors.push({
                r, c: idxC2_ac,
                msg: (lang==="en"
                  ? `Rule 13: Code 2 sequence broken at Row ${r+1}. Expected +10 after Row ${prevCode2Row+1} (${prevCode2Parsed.raw}) under parent prefix "${parentPrefix2}", but got "${code2}".`
                  : `規則 13：Code 2 連續順序錯誤：第 ${r+1} 列。上一個 Code 2 在第 ${prevCode2Row+1} 列為「${prevCode2Parsed.raw}」，同一父層（前兩碼 ${parentPrefix2}）下應該 +10 連續，但目前是「${code2}」。`
              )
              });
            }
          }

          // update prevCode2 trackers (only when have parent prefix2)
          prevCode2Parsed = cur2;
          prevCode2Row = r;
          prevCode2ParentPrefix2 = parentPrefix2 || cur2.prefix2;
        }
      }
    } // end for rows

    // Rule 10: cross-column conflict (same value appears in BOTH columns anywhere)
    const conflicts = [];
    code1Set.forEach(v => { if (code2Set.has(v)) conflicts.push(v); });
    if (conflicts.length){
      const conflictSet = new Set(conflicts);
      for (let r=0; r<rowsAC; r++){
        const v1 = code1Arr[r];
        const v2 = code2Arr[r];

        if (v1 && conflictSet.has(v1)){
          errors.push({
            r, c: idxC1_ac,
            msg: (lang==="en"
              ? `Rule 10: "${v1}" appears in BOTH Code 1 and Code 2 columns (cross-column conflict).`
              : `規則 10：「${v1}」同時出現在 Code 1 與 Code 2 欄位（跨欄重複，錯誤）。`
          )
          });
        }
        if (v2 && conflictSet.has(v2)){
          errors.push({
            r, c: idxC2_ac,
            msg: (lang==="en"
              ? `Rule 10: "${v2}" appears in BOTH Code 1 and Code 2 columns (cross-column conflict).`
              : `規則 10：「${v2}」同時出現在 Code 1 與 Code 2 欄位（跨欄重複，錯誤）。`
          )
          });
        }
      }
    }

    // ---- if errors -> list all + jump to first ----
    if (errors.length){
      const lines = [];
      lines.push(lang==="en"
        ? `❌ Found ${errors.length} error(s) in Model > Activity Center:`
        : `❌ Model > Activity Center 共找到 ${errors.length} 個錯誤：`
      );
      errors.forEach((e, i) => lines.push(`${i+1}. ${e.msg}`));

      const first = errors[0];
      return {
        ok:false,
        type:"err",
        msg: lines.join("\n"),
        goto: { mode:"model", key:"ac", r:first.r, c:first.c }
      };
    }

    return {
      ok:true,
      type:"ok",
      msg: (lang==="en"
        ? "✅ Activity Center check passed."
        : "✅ Activity Center 分頁檢查通過。"
      )
    };
  },

  /* =========================================================
     ✅ Model > Normal Capacity (key: nc) CHECK
     Delegates to window.DEFS.CHECKS.normalCapacity
  ========================================================= */
  nc: function checkNormalCapacityDelegate(){
    const fn = window.DEFS?.CHECKS?.normalCapacity;
    if (typeof fn !== "function") {
      return {
        ok:false,
        type:"err",
        msg:(lang==="en"
          ? "Normal Capacity rule not loaded: window.DEFS.CHECKS.normalCapacity"
          : "Normal Capacity rule not loaded: window.DEFS.CHECKS.normalCapacity"
        )
      };
    }
    return fn();
  },

  /* =========================================================
     ✅ Model > No More Capacity (假設 key 為 nmc，如果不存在請調整)
     Rules:
      - 基本檢查規則（可根據需求調整）
  ========================================================= */
  nmc: function checkNoMoreCapacitySheet(){
    if (activeMode !== "model") {
      return { ok:true, type:"warn", msg: (lang==="en" ? "Skipped (Period mode)." : "略過（Period 模式不檢查）。") };
    }

    const s = sheets?.nmc;
    if (!s) {
      return {
        ok:false, type:"err",
        msg: (lang==="en" ? "No More Capacity sheet not found." : "找不到 No More Capacity 分頁。")
      };
    }

    // ✅ 基本檢查：至少要有資料
    ensureSize(s);
    
    return {
      ok:true, type:"ok",
      msg: (lang==="en" ? "✅ Check passed. No More Capacity sheet is valid." : "✅ 檢查通過。No More Capacity 分頁有效。")
    };
  }
};

// ✅ 確保 CHECKS_BY_SHEET 是唯一的全域物件（暴露到 window）
window.CHECKS_BY_SHEET = CHECKS_BY_SHEET;

/* ✅ 主入口：只跑「目前分頁 activeKey」的規則 */
// ✅ 註冊表守衛：確保 CHECKS_BY_SHEET 和 nc 規則存在
window.CHECKS_BY_SHEET = window.CHECKS_BY_SHEET || {};
window.CHECKS_BY_SHEET.nc = window.CHECKS_BY_SHEET.nc || window.DEFS?.CHECKS?.normalCapacity;

function runChecksForActiveSheet(){
  // ✅ 單一註冊來源：使用 window.CHECKS_BY_SHEET 作為唯一來源
  const REG = window.CHECKS_BY_SHEET || {};
  
  // ✅ 取得 activeKey（確保是字串且已 trim）
  const key = (window.activeKey || "").trim();
  
  // ✅ 從註冊表查找規則函數
  let ruleFn = REG[key];
  
  // ✅ 最小 fallback：如果找不到且 key 是 "nc"，嘗試從 window.DEFS.CHECKS.normalCapacity 取得
  if (!ruleFn && key === "nc") {
    const checkFn = window.DEFS?.CHECKS?.normalCapacity;
    if (typeof checkFn === "function") {
      ruleFn = checkFn;
      // ✅ 回填到註冊表，確保一致性
      REG["nc"] = ruleFn;
    }
  }
  
  // ✅ 如果還是找不到規則，顯示錯誤
  if (typeof ruleFn !== "function") {
    setCheckStatusForCurrentSheet(
      "warn",
      "Check",
      (lang==="en"
        ? `No check rules for this sheet: ${key}`
        : `此分頁尚未設定檢查規則：${key}`
      )
    );
    return;
  }

  // ✅ 執行規則函數
  const res = ruleFn();

  // ✅ 處理檢查結果並顯示 UI
  if (!res || res.ok) {
    // 檢查通過：顯示綠色成功訊息
    setCheckStatusForCurrentSheet(
      res?.type || "ok",
      "Check",
      res?.msg || (lang==="en" ? "✅ Check passed." : "✅ 檢查通過。")
    );
    return;
  }

  // 檢查失敗：顯示紅色錯誤訊息
  setCheckStatusForCurrentSheet(
    res.type || "err",
    "Check",
    res.msg || (lang==="en" ? "⚠️ Check failed." : "⚠️ 檢查未通過。")
  );

  // 如果有指定跳轉位置，跳轉到第一個錯誤
  if (res.goto && typeof gotoCell === "function") {
    gotoCell(res.goto);
  }
}

// ✅ 暴露到全域，確保 app_init.js 可以存取
window.runChecksForActiveSheet = runChecksForActiveSheet;

// ✅ DEBUG: 建立 Check 按鈕調試指示器（臨時）
(function createCheckDebugIndicator(){
  const indicator = document.createElement("div");
  indicator.id = "checkDebugIndicator";
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #1f2937;
    color: #fbbf24;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 11px;
    font-family: monospace;
    z-index: 99999;
    max-width: 350px;
    white-space: pre-wrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    line-height: 1.4;
  `;
  indicator.textContent = "DEBUG: Ready";
  
  function insertIndicator(){
    if (document.body) {
      document.body.appendChild(indicator);
    } else {
      setTimeout(insertIndicator, 10);
    }
  }
  insertIndicator();
  
  window.updateDebugIndicator = function(text){
    const el = document.getElementById("checkDebugIndicator");
    if (el) {
      el.textContent = "DEBUG: " + text;
    }
  };
})();

// ✅ 延遲綁定 Check 按鈕，確保 CHECKS_BY_SHEET 已初始化
(function bindCheckButton(){
  function tryBind(){
    // 確保 on 函數和 CHECKS_BY_SHEET 都已定義
    const onFn = window.DEFS?.UTILS?.on || window.on;
    if (typeof onFn !== "function") return false;
    const REG = window.CHECKS_BY_SHEET;
    if (typeof REG === "undefined") return false;
    
    // 確保 checkBtn 存在
    const checkBtn = document.getElementById("checkBtn");
    if (!checkBtn) return false;
    
    // 避免重複綁定
    if (checkBtn.__checkBound) return true;
    checkBtn.__checkBound = true;
    
    // ✅ 綁定 Check 按鈕：所有分頁統一使用 runChecksForActiveSheet() 標準流程
    onFn("checkBtn", "click", function(){
      runChecksForActiveSheet();
    });
    return true;
  }
  
  // 立即嘗試
  if (tryBind()) return;
  
  // 如果失敗，延遲重試
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function(){
      setTimeout(tryBind, 0);
      setTimeout(tryBind, 100);
      setTimeout(tryBind, 300);
    });
  } else {
    setTimeout(tryBind, 0);
    setTimeout(tryBind, 100);
    setTimeout(tryBind, 300);
  }
})();

/* =========================================================
   ✅ 切換分頁時自動「隱藏/顯示」
========================================================= */
(function hookTabSwitchToStatus(){
  function tryHook(){
    if (typeof window.setActive !== "function") return false;

    if (window.setActive.__checkHooked) return true;
    const _orig = window.setActive;

    window.setActive = function(nextKey){
      const ret = _orig.apply(this, arguments);
      try { applyCheckStatusVisibility(); } catch {}
      return ret;
    };
    window.setActive.__checkHooked = true;

    try { applyCheckStatusVisibility(); } catch {}
    return true;
  }

  tryHook();
  setTimeout(tryHook, 0);
  setTimeout(tryHook, 200);
  setTimeout(tryHook, 800);
})();

/* ======================= END MODULE: 15A_CHECKS ======================= */

/* =========================================================
  MODULE: 12J_NC_REQUIRED_ROW1_ONLY
  AREA: Model > Normal Capacity (key: nc)
  GOAL:
    - 3 columns are required: Activity Code / Activity Name / Description
    - req-col tint on header + ALL rows
    - req-missing red outline ONLY on Row 1 (r===0)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
(function ncRequiredRow1Only(){

  const TARGET_MODE = "model";
  const TARGET_KEY  = "nc";

  const REQUIRED_HEADERS = [
    "Activity Code",
    "Activity Name",
    "Description"
  ];

  const TAG_REQ = "nc-req"; // tag so we only touch our own marks

  function norm(s){ return String(s||"").replace(/\s+/g," ").trim(); }

  function isTarget(){
    try {
      return (typeof activeMode !== "undefined"
        && typeof activeKey !== "undefined"
        && activeMode === TARGET_MODE
        && activeKey === TARGET_KEY);
    } catch { return false; }
  }

  function getSheet(){
    try { return (typeof activeSheet === "function") ? activeSheet() : null; }
    catch { return null; }
  }

  function findColIndexByHeader(sheet, headerName){
    const target = norm(headerName);
    const headers = Array.isArray(sheet?.headers) ? sheet.headers : [];
    for (let i=0; i<headers.length; i++){
      if (norm(headers[i]) === target) return i;
    }
    return -1;
  }

  function clearMyMarks(){
    const head = document.getElementById("gridHead");
    const body = document.getElementById("gridBody");
    head?.querySelectorAll(`th.${TAG_REQ}`).forEach(el => el.classList.remove("req-col", TAG_REQ));
    body?.querySelectorAll(`td.${TAG_REQ}`).forEach(el => el.classList.remove("req-col", TAG_REQ));
    body?.querySelectorAll(`td.nc-miss`).forEach(td => td.classList.remove("req-missing","nc-miss"));
  }

  function applyMarks(){
    if (!isTarget()){
      clearMyMarks();
      return;
    }

    const sheet = getSheet();
    if (!sheet) return;

    const head = document.getElementById("gridHead");
    const body = document.getElementById("gridBody");
    if (!head || !body) return;

    // resolve required col indexes by header name
    const reqCols = [];
    for (const h of REQUIRED_HEADERS){
      const idx = findColIndexByHeader(sheet, h);
      if (idx >= 0) reqCols.push(idx);
    }
    if (!reqCols.length) return;

    // clear only ours first
    head.querySelectorAll(`th.${TAG_REQ}`).forEach(el => el.classList.remove("req-col", TAG_REQ));
    body.querySelectorAll(`td.${TAG_REQ}`).forEach(el => el.classList.remove("req-col", TAG_REQ));
    body.querySelectorAll(`td.nc-miss`).forEach(td => td.classList.remove("req-missing","nc-miss"));

    // header: th index offset +1 (corner cell)
    const tr = head.querySelector("tr");
    if (tr){
      reqCols.forEach(c => {
        const th = tr.children?.[c + 1];
        if (th) th.classList.add("req-col", TAG_REQ);
      });
    }

    // ALL rows: tint required columns
    reqCols.forEach(c => {
      body.querySelectorAll(`td[data-c="${c}"]`).forEach(td => {
        td.classList.add("req-col", TAG_REQ);
      });
    });

    // ONLY Row 1 (r===0): red outline if blank
    const r = 0;
    reqCols.forEach(c => {
      const td = body.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
      if (!td) return;
      const v = String(td.textContent || "").trim();
      if (v === "") td.classList.add("req-missing","nc-miss");
    });
  }

  function boot(){
    try { applyMarks(); } catch {}
  }

  // live update
  document.addEventListener("input", () => {
    requestAnimationFrame(() => { try { applyMarks(); } catch {} });
  }, true);

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(boot, 0);
    setTimeout(boot, 200);
  });

  // keep after rerender/tab/mode changes
  (function hook(name){
    function tryHook(){
      const fn = window[name];
      if (typeof fn !== "function" || fn[`__ncReqHooked_${name}`]) return false;
      window[name] = function(){
        const ret = fn.apply(this, arguments);
        try { applyMarks(); } catch {}
        return ret;
      };
      window[name][`__ncReqHooked_${name}`] = true;
      return true;
    }
    tryHook(); setTimeout(tryHook,0); setTimeout(tryHook,200); setTimeout(tryHook,800);
  })("render");

  ["refreshUI","setActive","switchMode"].forEach(n => {
    (function hook2(name){
      function tryHook(){
        const fn = window[name];
        if (typeof fn !== "function" || fn[`__ncReqHooked_${name}`]) return false;
        window[name] = function(){
          const ret = fn.apply(this, arguments);
          try { applyMarks(); } catch {}
          return ret;
        };
        window[name][`__ncReqHooked_${name}`] = true;
        return true;
      }
      tryHook(); setTimeout(tryHook,0); setTimeout(tryHook,200); setTimeout(tryHook,800);
    })(n);
  });

})();
 /* ======================= END MODULE: 12J_NC_REQUIRED_ROW1_ONLY ======================= */




