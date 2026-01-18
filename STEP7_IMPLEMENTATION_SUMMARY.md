# Step 7 Implementation Summary

## Files Changed

### 1. js/defs.js
**Changes:**
- Added `exchange_rate` sheet definition to `PERIOD_DEF_MAP`
- Sheet key: "exchange_rate"
- Headers: ["From Currency", "To Currency", "Rate", "As Of Date"]
- Columns: 4

**Modified:**
```javascript
exchange_rate: { title:"Exchange Rate", headers:["From Currency","To Currency","Rate","As Of Date"], cols:4 },
```

### 2. js/tabs_def.js
**Changes:**
- Added `exchange_rate` tab to `TAB_CONFIG` array (periodOnly: true)
- Added `exchange_rate` to `TAB_GROUPS_PERIOD` Basic Info group

**Modified:**
```javascript
{ id:"tabExchangeRate", key:"exchange_rate", enModel:"", zhModel:"", enPeriod:"Exchange Rate", zhPeriod:"匯率", periodOnly:true }
// In TAB_GROUPS_PERIOD:
keys: ["company", "exchange_rate"]
```

### 3. js/mode_storage_store.js
**Changes:**
- Added `periodId` getter to ctx
- Updated `storageKeyByMode` to use `periodId` when available (format: `miniExcel_autosave_period_v1__${companyId}__${periodId}`)
- Updated `saveToLocalByMode` and `loadFromLocalByMode` to check for `periodId` or `activePeriod`

**Modified:**
```javascript
get periodId(){ return (window.getActivePeriodId?.() || sessionStorage.getItem("periodId") || "").trim(); }

// In storageKeyByMode:
const periodId = ctx.periodId;
if (periodId) {
  return `miniExcel_autosave_period_v1__${scope}__${periodId}`;
}
```

### 4. js/period_id_store.js (NEW FILE)
**Changes:**
- Created new file for periodId management (P1/P2/P3)
- Provides `getActivePeriodId()` and `setActivePeriodId(id)` helpers
- Stores in sessionStorage key "periodId"
- Exposes via `window.DEFS.PERIOD_ID` and global helpers

**Created Functions:**
```javascript
window.getActivePeriodId() // returns current periodId or ""
window.setActivePeriodId(id) // sets periodId (validates P1/P2/P3)
```

### 5. js/period_exchange_rate_required.js (NEW FILE)
**Changes:**
- Created new file for required marking on Period / Exchange Rate sheet
- All 4 columns marked as required (req-col class)
- Tag identifier: "req-period-exchange-rate"
- Pattern matches `model_all_required_company_bu.js`

**Created Functions:**
- Hooks into `window.render()` to re-apply marks after render
- Detects Exchange Rate sheet by headers: ["From Currency", "To Currency", "Rate", "As Of Date"]

### 6. js/toolbar_ops.js
**Changes:**
- Updated Save button handler guard logic
- Period/Exchange Rate now shows "Not available yet" (red)
- Other sheets show "Cloud save not enabled for this sheet" (red)
- Model/Company keeps existing cloud save behavior

**Modified:**
```javascript
// Guard: Model/Company -> cloud save works; Period/Exchange Rate -> not available yet
if (activeMode === "model" && activeKey === "company") {
  // Existing behavior - cloud save works
} else if (activeMode === "period" && activeKey === "exchange_rate") {
  status.textContent = "Not available yet";
  status.style.color = "#ef4444"; // red
  return;
} else {
  status.textContent = "Cloud save not enabled for this sheet";
  status.style.color = "#ef4444"; // red
  return;
}
```

### 7. app.html
**Changes:**
- Added script tag for `js/period_id_store.js` (after period_store.js)
- Added script tag for `js/period_exchange_rate_required.js` (after model_all_required_company_bu.js)

**Added Scripts:**
```html
<script src="js/period_id_store.js"></script>
<script src="js/period_exchange_rate_required.js"></script>
```

## Implementation Notes

### Period ID Management
- **NOT FOUND:** No existing periodId selector UI, so period switching must be done via:
  - `window.setActivePeriodId("P1")` in console, OR
  - SessionStorage directly: `sessionStorage.setItem("periodId", "P1")`
- Period ID switching logic (save/load on change) should be implemented in future step when period selector UI is added

### Storage Key Format
- Period mode with periodId: `miniExcel_autosave_period_v1__${companyId}__${periodId}`
- Falls back to existing `activePeriod` format if `periodId` is not set (backward compatibility)

### Required Marking
- All 4 columns in Exchange Rate sheet are marked with `req-col` class
- Applied automatically after render, similar to Model/Company pattern

## 10-Minute Smoke Test Checklist

### Test 1: Period P1/P2/P3 Isolation
**Steps:**
- Set periodId: `window.setActivePeriodId("P1")` in console
- Switch to Period mode → Exchange Rate sheet
- Enter data in a cell (e.g., A1: "USD")
- Set periodId: `window.setActivePeriodId("P2")` in console
- Switch to Period mode → Exchange Rate sheet

**Expected:**
- P1 data is saved and isolated
- P2 shows empty sheet (different localStorage key)
- Data persists per periodId

**Pass Criteria:** P1 and P2 data are isolated (separate localStorage keys)

---

### Test 2: F5 Persistence per Period
**Steps:**
- Set periodId: `window.setActivePeriodId("P1")`
- Switch to Period mode → Exchange Rate sheet
- Enter data: A1="USD", B1="EUR", C1="0.85"
- Press F5 (refresh)

**Expected:**
- Data persists after refresh
- Exchange Rate sheet still shows the data
- All 4 columns still marked as required (yellow tint)

**Pass Criteria:** Data persists after refresh, required marks visible

---

### Test 3: Exchange Rate Required Columns Visible
**Steps:**
- Switch to Period mode → Exchange Rate sheet
- Observe headers and cells

**Expected:**
- 4 headers visible: "From Currency", "To Currency", "Rate", "As Of Date"
- All 4 column headers have yellow tint (req-col class)
- All cells in all rows have yellow tint (req-col class)

**Pass Criteria:** All 4 columns show required marking (yellow tint)

---

### Test 4: Save Button Shows "Not available yet" in Period/Exchange Rate
**Steps:**
- Switch to Period mode → Exchange Rate sheet
- Click "Save to Cloud" button
- Observe status message

**Expected:**
- Status shows red text: "Not available yet"
- Button remains enabled (not disabled)
- No console logs from cloud write
- Switch to Model mode → Company sheet → Click Save → Shows "Saved ✓ HH:MM:SS" (works normally)

**Pass Criteria:** Period/Exchange Rate shows "Not available yet", Model/Company save still works

---

### Test 5: Model/Company Save Still Works
**Steps:**
- Switch to Model mode → Company sheet
- Enter some data
- Click "Save to Cloud" button

**Expected:**
- Button shows "Saving…" (disabled)
- Status shows "Saving…" then "Saved ✓ HH:MM:SS"
- Console shows: `[UI][SAVE][COMPANY] trigger` and `[CLOUD][WRITE][COMPANY] ok`
- Button restored to "Save to Cloud" (enabled)

**Pass Criteria:** Model/Company save works as before, no regression

---

## Known Limitations

1. **Period ID Selector UI:** Not implemented yet. Must use console or sessionStorage to set periodId.
2. **Period Switching Logic:** Save/load on periodId change not implemented (will be added when selector UI is built).
3. **Cloud Save:** Period/Exchange Rate cloud save disabled (Step 8 will implement).

## Next Steps (Step 8)

- Implement periodId selector UI (P1/P2/P3 dropdown)
- Add period switching logic (save current, load new periodId data)
- Implement cloud read/write for Period/Exchange Rate
