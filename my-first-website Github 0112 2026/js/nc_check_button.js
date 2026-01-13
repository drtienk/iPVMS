/* =========================================================
  MODULE: NC_CHECK_BUTTON
  FILE: js/nc_check_button.js
  AREA: Normal Capacity 專用 Check 按鈕
  GOAL:
    - 只在 Normal Capacity (key="nc") 分頁顯示
    - 點擊時直接執行 window.CHECKS_BY_SHEET["nc"]()
    - 在按鈕旁顯示檢查結果（綠/紅底）
  SAFE TO REPLACE WHOLE FILE
========================================================= */

console.log("✅ [nc_check_button.js] loaded");

(function installNCCheckButton(){
  const TARGET_KEY = "nc";
  let ncCheckBtn = null;
  let resultBox = null;

  // ✅ 建立 NC Check 按鈕
  function createNCCheckButton(){
    if (ncCheckBtn) return ncCheckBtn; // 已存在，不重複建立

    const btn = document.createElement("button");
    btn.id = "ncCheckBtn";
    btn.type = "button";
    btn.className = "btn-violet";
    btn.style.marginLeft = "8px";
    btn.textContent = "NC Check";

    // ✅ 點擊事件：直接執行 window.CHECKS_BY_SHEET["nc"]()
    btn.addEventListener("click", function(){
      // 清除之前的結果
      clearResult();

      // 檢查 CHECKS_BY_SHEET 是否存在
      const CHECKS = window.CHECKS_BY_SHEET;
      if (!CHECKS || typeof CHECKS !== "object") {
        showResult("err", "CHECKS_BY_SHEET not found");
        return;
      }

      // 檢查 nc 規則是否存在
      if (!CHECKS.nc || typeof CHECKS.nc !== "function") {
        showResult("err", "NC check rule not found");
        return;
      }

      // 執行檢查
      try {
        const res = CHECKS.nc();
        
        // 顯示結果
        if (res && typeof res === "object") {
          showResult(res.type || "ok", res.msg || "Check completed");
        } else {
          showResult("ok", "Check completed");
        }
      } catch(err) {
        showResult("err", "Error: " + (err.message || String(err)));
      }
    });

    ncCheckBtn = btn;
    return btn;
  }

  // ✅ 建立結果顯示區塊
  function createResultBox(){
    if (resultBox) return resultBox; // 已存在，不重複建立

    const box = document.createElement("div");
    box.id = "ncCheckResult";
    box.style.cssText = `
      display: inline-block;
      margin-left: 12px;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      white-space: pre-wrap;
      max-width: 400px;
      vertical-align: middle;
    `;

    resultBox = box;
    return box;
  }

  // ✅ 顯示結果
  function showResult(type, msg){
    if (!resultBox) {
      createResultBox();
    }

    // 確保結果區塊已插入到 DOM
    if (!resultBox.parentNode) {
      if (ncCheckBtn && ncCheckBtn.parentNode) {
        // 插入到按鈕後面
        ncCheckBtn.parentNode.insertBefore(resultBox, ncCheckBtn.nextSibling);
      } else if (document.body) {
        // 如果按鈕不在 DOM 中，插入到 body
        document.body.appendChild(resultBox);
      }
    }

    resultBox.style.display = "inline-block";
    resultBox.textContent = msg || "";

    // 根據類型設定顏色
    if (type === "ok") {
      resultBox.style.background = "#f0fdf4";
      resultBox.style.border = "1px solid #86efac";
      resultBox.style.color = "#166534";
    } else if (type === "warn") {
      resultBox.style.background = "#fffbeb";
      resultBox.style.border = "1px solid #f59e0b";
      resultBox.style.color = "#92400e";
    } else {
      resultBox.style.background = "#fee2e2";
      resultBox.style.border = "1px solid #ef4444";
      resultBox.style.color = "#991b1b";
    }
  }

  // ✅ 清除結果
  function clearResult(){
    if (resultBox) {
      resultBox.style.display = "none";
      resultBox.textContent = "";
    }
  }

  // ✅ 顯示按鈕（當 activeKey === "nc" 時）
  function showButton(){
    if (typeof activeKey === "undefined" || activeKey !== TARGET_KEY) {
      return;
    }

    // 確保按鈕已建立
    if (!ncCheckBtn) {
      createNCCheckButton();
    }

    // 如果按鈕已經在 DOM 中，直接顯示
    if (ncCheckBtn.parentNode) {
      ncCheckBtn.style.display = "inline-block";
      return;
    }

    // 尋找插入位置：優先插入到 toolbar（在 checkBtn 之後）
    const toolbar = document.querySelector(".toolbar");
    if (toolbar) {
      const checkBtn = document.getElementById("checkBtn");
      if (checkBtn && checkBtn.parentNode === toolbar) {
        // 插入到 checkBtn 之後
        toolbar.insertBefore(ncCheckBtn, checkBtn.nextSibling);
      } else {
        // 如果找不到 checkBtn，插入到 toolbar 最後
        toolbar.appendChild(ncCheckBtn);
      }
    } else {
      // 如果沒有 toolbar，插入到 body 最上方
      if (document.body) {
        const firstChild = document.body.firstChild;
        if (firstChild) {
          document.body.insertBefore(ncCheckBtn, firstChild);
        } else {
          document.body.appendChild(ncCheckBtn);
        }
      }
    }

    // 顯示按鈕
    if (ncCheckBtn) {
      ncCheckBtn.style.display = "inline-block";
    }
  }

  // ✅ 隱藏按鈕（當離開 nc 分頁時）
  function hideButton(){
    if (ncCheckBtn) {
      ncCheckBtn.style.display = "none";
    }
    clearResult();
  }

  // ✅ 監聽 activeKey 變化
  function checkAndUpdate(){
    if (typeof activeKey !== "undefined" && activeKey === TARGET_KEY) {
      showButton();
    } else {
      hideButton();
    }
  }

  // ✅ Hook setActive 函數來監聽分頁切換
  function hookSetActive(){
    if (typeof window.setActive !== "function") return false;
    if (window.setActive.__ncCheckButtonHooked) return true;

    const _orig = window.setActive;
    window.setActive = function(nextKey){
      const ret = _orig.apply(this, arguments);
      // 延遲檢查，確保 activeKey 已更新
      setTimeout(checkAndUpdate, 0);
      return ret;
    };
    window.setActive.__ncCheckButtonHooked = true;
    return true;
  }

  // ✅ 定期檢查 activeKey 變化（備用機制）
  let lastActiveKey = null;
  function watchActiveKey(){
    const currentKey = typeof activeKey !== "undefined" ? activeKey : null;
    if (currentKey !== lastActiveKey) {
      lastActiveKey = currentKey;
      checkAndUpdate();
    }
  }

  // ✅ 初始化
  function init(){
    // 嘗試 hook setActive
    hookSetActive();
    
    // 檢查當前 activeKey
    checkAndUpdate();
    
    // 定期檢查（備用機制）
    setInterval(watchActiveKey, 300);
  }

  // ✅ 立即初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ✅ 延遲初始化（確保 toolbar 和 setActive 已存在）
  setTimeout(function(){
    hookSetActive();
    checkAndUpdate();
  }, 100);
  setTimeout(function(){
    hookSetActive();
    checkAndUpdate();
  }, 500);
  setTimeout(function(){
    hookSetActive();
    checkAndUpdate();
  }, 1000);

  console.log("✅ [nc_check_button] NC Check button installed");
})();
