console.log("✅ [lang_ui.js] loaded");

window.DEFS = window.DEFS || {};
window.DEFS.LANG_UI = window.DEFS.LANG_UI || {};

// ✅ 不改任何邏輯：只是把「可能不存在的元素」改成安全寫法
window.DEFS.LANG_UI.applyLangUI = function(){

  // ✅ safe setter：元素不存在就跳過，避免 textContent of null
  function setText(id, i18nKey){
    const el = $(id);
    if (!el) return;
    el.textContent = t(i18nKey);
  }

  function setValue(id, v){
    const el = $(id);
    if (!el) return;
    el.value = v;
  }

  setValue("langSelect", (lang === "zh") ? "zh" : "en");

  setText("btnModeModel",  "btn_model");
  setText("btnModePeriod", "btn_period");
  setText("sheetAdminBtn", "btn_sheet_admin");
  setText("logoutBtn",     "btn_logout");

  setText("companyLabel", "company_label");
  setText("companyNote",  "company_note");

  setText("periodBarTitle",   "period_workspace");
  setText("periodBarCurrent", "period_current");
  setText("newPeriodBtn",     "period_new");
  setText("periodBarHelp",    "period_help");

  setText("periodModalTitle",  "period_modal_title");
  setText("periodModalClose",  "period_modal_close");
  setText("periodModalDesc",   "period_modal_desc");
  setText("periodCreateBtn",   "period_modal_create");
  setText("periodCancelBtn",   "period_modal_cancel");

  setText("adminTitle",       "admin_title");
  setText("sheetAdminClose",  "admin_close");
  setText("adminModelTitle",  "admin_model");
  setText("adminPeriodTitle", "admin_period");
  setText("sheetAdminAllOn",  "admin_all_on");
  setText("sheetAdminAllOff", "admin_all_off");
  setText("sheetAdminSave",   "admin_save");

  setText("addRowBtn",     "toolbar_add_row");
  setText("addColBtn",     "toolbar_add_col");
  setText("delColBtn",     "toolbar_del_col");
  setText("exportCsvBtn",  "toolbar_export_csv");
  setText("exportXlsxBtn", "toolbar_export_xlsx");

  // ✅ JSON 可能被 user 移除：用 safe setter 不會爆
  setText("exportJsonBtn", "toolbar_export_json");
  setText("importJsonBtn", "toolbar_import_json");

  setText("clearLocalBtn", "toolbar_clear_local");

  setText("hintText", "hint");

  syncModeUI();
  updateCurrentPeriodTag();

  if ($("sheetAdminModal")?.style.display === "block") {
  const fn = window.DEFS?.SHEET_ADMIN_UI?.render || window.renderSheetAdminLists;
  if (typeof fn === "function") fn();
}

};
