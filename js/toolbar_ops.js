// js/toolbar_ops.js
// ======================= BLOCK: 00_FILE_HEADER START =======================
console.log("✅ [toolbar_ops.js] loaded");

window.DEFS = window.DEFS || {};
window.DEFS.TOOLBAR_OPS = window.DEFS.TOOLBAR_OPS || {};


// ✅ GLOBAL SHIM: avoid ReferenceError on GitHub Pages
window._syncDelColBtnVisibility = window._syncDelColBtnVisibility || function(){
  try{
    const btn = document.getElementById("delColBtn");
    if (btn) btn.style.display = "";
  }catch(e){}
};

// ✅ GLOBAL shim (最重要)：任何地方呼叫都不會 ReferenceError
// 有人直接呼叫 `_syncDelColBtnVisibility()` 也能活
function _syncDelColBtnVisibility(){
  try{
    const btn = document.getElementById("delColBtn");
    if (btn) btn.style.display = "";
  } catch(_e){}
}
window._syncDelColBtnVisibility = _syncDelColBtnVisibility;
// ======================= BLOCK: 00_FILE_HEADER END =======================


(function installToolbarOps(){
  // ======================= BLOCK: 01_INSTALL_GUARD_START =======================
  if (window.__TOOLBAR_OPS_INSTALLED__) return;
  window.__TOOLBAR_OPS_INSTALLED__ = true;

  let CTX = null;

  function bind(ctx){
    CTX = ctx || {};
  }

  // ✅ 統一出口：本檔內部一律呼叫這個（不要再宣告同名 function 造成覆蓋混亂）
  function syncDelColBtnVisibility(){
    try{
      _syncDelColBtnVisibility(); // global shim
    } catch(_e){}
    try{
      _forceShowDelColBtn();
    } catch(_e){}
    try{
      _syncFloatingUI();
    } catch(_e){}
  }
  // ======================= BLOCK: 01_INSTALL_GUARD_END =======================


  // ======================= BLOCK: 02_HELPERS_START =======================
  function _roleIsAdminFallback(){
    const role = String(sessionStorage.getItem("role") || "user").toLowerCase();
    return role === "admin";
  }

  function _getActiveMode(){
    return (CTX && CTX.activeMode) ? CTX.activeMode : (window.activeMode || "model");
  }
  function _getActiveKey(){
    return (CTX && CTX.activeKey) ? CTX.activeKey : (window.activeKey || "company");
  }

  function _getDefMapByMode(mode){
    if (mode === "period") {
      return (
        (CTX && CTX.PERIOD_DEF_MAP) ||
        window.PERIOD_DEF_MAP ||
        window.DEFS?.PERIOD_DEF_MAP ||
        {}
      );
    }
    return (
      (CTX && CTX.MODEL_DEF_MAP) ||
      window.MODEL_DEF_MAP ||
      window.DEFS?.MODEL_DEF_MAP ||
      {}
    );
  }

  function _minColsForActiveSheet(){
    const mode = _getActiveMode();
    const key  = _getActiveKey();
    const map  = _getDefMapByMode(mode);
    const def  = map?.[key];
    const v = Number(def?.cols);
    return Number.isFinite(v) && v > 0 ? v : 1;
  }

  // ✅ 永遠顯示 Delete Column button
  function _forceShowDelColBtn(){
    const $ = (CTX && CTX.$) ? CTX.$ : ((id)=>document.getElementById(id));
    const btn = $("delColBtn");
    if (!btn) return;
    btn.style.display = "";
  }

  // ✅ 硬保護：有人把它藏起來，就立刻顯示回來
  function _installDelColBtnKeeper(){
    if (window.__DEL_COL_BTN_KEEPER_INSTALLED__) return;
    window.__DEL_COL_BTN_KEEPER_INSTALLED__ = true;

    function tick(){
      try{ _forceShowDelColBtn(); } catch(_e){}
    }

    tick();

    let n = 0;
    const timer = setInterval(() => {
      n++;
      tick();
      if (n >= 50) clearInterval(timer);
    }, 100);

    try{
      const obs = new MutationObserver(() => tick());
      obs.observe(document.documentElement, { attributes:true, subtree:true, childList:true });
    } catch(_e){}
  }

  function _makeSafeSheetName(name, used) {
    let base = String(name ?? "").trim() || "Sheet";
    base = base.replace(/[\[\]\:\*\?\/\\]/g, " ").slice(0, 31);

    let finalName = base, i = 2;
    while (used.has(finalName)) {
      const suffix = ` ${i}`;
      finalName = base.slice(0, 31 - suffix.length) + suffix;
      i++;
    }
    used.add(finalName);
    return finalName;
  }

  function _sheetToAOA_NoRowNumber(s, sheetKey){
    const { ensureSize, activeMode, ensureDafMeta } = CTX || {};
    if (ensureSize) ensureSize(s);

    if (activeMode === "period" && sheetKey === "daf") {
      if (ensureDafMeta) ensureDafMeta(s);

      const row1 = Array.from({ length: s.cols }, (_, c) => String(s.headers?.[c] ?? ""));
      const row2 = Array.from({ length: s.cols }, (_, c) => (c < 3 ? "" : String(s.meta?.dafDesc?.[c] ?? "")));
      const row3 = Array.from({ length: s.cols }, (_, c) => (c < 3 ? "" : String(s.meta?.dafEnt?.[c] ?? "")));

      const aoa = [row1, row2, row3];
      for (let r = 0; r < s.rows; r++) {
        aoa.push(Array.from({ length: s.cols }, (_, c) => (s.data?.[r]?.[c] ?? "")));
      }
      return aoa;
    }

    const aoa = [];
    aoa.push(Array.from({ length: s.cols }, (_, c) => (s.headers?.[c] ?? "")));
    for (let r = 0; r < s.rows; r++) {
      aoa.push(Array.from({ length: s.cols }, (_, c) => (s.data?.[r]?.[c] ?? "")));
    }
    return aoa;
  }
  // ======================= BLOCK: 02_HELPERS_END =======================


  // ======================= BLOCK: 02B_FLOATING_COL_UI_START =======================
  function _getSheet(){
    return (CTX && typeof CTX.activeSheet === "function")
      ? CTX.activeSheet()
      : (typeof window.activeSheet === "function" ? window.activeSheet() : null);
  }

  function _getRender(){
    return (CTX && typeof CTX.render === "function")
      ? CTX.render
      : (typeof window.render === "function" ? window.render : null);
  }

  function _save(){
    try{
      if (CTX && typeof CTX.saveToLocalByMode === "function") CTX.saveToLocalByMode(_getActiveMode());
    } catch {}
  }

  function _ensureHeadersLen(s){
    if (!Array.isArray(s.headers)) s.headers = [];
    while (s.headers.length < s.cols) s.headers.push("");
    if (s.headers.length > s.cols) s.headers.length = s.cols;
  }

  function _trimDataToCols(s){
    if (!Array.isArray(s.data)) return;
    for (let r=0; r<s.data.length; r++){
      if (Array.isArray(s.data[r])) s.data[r].length = s.cols;
    }
  }

  function _addCol(){
    const s = _getSheet();
    if (!s) return;

    s.cols = Number(s.cols||0) + 1;
    _ensureHeadersLen(s);

    try{ CTX?.ensureHeadersForActiveSheet?.(); } catch {}
    try{ CTX?.ensureSize?.(s); } catch {}

    const render = _getRender();
    if (render) render();
    _save();
    _syncFloatingUI();
    syncDelColBtnVisibility();
  }

  function _delCol(){
    const s = _getSheet();
    if (!s) return;

    const minCols = _minColsForActiveSheet();
    if (Number(s.cols||0) <= Number(minCols||0)) return;

    s.cols = Number(s.cols||0) - 1;
    _ensureHeadersLen(s);

    try{
      if (_getActiveMode() === "period" && _getActiveKey() === "daf" && s.meta){
        if (Array.isArray(s.meta.dafDesc)) s.meta.dafDesc.length = s.cols;
        if (Array.isArray(s.meta.dafEnt))  s.meta.dafEnt.length  = s.cols;
      }
    } catch {}

    _trimDataToCols(s);

    const render = _getRender();
    if (render) render();
    _save();
    _syncFloatingUI();
    syncDelColBtnVisibility();
  }

  function _syncFloatingUI(){
    const box = document.getElementById("__FLOAT_COL_BOX__");
    if (!box) return;

    const btnDel = document.getElementById("__FLOAT_COL_DEL__");
    const s = _getSheet();
    if (!btnDel || !s) return;

    const minCols = _minColsForActiveSheet();
    btnDel.style.display = (Number(s.cols||0) > Number(minCols||0)) ? "" : "none";
  }

  function _installFloatingColUI(){
    if (window.__FLOAT_COL_UI_INSTALLED__) return;
    window.__FLOAT_COL_UI_INSTALLED__ = true;

    const mount = () => {
      if (document.getElementById("__FLOAT_COL_BOX__")) { _syncFloatingUI(); return; }

      const box = document.createElement("div");
      box.id = "__FLOAT_COL_BOX__";
      box.style.position = "fixed";
      box.style.right = "14px";
      box.style.bottom = "14px";
      box.style.zIndex = "99999";
      box.style.background = "rgba(255,255,255,0.92)";
      box.style.border = "1px solid #ccc";
      box.style.borderRadius = "10px";
      box.style.padding = "8px";
      box.style.boxShadow = "0 6px 18px rgba(0,0,0,0.15)";
      box.style.fontFamily = "system-ui, -apple-system, Segoe UI, Arial";
      box.style.display = "flex";
      box.style.gap = "8px";
      box.style.alignItems = "center";

      const btnAdd = document.createElement("button");
      btnAdd.id = "__FLOAT_COL_ADD__";
      btnAdd.type = "button";
      btnAdd.textContent = "+ Col";
      btnAdd.style.padding = "6px 10px";
      btnAdd.style.borderRadius = "8px";
      btnAdd.style.border = "1px solid #999";
      btnAdd.style.cursor = "pointer";

      const btnDel = document.createElement("button");
      btnDel.id = "__FLOAT_COL_DEL__";
      btnDel.type = "button";
      btnDel.textContent = "- Col";
      btnDel.style.padding = "6px 10px";
      btnDel.style.borderRadius = "8px";
      btnDel.style.border = "1px solid #999";
      btnDel.style.cursor = "pointer";

      btnAdd.addEventListener("click", _addCol);
      btnDel.addEventListener("click", _delCol);

      box.appendChild(btnAdd);
      box.appendChild(btnDel);
      document.body.appendChild(box);

      _syncFloatingUI();

      try{
        const obs = new MutationObserver(() => _syncFloatingUI());
        obs.observe(document.documentElement, { childList:true, subtree:true });
      } catch {}
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", mount, { once:true });
    } else {
      mount();
    }
  }
  // ======================= BLOCK: 02B_FLOATING_COL_UI_END =======================


  // ======================= BLOCK: 03_BIND_TOOLBAR_EVENTS_START =======================
  function bindToolbarEvents(){
    if (!CTX) return;

    _installFloatingColUI();
    if (bindToolbarEvents.__bound) return;
    bindToolbarEvents.__bound = true;

    const {
      $, on, t, lang, isAdmin,
      sheets, activeSheet,
      ensureHeadersForActiveSheet, ensureSize, ensureDafMeta,
      saveToLocalByMode, loadPeriodList, savePeriodList, setActivePeriod,
      applySheetDefsByModeAndTrim, resetSheetsToBlankForMode,
      isSheetVisible, openPeriodModal,
      storageKeyByMode, documentMeta,
      showErr, downloadTextFile, csvCell,
      render, refreshUI, setActive, ensureActiveKeyVisible
    } = CTX;

    _installDelColBtnKeeper();
    _forceShowDelColBtn();
    syncDelColBtnVisibility();

    // Add Row
    on("addRowBtn","click", () => {
      const s = activeSheet();
      if (!s) return;
      s.rows += 1;
      render();
      saveToLocalByMode(CTX.activeMode);
      syncDelColBtnVisibility();
    });

    // Add Column
    on("addColBtn","click", () => {
      const s = activeSheet();
      if (!s) return;

      s.cols += 1;
      if (!Array.isArray(s.headers)) s.headers = [];
      while (s.headers.length < s.cols) s.headers.push(`Col ${s.headers.length + 1}`);

      ensureHeadersForActiveSheet();
      render();
      saveToLocalByMode(CTX.activeMode);
      syncDelColBtnVisibility();
    });

    // Delete Column (ALWAYS VISIBLE; block at minCols)
    on("delColBtn","click", () => {
      _forceShowDelColBtn();

      const s = activeSheet();
      if (!s) return;

      const minCols = _minColsForActiveSheet();
      if (Number(s.cols || 0) <= Number(minCols || 0)) {
        alert(t("alert_min_cols")(minCols));
        return;
      }

      s.cols -= 1;
      if (Array.isArray(s.headers)) s.headers.length = s.cols;

      if (CTX.activeMode === "period" && CTX.activeKey === "daf" && s.meta) {
        if (Array.isArray(s.meta.dafDesc)) s.meta.dafDesc.length = s.cols;
        if (Array.isArray(s.meta.dafEnt))  s.meta.dafEnt.length  = s.cols;
      }
      if (Array.isArray(s.data)) {
        for (let r=0; r<s.data.length; r++){
          if (Array.isArray(s.data[r])) s.data[r].length = s.cols;
        }
      }

      render();
      saveToLocalByMode(CTX.activeMode);
      syncDelColBtnVisibility();
    });

    // Export CSV (NO row-number column)
    on("exportCsvBtn","click", () => {
      const s = activeSheet();
      ensureHeadersForActiveSheet();
      ensureSize(s);

      const lines = [];

      if (CTX.activeMode === "period" && CTX.activeKey === "daf") {
        ensureDafMeta(s);

        const row1 = Array.from({ length: s.cols }, (_, c) => (s.headers[c] ?? ""));
        const row2 = Array.from({ length: s.cols }, (_, c) => (c < 3 ? "" : (s.meta.dafDesc[c] ?? "")));
        const row3 = Array.from({ length: s.cols }, (_, c) => (c < 3 ? "" : (s.meta.dafEnt[c] ?? "")));

        lines.push(row1.map(csvCell).join(","));
        lines.push(row2.map(csvCell).join(","));
        lines.push(row3.map(csvCell).join(","));
      } else {
        const header = Array.from({ length: s.cols }, (_, c) => (s.headers[c] ?? ""));
        lines.push(header.map(csvCell).join(","));
      }

      for (let r=0; r<s.rows; r++) {
        const row = Array.from({ length: s.cols }, (_, c) => (s.data[r][c] ?? ""));
        lines.push(row.map(csvCell).join(","));
      }

      // Generate filename with company, mode, period, and sheet name
      const company = (documentMeta?.companyName || sessionStorage.getItem("companyName") || "Company").trim();
      const modeTag = (CTX.activeMode === "period") ? "Period" : "Model";
      const periodTag = (CTX.activeMode === "period" && CTX.activePeriod) ? `_${CTX.activePeriod}` : "";
      const modeNow = _getActiveMode();
      const keyNow  = _getActiveKey();
      const mapNow  = _getDefMapByMode(modeNow);
      const KEY_TO_NAME = {
        company: "Company",
        bu: "Business Unit",
        cr: "Company Resource",
        ac: "Activity Center",
        nc: "Normal Capacity",
        act: "Activity",
        daf: "DAF",
        mach: "Machine",
        mat: "Material",
        pp: "Product/Process",
        prod: "Product",
        cust: "Customer",
        sd: "Sales/Distribution"
      };
      const sheetTag = String(
        KEY_TO_NAME[keyNow] || mapNow?.[keyNow]?.title || s?.title || keyNow || "Sheet"
      ).trim();
      let filename = `${company}_${modeTag}${periodTag}_${sheetTag}.csv`;
      
      // Sanitize filename: replace invalid characters with underscore
      filename = filename.replace(/[\\\/\:\*\?\"\<\>\|]/g, "_").replace(/\s+/g, " ").trim();

      const blob = new Blob([lines.join("\n")], { type:"text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      console.log("✅ [CSV DEBUG]", { company, modeTag, periodTag, sheetTag, filename, keyNow, modeNow, sheetTitle: s?.title, defTitle: mapNow?.[keyNow]?.title });
      a.click();
      URL.revokeObjectURL(url);
    });

    // Export XLSX (NO row-number column)
    on("exportXlsxBtn","click", () => {
      try {
        if (!window.XLSX) throw new Error("SheetJS 沒有載入成功（window.XLSX 不存在）");
        if (CTX.activeMode === "period" && !CTX.activePeriod) {
          alert(lang==="en"
            ? "Please create/select a Period (yyyy-mm) before exporting."
            : "請先建立或選擇一個 Period（yyyy-mm）再匯出。"
          );
          (window.DEFS?.PERIOD_UI?.openPeriodModal || openPeriodModal)?.();
          return;
        }

        const wb = window.XLSX.utils.book_new();
        wb.Props = wb.Props || {};
        wb.Props.Company = documentMeta.companyName || "";

        const used = new Set();
        const orderKeys = (CTX.activeMode === "period")
          ? ["company","bu","cr","ac","nc","act","daf","mach","mat","pp","prod","cust","mm","pmwip","epv","sr","rit","sd"]
          : ["company","bu","cr","ac","nc","act","daf","mach","mat","pp","prod","cust","sd"];

        orderKeys.forEach(k => {
          if (!isSheetVisible(CTX.activeMode, k)) return;
          const sh = sheets[k];
          if (!sh) return;

          if (CTX.activeMode === "period" && k === "daf") ensureDafMeta(sh);
          const ws = window.XLSX.utils.aoa_to_sheet(_sheetToAOA_NoRowNumber(sh, k));
          window.XLSX.utils.book_append_sheet(wb, ws, _makeSafeSheetName(sh.title, used));
        });

        // Generate filename with company, mode, and period
        const company = (documentMeta?.companyName || sessionStorage.getItem("companyName") || "Company").trim();
        let filename = (CTX.activeMode === "period") 
          ? `${company}_Period_${CTX.activePeriod}.xlsx`
          : `${company}_Model.xlsx`;
        
        // Sanitize filename: replace invalid characters with underscore
        filename = filename.replace(/[\\\/\:\*\?\"\<\>\|]/g, "_").replace(/\s+/g, " ").trim();
        
        window.XLSX.writeFile(wb, filename);
      } catch (err) { showErr(err); }
    });

    // JSON Export/Import (ADMIN ONLY) + HARD remove options for user
    (function adminOnlyJsonOps(){
      const admin =
        (typeof isAdmin === "function") ? !!isAdmin() : _roleIsAdminFallback();

      function removeEl(id){
        const el = $(id);
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }

      function scrubJsonOptionsEverywhere(){
        const selects = Array.from(document.querySelectorAll("select"));

        const shouldRemoveOption = (opt) => {
          const v  = String(opt?.value || "").toLowerCase().trim();
          const tx = String(opt?.text  || opt?.textContent || "").toLowerCase().trim();
          if (v === "export_json" || v === "import_json") return true;
          if (v === "exportjson" || v === "importjson") return true;
          if (tx.includes("export json")) return true;
          if (tx.includes("import json")) return true;
          if (tx.includes("workspace snapshot")) return true;
          if (tx.includes("load workspace snapshot")) return true;
          return false;
        };

        selects.forEach(sel => {
          const opts = Array.from(sel.options || []);
          let removed = false;

          opts.forEach(opt => {
            if (shouldRemoveOption(opt)) {
              if (sel.value === opt.value) sel.selectedIndex = 0;
              opt.remove();
              removed = true;
            }
          });

          if (removed) {
            const first = Array.from(sel.options || [])[0];
            if (first) sel.value = first.value;
          }
        });
      }

      function startHardScrub(){
        scrubJsonOptionsEverywhere();

        if (!window.__JSON_SCRUB_OBS__) {
          window.__JSON_SCRUB_OBS__ = true;
          const obs = new MutationObserver(() => {
            try { scrubJsonOptionsEverywhere(); } catch(_e){}
          });
          obs.observe(document.documentElement, { childList:true, subtree:true });
        }

        if (!window.__JSON_SCRUB_TIMER__) {
          let n = 0;
          window.__JSON_SCRUB_TIMER__ = setInterval(() => {
            n++;
            scrubJsonOptionsEverywhere();
            if (n >= 60) {
              clearInterval(window.__JSON_SCRUB_TIMER__);
              window.__JSON_SCRUB_TIMER__ = null;
            }
          }, 100);
        }

        setTimeout(scrubJsonOptionsEverywhere, 300);
        setTimeout(scrubJsonOptionsEverywhere, 1200);
        setTimeout(scrubJsonOptionsEverywhere, 2500);
      }

      if (!admin) {
        removeEl("exportJsonBtn");
        removeEl("importJsonBtn");
        removeEl("importJsonFile");
        startHardScrub();
        return;
      }

      on("exportJsonBtn","click", () => {
        try {
          if (CTX.activeMode === "period" && !CTX.activePeriod) {
            alert(lang==="en"
              ? "Please create/select a Period (yyyy-mm) before exporting."
              : "請先建立或選擇一個 Period（yyyy-mm）再匯出。"
            );
            openPeriodModal();
            return;
          }

          const filtered = {};
          Object.keys(sheets).forEach(k => {
            if (isSheetVisible(CTX.activeMode, k)) filtered[k] = sheets[k];
          });

          const payload = {
            version: 2,
            mode: CTX.activeMode,
            period: (CTX.activeMode==="period" ? CTX.activePeriod : ""),
            savedAt: new Date().toISOString(),
            sheets: filtered
          };

          downloadTextFile(
            CTX.activeMode === "period"
              ? `Period_${CTX.activePeriod}_workspace.json`
              : "Model_workspace.json",
            JSON.stringify(payload, null, 2),
            "application/json;charset=utf-8;"
          );
        } catch (err) { showErr(err); }
      });

      on("importJsonBtn","click", () => {
        const inp = $("importJsonFile");
        if (!inp) return;
        inp.value = "";
        inp.click();
      });

      on("importJsonFile","change", async () => {
        try {
          const file = $("importJsonFile")?.files?.[0];
          if (!file) return;

          const payload = JSON.parse(await file.text());
          const incomingSheets = payload?.sheets ?? payload;
          if (!incomingSheets || typeof incomingSheets !== "object") throw new Error("JSON 格式不正確：找不到 sheets");

          for (const k in incomingSheets) if (sheets[k]) Object.assign(sheets[k], incomingSheets[k]);

          if (payload?.mode === "model" || payload?.mode === "period") {
            if (payload.mode !== CTX.activeMode) CTX.activeMode = payload.mode;
          }

          if (CTX.activeMode === "period" && payload?.period && /^\d{4}-\d{2}$/.test(payload.period)) {
            const list = loadPeriodList();
            if (!list.includes(payload.period)) { list.push(payload.period); savePeriodList(list); }
            setActivePeriod(payload.period);
          }

          applySheetDefsByModeAndTrim();
          saveToLocalByMode(CTX.activeMode);

          CTX.activeKey = "company";
          ensureActiveKeyVisible();
          refreshUI();
          setActive(CTX.activeKey);

        } catch (err) { showErr(err); }
      });
    })();

    // Clear Local
    on("clearLocalBtn","click", () => {
      try {
        if (CTX.activeMode === "period") {
          if (!CTX.activePeriod) {
            alert(lang==="en" ? "No Period selected, cannot clear." : "目前沒有選 Period，無法清除。");
            return;
          }
          localStorage.removeItem(storageKeyByMode("period"));
          resetSheetsToBlankForMode("period");
          saveToLocalByMode("period");
        } else {
          localStorage.removeItem(storageKeyByMode("model"));
          resetSheetsToBlankForMode("model");
          saveToLocalByMode("model");
        }

        applySheetDefsByModeAndTrim();
        ensureActiveKeyVisible();
        refreshUI();
        setActive(CTX.activeKey);

        syncDelColBtnVisibility();
      } catch (err) { showErr(err); }
    });

  }
  // ======================= BLOCK: 03_BIND_TOOLBAR_EVENTS_END =======================


  // ======================= BLOCK: 04_EXPORTS_START =======================
  window.DEFS.TOOLBAR_OPS.bind = bind;
  window.DEFS.TOOLBAR_OPS.bindToolbarEvents = bindToolbarEvents;

  // ✅ 給其他模組呼叫：統一走我們的安全函式
  window.DEFS.TOOLBAR_OPS.syncDelColBtnVisibility = syncDelColBtnVisibility;
  // ======================= BLOCK: 04_EXPORTS_END =======================

  // ======================= BLOCK: 05_CLOUD_SAVE_DELEGATE_START =======================
  // Bind cloud save button using event delegation on stable toolbar container
  window.bindCloudSaveDelegateOnce = function bindCloudSaveDelegateOnce() {
    if (window.__saveDelegateBound) return;
    window.__saveDelegateBound = true;

    const root = document.getElementById("toolbarRoot") || document.querySelector(".toolbar");
    if (!root) {
      console.warn("[UI][SAVE] toolbar container not found, retrying...");
      window.__saveDelegateBound = false; // Reset guard on retry
      setTimeout(bindCloudSaveDelegateOnce, 100);
      return;
    }

    root.addEventListener("click", async (e) => {
      const btn = e.target.closest("#btnSaveCloudCompany");
      if (!btn) return;

      console.log("[UI][SAVE] trigger");

      const status = document.getElementById("cloudSaveStatus");
      if (!status) return;

      // Get active mode and key using same pattern as toolbar_ops
      const activeMode = (window.activeMode || "model").toLowerCase();
      const activeKey = (window.activeKey || "company");

      // Guard: Model/Company -> cloud save works; Period/Exchange Rate -> cloud save works
      if (activeMode === "model" && activeKey === "company") {
        // Existing behavior - cloud save works
      } else if (activeMode === "period" && activeKey === "exchange_rate") {
        // Period/Exchange Rate cloud save - Step 8
      } else {
        status.textContent = "Cloud save not enabled for this sheet";
        status.style.color = "#ef4444"; // red
        return;
      }

      // Disable button and set saving state
      btn.disabled = true;
      btn.textContent = "Saving…";
      status.textContent = "Saving…";
      status.style.color = ""; // default color

      try {
        // Call appropriate cloud write function based on mode/sheet
        let result;
        if (activeMode === "model" && activeKey === "company") {
          result = await (typeof window.cloudModelCompanyWriteOnce === "function"
            ? window.cloudModelCompanyWriteOnce({ reason: "manual_save" })
            : window.cloudModelCompanyWriteOnce());
        } else if (activeMode === "period" && activeKey === "exchange_rate") {
          result = await (typeof window.cloudPeriodExchangeRateWriteOnce === "function"
            ? window.cloudPeriodExchangeRateWriteOnce({ reason: "manual_save" })
            : window.cloudPeriodExchangeRateWriteOnce());
        } else {
          status.textContent = "Cloud save not enabled for this sheet";
          status.style.color = "#ef4444"; // red
          return;
        }

        if (result && result.ok) {
          // Success: show "Saved ✓ HH:MM:SS"
          const now = new Date();
          const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
          status.textContent = `Saved ✓ ${timeStr}`;
          status.style.color = ""; // default color (not red)
          if (activeMode === "model" && activeKey === "company") {
            console.log("[UI][SAVE][COMPANY] ok", { timestamp: now.toISOString() });
          } else if (activeMode === "period" && activeKey === "exchange_rate") {
            console.log("[UI][SAVE][PERIOD][EXCHANGE_RATE] ok", { timestamp: now.toISOString() });
          }
        } else {
          // Failure: show error message
          const errorMsg = result?.error || result?.reason || "Unknown error";
          status.textContent = `Save failed: ${errorMsg}`;
          status.style.color = "#ef4444"; // red
          if (activeMode === "model" && activeKey === "company") {
            console.log("[UI][SAVE][COMPANY] error", result);
          } else if (activeMode === "period" && activeKey === "exchange_rate") {
            console.log("[UI][SAVE][PERIOD][EXCHANGE_RATE] error", result);
          }
        }
      } catch (err) {
        // Catch any errors
        const errorMsg = err?.message || String(err) || "Unknown error";
        status.textContent = `Save failed: ${errorMsg}`;
        status.style.color = "#ef4444"; // red
        if (activeMode === "model" && activeKey === "company") {
          console.log("[UI][SAVE][COMPANY] error", err);
        } else if (activeMode === "period" && activeKey === "exchange_rate") {
          console.log("[UI][SAVE][PERIOD][EXCHANGE_RATE] error", err);
        }
      } finally {
        // Restore button state
        btn.disabled = false;
        btn.textContent = "Save to Cloud";
      }
    });

    console.log("[UI][SAVE] delegate_bound");
  };
  // ======================= BLOCK: 05_CLOUD_SAVE_DELEGATE_END =======================

})(); // end installToolbarOps IIFE

