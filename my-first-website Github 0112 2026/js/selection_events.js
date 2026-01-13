console.log("✅ [selection_events.js] loaded (UNDO: cell-level + paste)");

window.DEFS = window.DEFS || {};
window.DEFS.SELECTION_EVENTS = window.DEFS.SELECTION_EVENTS || {};

(function installSelectionEvents(){

  function tryBindOnce(){
    const API = window.DEFS?.SELECTION_CORE?.api;
    if (!API) return false;

    if (window.__SELECTION_EVENTS_BINDED__) return true;
    window.__SELECTION_EVENTS_BINDED__ = true;

    // =========================================================
    //  Excel-like Visual Override Layer (black active cell vs blue range)
    // =========================================================
    const VIS = {
      activeTD: null,
      rangeTDs: [],
      activeOutline: "2px solid #000",
      rangeBg: "rgba(120, 170, 255, 0.25)"
    };

    function clearCaret(){
      try{
        const sel = window.getSelection?.();
        if (sel) sel.removeAllRanges();
      } catch {}
    }

    function clearVisual(){
      try{
        if (VIS.activeTD){
          VIS.activeTD.style.outline = "";
          VIS.activeTD.style.outlineOffset = "";
        }
        VIS.rangeTDs.forEach(td => td.style.background = "");
      } catch {}
      VIS.activeTD = null;
      VIS.rangeTDs = [];
    }

    function inRect(r, c, r1, c1, r2, c2){
      const rr1 = Math.min(r1, r2), rr2 = Math.max(r1, r2);
      const cc1 = Math.min(c1, c2), cc2 = Math.max(c1, c2);
      return r >= rr1 && r <= rr2 && c >= cc1 && c <= cc2;
    }

    function getGridBody(){
      return API.getGridBody?.() || null;
    }

    function getTDByRC(r, c){
      const gridBody = getGridBody();
      if (!gridBody) return null;
      return gridBody.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
    }

    function selectionIsSingleCell(){
      const s = API.Sel?.start, e = API.Sel?.end;
      if (!s || !e) return false;
      return (Number(s.r) === Number(e.r) && Number(s.c) === Number(e.c));
    }

    function getSelectedTDsByDOM(){
      const s = API.Sel?.start, e = API.Sel?.end;
      const gridBody = getGridBody();
      if (!gridBody || !s || !e) return [];

      const r1 = Number(s.r), c1 = Number(s.c);
      const r2 = Number(e.r), c2 = Number(e.c);
      if (![r1,c1,r2,c2].every(Number.isFinite)) return [];

      const tds = Array.from(gridBody.querySelectorAll("td[data-r][data-c]"));
      return tds.filter(td => {
        const r = Number(td.dataset.r), c = Number(td.dataset.c);
        return Number.isFinite(r) && Number.isFinite(c) && inRect(r,c,r1,c1,r2,c2);
      });
    }

    function applyExcelVisual(){
      clearVisual();

      if (!API.Sel?.start || !API.Sel?.end) return;

      if (selectionIsSingleCell()){
        const r = Number(API.Sel.start.r);
        const c = Number(API.Sel.start.c);
        const td = getTDByRC(r, c);
        if (!td) return;

        td.style.outline = VIS.activeOutline;
        td.style.outlineOffset = "-2px";
        td.style.background = "";

        VIS.activeTD = td;
      } else {
        const tds = getSelectedTDsByDOM();
        tds.forEach(td => td.style.background = VIS.rangeBg);
        VIS.rangeTDs = tds;
      }
    }

    function safeApplySelectionDOM(){
      API.applySelectionDOM?.();
      applyExcelVisual();
      setTimeout(applyExcelVisual, 0);
      setTimeout(applyExcelVisual, 30);
    }

    // =========================================================
    //  TSV helpers
    // =========================================================
    function selectionRect(){
      const s = API.Sel?.start, e = API.Sel?.end;
      if (!s || !e) return null;

      const r1 = Number(s.r), c1 = Number(s.c);
      const r2 = Number(e.r), c2 = Number(e.c);
      if (![r1,c1,r2,c2].every(Number.isFinite)) return null;

      const top = Math.min(r1, r2);
      const left = Math.min(c1, c2);
      const bottom = Math.max(r1, r2);
      const right = Math.max(c1, c2);

      return { top, left, bottom, right, rows: bottom-top+1, cols: right-left+1 };
    }

    function selectionToTSV_ByDOM(){
      const rect = selectionRect();
      if (!rect) return "";

      const lines = [];
      for (let r = rect.top; r <= rect.bottom; r++){
        const row = [];
        for (let c = rect.left; c <= rect.right; c++){
          const td = getTDByRC(r, c);
          row.push(String(td?.textContent ?? "").replace(/\r?\n/g, " "));
        }
        lines.push(row.join("\t"));
      }
      return lines.join("\n");
    }

    function regionToTSV(top, left, rows, cols){
      const lines = [];
      for (let r = top; r < top + rows; r++){
        const row = [];
        for (let c = left; c < left + cols; c++){
          const td = getTDByRC(r, c);
          row.push(String(td?.textContent ?? "").replace(/\r?\n/g, " "));
        }
        lines.push(row.join("\t"));
      }
      return lines.join("\n");
    }

    function normalizeClipboardText(s){
      return String(s ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    }

    function parseTSVToMatrix(text){
      const t = normalizeClipboardText(text);
      if (!(t.includes("\t") || t.includes("\n"))) return [[t]];

      let lines = t.split("\n");
      if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
      const rows = lines.map(line => line.split("\t"));
      return rows.length ? rows : [[""]];
    }

    function matrixToTSV(mat){
      return mat.map(row => row.join("\t")).join("\n");
    }

    function tileMatrixToSize(src, outRows, outCols){
      const srcRows = src.length || 1;
      const srcCols = Math.max(1, ...src.map(r => r.length || 1));

      const out = [];
      for (let r = 0; r < outRows; r++){
        const row = [];
        for (let c = 0; c < outCols; c++){
          const v = (src[r % srcRows] && src[r % srcRows][c % srcCols] !== undefined)
            ? src[r % srcRows][c % srcCols]
            : "";
          row.push(String(v ?? ""));
        }
        out.push(row);
      }
      return out;
    }

    // =========================================================
    //  ✅ Undo/Redo stack (CELL/RECT level)
    // =========================================================
    const HIST = { undo: [], redo: [], max: 200, busy:false };

    function pushHist(step){
      if (!step) return;
      if (step.beforeTSV === step.afterTSV) return;
      HIST.undo.push(step);
      if (HIST.undo.length > HIST.max) HIST.undo.shift();
      HIST.redo.length = 0;
    }

    function applyTSVAt(top, left, tsv){
      // must use engine to update data model
      if (typeof API.pasteTSVAt === "function"){
        API.pasteTSVAt(top, left, tsv);
      } else {
        // fallback (should not happen)
        const mat = parseTSVToMatrix(tsv);
        for (let rr = 0; rr < mat.length; rr++){
          for (let cc = 0; cc < (mat[rr]?.length || 0); cc++){
            const td = getTDByRC(top + rr, left + cc);
            if (td) td.textContent = String(mat[rr][cc] ?? "");
          }
        }
      }
    }

    function doUndo(){
      if (HIST.busy) return;
      const step = HIST.undo.pop();
      if (!step) return;
      HIST.busy = true;

      applyTSVAt(step.top, step.left, step.beforeTSV);

      setTimeout(() => {
        try{ if (typeof window.render === "function") window.render(); }catch{}
        safeApplySelectionDOM();
        clearCaret();
        HIST.redo.push(step);
        HIST.busy = false;
      }, 0);
    }

    function doRedo(){
      if (HIST.busy) return;
      const step = HIST.redo.pop();
      if (!step) return;
      HIST.busy = true;

      applyTSVAt(step.top, step.left, step.afterTSV);

      setTimeout(() => {
        try{ if (typeof window.render === "function") window.render(); }catch{}
        safeApplySelectionDOM();
        clearCaret();
        HIST.undo.push(step);
        HIST.busy = false;
      }, 0);
    }

    // =========================================================
    //  Edit helpers + cell-level commit
    // =========================================================
    function placeCaretAtEnd(td){
      try{
        const sel = window.getSelection?.();
        if (!sel) return;
        const range = document.createRange();
        range.selectNodeContents(td);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch {}
    }

    // one active edit session
    const EDIT = { active:false, r:null, c:null, td:null, before:"" };

    function beginEditSession(td){
      try{
        const r = Number(td?.dataset?.r);
        const c = Number(td?.dataset?.c);
        if (!Number.isFinite(r) || !Number.isFinite(c)) return false;

        EDIT.active = true;
        EDIT.r = r; EDIT.c = c; EDIT.td = td;
        EDIT.before = String(td?.textContent ?? "");
        return true;
      }catch{
        return false;
      }
    }

    function commitEditSession(){
      if (!EDIT.active) return;
      try{
        const after = String(EDIT.td?.textContent ?? "");
        const before = String(EDIT.before ?? "");
        if (before !== after){
          pushHist({ top: EDIT.r, left: EDIT.c, rows: 1, cols: 1, beforeTSV: before, afterTSV: after });
        }
      }catch{}
      EDIT.active = false;
      EDIT.r = EDIT.c = null;
      EDIT.td = null;
      EDIT.before = "";
    }

    function enterEditOnTD(td, evt){
      if (!td) return false;
      if (typeof window.enterEditMode !== "function") return false;

      // start session BEFORE entering edit mode
      beginEditSession(td);

      window.enterEditMode(td, evt || {});
      setTimeout(() => placeCaretAtEnd(td), 0);
      setTimeout(() => placeCaretAtEnd(td), 50);
      return true;
    }

    function exitEdit(){
      // commit BEFORE leaving edit mode
      commitEditSession();
      if (typeof window.exitEditMode === "function") window.exitEditMode();
    }

    function moveSelectionDown(){
      const s = API.Sel?.start;
      if (!s) return;

      const r = Number(s.r), c = Number(s.c);
      if (!Number.isFinite(r) || !Number.isFinite(c)) return;

      const tdNext = getTDByRC(r + 1, c);
      if (!tdNext) return;

      API.setSelection?.({ r: r + 1, c }, { r: r + 1, c });
      safeApplySelectionDOM();
      clearCaret();
    }

    function replaceFirstCharAndStayEditing(td, ch, evt){
      // Excel: start typing overwrites cell (one edit session)
      enterEditOnTD(td, evt);
      setTimeout(() => {
        try{
          td.textContent = String(ch ?? "");
          placeCaretAtEnd(td);
        } catch {}
      }, 0);
    }

    // =========================================================
    //  Paste (keep your original fill behavior) + record undo
    // =========================================================
    function doPasteTextExcelStyle_WithUndo(text){
      if (!API.hasSelection?.() || !API.Sel?.start) return;

      const rect = selectionRect();
      if (!rect) return;

      const beforeTSV = regionToTSV(rect.top, rect.left, rect.rows, rect.cols);

      const clipMat = parseTSVToMatrix(text);
      const isSingleSel = (rect.rows === 1 && rect.cols === 1);

      if (isSingleSel){
        const t = normalizeClipboardText(text);
        applyTSVAt(rect.top, rect.left, t);
      } else {
        const tiled = tileMatrixToSize(clipMat, rect.rows, rect.cols);
        const outTSV = matrixToTSV(tiled);
        applyTSVAt(rect.top, rect.left, outTSV);
      }

      setTimeout(() => {
        const afterTSV = regionToTSV(rect.top, rect.left, rect.rows, rect.cols);
        pushHist({ top: rect.top, left: rect.left, rows: rect.rows, cols: rect.cols, beforeTSV, afterTSV });
      }, 0);
    }

    // =========================================================
    //  Drag state
    // =========================================================
    const DRAG = { down:false, moved:false, downAt:{x:0,y:0} };
    function markDown(e){
      DRAG.down = true;
      DRAG.moved = false;
      DRAG.downAt = { x: e.clientX || 0, y: e.clientY || 0 };
    }
    function markUp(){
      DRAG.down = false;
      DRAG.moved = false;
    }
    function movedEnough(e){
      const dx = Math.abs((e.clientX || 0) - DRAG.downAt.x);
      const dy = Math.abs((e.clientY || 0) - DRAG.downAt.y);
      return (dx + dy) >= 4;
    }

    // =========================================================
    //  Events
    // =========================================================
    document.addEventListener("mousedown", (e) => {
      const gridBody = getGridBody();
      if (!gridBody || !(e.target instanceof Node) || !gridBody.contains(e.target)) return;

      const td = API.getTDFromEventTarget?.(e.target);
      if (!td) return;

      const key = `${td.dataset.r},${td.dataset.c}`;
      if (window.__CELL_EDIT_MODE && window.__EDIT_CELL_KEY === key) return;

      exitEdit();

      e.preventDefault();
      clearCaret();

      if (e.shiftKey){
        API.shiftClickSelect?.(td);
        API.Sel.isDown = false;
        safeApplySelectionDOM();
        clearCaret();
        return;
      }

      const r = Number(td.dataset.r);
      const c = Number(td.dataset.c);
      if (!Number.isFinite(r) || !Number.isFinite(c)) return;

      API.Sel.isDown = true;
      API.setSelection?.({r,c}, {r,c});
      safeApplySelectionDOM();
      clearCaret();

      markDown(e);
    }, true);

    document.addEventListener("mouseover", (e) => {
      if (window.__CELL_EDIT_MODE) return;
      if (!API.Sel?.isDown) return;

      const gridBody = getGridBody();
      if (!gridBody || !(e.target instanceof Node) || !gridBody.contains(e.target)) return;

      if (DRAG.down && movedEnough(e)) DRAG.moved = true;

      const td = API.getTDFromEventTarget?.(e.target);
      if (!td) return;

      const r = Number(td.dataset.r);
      const c = Number(td.dataset.c);
      if (!Number.isFinite(r) || !Number.isFinite(c)) return;

      const s = API.Sel?.start;
      if (s && Number.isFinite(Number(s.r)) && Number.isFinite(Number(s.c)) && typeof API.setSelection === "function"){
        API.setSelection({ r:Number(s.r), c:Number(s.c) }, { r, c });
      } else {
        API.Sel.end = {r,c};
      }

      safeApplySelectionDOM();
      clearCaret();
    }, true);

    document.addEventListener("mouseup", () => {
      API.Sel.isDown = false;
      markUp();
      clearCaret();
    }, true);

    document.addEventListener("dblclick", (e) => {
      const gridBody = getGridBody();
      if (!gridBody || !(e.target instanceof Node) || !gridBody.contains(e.target)) return;

      const td = API.getTDFromEventTarget?.(e.target);
      if (!td) return;

      e.preventDefault();

      const r = Number(td.dataset.r);
      const c = Number(td.dataset.c);
      if (Number.isFinite(r) && Number.isFinite(c)){
        API.setSelection?.({r,c}, {r,c});
        safeApplySelectionDOM();
      }

      enterEditOnTD(td, e);
    }, true);

    document.addEventListener("keydown", (e) => {
      const ae = document.activeElement;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;

      const kl = (e.key || "").toLowerCase();
      const isMod = (e.ctrlKey || e.metaKey);

      // ✅ Excel-like Undo/Redo: always cell-level (even in edit mode)
      if (isMod && kl === "z"){
        e.preventDefault();
        if (e.shiftKey) doRedo();
        else doUndo();
        return;
      }
      if (isMod && kl === "y"){
        e.preventDefault();
        doRedo();
        return;
      }

      if (window.__CELL_EDIT_MODE){
        // Commit on Enter (then move down)
        if (e.key === "Enter"){
          e.preventDefault();
          exitEdit();
          moveSelectionDown();
        }
        return;
      }

      if (e.key === "Enter"){
        if (!API.hasSelection?.()) return;
        e.preventDefault();
        moveSelectionDown();
        return;
      }

      if (kl === "delete" || kl === "backspace"){
        if (!API.hasSelection?.()) return;

        const rect = selectionRect();
        if (!rect) return;

        const beforeTSV = regionToTSV(rect.top, rect.left, rect.rows, rect.cols);

        e.preventDefault();
        API.clearSelectedCells?.();

        setTimeout(() => {
          try{ if (typeof window.render === "function") window.render(); }catch{}
          safeApplySelectionDOM();
          clearCaret();

          const afterTSV = regionToTSV(rect.top, rect.left, rect.rows, rect.cols);
          pushHist({ top: rect.top, left: rect.left, rows: rect.rows, cols: rect.cols, beforeTSV, afterTSV });
        }, 0);
        return;
      }

      // Start typing: overwrite cell and stay editing; Undo will revert whole cell
      const k = e.key || "";
      const isPrintable = (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey);
      if (isPrintable){
        if (!API.hasSelection?.() || !API.Sel?.start) return;
        if (!selectionIsSingleCell()) return;

        const r = Number(API.Sel.start.r);
        const c = Number(API.Sel.start.c);
        if (!Number.isFinite(r) || !Number.isFinite(c)) return;

        const td = getTDByRC(r, c);
        if (!td) return;

        e.preventDefault();
        replaceFirstCharAndStayEditing(td, k, e);
        return;
      }
    }, true);

    // ✅ Copy/Cut/Paste
    document.addEventListener("copy", (e) => {
      if (window.__CELL_EDIT_MODE) return;
      if (!API.hasSelection?.()) return;

      const tsv = selectionToTSV_ByDOM();
      if (!tsv) return;

      e.preventDefault();
      e.clipboardData?.setData("text/plain", tsv);
    }, true);

    document.addEventListener("cut", (e) => {
      if (window.__CELL_EDIT_MODE) return;
      if (!API.hasSelection?.()) return;

      const rect = selectionRect();
      if (!rect) return;

      const beforeTSV = regionToTSV(rect.top, rect.left, rect.rows, rect.cols);
      if (!beforeTSV) return;

      e.preventDefault();
      e.clipboardData?.setData("text/plain", beforeTSV);

      setTimeout(() => {
        API.clearSelectedCells?.();
        try{ if (typeof window.render === "function") window.render(); }catch{}
        safeApplySelectionDOM();
        clearCaret();

        const afterTSV = regionToTSV(rect.top, rect.left, rect.rows, rect.cols);
        pushHist({ top: rect.top, left: rect.left, rows: rect.rows, cols: rect.cols, beforeTSV, afterTSV });
      }, 0);
    }, true);

    document.addEventListener("paste", (e) => {
      if (window.__CELL_EDIT_MODE) return;
      if (!API.hasSelection?.() || !API.Sel?.start) return;

      e.preventDefault();

      const text = e.clipboardData?.getData("text") ?? "";
      doPasteTextExcelStyle_WithUndo(text);

      setTimeout(() => {
        try{ if (typeof window.render === "function") window.render(); }catch{}
        safeApplySelectionDOM();
        clearCaret();
      }, 0);
    }, true);

    setTimeout(() => {
      safeApplySelectionDOM();
      clearCaret();
    }, 0);

    return true;
  }

  function bind(){
    if (window.__SELECTION_EVENTS_BINDED__) return true;
    if (tryBindOnce()) return true;

    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (tryBindOnce()) clearInterval(timer);
      else if (tries >= 50){
        clearInterval(timer);
        console.warn("⚠️ SELECTION_EVENTS bind timeout: SELECTION_CORE api still not ready");
      }
    }, 100);

    return false;
  }

  window.DEFS.SELECTION_EVENTS.bind = bind;

})();
