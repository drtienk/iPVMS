console.log("✅ company_row_lock.js loaded");

/* =========================================================
  MODULE: COMPANY_ROW_LOCK
  AREA: lock Model/company & Model/bu to 1 editable row only
        + disable Add Row / Add Column
  NOTE:
    - logic moved from app.js MODULE 12A
    - NO behavior change
========================================================= */
(function modelMasterRowLock(){

      if (window.__COMPANY_ROW_LOCK_INITED__) return;
  window.__COMPANY_ROW_LOCK_INITED__ = true;


  // 🔒 所有要鎖成「只填第一列」的 Model 分頁
  const LOCKED_SHEETS = [
    { mode:"model", key:"company", labelZh:"Company", labelEn:"Company" },
    { mode:"model", key:"bu",      labelZh:"Business Unit", labelEn:"Business Unit" },
  ];

  function isLockedContext(){
    try{
      return LOCKED_SHEETS.some(
        s => s.mode === activeMode && s.key === activeKey
      );
    } catch {
      return false;
    }
  }

  function currentSheetLabel(){
    const s = LOCKED_SHEETS.find(
      x => x.mode === activeMode && x.key === activeKey
    );
    if (!s) return "";
    return (lang === "en") ? s.labelEn : s.labelZh;
  }

  function enforceOneRow(sheetKey){
    const s = sheets?.[sheetKey];
    if (!s) return;

    s.rows = 1;
    if (typeof ensureSize === "function") ensureSize(s);

    // 只保留第 1 列資料
    s.data = [ (s.data[0] || []).slice(0) ];
    while (s.data[0].length < s.cols) s.data[0].push("");
  }

  function applyRowLocks(){
    if (!isLockedContext()) return;
    enforceOneRow(activeKey);
  }

  function styleDisabled(btn, disabled, title){
    if (!btn) return;
    btn.disabled = !!disabled;
    if (disabled){
      btn.style.opacity = "0.55";
      btn.style.cursor = "not-allowed";
      btn.title = title || "";
    } else {
      btn.style.opacity = "";
      btn.style.cursor = "";
      btn.title = "";
    }
  }

  function updateToolbarUI(){
    const addRowBtn = document.getElementById("addRowBtn");
    const addColBtn = document.getElementById("addColBtn");

    if (isLockedContext()){
      const name = currentSheetLabel();
      styleDisabled(addRowBtn, true, `${name} 分頁只允許填第一列，不能新增列。`);
      styleDisabled(addColBtn, true, `${name} 分頁欄位是固定的，不能新增欄。`);
    } else {
      styleDisabled(addRowBtn, false);
      styleDisabled(addColBtn, false);
    }
  }

  function showRuleMsg(){
    const name = currentSheetLabel();
    const msgZh = `${name} 分頁是系統設定資料，只允許填寫第一列。`;
    const msgEn = `${name} is master data. Only the first row is editable.`;

    if (typeof setCheckStatusForCurrentSheet === "function") {
      setCheckStatusForCurrentSheet(
        "warn",
        "Input Rule",
        (lang === "en" ? msgEn : msgZh)
      );
    }
  }

  function applyAll(){
    applyRowLocks();
    updateToolbarUI();
  }

  /* ========== hook setActive (切分頁) ========== */
  (function hookSetActive(){
    function tryHook(){
      if (typeof window.setActive !== "function") return false;
      if (window.setActive.__companyRowLockHooked) return true;

      const _orig = window.setActive;
      window.setActive = function(){
        const ret = _orig.apply(this, arguments);
        try { applyAll(); } catch {}
        return ret;
      };
      window.setActive.__companyRowLockHooked = true;
      return true;
    }
    tryHook(); setTimeout(tryHook,0); setTimeout(tryHook,200); setTimeout(tryHook,800);
  })();

  /* ========== hook switchMode (Model / Period) ========== */
  (function hookSwitchMode(){
    function tryHook(){
      if (typeof window.switchMode !== "function") return false;
      if (window.switchMode.__companyRowLockHooked) return true;

      const _orig = window.switchMode;
      window.switchMode = function(){
        const ret = _orig.apply(this, arguments);
        try { applyAll(); } catch {}
        return ret;
      };
      window.switchMode.__companyRowLockHooked = true;
      return true;
    }
    tryHook(); setTimeout(tryHook,0); setTimeout(tryHook,200); setTimeout(tryHook,800);
  })();

  /* ========== 強制擋 Add Row / Add Column（capture） ========== */
  window.addEventListener("DOMContentLoaded", () => {
    const addRowBtn = document.getElementById("addRowBtn");
    const addColBtn = document.getElementById("addColBtn");

    if (addRowBtn){
      addRowBtn.addEventListener("click", (e) => {
        if (!isLockedContext()) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        showRuleMsg();
      }, true);
    }

    if (addColBtn){
      addColBtn.addEventListener("click", (e) => {
        if (!isLockedContext()) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        showRuleMsg();
      }, true);
    }

    applyAll();
  });

  /* ========== render 後保險鎖一次 ========== */
  (function hookRender(){
    function tryHook(){
      if (typeof window.render !== "function") return false;
      if (window.render.__companyRowLockHooked) return true;

      const _orig = window.render;
      window.render = function(){
        if (isLockedContext()) applyRowLocks();
        const ret = _orig.apply(this, arguments);
        if (isLockedContext()) updateToolbarUI();
        return ret;
      };
      window.render.__companyRowLockHooked = true;
      return true;
    }
    tryHook(); setTimeout(tryHook,0); setTimeout(tryHook,200); setTimeout(tryHook,800);
  })();

})();
