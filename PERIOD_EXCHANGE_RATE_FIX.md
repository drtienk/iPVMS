# Period Exchange Rate Cloud Save 修復報告

## 🔴 根本問題

**問題描述：**
- 點擊 Period → Exchange Rate 標籤時，`sessionStorage.lastActiveKey_period` 有正確更新
- 但是 `window.activeKey` 沒有同步更新
- 導致 `toolbar_ops.js` 的 Save 按鈕處理器讀取到錯誤的 `window.activeKey` 值（仍為 "company"）
- 因此 Save 路由永遠不會呼叫 `cloudPeriodExchangeRateWriteOnce()`

**技術細節：**
- `mode_router.js` 的 `setActive()` 函式使用閉包變數 `activeKey`（來自 `app.js`）
- 它更新了 `activeKey` 和 `sessionStorage.lastActiveKey_period`
- 但**沒有同步更新 `window.activeKey`**
- `toolbar_ops.js` 第 730 行讀取：`const activeKey = (window.activeKey || "company");`
- 因此永遠讀到舊值

---

## ✅ 修復內容

### 修改檔案：`js/mode_router.js`

**變更位置：** 第 30-31 行（`setActive()` 函式內）

**變更前：**
```javascript
const prevKey = activeKey;
activeKey = nextKey;

// Save activeKey to sessionStorage based on mode
```

**變更後：**
```javascript
const prevKey = activeKey;
activeKey = nextKey;
window.activeKey = nextKey; // ✅ Sync window.activeKey for toolbar_ops.js and other modules

// Save activeKey to sessionStorage based on mode
```

---

## 📋 驗證步驟

### 步驟 1：點擊 Exchange Rate 標籤
1. 切換到 Period 模式
2. 點擊 Exchange Rate 標籤
3. 在 Console 執行：
   ```javascript
   console.log({
     activeKey: window.activeKey,
     sessionStorage: sessionStorage.getItem("lastActiveKey_period"),
     match: window.activeKey === "exchange_rate"
   });
   ```
4. **預期結果：** `activeKey: "exchange_rate"`, `match: true`

### 步驟 2：按 Save to Cloud 按鈕
1. 在 Exchange Rate sheet 輸入測試資料（例如 A1="USD"）
2. 點擊 "Save to Cloud" 按鈕
3. 觀察 Console 輸出：
   - `[UI][SAVE] trigger` ✅
   - `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] start` ✅
   - `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] ok` ✅

### 步驟 3：F5 後驗證
1. 按 F5 重新載入頁面
2. 切換到 Period → Exchange Rate
3. 確認 `sessionStorage.lastActiveKey_period === "exchange_rate"`
4. 點擊 Save to Cloud
5. **預期結果：** 成功寫入雲端

---

## ✅ 確認無誤的部分

### 1. Period 標籤已從 PERIOD_DEF_MAP 正確建立
- **檔案：** `js/tabs_ui.js` 第 29-66 行
- **實作：** Period 模式使用 `Object.keys(periodDefMap)` 建立標籤
- **每個標籤都有：**
  - `dataset.sheetKey` ✅ (第 52 行)
  - 正確的標題（來自 `def.title`）✅ (第 53 行)
  - 點擊處理器呼叫 `setActive(sheetKey)` ✅ (第 57 行)

### 2. sessionStorage 同步正常
- **檔案：** `js/mode_router.js` 第 33-40 行
- **實作：** `setActive()` 正確儲存到 `sessionStorage.lastActiveKey_period`
- **驗證：** Console 日誌 `[PERIOD][ACTIVE_SHEET]` 正常輸出

### 3. 雲端寫入函式已實作
- **檔案：** `js/cloud_period_exchange_rate_write.js`
- **函式：** `window.cloudPeriodExchangeRateWriteOnce()` ✅
- **記錄 ID 格式：** `period__${companyId}__${periodId}__exchange_rate` ✅

---

## 🎯 修復前後對比

| 項目 | 修復前 | 修復後 |
|------|--------|--------|
| `window.activeKey` | 保持 "company" | 正確更新為 "exchange_rate" |
| Save 路由判斷 | `activeKey === "company"` (錯誤) | `activeKey === "exchange_rate"` (正確) |
| 雲端寫入函式 | 永遠不會被呼叫 | 正確呼叫 |
| Console 輸出 | `[UI][SAVE] trigger` 但無寫入日誌 | `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] ok` |

---

## 📝 技術說明

### 為什麼需要 `window.activeKey`？

1. **模組間通訊：**
   - `app.js` 定義全域變數 `activeKey`（閉包變數）
   - `mode_router.js` 透過閉包存取並修改它
   - `toolbar_ops.js` 無法直接存取閉包，只能讀取 `window.activeKey`

2. **同步機制：**
   - `app.js` 第 87 行：`window.activeKey = activeKey;`（初始化時同步）
   - `mode_router.js` 第 31 行：**新增** `window.activeKey = nextKey;`（變更時同步）
   - `app.js` 第 164 行：`window.activeKey = activeKey;`（`ensureActiveKeyVisible()` 後同步）

### 為什麼其他位置不需要修改？

- 第 96、106、155 行：雖然直接設定 `activeKey`，但隨後都呼叫 `setActive(activeKey)`
- `setActive()` 現在會同步 `window.activeKey`，所以這些位置自動修復

---

## 🚀 測試建議

### 完整測試流程

1. **基本功能測試：**
   - [ ] 切換到 Period → Exchange Rate
   - [ ] 確認 `window.activeKey === "exchange_rate"`
   - [ ] 點擊 Save to Cloud 成功

2. **持久化測試：**
   - [ ] F5 後重新載入
   - [ ] 確認 `sessionStorage.lastActiveKey_period` 正確
   - [ ] 確認 Save 功能仍正常

3. **模式切換測試：**
   - [ ] Period → Exchange Rate → Save ✅
   - [ ] 切換到 Model → Company → Save ✅ (不應受影響)
   - [ ] 再切回 Period → Exchange Rate → Save ✅

---

## 📌 總結

**修復內容：** 單一關鍵修復
- **檔案：** `js/mode_router.js`
- **變更：** 在 `setActive()` 中同步 `window.activeKey`
- **影響範圍：** 最小化，僅影響 `window.activeKey` 的同步

**其他部分：** 無需修改
- Period 標籤系統已正確實作（`tabs_ui.js`）
- 雲端寫入函式已完整實作（`cloud_period_exchange_rate_write.js`）
- sessionStorage 同步正常（`mode_router.js`）

**驗證方式：** 
- 點擊 Exchange Rate 標籤
- 確認 Console 輸出 `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] ok`

---

**修復日期：** 2026-01-XX
**修復者：** Auto (AI Assistant)