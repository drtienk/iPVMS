PROJECT_STATUS.md（2026-01 最新整理版）

目標：
任何問題 → 30 秒內知道要去哪個 JS 檔改

0) 入口頁面（HTML）

login.html

固定入口

只負責登入 → 導向 app.html

❌ 不放業務邏輯

app.html

真正主頁（0109 2026）

模組化版本，所有功能都在 js/

<script> 載入順序非常重要

1) 系統核心狀態與啟動（⚠️ 穩定層，不放業務規則）
js/app_init.js

✅ 負責

啟動流程

F5 後狀態還原（mode / tab / period / lang）

🛠 常改

啟動順序

first render 時機

❌ 不負責

rules / tabs / table 行為

js/app.js

✅ 負責

薄殼 / delegate

串接所有模組

🛠 常改

delegate 接線

❌ 不放

任何業務邏輯

js/app_state_login.js

✅ 負責

login guard / logout

documentMeta

全域狀態（activeMode / activeKey / activePeriod）

🛠 常改

sessionStorage keys

登入流程

❌ 不負責

tabs / tables / rules

js/app_sheets_core.js

✅ 負責

activeSheet()

套用 sheet defs

meta helpers

🛠 常改

sheets 初始化策略

❌ 不負責

UI 行為 / rules

js/app_mode_storage.js

✅ 負責

mode / period 的 localStorage

header 特例（period / DAF）

🛠 常改

存檔策略

Period 分檔規則

❌ 不負責

分頁客製規則

2) 語言 / i18n（單一真相）
js/i18n_def.js

✅ 負責

所有翻譯字典

🛠 常改

新增 / 修改文案

js/i18n_role.js

✅ 負責

lang / t / setLang

role（admin / user）

F5 後語言一致

🛠 常改

角色預設語言

語言切換後刷新策略

js/lang_ui.js + js/lang_apply.js

✅ 負責

把 i18n 套到 DOM

topbar / toolbar / period bar

🛠 常改

新增要翻譯的 UI 元素

3) Tabs（分頁系統）
js/tabs_def.js

✅ 負責

TAB_CONFIG（所有 sheet key / 名稱）

MODEL / PERIOD 分組

🛠 最常改

新增分頁

改名稱 / 分組

❌ 不負責

表格 / rules

js/tabs_ui.js

✅ 負責

畫 tabs

切 activeKey

語言刷新 tab label

🛠 常改

tabs UI 排版

js/tabs_ui_wrappers.js

✅ 負責

安全 wrapper

載入順序保險

🛠 偶爾改

穩定度修正

4) 分頁顯示 / 隱藏（公司層級）
js/visibility_store.js

✅ 負責

分頁顯示 / 隱藏

ensureActiveKeyVisible

🛠 常改

預設顯示策略

periodOnly 規則

js/sheet_admin_ui.js + js/sheet_admin_delegate.js

✅ 負責

分頁管理 modal

管理事件

5) Sheet 定義（🔥 最重要）
js/sheets_core_store.js

✅ 負責

MODEL_DEF_MAP

PERIOD_DEF_MAP

headers / cols

🛠 最常改（No.1）

加欄位

改欄位名

改欄位順序

❌ 不負責

render / rules

6) Table 引擎（共用）
js/table_render_core.js

✅ 負責

表格 render

多列表頭（period / DAF）

🛠 偶爾改

特殊表顯示

js/table_core.js + js/table_core_bootstrap.js

✅ 負責

headers / cols 管理

ctx bootstrap

7) 選取 / 貼上 / Excel-like（你最近常改）
js/selection_core.js

✅ 負責

selection state

focus cell

js/selection_events.js

✅ 負責

drag select

copy / cut / paste / undo

🛠 最近常改

Excel 行為修正

8) Toolbar（共用操作）
js/toolbar_ops.js

✅ 負責

Add Row / Column

Export / Clear / Check

🛠 常改

按鈕行為

js/toolbar_delegate.js

✅ 負責

toolbar wrapper

js/user_added_col_flag.js

✅ 負責

是否新增過欄位

控制 Delete Column 顯示

9) Period（Period 列表）
js/period_store.js

✅ 負責

period list

activePeriod

normalizePeriod

js/period_ui.js + js/period_ui_delegate.js

✅ 負責

Period bar UI

modal

10) Custom Rules（🔥 你之後最常改）
js/custom_rules.js

✅ 負責

所有「會變的規則」集中

🛠 最常改

CHECKS_BY_SHEET

toolbar 可見性

分頁客製行為

❌ 不負責

table render / selection core

已拆出的單一規則模組

company_row_lock.js

model_all_required_company_bu.js

required_fields_guide.js

required_legend.js

resource_level_n_buttons.js

👉 單一分頁專用 → 拆成獨立檔

11) Router / 其他

mode_router.js：Model / Period 切換

router_wrappers.js：保穩 wrapper

user_admin_stub.js：保留 stub

12) Debug 快速定位
A) Console anchors

✅ app.js loaded

✅ [tabs_ui.js] loaded

custom_rules.js loaded - vX

✅ [01] i18n_role loaded

✅ [08] app_sheets_core loaded

B) 問題 → 檔案

分頁錯 → tabs_def.js

欄位錯 → sheets_core_store.js

F5 跑掉 → app_init.js

語言亂 → i18n_role.js + lang_apply.js

Check 沒反應 → custom_rules.js

貼上怪 → selection_* + table_*
