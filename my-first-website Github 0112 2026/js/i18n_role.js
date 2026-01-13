console.log('✅ [01] i18n_role loaded');

/* =========================================================
  MODULE: 01_I18N_ROLE
  AREA: i18n + role + language switching (GLOBAL)
  GOAL:
    - Single source of truth: sessionStorage("lang")
    - Keep window.lang in sync on load + on setLang
    - When language changes: refresh tab text via TABS_UI API (no DOM guessing)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */

(function installI18NRole(){

  var LANG_KEY = "lang";
  window.LANG_KEY = window.LANG_KEY || LANG_KEY;

  function getRole(){ return (sessionStorage.getItem("role") || "user").toLowerCase(); }
  function isAdmin(){ return getRole() === "admin"; }

  // ✅ 預設語言：user 英文，admin 中文（不改你原本邏輯）
  function getDefaultLangByRole() {
    return (getRole() === "user") ? "en" : "zh";
  }

  // ✅ i18n pack (from i18n_def.js)
  var I18N = window.DEFS?.I18N?.I18N || {};
  window.I18N = I18N;

  function normalizeLang(x){ return (String(x).toLowerCase() === "en") ? "en" : "zh"; }

  function readLang(){
    var saved = sessionStorage.getItem(window.LANG_KEY);
    if (!saved) {
      saved = getDefaultLangByRole();
      sessionStorage.setItem(window.LANG_KEY, saved);
    }
    return normalizeLang(saved);
  }

  // ✅ On load (F5): sync window.lang from sessionStorage
  window.lang = readLang();

  console.log(
    "✅ i18n_role I18N source:",
    (window.DEFS?.I18N?.I18N) ? "i18n_def.js" : "fallback(empty)",
    "| init lang =",
    window.lang
  );

  function t(key) {
    var cur = window.lang || "zh";
    var pack = I18N[cur] || I18N.zh || {};
    return (key in pack) ? pack[key] : ((I18N.zh && I18N.zh[key]) ?? key);
  }

  function syncLangDropdownIfAny(){
    var sel = document.getElementById("langSelect");
    if (!sel) return;
    sel.value = (window.lang === "en") ? "en" : "zh";
  }

  function refreshTabsTextIfAny(){
    try{
      var fn = window.DEFS?.TABS_UI?.refreshTabText;
      if (typeof fn === "function") fn();
      else if (typeof window.DEFS?.TABS_UI?.applyTabUI === "function") window.DEFS.TABS_UI.applyTabUI();
    }catch(e){}
  }

  function setLang(next) {
    var newLang = normalizeLang(next);

    // ✅ single truth
    sessionStorage.setItem(window.LANG_KEY, newLang);
    window.lang = newLang;

    // ✅ keep dropdown synced
    syncLangDropdownIfAny();

    // ✅ your existing flow (do not change behavior)
    if (typeof window.applyLangUI === "function") window.applyLangUI();
    if (typeof window.refreshUI === "function") window.refreshUI();

    // ✅ key fix: refresh tabs text via official API
    refreshTabsTextIfAny();

    // ✅ keep current tab consistent (safe)
    if (typeof window.setActive === "function") window.setActive(window.activeKey);

    // ✅ keep title/mode text consistent (safe)
    if (typeof window.syncModeUI === "function") window.syncModeUI();
  }

  // ✅ On DOM ready: ensure dropdown and tabs reflect stored lang (F5 consistency)
  document.addEventListener("DOMContentLoaded", function(){
    window.lang = readLang();
    syncLangDropdownIfAny();
    refreshTabsTextIfAny();
  });

  // expose
  window.getRole = getRole;
  window.isAdmin = isAdmin;
  window.getDefaultLangByRole = getDefaultLangByRole;
  window.t = t;
  window.setLang = setLang;

})();
