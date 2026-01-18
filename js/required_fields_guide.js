/* =========================================================
  MODULE: 12B_REQUIRED_FIELDS_GUIDE
  AREA: Model > Company Resource (key: cr) required columns UI
        Period > Exchange Rate (key: company) required columns UI (row 0 only)
  RULE: Do NOT modify header text (no asterisk, no extra words)
========================================================= */
(function requiredFieldsGuide(){

  const TARGET_MODE_CR = "model";
  const TARGET_KEY_CR  = "cr";
  const TARGET_MODE_EX = "period";
  const TARGET_KEY_EX  = "company";

  const REQUIRED_HEADERS_CR = new Set([
    "Resource Code",
    "Resource - Level 1",
    "Resource - Level 2",
    "Description",
    "A.C. or Value Object Type",
    "Resource Driver"
  ]);

  const REQUIRED_HEADERS_EX = new Set([
    "Business Unit Currency",
    "Company Currency",
    "Exchange Rate"
  ]);

  function normalizeHeader(s){
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  // ✅ 不直接依賴 window.activeMode / window.activeKey
  function getMode(){ try { return (typeof activeMode !== "undefined") ? activeMode : ""; } catch { return ""; } }
  function getKey(){  try { return (typeof activeKey  !== "undefined") ? activeKey  : ""; } catch { return ""; } }

  function isTargetContext(){
    const mode = getMode();
    const key = getKey();
    return (mode === TARGET_MODE_CR && key === TARGET_KEY_CR) ||
           (mode === TARGET_MODE_EX && key === TARGET_KEY_EX);
  }

  function getRequiredColIndexes(){
    const s = (typeof activeSheet === "function") ? activeSheet() : null;
    if (!s) return [];
    const headers = Array.isArray(s.headers) ? s.headers : [];
    const cols = Number(s.cols || 0);
    const mode = getMode();
    const key = getKey();

    const requiredSet = (mode === TARGET_MODE_EX && key === TARGET_KEY_EX)
      ? REQUIRED_HEADERS_EX
      : (mode === TARGET_MODE_CR && key === TARGET_KEY_CR)
        ? REQUIRED_HEADERS_CR
        : null;

    if (!requiredSet) return [];

    const idx = [];
    for (let c=0; c<cols; c++){
      const h = normalizeHeader(headers[c]);
      if (requiredSet.has(h)) idx.push(c);
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

    const mode = getMode();
    const key = getKey();
    // For Period/exchange_rate, only apply to row 0 (data row index 0, displayed as row 1)
    const requiredRowIndexes = (mode === TARGET_MODE_EX && key === TARGET_KEY_EX) ? [0] : null;

    requiredCols.forEach(c => {
      const tds = tbody.querySelectorAll(`td[data-c="${c}"]`);
      tds.forEach(td => {
        // If requiredRowIndexes is set, only apply to those rows
        if (requiredRowIndexes) {
          const r = Number(td.dataset.r);
          if (!Number.isFinite(r) || !requiredRowIndexes.includes(r)) return;
        }
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
    const r = Number(td.dataset.r);
    if (!Number.isFinite(c)) return;

    const mode = getMode();
    const key = getKey();
    // For Period/exchange_rate, only apply to row 0
    if (mode === TARGET_MODE_EX && key === TARGET_KEY_EX) {
      if (!Number.isFinite(r) || r !== 0) return;
    }

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
