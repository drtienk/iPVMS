// js/user_directory_store.js
console.log("✅ [user_directory_store.js] loaded");

window.DEFS = window.DEFS || {};
window.DEFS.USER_DIR = window.DEFS.USER_DIR || {};

(function installUserDirStore(){
  if (window.__USER_DIR_STORE_INSTALLED__) return;
  window.__USER_DIR_STORE_INSTALLED__ = true;

  /* =========================================================
    MODULE: 03_USER_DIRECTORY (moved from app.js)
    AREA: user directory for admin assignment
    SAFE TO REPLACE WHOLE MODULE
  ========================================================= */
  const USER_DIR_KEY = "miniExcel_user_directory_v1";

  function defaultUserDirectory() {
    return {
      user1: { companyId: "TEST_CO", companyName: "TEST CO." },
      user2: { companyId: "ABC_CO",  companyName: "ABC CO."  }
    };
  }

  function loadUserDirectory() {
    try {
      const raw = localStorage.getItem(USER_DIR_KEY);
      if (!raw) return defaultUserDirectory();
      const obj = JSON.parse(raw);
      return (obj && typeof obj === "object") ? obj : defaultUserDirectory();
    } catch {
      return defaultUserDirectory();
    }
  }

  function saveUserDirectory(dir) {
    localStorage.setItem(USER_DIR_KEY, JSON.stringify(dir, null, 2));
  }

  // exports
  window.DEFS.USER_DIR.USER_DIR_KEY = USER_DIR_KEY;
  window.DEFS.USER_DIR.defaultUserDirectory = defaultUserDirectory;
  window.DEFS.USER_DIR.loadUserDirectory = loadUserDirectory;
  window.DEFS.USER_DIR.saveUserDirectory = saveUserDirectory;

  /* ======================= END MODULE: 03_USER_DIRECTORY ======================= */

})();
