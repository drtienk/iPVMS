console.log("✅ app.js loaded");

/* =========================================================
  MODULE: 00_UTILS_DELEGATE
  AREA: use utils.js exports (no local utils here)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
const $ = window.DEFS?.UTILS?.$;
const on = window.DEFS?.UTILS?.on;
const showErr = window.DEFS?.UTILS?.showErr;
const Modal = window.DEFS?.UTILS?.Modal;
const csvCell = window.DEFS?.UTILS?.csvCell;
const downloadTextFile = window.DEFS?.UTILS?.downloadTextFile;
/* ======================= END MODULE: 00_UTILS_DELEGATE ======================= */


/* =========================================================
  MODULE: 01_I18N_ROLE
  AREA: i18n + role + language switching (DELEGATE)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [01] i18n_role delegated");

// ✅ 直接引用 i18n_role.js 掛在 window 上的真實函式（避免遞迴）
var LANG_KEY = window.LANG_KEY || "lang";
var I18N = window.I18N || (window.DEFS?.I18N?.I18N || {});
var lang = window.lang || (sessionStorage.getItem(LANG_KEY) || "zh");

// ✅ alias（不要自己包一層呼叫 window.xxx，會造成 call stack）
var getRole = window.getRole;
var isAdmin = window.isAdmin;
var t = window.t;
var setLang = window.setLang;

// ✅ 兜底：如果 window 上還沒掛好（理論上不會），才用最簡單 fallback
if (typeof getRole !== "function") {
  getRole = function(){ return (sessionStorage.getItem("role") || "user").toLowerCase(); };
  window.getRole = getRole;
}
if (typeof isAdmin !== "function") {
  isAdmin = function(){ return getRole() === "admin"; };
  window.isAdmin = isAdmin;
}
if (typeof t !== "function") {
  t = function(key){ return key; };
  window.t = t;
}
if (typeof setLang !== "function") {
  setLang = function(next){
    lang = (next === "en") ? "en" : "zh";
    sessionStorage.setItem(LANG_KEY, lang);
    window.lang = lang;
    if (typeof window.applyLangUI === "function") window.applyLangUI();
    if (typeof window.refreshUI === "function") window.refreshUI();
  };
  window.setLang = setLang;
}
/* ======================= END MODULE: 01_I18N_ROLE ======================= */


/* =========================================================
  MODULE: 02_APP_STATE_LOGIN
  AREA: basic config + login guard + logout (DELEGATE)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [02] app_state_login delegated");

// ✅ alias globals created by js/app_state_login.js (no behavior change)
var LOGIN_PAGE = window.LOGIN_PAGE || "login.html";
var ENABLE_AUTO_REDIRECT = !!window.ENABLE_AUTO_REDIRECT;

var MODE_KEY = window.MODE_KEY || "activeMode";
var activeMode = (window.activeMode || sessionStorage.getItem(MODE_KEY) || "model").toLowerCase();
if (activeMode !== "model" && activeMode !== "period") activeMode = "model";

var activeKey = window.activeKey || "company";
var activePeriod = (window.activePeriod || sessionStorage.getItem("activePeriod") || "").trim();

var documentMeta = window.documentMeta || {
  companyId: (sessionStorage.getItem("companyId") || "default").trim() || "default",
  companyName: (sessionStorage.getItem("companyName") || "").trim()
};
window.documentMeta = documentMeta;

// ✅ keep window state synced for other modules
window.activeMode = activeMode;
window.activeKey = activeKey;
window.activePeriod = activePeriod;

/* ======================= END MODULE: 02_APP_STATE_LOGIN ======================= */


/* =========================================================
  MODULE: 03_USER_DIRECTORY_DELEGATE
  AREA: delegate to user_directory_store.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
const USER_DIR_KEY = window.DEFS?.USER_DIR?.USER_DIR_KEY || "miniExcel_user_directory_v1";

function defaultUserDirectory() {
  return window.DEFS?.USER_DIR?.defaultUserDirectory?.() || {};
}
function loadUserDirectory() {
  return window.DEFS?.USER_DIR?.loadUserDirectory?.() || {};
}
function saveUserDirectory(dir) {
  return window.DEFS?.USER_DIR?.saveUserDirectory?.(dir);
}
/* ======================= END MODULE: 03_USER_DIRECTORY_DELEGATE ======================= */


/* =========================================================
  MODULE: 04_TAB_CONFIG_GROUPS
  AREA: tab config + groups + labels (delegate)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
const TAB_CONFIG = window.DEFS?.TABS?.TAB_CONFIG;
const TAB_GROUPS_MODEL = window.DEFS?.TABS?.TAB_GROUPS_MODEL;
const TAB_GROUPS_PERIOD = window.DEFS?.TABS?.TAB_GROUPS_PERIOD;
/* ======================= END MODULE: 04_TAB_CONFIG_GROUPS ======================= */

/* =========================================================
  MODULE: 04A_TAB_LABEL_DELEGATE
  AREA: expose tabLabel / groupLabel from tabs_def.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
const tabLabel   = window.DEFS?.TABS?.tabLabel   || window.DEFS?.TABS_DEF?.tabLabel;
const groupLabel = window.DEFS?.TABS?.groupLabel || window.DEFS?.TABS_DEF?.groupLabel;
/* ======================= END MODULE: 04A_TAB_LABEL_DELEGATE ======================= */


/* =========================================================
  MODULE: 05_VISIBILITY
  AREA: sheet show/hide per company (delegate)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
const VIS = window.DEFS?.VISIBILITY;

// keep local reference for compatibility
let sheetVisibility = null;

function companyScopeKey() { return VIS.companyScopeKey(); }
function visibilityStorageKey() { return VIS.visibilityStorageKey(); }
function defaultVisibility() { return VIS.defaultVisibility(); }

function loadVisibility() {
  sheetVisibility = VIS.loadVisibility();
  return sheetVisibility;
}

function saveVisibility() {
  VIS.saveVisibility(sheetVisibility);
}

function isSheetVisible(mode, key) {
  if (!sheetVisibility) loadVisibility();
  return VIS.isSheetVisible(sheetVisibility, mode, key);
}

function ensureActiveKeyVisible() {
  if (!sheetVisibility) loadVisibility();
  const next = VIS.ensureActiveKeyVisible(sheetVisibility, activeMode, activeKey);
  activeKey = next;
  window.activeKey = activeKey; // ✅ 同步 window
}
/* ======================= END MODULE: 05_VISIBILITY ======================= */


/* =========================================================
  MODULE: 06_PERIOD_LIST_DELEGATE
  AREA: delegate to period_store.js (thin wrappers)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
const PERIOD = window.DEFS?.PERIOD;

function periodListStorageKey() { return PERIOD.periodListStorageKey(); }
function loadPeriodList() { return PERIOD.loadPeriodList(); }
function savePeriodList(list) { return PERIOD.savePeriodList(list); }
function normalizePeriod(yyyy, mm) { return PERIOD.normalizePeriod(yyyy, mm); }

/* ✅ keep app.js state var activePeriod, but store value via PERIOD store */
function setActivePeriod(p) {
  activePeriod = PERIOD.setActivePeriod(p) || String(p || "").trim();
  window.activePeriod = activePeriod; // ✅ 同步 window

  // UI updates (same behavior)
  updateCurrentPeriodTag();
  (window.DEFS?.PERIOD_UI?.renderPeriodBar || window.renderPeriodBar)?.();
}
/* ======================= END MODULE: 06_PERIOD_LIST_DELEGATE ======================= */


const MODEL_DEF_MAP = window.DEFS?.MODEL_DEF_MAP;
const PERIOD_DEF_MAP = window.DEFS?.PERIOD_DEF_MAP;


/* =========================================================
  MODULE: 08_SHEETS_CORE
  AREA: sheets data structure + meta helpers + defs apply (DELEGATE)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [08] app_sheets_core delegated");

// ✅ 只做 alias，不要用 function 宣告（避免覆蓋 window 上的真實函式造成遞迴）
var sheets = window.sheets || {};
window.sheets = sheets;

var ensureDafMeta = window.ensureDafMeta;
var ensureRowExplanations = window.ensureRowExplanations;

var activeSheet = window.activeSheet;
var applySheetDefsByModeAndTrim = window.applySheetDefsByModeAndTrim;
var resetSheetsToBlankForMode = window.resetSheetsToBlankForMode;

// ✅ 兜底（理論上不會用到）：用「function expression」而不是 function declaration
if (typeof activeSheet !== "function") {
  activeSheet = function(){ return sheets[window.activeKey || "company"]; };
  window.activeSheet = activeSheet;
}
if (typeof applySheetDefsByModeAndTrim !== "function") {
  applySheetDefsByModeAndTrim = function(){
    return window.DEFS?.SHEETS_CORE?.applySheetDefsByModeAndTrim?.(sheets, window.activeMode || "model");
  };
  window.applySheetDefsByModeAndTrim = applySheetDefsByModeAndTrim;
}
if (typeof resetSheetsToBlankForMode !== "function") {
  resetSheetsToBlankForMode = function(mode){
    return window.DEFS?.SHEETS_CORE?.resetSheetsToBlankForMode?.(sheets, mode);
  };
  window.resetSheetsToBlankForMode = resetSheetsToBlankForMode;
}
/* ======================= END MODULE: 08_SHEETS_CORE ======================= */


/* =========================================================
  MODULE: 06A_CURRENT_PERIOD_TAG
  AREA: update current period tag (UI only)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
function updateCurrentPeriodTag() {
  const tag = $("currentPeriodTag");
  if (!tag) return;
  if (activeMode !== "period") { tag.style.display = "none"; return; }
  tag.style.display = "";
  tag.textContent = `${t("period_tag_prefix")}${activePeriod || "—"}`;
}
window.updateCurrentPeriodTag = updateCurrentPeriodTag;
/* ======================= END MODULE: 06A_CURRENT_PERIOD_TAG ======================= */


/* =========================================================
  MODULE: 09_MODE_STORAGE
  AREA: mode UI + localStorage save/load + headers rules (DELEGATE)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [09] app_mode_storage delegated");

// ✅ DO NOT alias same-name globals here (avoid shadowing)
// The real functions are owned by js/app_mode_storage.js:
//   - storageKeyByMode
//   - saveToLocalByMode
//   - loadFromLocalByMode
//   - ensureHeadersForActiveSheet

// ✅ UI sync stays here (pure UI)
function syncModeUI() {
  const isModel = activeMode === "model";

  const btnModel  = $("btnModeModel");
  const btnPeriod = $("btnModePeriod");
  if (btnModel)  btnModel.classList.toggle("active", isModel);
  if (btnPeriod) btnPeriod.classList.toggle("active", !isModel);

  const titleEl = $("pageTitle");
  const pageTitleText = isModel ? t("page_model") : t("page_period");
  if (titleEl) titleEl.textContent = pageTitleText;

  document.title = isModel ? t("title_model") : t("title_period");

  const bar = $("periodBar");
  if (bar) bar.style.display = (activeMode === "period") ? "flex" : "none";

  updateCurrentPeriodTag();
}
window.syncModeUI = syncModeUI;

/* ======================= END MODULE: 09_MODE_STORAGE ======================= */


/* =========================================================
  MODULE: 10_PERIOD_UI_DELEGATE
  AREA: moved to js/period_ui_delegate.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [10] period_ui_delegate delegated");
/* ======================= END MODULE: 10_PERIOD_UI_DELEGATE ======================= */


/* =========================================================
  MODULE: 04B_TABS_UI_WRAPPERS
  AREA: moved to js/tabs_ui_wrappers.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [04B] tabs_ui_wrappers delegated");
/* ======================= END MODULE: 04B_TABS_UI_WRAPPERS ======================= */


/* =========================================================
  MODULE: 11_TABLE_CORE_BOOTSTRAP
  AREA: init table_core BEFORE 12_TABLE_CORE uses ensureSize(...)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
(function tableCoreBootstrapDelegate(){
  const BOOT = window.DEFS?.TABLE_BOOT;
  if (!BOOT?.init) {
    console.warn("⚠️ TABLE_BOOT not ready: js/table_core_bootstrap.js not loaded?");
    return;
  }

  const ctx = {
    get gridBody(){ return document.getElementById("gridBody"); },

    // deps
    activeSheet: window.activeSheet,
    ensureHeadersForActiveSheet: window.ensureHeadersForActiveSheet,
    saveToLocalByMode: window.saveToLocalByMode,

    // state getters
    get activeMode(){ return window.activeMode; },

    // render getter
    get render(){ return window.render; }
  };

  BOOT.init(ctx);
})();
 /* ======================= END MODULE: 11_TABLE_CORE_BOOTSTRAP ======================= */


/* =========================================================
  MODULE: 12_TABLE_CORE
  AREA: render (delegated to js/table_render_core.js)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
on("companyNameInput","input", () => {
  $("companyNameInput").value = documentMeta.companyName || $("companyNameInput").value;
});

// moved to table_core.js (compat flags)
window.__CELL_EDIT_MODE = window.__CELL_EDIT_MODE || false;
window.__EDIT_CELL_KEY = window.__EDIT_CELL_KEY || "";

// ✅ delegate render + header renderers
(function bindTableRenderDelegate(){
  const TR = window.DEFS?.TABLE_RENDER;

  if (!TR?.render) {
    console.warn("⚠️ TABLE_RENDER not ready: js/table_render_core.js not loaded?");
    window.render = window.render || function(){};
    return;
  }

  window.render = TR.render;
})();
 /* ======================= END MODULE: 12_TABLE_CORE ======================= */


/* =========================================================
  MODULE: 12A_COMPANY_ROW_LOCK
  AREA: moved to js/company_row_lock.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [12A] company_row_lock delegated");
/* ======================= END MODULE: 12A_COMPANY_ROW_LOCK ======================= */


/* =========================================================
  MODULE: 12B_REQUIRED_FIELDS_GUIDE
  AREA: moved to js/required_fields_guide.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [12B] required_fields_guide delegated");
/* ======================= END MODULE: 12B_REQUIRED_FIELDS_GUIDE ======================= */


/* =========================================================
  MODULE: 12C_REQUIRED_LEGEND
  AREA: moved to js/required_legend.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [12C] required_legend delegated");
/* ======================= END MODULE: 12C_REQUIRED_LEGEND ======================= */


/* =========================================================
  MODULE: 12D_MODEL_ALL_REQUIRED_COMPANY_BU
  AREA: moved to js/model_all_required_company_bu.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [12D] model_all_required_company_bu delegated");
/* ======================= END MODULE: 12D_MODEL_ALL_REQUIRED_COMPANY_BU ======================= */


/* =========================================================
  MODULE: 12E_RESOURCE_LEVEL_N_BUTTONS
  AREA: moved to js/resource_level_n_buttons.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [12E] resource_level_n_buttons delegated");
/* ======================= END MODULE: 12E_RESOURCE_LEVEL_N_BUTTONS ======================= */


/* =========================================================
  MODULE: 12X_SELECTION_BOOTSTRAP
  AREA: init selection_core.js (real init with ctx)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
(function selectionCoreBootstrap(){
  const SC = window.DEFS?.SELECTION_CORE;
  if (!SC?.init) {
    console.warn("⚠️ SELECTION_CORE not ready: js/selection_core.js not loaded?");
    return;
  }

  if (window.__SELECTION_CORE_INITED__) return;
  window.__SELECTION_CORE_INITED__ = true;

  SC.init({
    get gridBody(){ return document.getElementById("gridBody"); },

    activeSheet: window.activeSheet,
    ensureSize: window.ensureSize,
    ensureHeadersForActiveSheet: window.ensureHeadersForActiveSheet,
    parseClipboardGrid: window.parseClipboardGrid,
    saveToLocalByMode: window.saveToLocalByMode,
    get activeMode(){ return window.activeMode; },
    get render(){ return window.render; },
  });
})();
 /* ======================= END MODULE: 12X_SELECTION_BOOTSTRAP ======================= */


/* =========================================================
  MODULE: 13_SELECTION
  AREA: Excel-like selection (events delegated to selection_events.js)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
(function selectionEventsDelegate(){
  const EV = window.DEFS?.SELECTION_EVENTS;
  if (!EV?.bind) {
    console.warn("⚠️ SELECTION_EVENTS not ready: js/selection_events.js not loaded?");
    return;
  }
  EV.bind();
})();
 /* ======================= END MODULE: 13_SELECTION ======================= */


/* =========================================================
  MODULE: 15_TOOLBAR_DELEGATE
  AREA: moved to js/toolbar_delegate.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [15] toolbar_delegate delegated");
/* ======================= END MODULE: 15_TOOLBAR_DELEGATE ======================= */


/* =========================================================
  MODULE: 15D_USER_ADDED_COL_FLAG
  AREA: moved to js/user_added_col_flag.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [15D] user_added_col_flag delegated");
/* ======================= END MODULE: 15D_USER_ADDED_COL_FLAG ======================= */


/* =========================================================
  MODULE: 16_SHEET_ADMIN_DELEGATE
  AREA: moved to js/sheet_admin_delegate.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [16] sheet_admin_delegate delegated");
/* ======================= END MODULE: 16_SHEET_ADMIN_DELEGATE ======================= */


/* =========================================================
  MODULE: 17_USER_ADMIN_STUB
  AREA: moved to js/user_admin_stub.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [17] user_admin_stub delegated");
/* ======================= END MODULE: 17_USER_ADMIN_STUB ======================= */


/* =========================================================
  MODULE: 18_LANG_APPLY
  AREA: applyLangUI + lang select event
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
function applyLangUI() {
  return window.DEFS?.LANG_UI?.applyLangUI?.();
}
window.applyLangUI = applyLangUI;

on("langSelect","change", (e) => setLang(e.target.value === "zh" ? "zh" : "en"));
/* ======================= END MODULE: 18_LANG_APPLY ======================= */


/* =========================================================
  MODULE: 14A_ROUTER_WRAPPERS
  AREA: moved to js/router_wrappers.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [14A] router_wrappers delegated");
/* ======================= END MODULE: 14A_ROUTER_WRAPPERS ======================= */


/* =========================================================
  MODULE: 19_INIT
  AREA: moved to js/app_init.js
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
console.log("✅ [19] app_init delegated");
/* ======================= END MODULE: 19_INIT ======================= */
