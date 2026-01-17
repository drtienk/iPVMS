# 專案狀態摘要（2026-01）

## 1. 專案概覽

- **應用程式類型**：Excel-like 網頁應用程式（Model Excel）
- **主要功能**：管理公司財務模型和期間資料的電子表格系統
- **部署位置**：純前端應用，透過 HTML 檔案直接開啟或託管在靜態伺服器
- **前端限制**：純 HTML + JavaScript，無使用任何框架（React/Vue 等）
- **後端限制**：依賴 Supabase 作為唯一的雲端服務（資料庫、身份驗證、即時功能）

## 2. 技術堆疊與架構

- **前端技術**：純 HTML5、原生 JavaScript（ES5/ES6）、CSS3
- **雲端服務**：Supabase（PostgreSQL 資料庫、身份驗證、Realtime）
- **本地儲存**：localStorage（以 companyId 和 mode 為鍵值範圍）
- **雲端儲存**：Supabase 的 `cloud_status` 表（存儲 Model 模式的 company sheet 資料）
- **身份驗證**：Supabase Auth（透過 `login.html` 登入，sessionStorage 儲存 role/companyId）
- **版本管理**：透過 URL query string 的 `v=` 參數控制檔案快取
- **模組化架構**：所有功能拆分成獨立 JS 檔案，透過 `window.DEFS` 命名空間組織
- **初始化流程**：`app_init.js` 負責啟動順序（載入本地資料 → 套用定義 → 渲染 → 延遲 100ms 後讀取雲端）

## 3. 已完成步驟（DONE）

- 登入系統（Supabase Auth，login.html 入口）
- Model 和 Period 兩種工作模式切換
- 多分頁（sheets）系統，支援分組顯示和自訂可見性
- Excel-like 表格編輯（選取、複製、貼上、新增列/欄）
- 本地自動儲存（localStorage，2 秒延遲）
- 雲端讀寫（Model 模式的 company sheet 同步到 Supabase）
- Presence（線上狀態）顯示（心跳寫入、輪詢讀取、Realtime 訂閱）
- 匯出功能（CSV、XLSX、JSON）
- Check 功能（驗證規則系統，透過 custom_rules.js 定義）
- 分頁顯示/隱藏管理（公司層級設定，Admin 專用）
- Period 列表管理（每個 Period 有獨立的分頁和資料）
- 多語言支援（中文/英文，透過 i18n_def.js 字典）
- 角色系統（admin/user，透過 sessionStorage 的 role 欄位）
- Required fields 視覺提示（黃色邊框標記必填欄位）
- 刪除欄位功能（僅在使用者新增過欄位時顯示）

## 4. 當前焦點（CURRENT）

- **跨分頁資料競態問題**：當兩個分頁（Tab A 和 Tab B）同時編輯同一儲存格時，Tab A 刷新（F5）後會先載入 localStorage（包含 Tab B 的最新值），然後在 100ms 後讀取雲端資料，若雲端資料較舊或缺少該儲存格，會覆蓋掉 localStorage 的較新值
- **已知限制**：雲端同步僅限 Model 模式的 company sheet，其他 sheets 和 Period 模式僅使用本地儲存
- **同步入口點**：`sync_entrypoint.js` 的 `syncCellChange` 目前僅記錄日誌，不實際執行雲端寫入（寫入由 `cloud_model_company_write.js` 在 autosave 時觸發）
- **診斷日誌**：已加入 `[DIAG]` 和 `[CLOUD][READ][COMPANY]` 前綴的 console.log，用於追蹤初始化順序和資料指紋（fingerprint）

## 5. 下一步邏輯（NEXT）

- 修復跨分頁刷新時的資料競態問題：在 `cloudModelCompanyTryReadOnce` 中比較雲端資料和本地資料的時間戳或版本號，若本地較新則跳過雲端覆蓋；或在本地資料已包含非空儲存格時，僅合併雲端資料而不覆蓋

## 6. 硬性約束 / 不可觸碰

- **模組化架構**：所有功能已拆分到獨立 JS 檔案，不應將邏輯合併回單一檔案
- **初始化順序**：`app.html` 中的 `<script>` 載入順序必須維持，特別是 `app_init.js` 必須最後載入
- **Check 按鈕綁定**：Check 按鈕的點擊事件由 `custom_rules.js` 獨家處理，`app_init.js` 中相關綁定已被停用，不應重新啟用
- **Supabase 配置**：Supabase URL 和 ANON_KEY 在多個檔案中硬編碼，應統一使用 `sb_client_singleton.js` 的 `window.SB` 實例
- **localStorage 鍵值格式**：透過 `storageKeyByMode` 函數產生，格式為 `miniExcel_${mode}_${companyId}_v1`，不應直接變更鍵值格式以免破壞現有資料
- **DEFS 命名空間**：模組透過 `window.DEFS` 暴露 API，不應破壞此命名空間結構
