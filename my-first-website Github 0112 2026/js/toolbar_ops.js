// js/toolbar_ops.js
// ======================= BLOCK: 00_FILE_HEADER START =======================
console.log("✅ [toolbar_ops.js] loaded");

window.DEFS = window.DEFS || {};
window.DEFS.TOOLBAR_OPS = window.DEFS.TOOLBAR_OPS || {};
// ======================= BLOCK: 00_FILE_HEADER END =======================

(function installToolbarOps(){
  // ======================= BLOCK: 01_INSTALL_GUARD_START =======================
  if (window.__TOOLBAR_OPS_INSTALLED__) return;
  window.__TOOLBAR_OPS_INSTALLED__ = true;

  let CTX = null;

  function bind(ctx){
    CTX = ctx || {};
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

  // ✅ 保底：如果頁面沒有 delColBtn，就自動生一顆放在 addColBtn 旁邊
  function _ensureDelColBtnExists(){
    const $ = (CTX && CTX.$) ? CTX.$ : ((id)=>document.getElementById(id));
    let btn = $("delColBtn");
    if (btn) return btn;

    const addBtn = $("addColBtn");
    if (!addBtn) return null;

    btn = document.createElement("button");
    btn.id = "delColBtn";
    btn.type = "button";
    btn.textContent = "Delete Column";
    btn.style.display = "none"; // 先隱藏，交給 sync 控制
    btn.style.marginLeft = "6px";

    // 放在 addColBtn 後面
    addBtn.insertAdjacentElement("afterend", btn);

    // 立刻把 click 綁到你原本的 on("delColBtn",...)（若 on 有事件代理會自動吃到）
    return btn;
  }

  // ✅ 防止 toolbar 重畫把按鈕弄丟：觀察 DOM，丟了就補回來
  function _startDelColBtnGuard(){
    if (window.__DEL_COL_BTN_GUARD__) return;
    window.__DEL_COL_BTN_GUARD__ = true;

    const kick = () => {
      try { _ensureDelColBtnExists(); } catch {}
      try { _syncDelColBtnVisibility(); } catch {}
    };

    kick();

    // observer
    try{
      const obs = new MutationObserver(() => kick());
      obs.observe(document.documentElement, { childList:true, subtree:true });
    } catch {}

    // 短時間 interval 保險（避免 observer 沒抓到）
    let n = 0;
    const timer = setInterval(() => {
      n++;
      kick();
      if (n >= 40) clearInterval(timer); // 約 4 秒
    }, 100);
  }

  function _syncDelColBtnVisibility(){
    const $ = (CTX && CTX.$) ? CTX.$ : ((id)=>document.getElementById(id));
    const btn = $("delColBtn") || _ensureDelColBtnExists();
    if (!btn) return;

    const s = (CTX && typeof CTX.activeSheet === "function")
      ? CTX.activeSheet()
      : (typeof window.activeSheet === "function" ? window.activeSheet() : null);

    if (!s) { btn.style.display = "none"; return; }

    const minCols = _minColsForActiveSheet();
    btn.style.display = (Number(s.cols || 0) > Number(minCols || 0)) ? "" : "none";
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
    const { ensureSize, activeMode, ensureDafMeta } = CTX;
    ensureSize(s);

    if (activeMode === "period" && sheetKey === "daf") {
      ensureDafMeta(s);

      const row1 = Array.from({ length: s.cols }, (_, c) => String(s.headers[c] ?? ""));
      const row2 = Array.from({ length: s.cols }, (_, c) => (c < 3 ? "" : String(s.meta.dafDesc[c] ?? "")));
      const row3 = Array.from({ length: s.cols }, (_, c) => (c < 3 ? "" : String(s.meta.dafEnt[c] ?? "")));

      const aoa = [row1, row2, row3];
      for (let r = 0; r < s.rows; r++) {
        aoa.push(Array.from({ length: s.cols }, (_, c) => (s.data[r][c] ?? "")));
      }
      return aoa;
    }

    const aoa = [];
    aoa.push(Array.from({ length: s.cols }, (_, c) => (s.headers[c] ?? "")));
    for (let r = 0; r < s.rows; r++) {
      aoa.push(Array.from({ length: s.cols }, (_, c) => (s.data[r][c] ?? "")));
    }
    return aoa;
  }
  // ======================= BLOCK: 02_HELPERS_END =======================




  // ======================= BLOCK: 03_BIND_TOOLBAR_EVENTS_START =======================
  function bindToolbarEvents(){
    if (!CTX) return;
    _startDelColBtnGuard();
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

    // -------------------------
    // Add Row
    // -------------------------
    on("addRowBtn","click", () => {
      activeSheet().rows += 1;
      render();
      saveToLocalByMode(CTX.activeMode);
      _syncDelColBtnVisibility();
    });

    // -------------------------
    // Add Column
    // -------------------------
    on("addColBtn","click", () => {
      const s = activeSheet();
      s.cols += 1;

      if (!Array.isArray(s.headers)) s.headers = [];
      while (s.headers.length < s.cols) s.headers.push("");

      ensureHeadersForActiveSheet();
      render();
      saveToLocalByMode(CTX.activeMode);

      _syncDelColBtnVisibility();
    });

    // -------------------------
    // Delete Column
    // -------------------------
    on("delColBtn","click", () => {
      const s = activeSheet();
      const minCols = _minColsForActiveSheet();
      if (s.cols <= minCols) { alert(t("alert_min_cols")(minCols)); _syncDelColBtnVisibility(); return; }

      s.cols -= 1;
      if (Array.isArray(s.headers)) s.headers.length = s.cols;

      if (CTX.activeMode === "period" && CTX.activeKey === "daf" && s.meta) {
        if (Array.isArray(s.meta.dafDesc)) s.meta.dafDesc.length = s.cols;
        if (Array.isArray(s.meta.dafEnt))  s.meta.dafEnt.length  = s.cols;
      }
      if (Array.isArray(s.data)) {
        for (let r=0; r<s.data.length; r++) {
          if (Array.isArray(s.data[r])) s.data[r].length = s.cols;
        }
      }

      render();
      saveToLocalByMode(CTX.activeMode);

      _syncDelColBtnVisibility();
    });

    // ✅ 開機先同步一次（避免一開始按鈕狀態不對）
    try { _syncDelColBtnVisibility(); } catch {}

    // -------------------------
    // Export CSV (NO row-number column)
    // -------------------------
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

      const blob = new Blob([lines.join("\n")], { type:"text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (s.title || "Sheet") + ".csv";
      a.click();
      URL.revokeObjectURL(url);
    });

    // -------------------------
    // Export XLSX (NO row-number column)
    // -------------------------
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

        const filename = (CTX.activeMode === "period") ? `Period_${CTX.activePeriod}.xlsx` : "Model.xlsx";
        window.XLSX.writeFile(wb, filename);
      } catch (err) { showErr(err); }
    });

    // =========================================================
    // JSON Export/Import (ADMIN ONLY) + HARD remove Actions dropdown options for user
    // =========================================================
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

    // -------------------------
    // Clear Local
    // -------------------------
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

        _syncDelColBtnVisibility();
      } catch (err) { showErr(err); }
    });
  }
  // ======================= BLOCK: 03_BIND_TOOLBAR_EVENTS_END =======================


  // ======================= BLOCK: 04_EXPORTS_START =======================
  window.DEFS.TOOLBAR_OPS.bind = bind;
  window.DEFS.TOOLBAR_OPS.bindToolbarEvents = bindToolbarEvents;

  // 給其他模組（例如 paste handler）呼叫用：貼上擴欄後可立刻同步按鈕顯示
  window.DEFS.TOOLBAR_OPS.syncDelColBtnVisibility = _syncDelColBtnVisibility;
  // ======================= BLOCK: 04_EXPORTS_END =======================

})();


