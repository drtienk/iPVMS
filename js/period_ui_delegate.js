/* =========================================================
  MODULE: 10_PERIOD_UI_DELEGATE
  FILE: js/period_ui_delegate.js
  AREA: delegate period UI to js/period_ui.js
========================================================= */
(function periodUIDelegate(){

  const UI = window.DEFS?.PERIOD_UI;
  if (!UI?.init) {
    console.warn("⚠️ PERIOD_UI not ready: js/period_ui.js not loaded?");
    return;
  }

  UI.init();

})();
