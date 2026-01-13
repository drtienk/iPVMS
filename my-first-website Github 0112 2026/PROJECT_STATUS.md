login.html              ← 固定入口
home.html               ← 固定入口
login_v1_2.html          ← 真正登入頁 0108 2026
index_v10_2.html         ← 真正主頁 0109 2026


PROJECT_STATUS.md（建議版本）
0) 入口頁面（HTML）

login.html ← 固定入口（跳轉/導向用）

home.html ← 固定入口（展示/導向用）

login_v1_2.html ← 真正登入頁（2026-01-08）

index_v10_2.html ← 舊版主頁（2026-01-09，inline 巨檔版本，供比對/回溯用）

index.html ← 目前主頁（模組化版本；所有功能以 js/ 為主）

1) 系統核心狀態與啟動（不要放業務規則）
js/app_init.js

✅ 負責：啟動流程（restore last tab / load data / apply lang / first render），必須最後載入

🛠 常改：啟動順序、第一次 render 時機、F5 後狀態還原

❌ 不負責：rules、表格互動、tabs 定義

js/app.js

✅ 負責：薄殼/委派（delegate）、各模組串接（不應塞業務邏輯）

🛠 常改：delegate 接線、ctx 傳遞

❌ 不負責：每個分頁的客製規則

js/app_state_login.js

✅ 負責：login guard、logout、documentMeta、activeMode/activeKey/activePeriod 等全域 state

🛠 常改：登入/登出流程、sessionStorage keys

❌ 不負責：tabs/表格/規則

js/app_sheets_core.js

✅ 負責：sheets core wrapper（activeSheet()、apply defs、reset blank、meta helpers）

🛠 常改：sheets 初始化策略、meta 結構（如 DAF）

❌ 不負責：UI 行為

js/app_mode_storage.js

✅ 負責：mode/period localStorage 存取（save/load、storage key）、header rules（period/daf 特例）

🛠 常改：存檔策略、Period 分檔規則、DAF header 規則

❌ 不負責：分頁客製 rules

2) 語言 / i18n（跨檔單一真相）
js/i18n_def.js

✅ 負責：字典內容（I18N pack）

🛠 常改：新增/修改翻譯文案

js/i18n_role.js

✅ 負責：lang / t / setLang / getRole / isAdmin、角色預設語言、F5 後語言一致

🛠 常改：角色預設語言、語言切換後要刷新哪些 UI

❌ 不負責：tabs 定義、表格渲染

js/lang_ui.js + js/lang_apply.js

✅ 負責：把 i18n 套到 DOM（topbar/toolbar/period bar）

🛠 常改：新增需要翻譯的 DOM 元素

3) Tabs（分頁定義與 UI）
js/tabs_def.js

✅ 負責：TAB_CONFIG（所有 sheet key/名稱）、TAB_GROUPS_MODEL / TAB_GROUPS_PERIOD（分組）

🛠 常改：新增分頁、改分頁名稱、改分組

❌ 不負責：表格資料/規則

js/tabs_ui.js

✅ 負責：buildTabs/applyTabUI（畫 tabs、切 activeKey、語言刷新 tabs 文字）

🛠 常改：tabs UI 排版、tab label 更新策略

js/tabs_ui_wrappers.js

✅ 負責：安全 wrapper / delegate（避免載入順序問題）

4) 分頁顯示/隱藏（公司層級）
js/visibility_store.js

✅ 負責：每公司分頁顯示/隱藏、isSheetVisible、ensureActiveKeyVisible

🛠 常改：預設顯示策略、periodOnly 規則

❌ 不負責：tabs UI、表格互動

js/sheet_admin_ui.js + js/sheet_admin_delegate.js

✅ 負責：分頁管理 modal UI 與事件

5) Sheet 定義（每張表的欄位/預設欄數）
js/sheets_core_store.js

✅ 負責：MODEL_DEF_MAP / PERIOD_DEF_MAP（每張表 headers、cols）

🛠 常改（最重要）：

「某分頁加一欄/改欄位名/改欄位順序」→ 改這裡

❌ 不負責：表格渲染、rules

6) Table 引擎（所有分頁共用）
js/table_render_core.js

✅ 負責：render 表格（含 period/daf 多列表頭）

🛠 常改：表頭渲染、特殊表（例如 DAF）顯示

js/table_core.js + js/table_core_bootstrap.js

✅ 負責：ensureSize、headers/cols 管理、bootstrap ctx 連接

7) 選取 / 貼上 / Excel-like 操作（共用）
js/selection_core.js

✅ 負責：selection core、focus cell、與 table 的整合

js/selection_events.js

✅ 負責：滑鼠拖曳選取、copy/cut/paste/delete 快捷鍵

8) Toolbar（共用操作）
js/toolbar_ops.js

✅ 負責：Add Row / Add Column / Export / Clear / Check 等共用操作入口

🛠 常改：按鈕行為（但「分頁客製」請放 custom_rules 或分頁專用檔）

js/toolbar_delegate.js

✅ 負責：toolbar delegate / wrapper

js/user_added_col_flag.js

✅ 負責：是否新增過欄位（控制 Delete Column 顯示條件）

9) Period（Period 列表與 UI）
js/period_store.js

✅ 負責：period list、activePeriod 存取、normalizePeriod

js/period_ui.js + js/period_ui_delegate.js

✅ 負責：Period bar UI / modal

10) Custom Rules（你之後最常改的地方）
js/custom_rules.js

✅ 負責：經常變動的規則集中地（Actions、toolbar 可見性、分頁客製、Checks）

🛠 常改：

CHECKS_BY_SHEET[activeKey]：按 Check 時跑哪張表的規則

特定分頁按鈕（例如 AC Code n、Resource Level n）

必填/鎖定/提示 UI（若屬於單一分頁建議拆出）

❌ 不負責：table render、selection 行為

已拆出的分頁/規則模組（單一目的）

js/company_row_lock.js：Company 分頁列鎖定（或單列輸入規則）

js/model_all_required_company_bu.js：Model 下 company/bu 必填彙整（若有）

js/required_fields_guide.js：必填欄位提示/導引

js/required_legend.js：必填欄位 legend

js/resource_level_n_buttons.js：Resource - Level n 動態欄位按鈕

11) Router wrappers / 其他

js/mode_router.js：模式切換（Model/Period）與路由行為

js/router_wrappers.js：保穩 wrapper

js/user_admin_stub.js：User admin（stub/保留）

12) Debug（遇到問題先看什麼）
A) Console anchors（你現在已經有的）

✅ app.js loaded

✅ [tabs_ui.js] loaded

custom_rules.js loaded - v...

✅ [01] i18n_role loaded

✅ [02] app_state_login loaded

✅ [08] app_sheets_core loaded

✅ [09] app_mode_storage loaded

✅ [CHK] ...（若你之後加 probe 才會有）

B) 問題定位速查

分頁名稱/分組不對 → tabs_def.js

欄位 headers/預設欄數不對 → sheets_core_store.js

F5 後狀態跑掉 → app_init.js

語言切換不一致 → i18n_role.js + lang_apply.js + tabs_ui.js

Check 沒反應/顯示 no rules → custom_rules.js 的 CHECKS_BY_SHEET

貼上/選取怪怪的 → selection_* + table_*