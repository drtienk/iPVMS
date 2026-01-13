// js/sheet_admin_ui.js
console.log("✅ [sheet_admin_ui.js] loaded");

window.DEFS = window.DEFS || {};
window.DEFS.SHEET_ADMIN_UI = window.DEFS.SHEET_ADMIN_UI || {};

(function installSheetAdminUI(){
  if (window.__SHEET_ADMIN_UI_INSTALLED__) return;
  window.__SHEET_ADMIN_UI_INSTALLED__ = true;

  function init(){
    // =========================================================
    // MODULE: 16_SHEET_ADMIN_MODAL (moved from app.js)
    // AREA: admin sheet visibility modal
    // NOTE: Keep logic identical (no refactor)
    // =========================================================

    const sheetAdminCtl = Modal.bind("sheetAdminModal", {
      openBtnIds: ["sheetAdminBtn"],
      closeBtnIds: ["sheetAdminClose"]
    });

    function openSheetAdmin() {
      sheetAdminCtl?.open();
      renderSheetAdminLists();
    }
    function closeSheetAdmin() {
      sheetAdminCtl?.close();
    }

    function renderSheetAdminLists() {
      if (!sheetVisibility) loadVisibility();

      const wrapModel = $("sheetAdminListModel");
      const wrapPeriod = $("sheetAdminListPeriod");
      wrapModel.innerHTML = "";
      wrapPeriod.innerHTML = "";

      TAB_CONFIG.forEach(tcfg => {
        const rowM = document.createElement("label");
        rowM.style.display = "flex";
        rowM.style.alignItems = "center";
        rowM.style.gap = "8px";
        rowM.style.padding = "6px 4px";
        rowM.style.borderBottom = "1px solid #f3f4f6";
        rowM.innerHTML = `
          <input type="checkbox" data-mode="model" data-key="${tcfg.key}">
          <span style="font-size:14px;">${tabLabel({...tcfg, zhPeriod:tcfg.zhModel, enPeriod:tcfg.enModel})}</span>
          ${tcfg.periodOnly ? `<span style="margin-left:auto; font-size:12px; color:#9ca3af;">(periodOnly)</span>` : `<span style="margin-left:auto;"></span>`}
        `;
        wrapModel.appendChild(rowM);

        const rowP = document.createElement("label");
        rowP.style.display = "flex";
        rowP.style.alignItems = "center";
        rowP.style.gap = "8px";
        rowP.style.padding = "6px 4px";
        rowP.style.borderBottom = "1px solid #f3f4f6";
        const periodName = (lang==="en") ? tcfg.enPeriod : tcfg.zhPeriod;
        rowP.innerHTML = `
          <input type="checkbox" data-mode="period" data-key="${tcfg.key}">
          <span style="font-size:14px;">${periodName}</span>
        `;
        wrapPeriod.appendChild(rowP);
      });

      document.querySelectorAll('#sheetAdminModal input[type="checkbox"][data-mode][data-key]').forEach(chk => {
        const mode = chk.getAttribute("data-mode");
        const key = chk.getAttribute("data-key");
        chk.checked = !!sheetVisibility?.[mode]?.[key];
      });
    }

    function setAllVisibility(on) {
      if (!sheetVisibility) loadVisibility();
      ["model","period"].forEach(m => {
        Object.keys(sheetVisibility[m]).forEach(k => sheetVisibility[m][k] = !!on);
      });
      renderSheetAdminLists();
    }

    function saveSheetAdminFromUI() {
      if (!sheetVisibility) loadVisibility();

      document.querySelectorAll('#sheetAdminModal input[type="checkbox"][data-mode][data-key]').forEach(chk => {
        const mode = chk.getAttribute("data-mode");
        const key = chk.getAttribute("data-key");
        sheetVisibility[mode][key] = !!chk.checked;
      });

      saveVisibility();
      ensureActiveKeyVisible();
      refreshUI();
      setActive(activeKey);
      closeSheetAdmin();
    }

    on("sheetAdminBtn","click", openSheetAdmin);
    on("sheetAdminAllOn","click", () => setAllVisibility(true));
    on("sheetAdminAllOff","click", () => setAllVisibility(false));
    on("sheetAdminSave","click", saveSheetAdminFromUI);

    // expose render API (preferred)
window.DEFS.SHEET_ADMIN_UI.render = renderSheetAdminLists;

// (optional backward compatibility)
window.renderSheetAdminLists = renderSheetAdminLists;


    // END MODULE 16
  }

  window.DEFS.SHEET_ADMIN_UI.init = init;

})();
