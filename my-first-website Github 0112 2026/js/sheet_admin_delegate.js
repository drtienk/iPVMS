/* =========================================================
  MODULE: 16_SHEET_ADMIN_DELEGATE
  FILE: js/sheet_admin_delegate.js
  AREA: delegate Sheet Admin modal to js/sheet_admin_ui.js
========================================================= */
(function sheetAdminDelegate(){

  function tryInit(){
    // 已綁過就不重複
    if (window.__SHEET_ADMIN_DELEGATE_BOUND__) return true;

    const UI = window.DEFS?.SHEET_ADMIN_UI;
    if (!UI?.init) return false; // sheet_admin_ui.js 還沒 ready

    window.__SHEET_ADMIN_DELEGATE_BOUND__ = true;

    try{
      UI.init(); // bind events + expose renderSheetAdminLists
      console.log("✅ [16] sheet_admin_delegate.js init OK");
      return true;
    } catch (e){
      console.error("❌ [16] sheet_admin_delegate.js init FAILED", e);
      window.__SHEET_ADMIN_DELEGATE_BOUND__ = false;
      return false;
    }
  }

  // 立即試一次 + DOM ready 後再試 + 多次重試（最穩）
  if (tryInit()) return;

  window.addEventListener("DOMContentLoaded", () => {
    if (tryInit()) return;
    setTimeout(tryInit, 200);
    setTimeout(tryInit, 800);
    setTimeout(tryInit, 1500);
  });

  setTimeout(tryInit, 50);
  setTimeout(tryInit, 300);
  setTimeout(tryInit, 900);

})();
