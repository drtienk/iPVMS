console.log("✅ [i18n_def.js] loaded");

(function initI18NDefs(){
  // ✅ 保證 window.DEFS 存在（跟你 tabs_def.js 同一套路）
  window.DEFS = window.DEFS || {};
  window.DEFS.I18N = window.DEFS.I18N || {};

  // ✅ 只放 I18N 本體（不放 t / setLang / lang / role）
  window.DEFS.I18N.I18N = {
    zh: {
      page_model: "📋 Model Excel",
      page_period: "📋 Period Excel",
      title_model: "Model Excel（v10.3 slim）",
      title_period: "Period Excel（v10.3 slim）",
      btn_model: "Model",
      btn_period: "Period",
      btn_sheet_admin: "分頁管理",
      btn_logout: "登出",
      company_label: "公司名稱：",
      company_note: "（此文件所屬公司）",
      period_workspace: "📅 Period 工作區",
      period_current: "目前：",
      period_new: "新增 Period（yyyy-mm）",
      period_help: "（每個 Period 都會自動有一套分頁，資料分開儲存）",
      period_tag_prefix: "Period：",
      toolbar_add_row: "新增一列",
      toolbar_add_col: "新增一欄",
      toolbar_del_col: "刪除一欄",
      toolbar_export_csv: "匯出 CSV（目前分頁）",
      toolbar_export_xlsx: "匯出 XLSX（全部分頁同檔）",
      toolbar_export_json: "匯出 JSON（全部分頁暫存檔）",
      toolbar_import_json: "匯入 JSON（載入協作暫存檔）",
      toolbar_clear_local: "清除本機暫存（目前模式）",
      hint:
`✅ 用法：先點一下任一格，然後從 Excel 複製一塊資料（可多列多欄），直接貼上（Ctrl+V）。
你貼上幾列幾欄，它會自動填進表格；不夠的列/欄會自動長出來。`,
      admin_title: "🔧 分頁顯示/隱藏（只影響目前公司）",
      admin_close: "關閉",
      admin_model: "Model 分頁",
      admin_period: "Period 分頁",
      admin_all_on: "全部顯示",
      admin_all_off: "全部隱藏",
      admin_save: "儲存並套用",
      check_admin_title: "🔧 Check Button 可見性設定（只影響目前公司）",
      check_admin_close: "關閉",
      check_admin_model: "Model 標籤",
      check_admin_period: "Period 標籤",
      check_admin_all_on: "全部啟用",
      check_admin_all_off: "全部停用",
      check_admin_save: "儲存並套用",
      period_modal_title: "📅 建立 / 選擇 Period（yyyy-mm）",
      period_modal_close: "關閉",
      period_modal_desc:
`先選擇年份（2023–2032）與月份（01–12），建立新的 Period 工作區。
每個 Period 都有一套分頁，且資料會分開保存。`,
      period_modal_create: "建立並切換",
      period_modal_cancel: "取消",
      not_logged_title: "⚠️ 目前未登入",
      not_logged_line1: "這個頁面應該先從登入頁登入再進來。",
      not_logged_line2: "如果你只是在本機/Canvas 預覽，按「模擬登入」即可繼續。",
      not_logged_preview: "模擬登入（僅預覽）",
      not_logged_go_login: "前往登入頁",
      alert_min_cols: (n)=> `這個分頁最少需要 ${n} 欄，不能再刪了。`
    },
    en: {
      page_model: "📋 Model Excel",
      page_period: "📋 Period Excel",
      title_model: "Model Excel（v10.3 slim）",
      title_period: "Period Excel（v10.3 slim）",
      btn_model: "Model",
      btn_period: "Period",
      btn_sheet_admin: "Sheet Admin",
      btn_logout: "Log out",
      company_label: "Company Name:",
      company_note: "(Document owner company)",
      period_workspace: "📅 Period Workspace",
      period_current: "Current:",
      period_new: "New Period (yyyy-mm)",
      period_help: "(Each Period has its own set of sheets. Data is stored separately.)",
      period_tag_prefix: "Period: ",
      toolbar_add_row: "Add Row",
      toolbar_add_col: "Add Column",
      toolbar_del_col: "Delete Column",
      toolbar_export_csv: "Export CSV (current sheet)",
      toolbar_export_xlsx: "Export XLSX (all sheets in one file)",
      toolbar_export_json: "Export JSON (workspace snapshot)",
      toolbar_import_json: "Import JSON (load workspace snapshot)",
      toolbar_clear_local: "Clear Local Cache (current mode)",
      hint:
`✅ How to use: Click any cell, then copy a block of data from Excel (multi-row / multi-column) and paste (Ctrl+V).
The table will auto-fill. If rows/columns are not enough, it will automatically expand.`,
      admin_title: "🔧 Show/Hide Sheets (company-scoped)",
      admin_close: "Close",
      admin_model: "Model Sheets",
      admin_period: "Period Sheets",
      admin_all_on: "Show All",
      admin_all_off: "Hide All",
      admin_save: "Save & Apply",
      check_admin_title: "🔧 Check Button Visibility (company-scoped)",
      check_admin_close: "Close",
      check_admin_model: "Model Tabs",
      check_admin_period: "Period Tabs",
      check_admin_all_on: "All On",
      check_admin_all_off: "All Off",
      check_admin_save: "Save & Apply",
      period_modal_title: "📅 Create / Select Period (yyyy-mm)",
      period_modal_close: "Close",
      period_modal_desc:
`Select a year (2023–2032) and month (01–12) to create a new Period workspace.
Each Period has its own set of sheets and data is stored separately.`,
      period_modal_create: "Create & Switch",
      period_modal_cancel: "Cancel",
      not_logged_title: "⚠️ Not logged in",
      not_logged_line1: "You should open this page after logging in from the login page.",
      not_logged_line2: "If you're only previewing locally/Canvas, click “Preview Login” to continue.",
      not_logged_preview: "Preview Login (local only)",
      not_logged_go_login: "Go to Login Page",
      alert_min_cols: (n)=> `This sheet requires at least ${n} columns. You cannot delete more.`
    }
  };

  console.log("✅ [i18n_def.js] I18N ready:", !!window.DEFS?.I18N?.I18N);
})();
