/* =========================================================
  MODULE: 15D_USER_ADDED_COL_FLAG
  FILE: js/user_added_col_flag.js
  AREA: Track "user added column" only via Add Column button
  GOAL:
    - When clicking addColBtn => activeSheet().__userAddedCols = true
    - When clicking delColBtn and cols <= minCols => activeSheet().__userAddedCols = false
  NOTE:
    - Does NOT touch Activity Center Code n feature
    - Works even if other modules overwrite functions
========================================================= */
(function userAddedColFlag(){

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

  function bindOnce(){
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

  window.addEventListener("DOMContentLoaded", () => {
    bindOnce();
    setTimeout(bindOnce, 200);
    setTimeout(bindOnce, 800);
  });

  // guard: toolbar sometimes re-rendered / overwritten
  setInterval(bindOnce, 600);

})();
