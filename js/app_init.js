console.log("✅ [19] app_init loaded");

/* =========================================================
  CHECK BUTTON BINDING POLICY:
  - Check button click binding is handled exclusively in js/custom_rules.js
  - The following functions in this file have been disabled to prevent
    double-binding and conflicts:
    1. forceBindCheckButton() - no longer sets checkBtn.onclick
    2. setupGlobalClickCapture() - no longer installs document capture listener
  - All Check button clicks are now handled by custom_rules.js bindCheckButton()
========================================================= */

/* =========================================================
  DEBUG: Check Button Debug Badge (臨時調試指示器)
========================================================= */
(function createDebugBadge(){
  function insertBadge(){
    // 如果已存在，不重複建立
    if (document.getElementById("dbgBadge")) return;
    
    const badge = document.createElement("div");
    badge.id = "dbgBadge";
    badge.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #1f2937;
      color: #fbbf24;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-family: monospace;
      z-index: 99999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      line-height: 1.4;
    `;
    badge.textContent = "DEBUG: Ready";
    
    if (document.body) {
      document.body.appendChild(badge);
      console.log("✅ [app_init] Debug badge created");
    } else {
      setTimeout(insertBadge, 10);
    }
    
    // ✅ Debug badge click listener removed (no global click listening)
  }
  
  // 在 DOMContentLoaded 時建立
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertBadge);
  } else {
    insertBadge();
  }
  
  // 延遲建立（確保一定執行）
  setTimeout(insertBadge, 0);
  setTimeout(insertBadge, 100);
  setTimeout(insertBadge, 500);
})();

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
        if (document.getElementById("checkButtonAdminBtn")) document.getElementById("checkButtonAdminBtn").style.display = "";
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

      // ====== 7.5) Try cloud read once (after initial render) ======
      try {
        if (!window.__CLOUD_COMPANY_READ_ONCE__) {
          window.__CLOUD_COMPANY_READ_ONCE__ = true;
          if (typeof window.cloudModelCompanyTryReadOnce === "function") {
            // Run asynchronously to not block init
            setTimeout(() => {
              window.cloudModelCompanyTryReadOnce?.();
            }, 100);
          }
        }
      } catch (err) {
        console.warn("[app_init] cloud read hook error (non-fatal):", err.message);
      }

      // ====== 8) 強制重新綁定 Check 按鈕（確保 click handler 一定接上） ======
      setTimeout(function forceBindCheckButton(){
        // ✅ DISABLED: Check binding handled in custom_rules.js
        // This function previously cloned the button and set onclick to call runChecksForActiveSheet()
        // It has been disabled to prevent conflicts with the binding in custom_rules.js
        return;
        
        // Original code (disabled):
        // const checkBtn = document.getElementById("checkBtn");
        // if (checkBtn) {
        //   const newBtn = checkBtn.cloneNode(true);
        //   checkBtn.parentNode.replaceChild(newBtn, checkBtn);
        //   newBtn.onclick = function(e){ ... window.runChecksForActiveSheet(); };
        // }
      }, 500); // 延遲 500ms 確保 DOM 完全準備好

      // ====== 9) 全域捕捉任何點擊，定位真正的 Check 按鈕 ======
      setTimeout(function setupGlobalClickCapture(){
        // ✅ DISABLED: Disabled to prevent double-trigger; binding is in custom_rules.js
        // This function previously installed a document-level click capture that triggered
        // checks based on elements containing "Check" text. It has been disabled to prevent
        // double-triggering and unintended triggers.
        return;
        
        // Original code (disabled):
        // document.addEventListener("click", function(e){
        //   if (txt.toLowerCase().includes("check")) {
        //     window.runChecksForActiveSheet();
        //   }
        // }, true);
      }, 600); // 在綁定按鈕之後執行

      // ====== 10) Start presence heartbeat (write-only) ======
      if (!window.__PRESENCE_HEARTBEAT_STARTED__) {
        console.log("[PRESENCE][INIT] entering step10", new Date().toISOString());
        window.__PRESENCE_HEARTBEAT_STARTED__ = true;
        console.log("[PRESENCE][INIT] heartbeat started");
        // Call once immediately
        if (typeof window.presenceHeartbeatOnce === "function") {
          window.presenceHeartbeatOnce();
        }
        // Set up interval (every 20 seconds)
        window.__PRESENCE_HEARTBEAT_TIMER__ = setInterval(() => {
          console.log("[PRESENCE][TICK]", new Date().toISOString());
          if (typeof window.presenceHeartbeatOnce === "function") {
            window.presenceHeartbeatOnce();
          }
        }, 20000);
      }

      // ====== 11) Start presence read polling ======
      if (!window.__PRESENCE_READ_STARTED__) {
        window.__PRESENCE_READ_STARTED__ = true;
        // Call once immediately
        if (typeof window.presenceReadOnce === "function") {
          window.presenceReadOnce();
        }
        // Set up interval (every 25 seconds)
        window.__PRESENCE_READ_TIMER__ = setInterval(() => {
          if (typeof window.presenceReadOnce === "function") {
            window.presenceReadOnce();
          }
        }, 25000);
      }

    } catch (err) {
      window.showErr?.(err);
    }
  }

  // run immediately (same behavior as original IIFE)
  initAppOnce();

})();
 /* ======================= END MODULE: 19_INIT ======================= */
