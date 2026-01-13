console.log("✅ [selection_core.js] loaded");

window.DEFS = window.DEFS || {};
window.DEFS.SELECTION_CORE = window.DEFS.SELECTION_CORE || {};

(function installSelectionCore(){

  window.DEFS.SELECTION_CORE.init = function initSelectionCore(ctx){
    ctx = ctx || {};
    console.log("✅ [selection_core.js] init");

    // ===== state =====
    const Sel = {
      isDown: false,
      start: null,   // anchor
      end: null,
      set: new Set()
    };

    function getGridBody(){
      try{
        // ctx.gridBody can be a getter in app.js
        return (ctx && ctx.gridBody) ? ctx.gridBody : document.getElementById("gridBody");
      } catch {
        return document.getElementById("gridBody");
      }
    }

    function cellKey(r,c){ return `${r},${c}`; }

    function getTDFromEventTarget(t){
      if (t instanceof HTMLElement) return t.closest("td");
      if (t && t.nodeType === 3 && t.parentElement) return t.parentElement.closest("td");
      return null;
    }

    function clearSelectionDOM(){
      const gridBody = getGridBody();
      if (!gridBody) return;
      gridBody.querySelectorAll("td.cell-selected, td.cell-anchor").forEach(td=>{
        td.classList.remove("cell-selected","cell-anchor");
      });
    }

    function rebuildSelectionSet(){
      Sel.set.clear();
      if (!Sel.start || !Sel.end) return;

      const r1 = Math.min(Sel.start.r, Sel.end.r);
      const r2 = Math.max(Sel.start.r, Sel.end.r);
      const c1 = Math.min(Sel.start.c, Sel.end.c);
      const c2 = Math.max(Sel.start.c, Sel.end.c);

      for (let r=r1; r<=r2; r++){
        for (let c=c1; c<=c2; c++){
          Sel.set.add(cellKey(r,c));
        }
      }
    }

    function applySelectionDOM(){
      const gridBody = getGridBody();
      if (!gridBody) return;

      clearSelectionDOM();
      rebuildSelectionSet();

      Sel.set.forEach(k=>{
        const [r,c] = k.split(",").map(Number);
        const td = gridBody.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
        if (td) td.classList.add("cell-selected");
      });

      if (Sel.start){
        const anchor = gridBody.querySelector(`td[data-r="${Sel.start.r}"][data-c="${Sel.start.c}"]`);
        anchor?.classList.add("cell-anchor");
      }
    }

    function setSelection(startRC, endRC){
      Sel.start = startRC;
      Sel.end = endRC;
      applySelectionDOM();
    }

    function hasSelection(){ return Sel.set && Sel.set.size > 0; }

    function selectionRect(){
      if (!Sel.start || !Sel.end) return null;
      const r1 = Math.min(Sel.start.r, Sel.end.r);
      const r2 = Math.max(Sel.start.r, Sel.end.r);
      const c1 = Math.min(Sel.start.c, Sel.end.c);
      const c2 = Math.max(Sel.start.c, Sel.end.c);
      return { r1, r2, c1, c2 };
    }

    function clearSelectedCells(){
      if (!hasSelection()) return;
      if (typeof ctx.activeSheet !== "function") return;
      if (typeof ctx.ensureSize !== "function") return;

      const s = ctx.activeSheet();
      if (!s) return;

      ctx.ensureSize(s);

      const gridBody = getGridBody();

      Sel.set.forEach(k=>{
        const [r,c] = k.split(",").map(Number);
        if (!Number.isFinite(r) || !Number.isFinite(c)) return;
        if (r < 0 || r >= s.rows) return;
        if (c < 0 || c >= s.cols) return;

        s.data[r][c] = "";
        const td = gridBody?.querySelector?.(`td[data-r="${r}"][data-c="${c}"]`);
        if (td) td.textContent = "";
      });

      if (typeof ctx.saveToLocalByMode === "function") ctx.saveToLocalByMode(ctx.activeMode);
    }

    function selectionToTSV(){
      const rect = selectionRect();
      if (!rect) return "";
      if (typeof ctx.activeSheet !== "function") return "";
      if (typeof ctx.ensureSize !== "function") return "";

      const s = ctx.activeSheet();
      if (!s) return "";

      ctx.ensureSize(s);

      const lines = [];
      for (let r=rect.r1; r<=rect.r2; r++){
        const row = [];
        for (let c=rect.c1; c<=rect.c2; c++){
          row.push(String(s.data?.[r]?.[c] ?? ""));
        }
        lines.push(row.join("\t"));
      }
      return lines.join("\n");
    }

    function pasteTSVAt(startR, startC, text){
      if (typeof ctx.activeSheet !== "function") return;
      if (typeof ctx.parseClipboardGrid !== "function") return;
      if (typeof ctx.ensureHeadersForActiveSheet !== "function") return;
      if (typeof ctx.ensureSize !== "function") return;

      const s = ctx.activeSheet();
      if (!s) return;

      const block = ctx.parseClipboardGrid(text);
      if (!block.length) return;

      const needRows = startR + block.length;
      const needCols = startC + Math.max(...block.map(row => row.length));

      if (needRows > s.rows) s.rows = needRows;
      if (needCols > s.cols) s.cols = needCols;

      ctx.ensureHeadersForActiveSheet();
      ctx.ensureSize(s);

      for (let r=0; r<block.length; r++) {
        for (let c=0; c<block[r].length; c++) {
          s.data[startR + r][startC + c] = block[r][c] ?? "";
        }
      }

      if (typeof ctx.render === "function") ctx.render();
      if (typeof ctx.saveToLocalByMode === "function") ctx.saveToLocalByMode(ctx.activeMode);

      const endR = startR + block.length - 1;
      const endC = startC + Math.max(...block.map(row => row.length)) - 1;
      setSelection({r:startR, c:startC}, {r:endR, c:endC});
    }

    function sameAsAnchor(td){
      if (!Sel.start) return false;
      return Number(td.dataset.r) === Sel.start.r && Number(td.dataset.c) === Sel.start.c;
    }

    function shiftClickSelect(td){
      const r = Number(td.dataset.r);
      const c = Number(td.dataset.c);
      if (!Number.isFinite(r) || !Number.isFinite(c)) return;

      if (!Sel.start){
        setSelection({r,c}, {r,c});
        return;
      }

      Sel.end = {r,c};
      applySelectionDOM();
    }

    // ===== export =====
    const api = {
      Sel,
      getGridBody,
      cellKey,
      getTDFromEventTarget,

      clearSelectionDOM,
      rebuildSelectionSet,
      applySelectionDOM,
      setSelection,
      hasSelection,
      selectionRect,

      clearSelectedCells,
      selectionToTSV,
      pasteTSVAt,

      sameAsAnchor,
      shiftClickSelect
    };

    window.DEFS.SELECTION_CORE.api = api;

    // keep old global names (compat)
    window.applySelectionDOM = applySelectionDOM;
    window.setSelection = setSelection;

    return api;
  };

})();
