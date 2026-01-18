# Period Workspace 實作狀態總結與 Exchange Rate 雲端儲存問題分析

## 一、Period Workspace 實作狀態總結

### 1. 已完成的實作

#### ✅ **檔案結構已完成**
- `js/cloud_period_exchange_rate_write.js` - 雲端寫入功能已實作
- `js/cloud_period_exchange_rate_read.js` - 雲端讀取功能已實作
- `js/period_id_helper.js` - Period ID 輔助函式已實作
- `js/toolbar_ops.js` - 儲存按鈕委派處理已更新
- `js/mode_router.js` - 模式路由已加入雲端讀取觸發

#### ✅ **功能整合已完成**
- **儲存按鈕處理**：`toolbar_ops.js` 中已加入 Period/Exchange Rate 分支邏輯
- **雲端讀取觸發**：進入 Exchange Rate sheet 時自動觸發雲端讀取
- **Period 切換觸發**：切換 Period 時如果停留在 Exchange Rate sheet 會觸發雲端讀取
- **腳本載入順序**：`app.html` 中所有必要腳本已依正確順序載入

#### ✅ **雲端記錄 ID 格式**
- 格式：`period__${companyId}__${periodId}__exchange_rate`
- 範例：`period__default__2023-02__exchange_rate`

### 2. 實作架構

```
┌─────────────────────────────────────────────────────┐
│ Period Workspace Cloud Save 架構                     │
└─────────────────────────────────────────────────────┘

1. 使用者操作
   └─> 進入 Period 模式 → Exchange Rate sheet
       └─> 觸發雲端讀取 (mode_router.js)

2. 儲存流程
   └─> 點擊 "Save to Cloud" 按鈕
       └─> toolbar_ops.js 判斷模式/工作表
           └─> 呼叫 cloudPeriodExchangeRateWriteOnce()
               └─> 取得 companyId 和 periodId
                   └─> 寫入 Supabase cloud_status 表

3. 讀取流程
   └─> 進入 Exchange Rate sheet 或切換 Period
       └─> 觸發 cloudPeriodExchangeRateTryReadOnce()
           └─> 檢查本地是否有資料 (保護機制)
               └─> 從 Supabase 讀取資料
                   └─> 套用到工作表
```

---

## 二、Exchange Rate 雲端儲存無法運作的可能原因

### 🔴 **問題 1：periodId 未正確設定**

**檢查點：**
- `window.getActivePeriodId()` 函式是否正確載入
- `sessionStorage.getItem("activePeriod")` 是否有值
- `window.activePeriod` 是否已設定

**驗證方法：**
```javascript
// 在瀏覽器 console 執行
console.log("activePeriod:", window.activePeriod);
console.log("sessionStorage:", sessionStorage.getItem("activePeriod"));
console.log("getActivePeriodId:", window.getActivePeriodId());
```

**可能原因：**
- 使用者尚未選擇或建立 Period
- `period_id_helper.js` 未正確載入
- `setActivePeriod()` 未正確更新 `sessionStorage`

**解決方案：**
- 確保在使用 Exchange Rate 功能前已選擇 Period
- 檢查 `js/period_id_helper.js` 是否在 `app.html` 中正確載入（第 510 行）

---

### 🔴 **問題 2：companyId 未正確取得**

**檢查點：**
`cloud_period_exchange_rate_write.js` 中的 companyId 取得邏輯：
```javascript
const companyId = window.documentMeta?.companyId || 
                  (typeof window.companyScopeKey === "function" ? window.companyScopeKey() : null) ||
                  sessionStorage.getItem("companyId") ||
                  null;
```

**驗證方法：**
```javascript
// 在瀏覽器 console 執行
console.log("documentMeta.companyId:", window.documentMeta?.companyId);
console.log("sessionStorage companyId:", sessionStorage.getItem("companyId"));
console.log("companyScopeKey:", typeof window.companyScopeKey === "function" ? window.companyScopeKey() : "N/A");
```

**可能原因：**
- 使用者尚未登入
- `companyId` 未正確儲存在 `sessionStorage`
- `window.documentMeta` 未初始化

---

### 🔴 **問題 3：activeKey 判斷錯誤**

**檢查點：**
`toolbar_ops.js` 中判斷邏輯：
```javascript
const activeMode = (window.activeMode || "model").toLowerCase();
const activeKey = (window.activeKey || "company");
```

**驗證方法：**
```javascript
// 在瀏覽器 console 執行（在 Exchange Rate sheet 時）
console.log("activeMode:", window.activeMode);
console.log("activeKey:", window.activeKey);
console.log("條件符合:", window.activeMode === "period" && window.activeKey === "exchange_rate");
```

**可能原因：**
- `activeKey` 未正確設為 `"exchange_rate"`
- 大小寫或拼寫錯誤
- 切換到 Exchange Rate sheet 時 `setActive()` 未正確更新 `activeKey`

**解決方案：**
- 確認 `tabs_def.js` 中定義的 key 為 `"exchange_rate"`（第 14 行）
- 檢查 `setActive("exchange_rate")` 是否正確呼叫

---

### 🔴 **問題 4：window.SB 未初始化**

**檢查點：**
`cloud_period_exchange_rate_write.js` 需要 `window.SB`（Supabase 客戶端）

**驗證方法：**
```javascript
// 在瀏覽器 console 執行
console.log("window.SB:", typeof window.SB);
console.log("window.SB.from:", typeof window.SB?.from);
```

**可能原因：**
- `js/sb_client_singleton.js` 未正確載入
- Supabase 初始化失敗
- 腳本載入順序問題（應在 `sb_client_singleton.js` 之後載入）

**解決方案：**
- 確認 `app.html` 中腳本載入順序正確：
  - 第 560 行：`sb_client_singleton.js`
  - 第 574 行：`cloud_period_exchange_rate_write.js`

---

### 🔴 **問題 5：函式未正確暴露**

**檢查點：**
`window.cloudPeriodExchangeRateWriteOnce` 是否已定義

**驗證方法：**
```javascript
// 在瀏覽器 console 執行
console.log("cloudPeriodExchangeRateWriteOnce:", typeof window.cloudPeriodExchangeRateWriteOnce);
```

**可能原因：**
- `js/cloud_period_exchange_rate_write.js` 未載入
- JavaScript 錯誤導致函式未正確定義

**解決方案：**
- 檢查瀏覽器 Console 是否有錯誤訊息
- 確認 `app.html` 第 574 行腳本標籤正確

---

### 🔴 **問題 6：工作表不存在**

**檢查點：**
`window.sheets.exchange_rate` 是否存在

**驗證方法：**
```javascript
// 在瀏覽器 console 執行
console.log("window.sheets:", window.sheets);
console.log("window.sheets.exchange_rate:", window.sheets?.exchange_rate);
```

**可能原因：**
- `exchange_rate` 工作表未正確初始化
- `period_exchange_rate_required.js` 未正確載入

---

### 🔴 **問題 7：事件委派未綁定**

**檢查點：**
`bindCloudSaveDelegateOnce()` 是否已執行

**驗證方法：**
```javascript
// 在瀏覽器 console 執行
console.log("__saveDelegateBound:", window.__saveDelegateBound);
console.log("bindCloudSaveDelegateOnce:", typeof window.bindCloudSaveDelegateOnce);
```

**可能原因：**
- `app_init.js` 中未呼叫 `bindCloudSaveDelegateOnce()`
- DOM 未準備好時嘗試綁定

---

## 三、診斷步驟

### 步驟 1：檢查 Console 錯誤
1. 開啟瀏覽器開發者工具
2. 切換到 Period 模式 → Exchange Rate sheet
3. 查看 Console 是否有錯誤訊息
4. 特別注意：
   - `✅ [cloud_period_exchange_rate_write] loaded`
   - `✅ [period_id_helper] loaded`

### 步驟 2：驗證必要變數
在 Exchange Rate sheet 時執行：
```javascript
console.log({
  activeMode: window.activeMode,
  activeKey: window.activeKey,
  periodId: window.getActivePeriodId(),
  companyId: sessionStorage.getItem("companyId"),
  hasSB: !!window.SB,
  hasFunction: typeof window.cloudPeriodExchangeRateWriteOnce === "function",
  hasSheet: !!window.sheets?.exchange_rate
});
```

### 步驟 3：測試儲存功能
1. 在 Exchange Rate sheet 輸入測試資料（例如 A1="USD", B1="EUR", C1="0.85"）
2. 點擊 "Save to Cloud" 按鈕
3. 觀察 Console 輸出：
   - `[UI][SAVE] trigger`
   - `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] start`
   - `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] ok` 或錯誤訊息

### 步驟 4：檢查 Supabase 記錄
1. 開啟 Supabase Dashboard
2. 查詢 `cloud_status` 表
3. 篩選 `id LIKE 'period__%__exchange_rate'`
4. 確認記錄是否已建立

---

## 四、常見錯誤訊息對照

| 錯誤訊息 | 原因 | 解決方法 |
|---------|------|---------|
| `periodId_not_found` | 未選擇 Period | 先選擇或建立 Period |
| `companyId_not_found` | 未登入或 companyId 未設定 | 確認已登入並有 companyId |
| `SB_not_available` | Supabase 客戶端未初始化 | 檢查 `sb_client_singleton.js` 是否載入 |
| `exchange_rate_sheet_not_found` | 工作表未初始化 | 檢查 `period_exchange_rate_required.js` |
| `Cloud save not enabled for this sheet` | activeMode 或 activeKey 不匹配 | 確認在 Period 模式且 activeKey 為 `exchange_rate` |

---

## 五、建議的修復步驟

1. **確認前置條件**
   - 使用者已登入（有 companyId）
   - 已選擇 Period（有 activePeriod）
   - 已切換到 Period 模式 → Exchange Rate sheet

2. **檢查載入順序**
   - 確認所有必要腳本在 `app.html` 中正確載入
   - 特別確認 `period_id_helper.js`、`sb_client_singleton.js`、`cloud_period_exchange_rate_write.js` 的順序

3. **驗證函式定義**
   - 在 Console 中確認所有必要函式都已定義
   - 如果缺少，檢查對應的 .js 檔案是否存在且無語法錯誤

4. **測試流程**
   - 按照「診斷步驟」逐一檢查
   - 根據錯誤訊息對照表找出問題

---

## 六、參考文件

- `STEP8_IMPLEMENTATION_SUMMARY.md` - Step 8 完整實作說明
- `STEP8_WRITE_FUNCTION_FIX.md` - 寫入函式修復說明
- `P1P2P3_REMOVAL_SUMMARY.md` - Period ID 格式變更說明（從 P1/P2/P3 改為 YYYY-MM）

---

**最後更新：** 2026-01-XX
**文件狀態：** 待驗證實際問題後更新具體解決方案