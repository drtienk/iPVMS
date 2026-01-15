/* =========================================================
  MODULE: 15D_USER_ADDED_COL_FLAG
  FILE: js/user_added_col_flag.js
  AREA: Track "user added column" only via Add Column button
  GOAL:
    - When clicking addColBtn => activeSheet().__userAddedCols = true
    - When clicking delColBtn and cols <= minCols => activeSheet().__userAddedCols = false
  NEW:
    - Force delColBtn ALWAYS visible (button may be hidden by other modules)
========================================================= */

// ======================= BLOCK: 00_WRAPPER_START =======================
(function userAddedColFlag(){
// ======================= BLOCK: 00_WRAPPER_END =======================


// ======================= BLOCK: 01_FLAG_HELPERS_START =======================
  function setFlagTrue(){
    try{
      if (typeof activeSheet !== "function") return;
      const s = activeSheet();
      if (!s) return;
      s.__userAddedCols = true;
    } catch {}
  }

  function setFlagFalseIfBackToMin(){
    try{
      if (typeof activeSheet !== "function") return;
      const s = activeSheet();
      if (!s) return;

      const minCols =
        (typeof minColsForActiveSheet === "function")
          ? minColsForActiveSheet()
          : 1;

      const cols = Number(s.cols || 0);
      if (cols <= Number(minCols || 0)) s.__userAddedCols = false;
    } catch {}
  }
// ======================= BLOCK: 01_FLAG_HELPERS_END =======================


// ======================= BLOCK: 02_FORCE_SHOW_DELBTN_START =======================
  // ✅ Force delColBtn ALWAYS visible (even if other modules hide it)
  function forceShowDelBtn(){
    try{
      const delBtn = document.getElementById("delColBtn");
      if (!delBtn) return;

      // 永遠顯示，不要再被 display:none 藏掉
      delBtn.style.display = "";
    } catch {}
  }
// ======================= BLOCK: 02_FORCE_SHOW_DELBTN_END =======================


// ======================= BLOCK: 03_BIND_ONCE_START =======================
  function bindOnce(){
    // ✅ 每次都先把刪欄按鈕拉回來（有人藏就救回來）
    forceShowDelBtn();

    const addBtn = document.getElementById("addColBtn");
    const delBtn = document.getElementById("delColBtn");

    if (addBtn && addBtn.dataset.__flagBound !== "1"){
      addBtn.dataset.__flagBound = "1";
      // capture: ensure runs even if other listeners stopPropagation
      addBtn.addEventListener("click", () => setFlagTrue(), true);
    }

    if (delBtn && delBtn.dataset.__flagBound !== "1"){
      delBtn.dataset.__flagBound = "1";
      delBtn.addEventListener("click", () => {
        // wait for the column deletion to happen first
        setTimeout(setFlagFalseIfBackToMin, 0);
      }, true);
    }
  }
// ======================= BLOCK: 03_BIND_ONCE_END =======================


// ======================= BLOCK: 04_BOOT_AND_GUARDS_START =======================
  window.addEventListener("DOMContentLoaded", () => {
    bindOnce();
    setTimeout(bindOnce, 200);
    setTimeout(bindOnce, 800);
  });

  // guard: toolbar sometimes re-rendered / overwritten
  setInterval(bindOnce, 600);
// ======================= BLOCK: 04_BOOT_AND_GUARDS_END =======================


// ======================= BLOCK: 05_END_START =======================
})();
// ======================= BLOCK: 05_END_END =======================
