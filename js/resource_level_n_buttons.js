/* =========================================================
  MODULE: 12E_RESOURCE_LEVEL_N_BUTTONS
  FILE: js/resource_level_n_buttons.js
  AREA: Model > Company Resource (key: cr)
        Add / Remove Resource-Level n columns
        - Buttons are bilingual (EN / ZH)
========================================================= */
(function resourceLevelNButtons(){

  const TARGET_MODE = "model";
  const TARGET_KEY  = "cr";

  function getMode(){ return (typeof activeMode !== "undefined") ? activeMode : ""; }
  function getKey(){  return (typeof activeKey  !== "undefined") ? activeKey  : ""; }
  function getLang(){ return (typeof lang !== "undefined" && lang === "en") ? "en" : "zh"; }

  function isTarget(){
    return getMode() === TARGET_MODE && getKey() === TARGET_KEY;
  }

  /* ===============================
     ✅ Button label (bilingual)
  =============================== */
  function addBtnLabel(){
    return (getLang() === "en")
      ? "Add Resource-Level n"
      : "新增 Resource-Level n";
  }

  function delBtnLabel(){
    return (getLang() === "en")
      ? "Remove Resource-Level n"
      : "刪除 Resource-Level n";
  }

  function norm(s){ return String(s || "").replace(/\s+/g, " ").trim(); }

  function ensureUI(){
    let wrap = document.getElementById("resourceLevelNBar");
    if (wrap) return wrap;

    const toolbar = document.querySelector(".toolbar");
    if (!toolbar) return null;

    wrap = document.createElement("div");
    wrap.id = "resourceLevelNBar";
    wrap.style.display = "none";
    wrap.style.gap = "8px";
    wrap.style.margin = "6px 0 10px";
    wrap.style.flexWrap = "wrap";
    wrap.style.alignItems = "center";

    wrap.innerHTML = `
      <button type="button" id="btnAddResLevelN" class="btn-ok" style="padding:6px 10px;"></button>
      <button type="button" id="btnDelResLevelN" class="btn-danger" style="padding:6px 10px;"></button>
    `;

    toolbar.insertAdjacentElement("afterend", wrap);

    wrap.querySelector("#btnAddResLevelN")
      .addEventListener("click", addNextLevel);
    wrap.querySelector("#btnDelResLevelN")
      .addEventListener("click", removeLastLevel);

    updateButtonText();
    return wrap;
  }

  function updateButtonText(){
    const addBtn = document.getElementById("btnAddResLevelN");
    const delBtn = document.getElementById("btnDelResLevelN");
    if (addBtn) addBtn.textContent = addBtnLabel();
    if (delBtn) delBtn.textContent = delBtnLabel();
  }

  function showHideUI(){
    const wrap = ensureUI();
    if (!wrap) return;
    wrap.style.display = isTarget() ? "flex" : "none";
    updateButtonText();
  }

  /* ===============================
     Sheet helpers
  =============================== */
  function getSheet(){
    return (typeof activeSheet === "function") ? activeSheet() : null;
  }

  function parseLevelHeader(h){
    const t = norm(h);
    let m = t.match(/^Resource\s*-\s*Level\s*(\d+)$/i);
    if (m) return Number(m[1]);
    m = t.match(/^資源\s*[-－]?\s*層級\s*(\d+)$/);
    if (m) return Number(m[1]);
    return null;
  }

  function makeLevelHeader(n){
    return (getLang() === "en")
      ? `Resource - Level ${n}`
      : `資源 - 層級 ${n}`;
  }

  function getMaxLevel(headers){
    let max = 2;
    (headers || []).forEach(h => {
      const n = parseLevelHeader(h);
      if (Number.isFinite(n)) max = Math.max(max, n);
    });
    return max;
  }

  function findInsertIndex(headers){
    let maxLv = 2, idx = -1;
    headers.forEach((h, i) => {
      const n = parseLevelHeader(h);
      if (Number.isFinite(n) && n >= maxLv) {
        maxLv = n; idx = i;
      }
    });
    return idx >= 0 ? idx + 1 : headers.length;
  }

  function addNextLevel(){
    if (!isTarget()) return;
    const s = getSheet(); if (!s) return;

    const nextLv = getMaxLevel(s.headers) + 1;
    if (s.headers.some(h => parseLevelHeader(h) === nextLv)) return;

    const insertAt = findInsertIndex(s.headers);
    s.headers.splice(insertAt, 0, makeLevelHeader(nextLv));

    s.data.forEach(r => r.splice(insertAt, 0, ""));
    s.cols += 1;

    render();
    saveToLocalByMode(getMode());
  }

  function removeLastLevel(){
    if (!isTarget()) return;
    const s = getSheet(); if (!s) return;

    const maxLv = getMaxLevel(s.headers);
    if (maxLv < 3) return;

    const idx = s.headers.findIndex(h => parseLevelHeader(h) === maxLv);
    if (idx < 0) return;

    s.headers.splice(idx, 1);
    s.data.forEach(r => r.splice(idx, 1));
    s.cols -= 1;

    render();
    saveToLocalByMode(getMode());
  }

  /* ===============================
     Hooks (tab / lang switch)
  =============================== */
  function hook(fnName){
    const fn = window[fnName];
    if (typeof fn !== "function" || fn.__resLevelBtnHooked) return;

    window[fnName] = function(){
      const r = fn.apply(this, arguments);
      try { showHideUI(); } catch {}
      return r;
    };
    window[fnName].__resLevelBtnHooked = true;
  }

  window.addEventListener("DOMContentLoaded", () => {
    ensureUI();
    showHideUI();
  });

  ["render","refreshUI","setActive","switchMode","setLang"].forEach(hook);

})();
