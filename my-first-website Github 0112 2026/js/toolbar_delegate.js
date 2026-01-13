/* =========================================================
  MODULE: 15_TOOLBAR_DELEGATE
  FILE: js/toolbar_delegate.js
  AREA: delegate toolbar ops to js/toolbar_ops.js
  NOTE:
    - No behavior change
    - Bind once (but WAIT until toolbar buttons exist)
========================================================= */

// ======================= BLOCK: 00_TOOLBAR_DELEGATE_START =======================
(function toolbarDelegate(){

  // ✅ 防止重複綁定（hot reload / 多次載入）
  if (window.__TOOLBAR_DELEGATE_BOUND__) return;
  window.__TOOLBAR_DELEGATE_BOUND__ = true;

  const OPS = window.DEFS?.TOOLBAR_OPS;
  if (!OPS?.bind || !OPS?.bindToolbarEvents) {
    console.warn("⚠️ TOOLBAR_OPS not ready: js/toolbar_ops.js not loaded?");
    return;
  }

  // ======================= BLOCK: 01_WAIT_TOOLBAR_BUTTONS_START =======================
  function ensureDelColBtnExists(){
    // ✅ 在「按鈕都已經 render 出來」後，才做 DOM 插入
    const add = document.getElementById("addColBtn");
    if (!add) return false;

    let del = document.getElementById("delColBtn");
    if (del) return true;

    del = document.createElement("button");
    del.id = "delColBtn";
    del.type = "button";
    del.textContent = "Delete Column";

    // 盡量沿用 addColBtn 的 class / style（看起來一致）
    if (add.className) del.className = add.className;
    del.style.marginLeft = "6px";
    del.style.display = "none"; // 先隱藏，讓 ops 的 sync 來控制

    add.insertAdjacentElement("afterend", del);
    return true;
  }

  function waitForToolbarThenBind(){
    let tries = 0;
    const MAX = 120;          // 最多等 120 次
    const GAP = 100;          // 每次等 100ms（最多等 12 秒）

    const timer = setInterval(() => {
      tries++;

      const addRow = document.getElementById("addRowBtn");
      const addCol = document.getElementById("addColBtn");

      // ✅ toolbar 真的出現了才綁
      if (addRow && addCol) {
        clearInterval(timer);

        // 先確保 delColBtn 有存在（沒有就補一顆）
        ensureDelColBtnExists();

        bindNow();
        return;
      }

      if (tries >= MAX) {
        clearInterval(timer);
        console.warn("⚠️ toolbar buttons not found (addRowBtn/addColBtn). Bind skipped.");
      }
    }, GAP);
  }
  // ======================= BLOCK: 01_WAIT_TOOLBAR_BUTTONS_END =======================


  // ======================= BLOCK: 02_BIND_CTX_AND_EVENTS_START =======================
  function bindNow(){
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

    // ✅ 綁完立刻同步一次（讓 Delete Column 有機會立刻顯示/隱藏）
    try{ OPS.syncDelColBtnVisibility?.(); } catch {}
  }
  // ======================= BLOCK: 02_BIND_CTX_AND_EVENTS_END =======================


  // ======================= BLOCK: 03_START_START =======================
  // ✅ 不要立刻綁：等 toolbar 按鈕真的出現
  waitForToolbarThenBind();
  // ======================= BLOCK: 03_START_END =======================

})();
// ======================= BLOCK: 00_TOOLBAR_DELEGATE_END =======================
