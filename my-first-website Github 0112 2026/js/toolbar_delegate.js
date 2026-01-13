/* =========================================================
  MODULE: 15_TOOLBAR_DELEGATE
  FILE: js/toolbar_delegate.js
  AREA: delegate toolbar ops to js/toolbar_ops.js
  NOTE:
    - No behavior change
    - Bind once
========================================================= */
(function toolbarDelegate(){

  // ✅ 防止重複綁定（hot reload / 多次載入）
  if (window.__TOOLBAR_DELEGATE_BOUND__) return;
  window.__TOOLBAR_DELEGATE_BOUND__ = true;

  const OPS = window.DEFS?.TOOLBAR_OPS;
  if (!OPS?.bind || !OPS?.bindToolbarEvents) {
    console.warn("⚠️ TOOLBAR_OPS not ready: js/toolbar_ops.js not loaded?");
    return;
  }

  // ✅ 建立 ctx（把 app.js 的依賴注入到 toolbar_ops）
  const ctx = {
    // utils
    $, on, showErr, csvCell, downloadTextFile,

    // i18n / lang
    t,
    get lang(){ return lang; },
    // role
    isAdmin,

    // core state + sheets
    sheets,
    activeSheet,

    // helpers needed by exports/imports
    ensureHeadersForActiveSheet,
    ensureSize,
    ensureDafMeta,

    // storage / period
    saveToLocalByMode,
    loadPeriodList,
    savePeriodList,
    setActivePeriod,
    storageKeyByMode,

    // mode defs
    PERIOD_DEF_MAP,
    MODEL_DEF_MAP,

    // visibility / export order filter
    isSheetVisible,

    // UI hooks
    openPeriodModal,
    applySheetDefsByModeAndTrim,
    resetSheetsToBlankForMode,
    ensureActiveKeyVisible,
    render: window.render,
    refreshUI: window.refreshUI,
    setActive: window.setActive,

    // meta
    documentMeta,
  };

  // ✅ 把 activeMode / activeKey / activePeriod 跟 app.js 變數「雙向連動」
  Object.defineProperty(ctx, "activeMode", {
    get(){ return activeMode; },
    set(v){ activeMode = v; }
  });
  Object.defineProperty(ctx, "activeKey", {
    get(){ return activeKey; },
    set(v){ activeKey = v; }
  });
  Object.defineProperty(ctx, "activePeriod", {
    get(){ return activePeriod; },
    set(v){ activePeriod = v; }
  });

  OPS.bind(ctx);
  OPS.bindToolbarEvents();

})();
