/* =========================================================
  MODULE: 17_USER_ADMIN_STUB
  FILE: js/user_admin_stub.js
  AREA: keep minimal user admin modal binder
========================================================= */
(function userAdminStub(){

  function tryBind(){
    // 已綁過就不重複
    if (window.__USER_ADMIN_STUB_BOUND__) return true;

    const Modal = window.DEFS?.UTILS?.Modal || window.Modal;
    if (!Modal?.bind) return false; // utils 還沒 ready

    const openBtn = document.getElementById("userAdminBtn");
    const closeBtn = document.getElementById("userAdminClose");
    const modalEl = document.getElementById("userAdminModal");

    // DOM 沒準備好 → 等一下再綁
    if (!openBtn || !closeBtn || !modalEl) return false;

    try{
      window.__USER_ADMIN_STUB_BOUND__ = true;

      // keep original behavior
      window.userAdminCtl = Modal.bind("userAdminModal", {
        openBtnIds: ["userAdminBtn"],
        closeBtnIds: ["userAdminClose"],
      });

      console.log("✅ [17] user_admin_stub.js bind OK");
      return true;

    } catch (e){
      console.error("❌ [17] user_admin_stub.js bind FAILED", e);
      window.__USER_ADMIN_STUB_BOUND__ = false;
      return false;
    }
  }

  // 立即試一次 + DOM ready 後再試 + 多次重試（最穩）
  if (tryBind()) return;

  window.addEventListener("DOMContentLoaded", () => {
    if (tryBind()) return;
    setTimeout(tryBind, 200);
    setTimeout(tryBind, 800);
    setTimeout(tryBind, 1500);
  });

  setTimeout(tryBind, 50);
  setTimeout(tryBind, 300);
  setTimeout(tryBind, 900);

})();
