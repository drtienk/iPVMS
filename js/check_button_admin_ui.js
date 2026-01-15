// js/check_button_admin_ui.js
console.log("✅ [check_button_admin_ui.js] loaded");

window.DEFS = window.DEFS || {};
window.DEFS.CHECK_BUTTON_ADMIN_UI = window.DEFS.CHECK_BUTTON_ADMIN_UI || {};

(function installCheckButtonAdminUI(){
  if (window.__CHECK_BUTTON_ADMIN_UI_INSTALLED__) return;
  window.__CHECK_BUTTON_ADMIN_UI_INSTALLED__ = true;

  function init(){
    // =========================================================
    // MODULE: CHECK_BUTTON_ADMIN_MODAL
    // AREA: admin Check button visibility per-tab modal
    // =========================================================

    const $ = window.DEFS?.UTILS?.$ || window.$ || ((id) => document.getElementById(id));
    const on = window.DEFS?.UTILS?.on || window.on || function(id, evt, fn) {
      const el = $(id);
      if (el) el.addEventListener(evt, fn);
    };
    const Modal = window.DEFS?.UTILS?.Modal || window.Modal;

    const checkButtonAdminCtl = Modal?.bind("checkButtonAdminModal", {
      openBtnIds: ["checkButtonAdminBtn"],
      closeBtnIds: ["checkButtonAdminClose"]
    });

    function applyCheckButtonAdminI18n() {
      const t = window.t || ((k) => k);
      const setText = (id, key) => {
        const el = $(id);
        if (el) el.textContent = t(key);
      };

      setText("checkButtonAdminTitle", "check_admin_title");
      setText("checkButtonAdminClose", "check_admin_close");
      setText("checkButtonAdminModelTitle", "check_admin_model");
      setText("checkButtonAdminPeriodTitle", "check_admin_period");
      setText("checkButtonAdminAllOn", "check_admin_all_on");
      setText("checkButtonAdminAllOff", "check_admin_all_off");
      setText("checkButtonAdminSave", "check_admin_save");
    }

    function openCheckButtonAdmin() {
      checkButtonAdminCtl?.open();
      applyCheckButtonAdminI18n();
      renderCheckButtonAdminList();
    }
    function closeCheckButtonAdmin() {
      checkButtonAdminCtl?.close();
    }

    function renderCheckButtonAdminList() {
      const store = window.DEFS?.CHECK_VISIBILITY;
      if (!store) {
        console.warn("[check_button_admin_ui] Store not available");
        return;
      }

      const companyId = store.getCompanyId();
      const perTabMap = store.getPerTabUserCheckMap(companyId);
      const TAB_CONFIG = window.DEFS?.TABS?.TAB_CONFIG || [];
      const tabLabel = window.DEFS?.TABS?.tabLabel || function(tcfg) { return tcfg.enModel || tcfg.key; };

      const wrapModel = $("checkButtonAdminListModel");
      const wrapPeriod = $("checkButtonAdminListPeriod");
      if (!wrapModel || !wrapPeriod) return;

      wrapModel.innerHTML = "";
      wrapPeriod.innerHTML = "";

      const checkboxMap = {};

      const addRow = (wrap, labelText, sheetKey) => {
        const row = document.createElement("label");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "8px";
        row.style.padding = "6px 4px";
        row.style.borderBottom = "1px solid #f3f4f6";
        row.style.cursor = "pointer";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.sheetKey = sheetKey;
        checkbox.checked = perTabMap[sheetKey] === true;

        const labelSpan = document.createElement("span");
        labelSpan.style.fontSize = "14px";
        labelSpan.textContent = labelText;

        row.appendChild(checkbox);
        row.appendChild(labelSpan);
        wrap.appendChild(row);

        checkboxMap[sheetKey] = checkboxMap[sheetKey] || [];
        checkboxMap[sheetKey].push(checkbox);
      };

      TAB_CONFIG.forEach(tcfg => {
        const modelLabel = tabLabel({
          ...tcfg,
          // Force tabLabel to use model wording regardless of activeMode
          zhPeriod: tcfg.zhModel,
          enPeriod: tcfg.enModel
        });
        const periodLabel = tabLabel({
          ...tcfg,
          // Force tabLabel to use period wording regardless of activeMode
          enModel: tcfg.enPeriod,
          zhModel: tcfg.zhPeriod
        });

        addRow(wrapModel, modelLabel, tcfg.key);
        addRow(wrapPeriod, periodLabel, tcfg.key);
      });

      // Keep paired checkboxes in sync so they represent one setting
      Object.values(checkboxMap).forEach(list => {
        list.forEach(chk => {
          chk.addEventListener("change", () => {
            list.forEach(other => {
              if (other !== chk) other.checked = chk.checked;
            });
          });
        });
      });
    }

    function setAllCheckButtons(on) {
      const store = window.DEFS?.CHECK_VISIBILITY;
      if (!store) return;

      const companyId = store.getCompanyId();
      const TAB_CONFIG = window.DEFS?.TABS?.TAB_CONFIG || [];

      TAB_CONFIG.forEach(tcfg => {
        store.setPerTabUserCheck(companyId, tcfg.key, !!on);
      });

      renderCheckButtonAdminList();
    }

    function saveCheckButtonAdminFromUI() {
      const store = window.DEFS?.CHECK_VISIBILITY;
      if (!store) {
        console.warn("[check_button_admin_ui] Store not available");
        return;
      }

      const companyId = store.getCompanyId();
      const checkboxes = document.querySelectorAll('#checkButtonAdminModal input[type="checkbox"][data-sheet-key]');
      const seen = new Set();

      checkboxes.forEach(chk => {
        const sheetKey = chk.getAttribute("data-sheet-key");
        if (!sheetKey || seen.has(sheetKey)) return;
        seen.add(sheetKey);

        const enabled = !!chk.checked;
        store.setPerTabUserCheck(companyId, sheetKey, enabled);
      });

      // Immediately apply visibility without re-login
      if (typeof window.applyCheckButtonVisibility === "function") {
        window.applyCheckButtonVisibility();
      }

      closeCheckButtonAdmin();
    }

    on("checkButtonAdminBtn", "click", openCheckButtonAdmin);
    on("checkButtonAdminAllOn", "click", () => setAllCheckButtons(true));
    on("checkButtonAdminAllOff", "click", () => setAllCheckButtons(false));
    on("checkButtonAdminSave", "click", saveCheckButtonAdminFromUI);

    // expose render API
    window.DEFS.CHECK_BUTTON_ADMIN_UI.render = renderCheckButtonAdminList;
    window.renderCheckButtonAdminList = renderCheckButtonAdminList;

    // END MODULE
  }

  window.DEFS.CHECK_BUTTON_ADMIN_UI.init = init;

})();
