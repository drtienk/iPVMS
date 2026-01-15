// js/auth_ui.js
console.log("✅ [auth_ui.js] loaded");

window.DEFS = window.DEFS || {};
window.DEFS.AUTH_UI = window.DEFS.AUTH_UI || {};

(function installAuthUI(){
  if (window.__AUTH_UI_INSTALLED__) return;
  window.__AUTH_UI_INSTALLED__ = true;

  function init(){
    /* =========================================================
      MODULE: 02_APP_STATE_LOGIN (moved from app.js)
      AREA: basic config + login guard + logout
      NOTE: Keep logic identical (no refactor)
    ========================================================= */

    const LOGIN_PAGE = "login.html";
    const ENABLE_AUTO_REDIRECT = false;

    function showNotLoggedInHint() {
      if ($("notLoggedInBanner")) return;

      const banner = document.createElement("div");
      banner.id = "notLoggedInBanner";
      banner.className = "panel";
      banner.style.borderColor = "#f59e0b";
      banner.style.background = "#fffbeb";
      banner.innerHTML = `
        <div style="font-weight:700; margin-bottom:6px;">${t("not_logged_title")}</div>
        <div style="font-size:14px; color:#444; line-height:1.7;">
          <div>${t("not_logged_line1")}</div>
          <div>${t("not_logged_line2")}</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
          <button type="button" id="previewLoginBtn" class="btn-ok">${t("not_logged_preview")}</button>
          <button type="button" id="goLoginBtn">${t("not_logged_go_login")}</button>
        </div>
      `;
      const anchor = document.querySelector(".topbar");
      (anchor?.parentNode || document.body).insertBefore(banner, anchor?.nextSibling || document.body.firstChild);

      banner.querySelector("#previewLoginBtn").addEventListener("click", () => {
        sessionStorage.setItem("loggedIn", "yes");
        sessionStorage.setItem("role", "user");
        sessionStorage.setItem("companyId", "TEST_CO");
        sessionStorage.setItem("companyName", "TEST CO.");
        location.reload();
      });

      banner.querySelector("#goLoginBtn").addEventListener("click", () => location.href = LOGIN_PAGE);
    }

    if (sessionStorage.getItem("loggedIn") !== "yes") {
      if (ENABLE_AUTO_REDIRECT) location.href = LOGIN_PAGE;
      else showNotLoggedInHint();
    }

   const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn && !logoutBtn.__authBound){
  logoutBtn.__authBound = true;
  logoutBtn.addEventListener("click", () => {
    ["loggedIn","role","companyId","companyName","activePeriod"].forEach(k => sessionStorage.removeItem(k));
    location.href = LOGIN_PAGE;
  });
}


    /* ======================= END MODULE: 02_APP_STATE_LOGIN ======================= */
  }

  window.DEFS.AUTH_UI.init = function(){
  // ✅ ensure app.js top-level state exists first
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", () => init(), { once:true });
  } else {
    init();
  }
};


})();
