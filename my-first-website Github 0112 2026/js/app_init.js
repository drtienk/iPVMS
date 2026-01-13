console.log("✅ [19] app_init loaded");

/* =========================================================
  MODULE: 19_INIT
  AREA: init app (restore last active tab BEFORE first render to avoid flashing)
  SAFE TO REPLACE WHOLE MODULE
========================================================= */

(function installAppInit(){

  function initAppOnce(){
    try {
      // ====== 1) admin buttons ======
      if (typeof window.isAdmin === "function" && window.isAdmin()) {
        if (document.getElementById("sheetAdminBtn")) document.getElementById("sheetAdminBtn").style.display = "";
        if (document.getElementById("userAdminBtn")) document.getElementById("userAdminBtn").style.display = "";
      }

      // ====== 2) company name sync ======
      const cn = (sessionStorage.getItem("companyName") || "").trim();
      if (cn && document.getElementById("companyNameInput")) {
        document.getElementById("companyNameInput").value = cn;
        if (window.documentMeta) window.documentMeta.companyName = cn;
      }

      // ====== 3) visibility ======
      if (typeof window.loadVisibility === "function") window.loadVisibility();

      // ====== 4) load data by mode ======
      if ((window.activeMode || "model") === "period") {

        // ✅ safe call Period bar (avoid ReferenceError)
        (window.DEFS?.PERIOD_UI?.renderPeriodBar || window.renderPeriodBar)?.();

        if (!(window.activePeriod || "").trim()) {
          window.resetSheetsToBlankForMode?.("period");
        } else {
          window.loadFromLocalByMode?.("period");
        }

      } else {
        window.loadFromLocalByMode?.("model");
      }

      // ====== 5) apply defs & trim ======
      window.applySheetDefsByModeAndTrim?.();

      // ====== 6) restore last active tab BEFORE first UI paint ======
      const KEY_MODEL  = "lastActiveKey_model";
      const KEY_PERIOD = "lastActiveKey_period";

      const wanted = ((window.activeMode || "model") === "period")
        ? (sessionStorage.getItem(KEY_PERIOD) || "").trim()
        : (sessionStorage.getItem(KEY_MODEL) || "").trim();

      if (wanted) {
        window.activeKey = wanted;
      }

      // 若被隱藏/不合法，會自動找第一個可見
      if (typeof window.ensureActiveKeyVisible === "function") window.ensureActiveKeyVisible();

      // ====== 7) apply lang + build UI + first render ======
      window.applyLangUI?.();
      window.refreshUI?.();

      // setActive is from router wrappers
      if (typeof window.setActive === "function") window.setActive(window.activeKey);

      // safety: ensure first paint
      if (typeof window.render === "function") window.render();

    } catch (err) {
      window.showErr?.(err);
    }
  }

  // run immediately (same behavior as original IIFE)
  initAppOnce();

})();
 /* ======================= END MODULE: 19_INIT ======================= */
