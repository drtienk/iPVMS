/* =========================================================
  MODULE: NC_CHECK_BUTTON (簡化版 - 固定顯示)
  FILE: js/nc_check_button.js
  AREA: Normal Capacity 專用 Check 按鈕（固定顯示在右下角）
  GOAL:
    - 檔案一載入就立刻在畫面右下角插入固定按鈕和結果區塊
    - 點擊時執行 window.CHECKS_BY_SHEET?.nc?.() 並顯示結果
  SAFE TO REPLACE WHOLE FILE
========================================================= */

console.log("✅ [nc_check_button.js] loaded");

(function installNCCheckButton(){
  // ✅ 建立按鈕
  const btn = document.createElement("button");
  btn.id = "ncCheckBtn";
  btn.textContent = "NC Check";
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 16px;
    background: #8b5cf6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    z-index: 99998;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;

  // ✅ 建立結果顯示區塊
  const resultBox = document.createElement("div");
  resultBox.id = "ncCheckOut";
  resultBox.style.cssText = `
    position: fixed;
    bottom: 70px;
    right: 20px;
    padding: 12px 16px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 12px;
    font-family: monospace;
    white-space: pre-wrap;
    max-width: 400px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 99997;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    display: none;
  `;

  // ✅ 點擊事件
  btn.addEventListener("click", function(){
    // 先顯示 "clicked"
    resultBox.style.display = "block";
    resultBox.textContent = "clicked";
    resultBox.style.background = "#f3f4f6";
    resultBox.style.borderColor = "#d1d5db";
    resultBox.style.color = "#374151";

    // 執行檢查
    try {
      const CHECKS = window.CHECKS_BY_SHEET;
      if (!CHECKS || typeof CHECKS !== "object") {
        resultBox.textContent = "clicked\n\nError: CHECKS_BY_SHEET not found";
        resultBox.style.background = "#fee2e2";
        resultBox.style.borderColor = "#ef4444";
        resultBox.style.color = "#991b1b";
        return;
      }

      if (!CHECKS.nc || typeof CHECKS.nc !== "function") {
        resultBox.textContent = "clicked\n\nError: CHECKS_BY_SHEET.nc not found";
        resultBox.style.background = "#fee2e2";
        resultBox.style.borderColor = "#ef4444";
        resultBox.style.color = "#991b1b";
        return;
      }

      const res = CHECKS.nc();

      // 顯示結果
      if (res && typeof res === "object") {
        const msg = res.msg || "No message";
        resultBox.textContent = "clicked\n\n" + msg;

        // 根據類型設定顏色
        if (res.type === "ok") {
          resultBox.style.background = "#f0fdf4";
          resultBox.style.borderColor = "#86efac";
          resultBox.style.color = "#166534";
        } else if (res.type === "warn") {
          resultBox.style.background = "#fffbeb";
          resultBox.style.borderColor = "#f59e0b";
          resultBox.style.color = "#92400e";
        } else {
          resultBox.style.background = "#fee2e2";
          resultBox.style.borderColor = "#ef4444";
          resultBox.style.color = "#991b1b";
        }
      } else {
        resultBox.textContent = "clicked\n\nResult: " + String(res);
        resultBox.style.background = "#f3f4f6";
        resultBox.style.borderColor = "#d1d5db";
        resultBox.style.color = "#374151";
      }
    } catch(err) {
      resultBox.textContent = "clicked\n\nError: " + (err.message || String(err));
      resultBox.style.background = "#fee2e2";
      resultBox.style.borderColor = "#ef4444";
      resultBox.style.color = "#991b1b";
    }
  });

  // ✅ 插入到頁面
  function insertElements(){
    if (document.body) {
      document.body.appendChild(btn);
      document.body.appendChild(resultBox);
      console.log("✅ [nc_check_button] Button and result box inserted");
    } else {
      setTimeout(insertElements, 10);
    }
  }

  // ✅ 立即嘗試插入
  insertElements();

  // ✅ 延遲插入（確保 body 已存在）
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertElements);
  } else {
    setTimeout(insertElements, 0);
    setTimeout(insertElements, 100);
    setTimeout(insertElements, 500);
  }
})();
