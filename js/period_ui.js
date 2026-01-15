// js/period_ui.js
console.log("✅ [period_ui.js] loaded");

window.DEFS = window.DEFS || {};
window.DEFS.PERIOD_UI = window.DEFS.PERIOD_UI || {};

(function installPeriodUI(){
  if (window.__PERIOD_UI_INSTALLED__) return;
  window.__PERIOD_UI_INSTALLED__ = true;

  function init(){
    // =========================================================
    // MODULE: 10_PERIOD_UI (moved from app.js)
    // AREA: period bar + modal + create/switch core
    // NOTE: Keep logic identical (no refactor)
    // =========================================================

    function renderPeriodBar() {
      const bar = $("periodBar");
      if (activeMode !== "period") { bar.style.display = "none"; return; }
      bar.style.display = "flex";

      const sel = $("periodSelect");
      const list = loadPeriodList();

      if (activePeriod && !list.includes(activePeriod)) {
        activePeriod = "";
        sessionStorage.removeItem("activePeriod");
      }
      if (!activePeriod && list.length) setActivePeriod(list[0]);

      sel.innerHTML = "";
      if (!list.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = (lang==="en") ? "(No Period created yet)" : "（尚未建立 Period）";
        sel.appendChild(opt);
        sel.disabled = true;
      } else {
        sel.disabled = false;
        list.forEach(p => {
          const opt = document.createElement("option");
          opt.value = p;
          opt.textContent = p;
          opt.selected = (p === activePeriod);
          sel.appendChild(opt);
        });
      }

      updateCurrentPeriodTag();

      // Ensure deletePeriodBtn exists
      const newPeriodBtn = $("newPeriodBtn");
      let deletePeriodBtn = $("deletePeriodBtn");
      if (!deletePeriodBtn && newPeriodBtn) {
        deletePeriodBtn = document.createElement("button");
        deletePeriodBtn.id = "deletePeriodBtn";
        deletePeriodBtn.type = "button";
        deletePeriodBtn.textContent = (lang === "en") ? "Delete Period" : "刪除 Period";
        deletePeriodBtn.className = "btn-danger";
        newPeriodBtn.insertAdjacentElement("afterend", deletePeriodBtn);
      }
      if (deletePeriodBtn) {
        deletePeriodBtn.textContent = (lang === "en") ? "Delete Period" : "刪除 Period";
      }
    }

    const periodModalCtl = Modal.bind("periodModal", {
      openBtnIds: ["newPeriodBtn"],
      closeBtnIds: ["periodModalClose","periodCancelBtn"]
    });

    function openPeriodModal() {
      const ySel = $("periodYear");
      const mSel = $("periodMonth");
      ySel.innerHTML = "";
      mSel.innerHTML = "";

      for (let y=2023; y<=2032; y++) {
        const opt = document.createElement("option");
        opt.value = String(y); opt.textContent = String(y);
        ySel.appendChild(opt);
      }
      for (let m=1; m<=12; m++) {
        const mm = String(m).padStart(2, "0");
        const opt = document.createElement("option");
        opt.value = mm; opt.textContent = mm;
        mSel.appendChild(opt);
      }

      if (activePeriod && /^\d{4}-\d{2}$/.test(activePeriod)) {
        const [yy, mm] = activePeriod.split("-");
        ySel.value = yy; mSel.value = mm;
      } else {
        ySel.value = "2023"; mSel.value = "01";
      }

      periodModalCtl?.open();
    }

    function createAndSwitchPeriod(yyyy, mm) {
      const p = normalizePeriod(yyyy, mm);

      if (activeMode === "period" && activePeriod) saveToLocalByMode("period");

      const list = loadPeriodList();
      if (!list.includes(p)) { list.push(p); savePeriodList(list); }

      setActivePeriod(p);
      sessionStorage.setItem(MODE_KEY, "period");

      const raw = localStorage.getItem(storageKeyByMode("period"));
      if (!raw) {
        resetSheetsToBlankForMode("period");
        saveToLocalByMode("period");
      }

      for (const k in sheets) sheets[k].data = [];
      loadFromLocalByMode("period");
      applySheetDefsByModeAndTrim();

      activeKey = "company";
      ensureActiveKeyVisible();
      refreshUI();
      setActive(activeKey);
    }

    // Bind delete period button
    if (!window.__DELETE_PERIOD_BINDED__) {
      window.__DELETE_PERIOD_BINDED__ = true;
      setTimeout(() => {
        const deleteBtn = $("deletePeriodBtn");
        if (deleteBtn) {
          deleteBtn.addEventListener("click", () => {
            const target = $("periodSelect")?.value;
            if (!target || target === "") {
              alert((lang === "en") ? "No period selected to delete" : "沒有可刪除的 Period");
              return;
            }

            if (!confirm(`Delete ${target}? This will remove ALL data in this period.`)) {
              return;
            }

            window.DEFS?.PERIOD?.deletePeriod?.(target);
            renderPeriodBar();

            if (activeMode === "period") {
              for (const k in sheets) sheets[k].data = [];
              loadFromLocalByMode("period");
              applySheetDefsByModeAndTrim();
              refreshUI();
              setActive(activeKey || "company");
            }
          });
        }
      }, 100);
    }

    // expose (so app.js / toolbar_ops can call)
    window.DEFS.PERIOD_UI.renderPeriodBar = renderPeriodBar;
    window.DEFS.PERIOD_UI.openPeriodModal = openPeriodModal;
    window.DEFS.PERIOD_UI.createAndSwitchPeriod = createAndSwitchPeriod;

    // optional backward-compat globals (keep default = true for now)
const EXPOSE_GLOBALS = true;
if (EXPOSE_GLOBALS) {
  window.renderPeriodBar = renderPeriodBar;
  window.openPeriodModal = openPeriodModal;
  window.createAndSwitchPeriod = createAndSwitchPeriod;
}


    // END MODULE 10
  }

  window.DEFS.PERIOD_UI.init = init;

})();
