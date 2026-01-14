/* =========================================================
  MODULE: CHECK_BUTTON_ADMIN_DELEGATE
  FILE: js/check_button_admin_delegate.js
  AREA: delegate Check Button Admin modal to js/check_button_admin_ui.js
========================================================= */
(function checkButtonAdminDelegate(){

  function tryInit(){
    // 已綁過就不重複
    if (window.__CHECK_BUTTON_ADMIN_DELEGATE_BOUND__) return true;

    const UI = window.DEFS?.CHECK_BUTTON_ADMIN_UI;
    if (!UI?.init) return false; // check_button_admin_ui.js 還沒 ready

    window.__CHECK_BUTTON_ADMIN_DELEGATE_BOUND__ = true;

    try{
      UI.init(); // bind events + expose renderCheckButtonAdminList
      console.log("✅ [check_button_admin_delegate] init OK");
      return true;
    } catch (e){
      console.error("❌ [check_button_admin_delegate] init FAILED", e);
      window.__CHECK_BUTTON_ADMIN_DELEGATE_BOUND__ = false;
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
