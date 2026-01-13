console.log("✅ utils.js loaded");


// ======================= HOTFIX: _syncDelColBtnVisibility SHIM START =======================
if (typeof window._syncDelColBtnVisibility !== "function") {
  window._syncDelColBtnVisibility = function(){
    try{
      const btn = document.getElementById("delColBtn");
      if (btn) btn.style.display = "";
    } catch(_e){}
  };
}
// ======================= HOTFIX: _syncDelColBtnVisibility SHIM END =======================

window.DEFS = window.DEFS || {};
window.DEFS.UTILS = window.DEFS.UTILS || {};

/* =========================================================
  MODULE: 00_UTILS (MOVED)
  AREA: DOM helpers + error + modal + download
  SAFE TO REPLACE WHOLE MODULE
========================================================= */
(function installUtils(){
  const $ = (id) => document.getElementById(id);
  const on = (id, evt, fn) => $(id)?.addEventListener(evt, fn);

  const jsErrorEl = $("jsError");
  function showErr(err) {
    if (jsErrorEl) {
      jsErrorEl.style.display = "block";
      jsErrorEl.textContent = "⚠️ JavaScript 錯誤：\n\n" + (err && err.stack ? err.stack : String(err));
    }
    console.error(err);
  }
  if (!window.__UTILS_ERROR_HOOKED__) {
  window.__UTILS_ERROR_HOOKED__ = true;
  window.addEventListener("error", (e) => showErr(e.error || e.message));
}


  const Modal = {
    bind(modalId, { openBtnIds = [], closeBtnIds = [] } = {}) {
      const modal = $(modalId);
      if (!modal) return;

      const open = () => modal.style.display = "block";
      const close = () => modal.style.display = "none";

      openBtnIds.forEach(id => on(id, "click", open));
      closeBtnIds.forEach(id => on(id, "click", close));
      modal.addEventListener("click", (e) => { if (e.target === modal) close(); });

      return { open, close, el: modal };
    }
  };

  function csvCell(v){
    return `"${String(v ?? "").replace(/"/g,'""')}"`;
  }

  function downloadTextFile(filename, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // export
  window.DEFS.UTILS.$ = $;
  window.DEFS.UTILS.on = on;
  window.DEFS.UTILS.showErr = showErr;
  window.DEFS.UTILS.Modal = Modal;
  window.DEFS.UTILS.csvCell = csvCell;
  window.DEFS.UTILS.downloadTextFile = downloadTextFile;
})();

