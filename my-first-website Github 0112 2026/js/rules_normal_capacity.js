/* =========================================================
  MODULE: RULES_NORMAL_CAPACITY
  FILE: js/rules_normal_capacity.js
  AREA: Model > Normal Capacity (key: nc) validation rules
  GOAL:
    - Check only Row 1 (row index 0): Activity Code, Activity Name, Description
    - Mark missing cells with error styling (req-missing)
    - Show check result message (pass / error count)
    - Set checked status in sessionStorage when check passes
  SAFE TO REPLACE WHOLE FILE
========================================================= */

console.log("✅ [rules_normal_capacity.js] loaded");

(function installNormalCapacityRules(){

  const TARGET_MODE = "model";
  const TARGET_KEY  = "nc";
  const CHECKED_STATUS_KEY = "nc_checked_status"; // sessionStorage key

  // ✅ 必填欄位清單（與 required fields UI 使用同一份 source of truth）
  const REQUIRED_HEADERS = [
    "Activity Code",
    "Activity Name",
    "Description"
  ];

  // ✅ 文字正規化（與 required fields UI 一致）
  function norm(s){
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  // ✅ 根據表頭名稱找出欄位 index
  function findColIndexByHeader(sheet, headerName){
    if (!sheet) return -1;
    const target = norm(headerName);
    const headers = Array.isArray(sheet.headers) ? sheet.headers : [];
    for (let i = 0; i < headers.length; i++){
      if (norm(headers[i]) === target) return i;
    }
    return -1;
  }

  // ✅ 檢查儲存格是否為空（空字串、全空白、undefined、null）
  function isEmpty(value){
    if (value === undefined || value === null) return true;
    return norm(value) === "";
  }

  // ✅ 標記錯誤儲存格（加上 req-missing class）
  function markErrorCell(row, col){
    const tbody = document.getElementById("gridBody");
    if (!tbody) return;
    const td = tbody.querySelector(`td[data-r="${row}"][data-c="${col}"]`);
    if (td) td.classList.add("req-missing");
  }

  // ✅ 清除所有錯誤標記（只清除我們加的）
  function clearErrorMarks(){
    const tbody = document.getElementById("gridBody");
    if (!tbody) return;
    // 只清除有 req-col 的儲存格的 req-missing（避免誤傷其他規則）
    tbody.querySelectorAll("td.req-col.req-missing").forEach(td => {
      const c = Number(td.dataset.c);
      if (Number.isFinite(c)) {
        td.classList.remove("req-missing");
      }
    });
  }

  // ✅ 設定已檢查狀態
  function setCheckedStatus(checked){
    try {
      if (checked) {
        sessionStorage.setItem(CHECKED_STATUS_KEY, "1");
      } else {
        sessionStorage.removeItem(CHECKED_STATUS_KEY);
      }
      // 更新 tab UI
      updateTabCheckedUI(checked);
    } catch(e) {
      console.warn("Failed to set checked status:", e);
    }
  }

  // ✅ 取得已檢查狀態
  function getCheckedStatus(){
    try {
      return sessionStorage.getItem(CHECKED_STATUS_KEY) === "1";
    } catch(e) {
      return false;
    }
  }

  // ✅ 更新 tab 按鈕的已檢查狀態顯示
  function updateTabCheckedUI(checked){
    try {
      const tabBtn = document.getElementById("tabNC");
      if (!tabBtn) return;
      
      if (checked) {
        tabBtn.classList.add("tab-checked");
      } else {
        tabBtn.classList.remove("tab-checked");
      }
    } catch(e) {
      console.warn("Failed to update tab UI:", e);
    }
  }

  // ✅ 清除已檢查狀態（當資料被修改時）
  function clearCheckedStatus(){
    setCheckedStatus(false);
  }

  // ✅ 主檢查函數
  function checkNormalCapacity(){
    // 只在 Model 模式檢查
    if (typeof activeMode === "undefined" || activeMode !== TARGET_MODE) {
      return {
        ok: true,
        type: "warn",
        msg: (typeof lang !== "undefined" && lang === "en")
          ? "Skipped (Period mode)."
          : "略過（Period 模式不檢查）。"
      };
    }

    // 檢查是否在正確的分頁
    if (typeof activeKey === "undefined" || activeKey !== TARGET_KEY) {
      return {
        ok: false,
        type: "err",
        msg: (typeof lang !== "undefined" && lang === "en")
          ? "Internal error: not on Normal Capacity sheet."
          : "內部錯誤：不在 Normal Capacity 分頁。"
      };
    }

    // 取得 sheet 資料
    const sheet = (typeof activeSheet === "function") ? activeSheet() : null;
    if (!sheet) {
      return {
        ok: false,
        type: "err",
        msg: (typeof lang !== "undefined" && lang === "en")
          ? "Sheet data not found."
          : "找不到分頁資料。"
      };
    }

    // 確保資料大小正確
    if (typeof ensureSize === "function") {
      ensureSize(sheet);
    }

    // 找出必填欄位的 index
    const requiredCols = [];
    for (const headerName of REQUIRED_HEADERS){
      const colIdx = findColIndexByHeader(sheet, headerName);
      if (colIdx >= 0) {
        requiredCols.push(colIdx);
      }
    }

    if (requiredCols.length === 0) {
      return {
        ok: false,
        type: "err",
        msg: (typeof lang !== "undefined" && lang === "en")
          ? "Required headers not found in sheet."
          : "分頁中找不到必填欄位。"
      };
    }

    // 清除之前的錯誤標記
    clearErrorMarks();

    // ✅ 只檢查第 1 列（row index = 0）
    const rowToCheck = 0;
    const errors = [];

    for (const c of requiredCols){
      const value = sheet.data?.[rowToCheck]?.[c];
      if (isEmpty(value)){
        const headerName = REQUIRED_HEADERS[requiredCols.indexOf(c)];
        errors.push({ row: rowToCheck, col: c, header: headerName });
        markErrorCell(rowToCheck, c);
      }
    }

    // 產生結果訊息
    if (errors.length === 0) {
      // ✅ 檢查通過：設定已檢查狀態
      setCheckedStatus(true);
      
      return {
        ok: true,
        type: "ok",
        msg: (typeof lang !== "undefined" && lang === "en")
          ? "✅ Check passed. Row 1 required fields are filled."
          : "✅ 檢查通過。第 1 列必填欄位都已填寫。"
      };
    }

    // 有錯誤：清除已檢查狀態並顯示錯誤
    setCheckedStatus(false);
    
    const errorCount = errors.length;
    const missingHeaders = errors.map(e => e.header).join("、");
    
    const errorMsg = (typeof lang !== "undefined" && lang === "en")
      ? `⚠️ Found ${errorCount} missing required field${errorCount > 1 ? "s" : ""} in Row 1:\n${missingHeaders}`
      : `⚠️ 第 1 列發現 ${errorCount} 個必填欄位缺漏：\n${missingHeaders}`;

    return {
      ok: false,
      type: "err",
      msg: errorMsg,
      goto: {
        mode: TARGET_MODE,
        key: TARGET_KEY,
        r: errors[0].row,
        c: errors[0].col
      }
    };
  }

  // ✅ 監聽資料變更事件，自動清除已檢查狀態
  (function setupDataChangeListeners(){
    // 監聽 input 事件（cell edit）
    document.addEventListener("input", function(e){
      const td = e.target;
      if (!(td instanceof HTMLElement) || td.tagName !== "TD") return;
      
      // 檢查是否在 Normal Capacity 分頁
      if (typeof activeMode !== "undefined" && activeMode === TARGET_MODE &&
          typeof activeKey !== "undefined" && activeKey === TARGET_KEY) {
        clearCheckedStatus();
      }
    }, true);

    // 監聽 paste 事件
    document.addEventListener("paste", function(e){
      const td = e.target;
      if (!(td instanceof HTMLElement) || td.tagName !== "TD") return;
      
      if (typeof activeMode !== "undefined" && activeMode === TARGET_MODE &&
          typeof activeKey !== "undefined" && activeKey === TARGET_KEY) {
        clearCheckedStatus();
      }
    }, true);

    // 監聽 addRow/addCol 按鈕點擊
    function setupToolbarListeners(){
      const addRowBtn = document.getElementById("addRowBtn");
      const addColBtn = document.getElementById("addColBtn");
      
      if (addRowBtn && !addRowBtn.__ncCheckedListener) {
        addRowBtn.__ncCheckedListener = true;
        addRowBtn.addEventListener("click", function(){
          if (typeof activeMode !== "undefined" && activeMode === TARGET_MODE &&
              typeof activeKey !== "undefined" && activeKey === TARGET_KEY) {
            clearCheckedStatus();
          }
        });
      }
      
      if (addColBtn && !addColBtn.__ncCheckedListener) {
        addColBtn.__ncCheckedListener = true;
        addColBtn.addEventListener("click", function(){
          if (typeof activeMode !== "undefined" && activeMode === TARGET_MODE &&
              typeof activeKey !== "undefined" && activeKey === TARGET_KEY) {
            clearCheckedStatus();
          }
        });
      }
    }

    // 延遲設定，確保按鈕已存在
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setupToolbarListeners);
    } else {
      setupToolbarListeners();
    }
    setTimeout(setupToolbarListeners, 200);
    setTimeout(setupToolbarListeners, 800);
  })();

  // ✅ 初始化：載入已檢查狀態並更新 UI
  (function initCheckedStatus(){
    const checked = getCheckedStatus();
    updateTabCheckedUI(checked);
  })();

  // ✅ 匯出檢查函數和工具函數（給 custom_rules.js 使用）
  window.DEFS = window.DEFS || {};
  window.DEFS.CHECKS = window.DEFS.CHECKS || {};
  window.DEFS.CHECKS.normalCapacity = checkNormalCapacity;
  window.DEFS.CHECKS.normalCapacityUpdateTabUI = updateTabCheckedUI;

})();
