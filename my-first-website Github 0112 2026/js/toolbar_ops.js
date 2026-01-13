// js/toolbar_ops.js
console.log("✅ [toolbar_ops.js] loaded");

window.DEFS = window.DEFS || {};
window.DEFS.TOOLBAR_OPS = window.DEFS.TOOLBAR_OPS || {};

(function installToolbarOps(){
  if (window.__TOOLBAR_OPS_INSTALLED__) return;
  window.__TOOLBAR_OPS_INSTALLED__ = true;

  let CTX = null;

  function bind(ctx){
    CTX = ctx || {};
  }

  function _roleIsAdminFallback(){
    const role = String(sessionStorage.getItem("role") || "user").toLowerCase();
    return role === "admin";
  }

  function _minColsForActiveSheet(){
    const { activeMode, activeKey, PERIOD_DEF_MAP, MODEL_DEF_MAP } = CTX || {};
    const map = (activeMode === "period") ? PERIOD_DEF_MAP : MODEL_DEF_MAP;
    const def = map?.[activeKey];
    return def?.cols ?? 1;
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

  // ✅ XLSX: no row-number column
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

  function bindToolbarEvents(){
    if (!CTX) return;
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

      const delBtn = $("delColBtn");
      if (delBtn) delBtn.style.display = "";
    });

    // -------------------------
    // Delete Column
    // -------------------------
    on("delColBtn","click", () => {
      const s = activeSheet();
      const minCols = _minColsForActiveSheet();
      if (s.cols <= minCols) { alert(t("alert_min_cols")(minCols)); return; }

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

      const delBtn = $("delColBtn");
      if (delBtn && s.cols <= minCols) delBtn.style.display = "none";
    });

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

      // ✅ 抓到任何 select，把 JSON 匯出/匯入兩個 option 直接刪掉
      function scrubJsonOptionsEverywhere(){
        const selects = Array.from(document.querySelectorAll("select"));

        const shouldRemoveOption = (opt) => {
          const v  = String(opt?.value || "").toLowerCase().trim();
          const tx = String(opt?.text  || opt?.textContent || "").toLowerCase().trim();

          // value 精準命中（你現在就是 export_json / import_json）
          if (v === "export_json" || v === "import_json") return true;

          // 有些版本可能沒有底線
          if (v === "exportjson" || v === "importjson") return true;

          // 文字命中
          if (tx.includes("export json")) return true;
          if (tx.includes("import json")) return true;

          // 你這兩個選項的括號描述
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

          // 如果剛好移除後選到空/不存在，保險：選第一個可用的
          if (removed) {
            const first = Array.from(sel.options || [])[0];
            if (first) sel.value = first.value;
          }
        });
      }

      function startHardScrub(){
        // 立刻 scrub 一次
        scrubJsonOptionsEverywhere();

        // 1) MutationObserver：任何 DOM 更新都再 scrub
        if (!window.__JSON_SCRUB_OBS__) {
          window.__JSON_SCRUB_OBS__ = true;
          const obs = new MutationObserver(() => {
            try { scrubJsonOptionsEverywhere(); } catch(_e){}
          });
          obs.observe(document.documentElement, { childList:true, subtree:true });
        }

        // 2) 短時間 interval：防止某些程式「重建 select」但 observer 沒抓到的邊界狀況
        if (!window.__JSON_SCRUB_TIMER__) {
          let n = 0;
          window.__JSON_SCRUB_TIMER__ = setInterval(() => {
            n++;
            scrubJsonOptionsEverywhere();
            if (n >= 60) { // 約 6 秒
              clearInterval(window.__JSON_SCRUB_TIMER__);
              window.__JSON_SCRUB_TIMER__ = null;
            }
          }, 100);
        }

        // 3) 再補幾次延遲 scrub（保險）
        setTimeout(scrubJsonOptionsEverywhere, 300);
        setTimeout(scrubJsonOptionsEverywhere, 1200);
        setTimeout(scrubJsonOptionsEverywhere, 2500);
      }

      // ===== USER：移除 JSON UI + 強制把下拉選單的 JSON option 拔掉 =====
      if (!admin) {
        removeEl("exportJsonBtn");
        removeEl("importJsonBtn");
        removeEl("importJsonFile");
        startHardScrub();
        return;
      }

      // ===== ADMIN：正常保留 JSON 功能 =====

      // Export JSON
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

      // Import JSON
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

      } catch (err) { showErr(err); }
    });
  }

  window.DEFS.TOOLBAR_OPS.bind = bind;
  window.DEFS.TOOLBAR_OPS.bindToolbarEvents = bindToolbarEvents;

})();
