/* =========================================================
  MODULE: 04B_TABS_UI_WRAPPERS
  FILE: js/tabs_ui_wrappers.js
  AREA: expose buildTabs / applyTabUI wrappers for app.js
========================================================= */
(function tabsUIWrappers(){

  window.buildTabs = function buildTabs(){
    return window.DEFS?.TABS_UI?.buildTabs?.();
  };

  window.applyTabUI = function applyTabUI(){
    return window.DEFS?.TABS_UI?.applyTabUI?.();
  };

})();
