console.log('✅ [02] app_state_login loaded');

/* =========================================================
  MODULE: 02_APP_STATE_LOGIN
  AREA: login guard + logout + documentMeta + activeMode/Key/Period (GLOBAL)
  NOTE:
    - Must NOT depend on utils.js (because utils may load later)
    - Bind logout after DOM ready
  SAFE TO REPLACE WHOLE MODULE
========================================================= */

(function installAppStateLogin(){

  // ✅ config
  // ---- Robust login page resolver for GitHub Pages subfolder deployments ----
  function computeLoginPage(){
    try{
      var p = String(location.pathname || "/");
      var decodedPath = decodeURIComponent(p);
      
      // If we are already inside the app folder (check both encoded and decoded paths)
      if (p.indexOf("/my-first-website%20Github%200112%202026/") >= 0 || 
          decodedPath.indexOf("/my-first-website Github 0112 2026/") >= 0 ||
          p.indexOf("login.html") >= 0 || p.indexOf("app.html") >= 0) {
        return "login.html";
      }

      // If we are at repo root, navigate to app folder
      // Use relative path - works in both local and GitHub Pages
      return "my-first-website%20Github%200112%202026/login.html";
    }catch(e){
      // Fallback: use same-folder login
      return "login.html";
    }
  }

  var LOGIN_PAGE = computeLoginPage();
  var ENABLE_AUTO_REDIRECT = false;

  // ✅ mode state (GLOBAL)
  var MODE_KEY = "activeMode";
  var activeModeLocal = (sessionStorage.getItem(MODE_KEY) || "model").toLowerCase();
  if (activeModeLocal !== "model" && activeModeLocal !== "period") activeModeLocal = "model";

  // ✅ sheet key + period state (GLOBAL)
  var activeKeyLocal = "company";
  var activePeriodLocal = (sessionStorage.getItem("activePeriod") || "").trim();

  // ✅ document meta (GLOBAL)
  var documentMetaLocal = {
    companyId: (sessionStorage.getItem("companyId") || "default").trim() || "default",
    companyName: (sessionStorage.getItem("companyName") || "").trim()
  };

  // expose globals
  window.LOGIN_PAGE = LOGIN_PAGE;
  window.ENABLE_AUTO_REDIRECT = ENABLE_AUTO_REDIRECT;

  window.MODE_KEY = MODE_KEY;
  window.activeMode = activeModeLocal;
  window.activeKey = activeKeyLocal;
  window.activePeriod = activePeriodLocal;

  window.documentMeta = documentMetaLocal;

  function tSafe(k){
    try { return (typeof window.t === "function") ? window.t(k) : k; }
    catch(e){ return k; }
  }

  function showNotLoggedInHint() {
    if (document.getElementById("notLoggedInBanner")) return;

    var banner = document.createElement("div");
    banner.id = "notLoggedInBanner";
    banner.className = "panel";
    banner.style.borderColor = "#f59e0b";
    banner.style.background = "#fffbeb";
    banner.innerHTML = `
      <div style="font-weight:700; margin-bottom:6px;">${tSafe("not_logged_title")}</div>
      <div style="font-size:14px; color:#444; line-height:1.7;">
        <div>${tSafe("not_logged_line1")}</div>
        <div>${tSafe("not_logged_line2")}</div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:10px;">
        <button type="button" id="previewLoginBtn" class="btn-ok">${tSafe("not_logged_preview")}</button>
        <button type="button" id="goLoginBtn">${tSafe("not_logged_go_login")}</button>
      </div>
    `;

    var anchor = document.querySelector(".topbar");
    (anchor?.parentNode || document.body).insertBefore(
      banner,
      anchor?.nextSibling || document.body.firstChild
    );

    banner.querySelector("#previewLoginBtn")?.addEventListener("click", function(){
      sessionStorage.setItem("loggedIn", "yes");
      sessionStorage.setItem("role", "user");
      sessionStorage.setItem("companyId", "TEST_CO");
      sessionStorage.setItem("companyName", "TEST CO.");
      location.reload();
    });

    banner.querySelector("#goLoginBtn")?.addEventListener("click", function(){
      location.href = LOGIN_PAGE;
    });
  }

  // ✅ login guard (same behavior)
  if (sessionStorage.getItem("loggedIn") !== "yes") {
    if (ENABLE_AUTO_REDIRECT) location.href = LOGIN_PAGE;
    else showNotLoggedInHint();
  }

  // ✅ logout binding (DOM ready to ensure #logoutBtn exists)
  function bindLogout(){
    var btn = document.getElementById("logoutBtn");
    if (!btn) return false;

    // avoid double bind
    if (btn.__LOGOUT_BOUND__) return true;
    btn.__LOGOUT_BOUND__ = true;

    btn.addEventListener("click", function(){
      ["loggedIn","role","companyId","companyName","activePeriod"].forEach(function(k){
        sessionStorage.removeItem(k);
      });

      // Re-compute in case we're at a different level when clicking logout
      location.href = computeLoginPage();
    });

    console.log("✅ [02] logout bound");
    return true;
  }

  // try now + after DOMContentLoaded (safe)
  bindLogout();
  document.addEventListener("DOMContentLoaded", bindLogout);

})();
 /* ======================= END MODULE: 02_APP_STATE_LOGIN ======================= */
