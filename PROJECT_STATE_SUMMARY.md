# 專案狀態摘要（2026-01-15）

## 1. 專案概覽

- **應用程式類型**：Excel-like 網頁應用程式（Model Excel v10.3 slim）
- **主要功能**：管理公司財務模型和期間資料的電子表格系統，支援多公司、多分頁、多使用者協作
- **部署位置**：純前端應用，透過 HTML 檔案直接開啟或託管在靜態伺服器（GitHub Pages）
- **前端限制**：純 HTML5 + 原生 JavaScript（ES5/ES6）+ CSS3，無使用任何框架（React/Vue 等）
- **後端限制**：依賴 Supabase 作為唯一的雲端服務（PostgreSQL 資料庫、身份驗證、Realtime 即時功能）

## 2. 技術堆疊與架構

- **前端技術**：純 HTML5、原生 JavaScript（ES5/ES6）、CSS3
- **雲端服務**：Supabase（PostgreSQL 資料庫、身份驗證、Realtime 訂閱）
- **本地儲存**：localStorage（以 companyId 和 mode 為鍵值範圍，格式：`miniExcel_${mode}_${companyId}_v1`）
- **雲端儲存**：Supabase 的 `cloud_status` 表（存儲 Model 模式的 company sheet 資料，ID 格式：`model_company__${companyId}`）
- **身份驗證**：Supabase Auth（透過 `login.html` 登入，sessionStorage 儲存 role/companyId/userEmail/userId）
- **版本管理**：透過 URL query string 的 `v=` 參數控制檔案快取（例如：`cloud_model_company_read.js?v=20260115_1`）
- **模組化架構**：所有功能拆分成獨立 JS 檔案（57 個檔案），透過 `window.DEFS` 命名空間組織
- **初始化流程**：`app_init.js` 負責啟動順序（載入本地資料 → 套用定義 → 渲染 → 延遲 100ms 後讀取雲端）
- **Presence 系統**：多層級線上狀態追蹤（心跳寫入每 20 秒、輪詢讀取每 25 秒、Realtime 訂閱、快速讀取迴圈每 2 秒）

## 3. 已完成步驟（DONE）

- ✅ 登入系統（Supabase Auth，`login.html` 入口，支援 admin/user 兩段式登入流程）
- ✅ Model 和 Period 兩種工作模式切換（透過 `mode_router.js` 管理）
- ✅ 多分頁（sheets）系統，支援分組顯示和自訂可見性（透過 `tabs_def.js` 和 `visibility_store.js` 管理）
- ✅ Excel-like 表格編輯（選取、複製、貼上、新增列/欄、刪除欄位）
- ✅ 本地自動儲存（localStorage，2 秒延遲，透過 `app_mode_storage.js` 管理）
- ✅ 雲端讀寫（Model 模式的 company sheet 同步到 Supabase，透過 `cloud_model_company_read.js` 和 `cloud_model_company_write.js`）
- ✅ Presence（線上狀態）顯示（心跳寫入、輪詢讀取、Realtime 訂閱、快速讀取迴圈，透過 `cloud_presence_heartbeat.js` 和 `presence_ui_banner.js`）
- ✅ 匯出功能（CSV、XLSX、JSON，透過 `toolbar_ops.js`）
- ✅ Check 功能（驗證規則系統，透過 `custom_rules.js` 定義，Check 按鈕綁定由 `custom_rules.js` 獨家處理）
- ✅ 分頁顯示/隱藏管理（公司層級設定，Admin 專用，透過 `sheet_admin_ui.js` 管理）
- ✅ Check 按鈕可見性管理（公司層級、分頁層級設定，透過 `check_button_admin_ui.js` 管理）
- ✅ Period 列表管理（每個 Period 有獨立的分頁和資料，透過 `period_store.js` 和 `period_ui.js` 管理）
- ✅ 多語言支援（中文/英文，透過 `i18n_def.js` 字典，`lang_ui.js` 和 `lang_apply.js` 套用）
- ✅ 角色系統（admin/user，透過 sessionStorage 的 role 欄位，admin 可管理分頁可見性和 Check 按鈕可見性）
- ✅ Required fields 視覺提示（黃色邊框標記必填欄位，透過 `required_fields_guide.js` 和 `required_legend.js`）
- ✅ 刪除欄位功能（僅在使用者新增過欄位時顯示，透過 `user_added_col_flag.js` 控制）
- ✅ 公司管理（Admin 可建立/刪除公司，從模板複製，透過 `login.html` 的 `createNewCompany()` 和 `deleteCompany()`）
- ✅ 使用者管理（Admin 可新增/刪除使用者，透過 `login.html` 的 `addNewUser()` 和 `deleteUser()`）
- ✅ 使用者→公司綁定（User 首次登入時輸入公司名稱，之後自動綁定，透過 `login.html` 的 `confirmUserCompany()`）
- ✅ 同步入口點（`sync_entrypoint.js` 的 `syncCellChange()` 記錄日誌並觸發雲端寫入，目前僅 Model/company 模式）

## 4. 當前焦點（CURRENT）

- **跨分頁資料競態問題**：當兩個分頁（Tab A 和 Tab B）同時編輯同一儲存格時，Tab A 刷新（F5）後會先載入 localStorage（包含 Tab B 的最新值），然後在 100ms 後讀取雲端資料，若雲端資料較舊或缺少該儲存格，會覆蓋掉 localStorage 的較新值
- **已知限制**：雲端同步僅限 Model 模式的 company sheet，其他 sheets 和 Period 模式僅使用本地儲存
- **同步入口點**：`sync_entrypoint.js` 的 `syncCellChange` 目前僅記錄日誌並觸發雲端寫入（寫入由 `cloud_model_company_write.js` 在 autosave 時觸發），不執行實際的衝突解決
- **診斷日誌**：已加入 `[DIAG]` 和 `[CLOUD][READ][COMPANY]` 前綴的 console.log，用於追蹤初始化順序和資料指紋（fingerprint）
- **雲端讀取保護機制**：`cloud_model_company_read.js` 已實作多層保護（檢查本地是否有資料、比較資料長度、檢查列數），但仍有邊緣情況可能導致資料覆蓋

## 5. 下一步邏輯（NEXT）

修復跨分頁刷新時的資料競態問題：在 `cloudModelCompanyTryReadOnce` 中實作更嚴格的版本比較或時間戳比較機制，確保本地資料較新時完全跳過雲端覆蓋；或實作儲存格層級的合併策略（僅合併雲端有但本地沒有的儲存格，不覆蓋本地已存在的非空儲存格）。

## 6. 硬性約束 / 不可觸碰

- **模組化架構**：所有功能已拆分到獨立 JS 檔案（57 個檔案），不應將邏輯合併回單一檔案
- **初始化順序**：`app.html` 中的 `<script>` 載入順序必須維持，特別是 `app_init.js` 必須最後載入（第 572 行）
- **Check 按鈕綁定**：Check 按鈕的點擊事件由 `custom_rules.js` 獨家處理，`app_init.js` 中相關綁定已被停用（第 172-200 行），不應重新啟用
- **Supabase 配置**：Supabase URL 和 ANON_KEY 在多個檔案中硬編碼，應統一使用 `sb_client_singleton.js` 的 `window.SB` 實例
- **localStorage 鍵值格式**：透過 `storageKeyByMode` 函數產生，格式為 `miniExcel_${mode}_${companyId}_v1`，不應直接變更鍵值格式以免破壞現有資料
- **DEFS 命名空間**：模組透過 `window.DEFS` 暴露 API，不應破壞此命名空間結構
- **Presence 系統**：Presence 相關函數（`presenceHeartbeatOnce`、`presenceReadOnce`、`presenceRealtimeSubscribe`、`presenceStartFastReadLoop`）必須永不拋出錯誤，所有錯誤都必須被 catch 並記錄日誌
- **公司模板**：`TEMPLATE_COMPANY_ID = "TEST_CO"` 是系統預設模板，不應被刪除或修改
- **Admin 角色判定**：透過 `ADMIN_EMAILS` 陣列判定（目前為 `["drtienk@gmail.com"]`），不應變更判定邏輯
- **雲端資料表結構**：`cloud_status` 表必須包含 `id`（text PK）、`payload`（text）、`updated_at`（timestamptz）欄位，不應變更表結構