console.log("✅ [selection_events.js] loaded");

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
    //  Edit helpers
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

    function enterEditOnTD(td, evt){
      if (!td) return false;
      if (typeof window.enterEditMode !== "function") return false;
      window.enterEditMode(td, evt || {});
      setTimeout(() => placeCaretAtEnd(td), 0);
      setTimeout(() => placeCaretAtEnd(td), 50);
      return true;
    }

    function exitEdit(){
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

    function replaceCellWithChar(td, ch, evt){
      enterEditOnTD(td, evt);
      setTimeout(() => {
        try{
          td.textContent = ch;
          placeCaretAtEnd(td);
        } catch {}
      }, 0);
    }

    // =========================================================
    // ✅ TSV helpers for COPY/CUT (FIX: multi-cell copy guaranteed)
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

    // =========================================================
    //  TSV helpers (IMPORTANT: always use pasteTSVAt)
    // =========================================================
    function normalizeClipboardText(s){
      return String(s ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    }

    function parseTSVToMatrix(text){
      const t = normalizeClipboardText(text);

      if (!(t.includes("\t") || t.includes("\n"))){
        return [[t]];
      }

      let lines = t.split("\n");
      if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();

      const rows = lines.map(line => line.split("\t"));
      if (!rows.length) return [[""]];
      return rows;
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

    function doPasteTextExcelStyle(text){
      if (!API.hasSelection?.() || !API.Sel?.start) return;

      const rect = selectionRect();
      if (!rect) return;

      const clipMat = parseTSVToMatrix(text);

      const isSingleSel = (rect.rows === 1 && rect.cols === 1);

      if (isSingleSel){
        const t = normalizeClipboardText(text);
        API.pasteTSVAt?.(API.Sel.start.r, API.Sel.start.c, t);
        return;
      }

      const tiled = tileMatrixToSize(clipMat, rect.rows, rect.cols);
      const outTSV = matrixToTSV(tiled);
      API.pasteTSVAt?.(rect.top, rect.left, outTSV);
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

      // ✅ FIX: drag uses setSelection so copy is multi-cell
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

      if (window.__CELL_EDIT_MODE){
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

      const kl = (e.key || "").toLowerCase();
      if (kl === "delete" || kl === "backspace"){
        if (!API.hasSelection?.()) return;
        e.preventDefault();
        API.clearSelectedCells?.();
        safeApplySelectionDOM();
        clearCaret();
        return;
      }

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
        replaceCellWithChar(td, k, e);
        return;
      }
    }, true);

    // ✅ Copy/Cut/Paste（大量 cell）
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

      const tsv = selectionToTSV_ByDOM();
      if (!tsv) return;

      e.preventDefault();
      e.clipboardData?.setData("text/plain", tsv);

      setTimeout(() => {
        API.clearSelectedCells?.();
        if (typeof window.render === "function") window.render();
        safeApplySelectionDOM();
        clearCaret();
      }, 0);
    }, true);

    document.addEventListener("paste", (e) => {
      if (window.__CELL_EDIT_MODE) return;
      if (!API.hasSelection?.() || !API.Sel?.start) return;

      e.preventDefault();

      const text = e.clipboardData?.getData("text") ?? "";
      doPasteTextExcelStyle(text);

      setTimeout(() => {
        if (typeof window.render === "function") window.render();
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
