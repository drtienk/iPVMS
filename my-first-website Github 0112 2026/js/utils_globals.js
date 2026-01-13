console.log("✅ [utils_globals.js] loaded");

(function installUtilsGlobals(){
  const U = window.DEFS?.UTILS;
  if (!U) {
    console.warn("⚠️ utils_globals: window.DEFS.UTILS not ready (utils.js not loaded yet?)");
    return;
  }

  // ✅ provide global aliases for scripts that expect $ / on / Modal
  if (!window.$) window.$ = U.$;
  if (!window.on) window.on = U.on;
  if (!window.showErr) window.showErr = U.showErr;
  if (!window.Modal) window.Modal = U.Modal;

  if (!window.csvCell) window.csvCell = U.csvCell;
  if (!window.downloadTextFile) window.downloadTextFile = U.downloadTextFile;
})();
