/* =========================================================
  MODULE: 12B_REQUIRED_FIELDS_GUIDE
  AREA: Model > Company Resource (key: cr) required columns UI
  RULE: Do NOT modify header text (no asterisk, no extra words)
========================================================= */
(function requiredFieldsGuide(){

  const TARGET_MODE = "model";
  const TARGET_KEY  = "cr";

  const REQUIRED_HEADERS = new Set([
    "Resource Code",
    "Resource - Level 1",
    "Resource - Level 2",
    "Description",
    "A.C. or Value Object Type",
    "Resource Driver"
  ]);

  function normalizeHeader(s){
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  // ✅ 不直接依賴 window.activeMode / window.activeKey
  function getMode(){ try { return (typeof activeMode !== "undefined") ? activeMode : ""; } catch { return ""; } }
  function getKey(){  try { return (typeof activeKey  !== "undefined") ? activeKey  : ""; } catch { return ""; } }

  function isTargetContext(){
    return getMode() === TARGET_MODE && getKey() === TARGET_KEY;
  }

  function getRequiredColIndexes(){
    const s = (typeof activeSheet === "function") ? activeSheet() : null;
    if (!s) return [];
    const headers = Array.isArray(s.headers) ? s.headers : [];
    const cols = Number(s.cols || 0);

    const idx = [];
    for (let c=0; c<cols; c++){
      const h = normalizeHeader(headers[c]);
      if (REQUIRED_HEADERS.has(h)) idx.push(c);
    }
    return idx;
  }

  function clearAllMarks(){
    const thead = document.getElementById("gridHead");
    const tbody = document.getElementById("gridBody");
    thead?.querySelectorAll("th.req-col").forEach(th => th.classList.remove("req-col"));
    tbody?.querySelectorAll("td.req-col, td.req-missing").forEach(td => td.classList.remove("req-col","req-missing"));
  }

  function applyRequiredHeaderStyles(requiredCols){
    const thead = document.getElementById("gridHead");
    if (!thead) return;

    const tr = thead.querySelector("tr");
    if (!tr) return;

    tr.querySelectorAll("th.req-col").forEach(th => th.classList.remove("req-col"));

    requiredCols.forEach(c => {
      const th = tr.children?.[c + 1]; // +1 corner
      if (th) th.classList.add("req-col");
    });
  }

  function applyRequiredCellStylesAndMissing(requiredCols){
    const tbody = document.getElementById("gridBody");
    if (!tbody) return;

    tbody.querySelectorAll("td.req-col").forEach(td => td.classList.remove("req-col"));
    tbody.querySelectorAll("td.req-missing").forEach(td => td.classList.remove("req-missing"));

    requiredCols.forEach(c => {
      const tds = tbody.querySelectorAll(`td[data-c="${c}"]`);
      tds.forEach(td => {
        td.classList.add("req-col");
        const v = String(td.textContent || "").trim();
        if (v === "") td.classList.add("req-missing");
      });
    });
  }

  function applyAll(){
    if (!isTargetContext()){
      clearAllMarks();
      return;
    }
    const requiredCols = getRequiredColIndexes();
    applyRequiredHeaderStyles(requiredCols);
    applyRequiredCellStylesAndMissing(requiredCols);
  }

  /* ✅ hook render */
  (function hookRender(){
    function tryHook(){
      if (typeof window.render !== "function") return false;
      if (window.render.__requiredFieldsGuideHooked) return true;

      const _orig = window.render;
      window.render = function(){
        const ret = _orig.apply(this, arguments);
        try { applyAll(); } catch {}
        return ret;
      };
      window.render.__requiredFieldsGuideHooked = true;
      return true;
    }
    tryHook(); setTimeout(tryHook, 0); setTimeout(tryHook, 200); setTimeout(tryHook, 800);
  })();

  /* ✅ 即時 input */
  document.addEventListener("input", (e) => {
    if (!isTargetContext()) return;
    const td = e.target;
    if (!(td instanceof HTMLElement) || td.tagName !== "TD") return;

    const c = Number(td.dataset.c);
    if (!Number.isFinite(c)) return;

    const requiredCols = getRequiredColIndexes();
    if (!requiredCols.includes(c)) return;

    const v = String(td.textContent || "").trim();
    td.classList.add("req-col");
    td.classList.toggle("req-missing", v === "");
  }, true);

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => { try { applyAll(); } catch {} }, 0);
    setTimeout(() => { try { applyAll(); } catch {} }, 200);
  });

})();
