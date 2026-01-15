/* =========================================================
  MODULE: 18_LANG_APPLY
  FILE: js/lang_apply.js
  AREA: applyLangUI + lang select event
========================================================= */
(function langApply(){

  // wrapper
  window.applyLangUI = function applyLangUI(){
    return window.DEFS?.LANG_UI?.applyLangUI?.();
  };

  // bind once
  function bindOnce(){
    const sel = document.getElementById("langSelect");
    if (!sel) return;
    if (sel.dataset.__langApplyBound === "1") return;
    sel.dataset.__langApplyBound = "1";

    sel.addEventListener("change", (e) => {
      const v = (e.target && e.target.value === "zh") ? "zh" : "en";
      if (typeof window.setLang === "function") window.setLang(v);
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    bindOnce();
    setTimeout(bindOnce, 200);
  });

})();
