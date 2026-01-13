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

      // ====== 8) 強制重新綁定 Check 按鈕（確保 click handler 一定接上） ======
      setTimeout(function forceBindCheckButton(){
        const checkBtn = document.getElementById("checkBtn");
        if (checkBtn) {
          // 移除所有舊的事件監聽器（使用 cloneNode 技巧）
          const newBtn = checkBtn.cloneNode(true);
          checkBtn.parentNode.replaceChild(newBtn, checkBtn);
          
          // 強制綁定 onclick（最直接的方式，確保一定執行）
          newBtn.onclick = function(e){
            e = e || window.event;
            if (e) {
              e.stopPropagation = function(){}; // 不阻止，但提供函數避免錯誤
            }
            alert("CHECK CLICKED");
            if (typeof window.runChecksForActiveSheet === "function") {
              window.runChecksForActiveSheet();
            } else {
              alert("runChecksForActiveSheet not found!");
            }
          };
          
          console.log("✅ [app_init] Check button force-bound via onclick");
        } else {
          console.warn("⚠️ [app_init] checkBtn not found");
        }
      }, 500); // 延遲 500ms 確保 DOM 完全準備好

    } catch (err) {
      window.showErr?.(err);
    }
  }

  // run immediately (same behavior as original IIFE)
  initAppOnce();

})();
 /* ======================= END MODULE: 19_INIT ======================= */
