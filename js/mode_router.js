console.log("✅ mode_router.js loaded");

window.DEFS = window.DEFS || {};
window.DEFS.ROUTER = window.DEFS.ROUTER || {};

(function installModeRouter(){

  // helpers
  function $id(id){ return window.DEFS?.UTILS?.$?.(id) || document.getElementById(id); }
  function on(id, evt, fn){ return window.DEFS?.UTILS?.on?.(id, evt, fn); }

  // --- core: setActive (CLEAN: no tabs DOM ops) ---
  function setActive(nextKey) {
    // activeMode / activeKey are globals in app.js
    if (typeof isSheetVisible === "function") {
      if (!isSheetVisible(activeMode, nextKey)) {
        const TAB_CONFIG = window.TAB_CONFIG || window.DEFS?.TABS?.TAB_CONFIG || [];
        const first = TAB_CONFIG.map(t => t.key).find(k => isSheetVisible(activeMode, k));
        nextKey = first || "company";
      }
    }

    if (activeMode === "period") {
      const allowed = new Set(Object.keys(window.PERIOD_DEF_MAP || window.DEFS?.PERIOD_DEF_MAP || {}));
      if (allowed.size && !allowed.has(nextKey)) nextKey = "company";
    }

    activeKey = nextKey;

    // ✅ delegate tabs UI only
    try { window.DEFS?.TABS_UI?.applyTabUI?.(); } catch {}

    // render the table
    if (typeof render === "function") render();
  }

  function refreshUI(){
    if (typeof syncModeUI === "function") syncModeUI();
    try { window.DEFS?.TABS_UI?.buildTabs?.(); } catch {}
    try { window.DEFS?.TABS_UI?.applyTabUI?.(); } catch {}
    if (typeof renderPeriodBar === "function") renderPeriodBar();
    if (typeof render === "function") render();
  }

  function switchMode(nextMode) {
    if (nextMode === activeMode) return;

    if (typeof saveToLocalByMode === "function") saveToLocalByMode(activeMode);
    try { for (const k in sheets) sheets[k].data = []; } catch {}

    activeMode = nextMode;
    try { sessionStorage.setItem("activeMode", activeMode); } catch {}

    if (typeof loadVisibility === "function") loadVisibility();

    if (activeMode === "period") {
      if (typeof renderPeriodBar === "function") renderPeriodBar();
      if (!activePeriod) {
        if (typeof openPeriodModal === "function") openPeriodModal();
        activeKey = "company";
        if (typeof refreshUI === "function") refreshUI();
        setActive(activeKey);
        return;
      }
    }

    if (typeof loadFromLocalByMode === "function") loadFromLocalByMode(activeMode);
    if (typeof applySheetDefsByModeAndTrim === "function") applySheetDefsByModeAndTrim();

    activeKey = "company";
    if (typeof ensureActiveKeyVisible === "function") ensureActiveKeyVisible();

    refreshUI();
    setActive(activeKey);
  }

  // bind events (same as your MODULE 14)
  function bindEvents(){
    on("btnModeModel","click", () => switchMode("model"));
    on("btnModePeriod","click", () => switchMode("period"));

    on("newPeriodBtn","click", () => (typeof openPeriodModal === "function") && openPeriodModal());

    on("periodSelect","change", () => {
      const sel = $id("periodSelect");
      const p = sel ? sel.value : "";
      if (!p) return;

      if (activeMode === "period" && activePeriod && typeof saveToLocalByMode === "function") {
        saveToLocalByMode("period");
      }

      if (typeof setActivePeriod === "function") setActivePeriod(p);

      try { for (const k in sheets) sheets[k].data = []; } catch {}
      if (typeof loadFromLocalByMode === "function") loadFromLocalByMode("period");

      const raw = localStorage.getItem((typeof storageKeyByMode === "function") ? storageKeyByMode("period") : "");
      if (!raw && typeof resetSheetsToBlankForMode === "function") {
        resetSheetsToBlankForMode("period");
        if (typeof saveToLocalByMode === "function") saveToLocalByMode("period");
      }

      if (typeof applySheetDefsByModeAndTrim === "function") applySheetDefsByModeAndTrim();

      activeKey = "company";
      if (typeof ensureActiveKeyVisible === "function") ensureActiveKeyVisible();
      refreshUI();
      setActive(activeKey);
    });

    on("periodModalClose","click", () => window.periodModalCtl?.close?.());
    on("periodCancelBtn","click", () => window.periodModalCtl?.close?.());

    on("periodCreateBtn","click", () => {
      const yy = $id("periodYear")?.value;
      const mm = $id("periodMonth")?.value;

      if (activeMode !== "period") activeMode = "period";
      try { sessionStorage.setItem("activeMode", "period"); } catch {}

      if (typeof createAndSwitchPeriod === "function") createAndSwitchPeriod(yy, mm);
      window.periodModalCtl?.close?.();
    });
  }

  // exports
  window.setActive = setActive;        // keep existing API
  window.refreshUI = refreshUI;
  window.switchMode = switchMode;

  window.DEFS.ROUTER.setActive = setActive;
  window.DEFS.ROUTER.refreshUI = refreshUI;
  window.DEFS.ROUTER.switchMode = switchMode;

  window.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    try { refreshUI(); } catch {}
  });

})();
