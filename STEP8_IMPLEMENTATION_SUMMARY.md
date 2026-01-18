# Step 8 Implementation Summary - Period Exchange Rate Cloud Closed Loop

## Files Changed

### 1. js/cloud_period_exchange_rate_write.js (NEW FILE)
**Changes:**
- Created cloud write function for Period/Exchange Rate sheet
- Function: `window.cloudPeriodExchangeRateWriteOnce(opts)`
- Cloud record ID format: `period__${companyId}__${periodId}__exchange_rate`
- Uses `window.SB` from sb_client_singleton.js
- Upserts to `cloud_status` table

**Key Code:**
```javascript
const cloudId = `period__${companyIdStr}__${periodIdStr}__exchange_rate`;
console.log("[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] start", { id, companyId, periodId });
// ... upsert to cloud_status ...
console.log("[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] ok");
```

### 2. js/cloud_period_exchange_rate_read.js (NEW FILE)
**Changes:**
- Created cloud read function for Period/Exchange Rate sheet
- Function: `window.cloudPeriodExchangeRateTryReadOnce(opts)`
- Includes `sheetHasAnyData()` helper for local-newer protection
- STRICT guard: Never overwrites if local has any non-empty cell
- Guard key per (companyId, periodId) prevents repeated reads

**Key Code:**
```javascript
// Helper: Check if local sheet has any non-empty data
function sheetHasAnyData(sheet) {
  // Returns true if any cell has non-empty value
}

// Guard check before applying:
if (sheetHasAnyData(window.sheets.exchange_rate)) {
  console.warn("[CLOUD][READ][PERIOD][EXCHANGE_RATE] SKIP apply (local_has_data)", ...);
  return done({ ok: true, step: "skip_apply_local_has_data", reason: "local_has_data" });
}

Object.assign(window.sheets.exchange_rate, exchangeRateSheetFromCloud);
```

### 3. js/toolbar_ops.js
**Changes:**
- Updated Save button handler to support Period/Exchange Rate
- Branches on mode/sheet: Model/Company uses existing writer, Period/Exchange Rate uses new writer
- Added logs: `[UI][SAVE][PERIOD][EXCHANGE_RATE] trigger/ok/error`

**Modified Guard Logic:**
```javascript
if (activeMode === "model" && activeKey === "company") {
  // Existing behavior - cloud save works
} else if (activeMode === "period" && activeKey === "exchange_rate") {
  // Period/Exchange Rate cloud save - Step 8
} else {
  status.textContent = "Cloud save not enabled for this sheet";
  return;
}

// Then in try block:
if (activeMode === "model" && activeKey === "company") {
  result = await window.cloudModelCompanyWriteOnce({ reason: "manual_save" });
} else if (activeMode === "period" && activeKey === "exchange_rate") {
  result = await window.cloudPeriodExchangeRateWriteOnce({ reason: "manual_save" });
}
```

### 4. js/mode_router.js
**Changes:**
- Added cloud read trigger in `setActive()` when entering Period/Exchange Rate sheet
- Added cloud read trigger in `periodSelector` change handler after period switch

**Modified Code:**
```javascript
// In setActive() after render:
if (activeMode === "period" && nextKey === "exchange_rate") {
  setTimeout(() => {
    if (typeof window.cloudPeriodExchangeRateTryReadOnce === "function") {
      window.cloudPeriodExchangeRateTryReadOnce({ reason: "enter_sheet" });
    }
  }, 100);
}

// In periodSelector change handler after setActive(activeKey):
if (activeMode === "period" && activeKey === "exchange_rate") {
  setTimeout(() => {
    if (typeof window.cloudPeriodExchangeRateTryReadOnce === "function") {
      window.cloudPeriodExchangeRateTryReadOnce({ reason: "period_switch" });
    }
  }, 100);
}
```

### 5. app.html
**Changes:**
- Added script tags for cloud read/write files (after cloud_model_company_write.js)

**Added Scripts:**
```html
<!-- ✅ Cloud period exchange_rate read (read-only pull) -->
<script src="js/cloud_period_exchange_rate_read.js"></script>
<!-- ✅ Cloud period exchange_rate write (write-only push) -->
<script src="js/cloud_period_exchange_rate_write.js"></script>
```

## Implementation Details

### Cloud Record ID Format
- **Exact format:** `period__${companyId}__${periodId}__exchange_rate`
- Example: `period__default__P1__exchange_rate`

### Local-Newer Protection
- **Helper function:** `sheetHasAnyData(sheet)` - returns true if any cell has non-empty value
- **Guard logic:** If `sheetHasAnyData(window.sheets.exchange_rate)` returns true, skip cloud apply
- **Log when skipped:** `[CLOUD][READ][PERIOD][EXCHANGE_RATE] SKIP apply (local_has_data)`

### Cloud Read Triggers
- **On enter sheet:** When `setActive("exchange_rate")` is called in Period mode (100ms delay)
- **On period switch:** When periodSelector changes and lands on exchange_rate (100ms delay)
- **Guard:** In-memory Set prevents repeated reads per (companyId, periodId)

### Save Button Parity
- **Period/Exchange Rate:** Same UI behavior as Model/Company (disable → "Saving…" → "Saved ✓ HH:MM:SS" or red error)
- **Other sheets:** Shows red "Cloud save not enabled for this sheet"
- **Model/Company:** Unchanged, still works

## 10-Step Smoke Test Checklist

### Step 1: P1 Local Data -> Save -> Supabase Updated
**Test:**
- Set periodSelector to P1
- Switch to Period mode → Exchange Rate sheet
- Enter data: A1="USD", B1="EUR", C1="0.85", D1="2024-01-15"
- Click "Save to Cloud" button

**Expected:**
- Button shows "Saving…" (disabled)
- Status shows "Saved ✓ HH:MM:SS"
- Console shows: `[UI][SAVE][PERIOD][EXCHANGE_RATE] trigger`
- Console shows: `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] start` with `id: "period__default__P1__exchange_rate"`
- Console shows: `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] ok`

**Pass Criteria:** Save succeeds, Supabase record created/updated

---

### Step 2: Check Supabase Record for P1
**Test:**
- Open Supabase Dashboard → `cloud_status` table
- Filter by `id = "period__default__P1__exchange_rate"`

**Expected:**
- Record exists with correct ID
- `payload` contains JSON stringified Exchange Rate sheet with the data entered

**Pass Criteria:** Record exists in Supabase with correct data

---

### Step 3: Clear localStorage -> Reload -> Cloud Restore
**Test:**
- Clear localStorage: `localStorage.clear()` in console
- Press F5 (refresh page)
- Set periodSelector to P1
- Navigate to Period mode → Exchange Rate sheet
- Wait ~100ms

**Expected:**
- Console shows: `[CLOUD][READ][PERIOD][EXCHANGE_RATE] query`
- Console shows: `[CLOUD][READ][PERIOD][EXCHANGE_RATE] applied`
- Exchange Rate sheet shows P1 data (A1="USD", etc.)

**Pass Criteria:** Cloud data restored after clearing local storage

---

### Step 4: P2 Different Data -> Save -> Separate Record
**Test:**
- Set periodSelector to P2
- Switch to Period mode → Exchange Rate sheet
- Enter different data: A1="GBP", B1="USD", C1="1.25", D1="2024-02-20"
- Click "Save to Cloud"

**Expected:**
- Console shows: `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] start` with `id: "period__default__P2__exchange_rate"`
- Console shows: `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] ok`
- Supabase has separate record: `period__default__P2__exchange_rate`

**Pass Criteria:** P1 and P2 have separate cloud records

---

### Step 5: Guard Prevents Cloud Overwrite When Local Has Data
**Test:**
- In P1: Enter data A1="LOCAL", B1="DATA"
- Clear cloud record (or ensure no cloud data exists for P1)
- Switch to another sheet, then switch back to Exchange Rate sheet

**Expected:**
- Console shows: `[CLOUD][READ][PERIOD][EXCHANGE_RATE] query`
- Console shows: `[CLOUD][READ][PERIOD][EXCHANGE_RATE] SKIP apply (local_has_data)`
- Local data remains: A1="LOCAL", B1="DATA" (not overwritten)

**Pass Criteria:** Guard prevents overwrite, local data preserved

---

### Step 6: Guard Allows Cloud When Local Empty
**Test:**
- Switch to P3 (should be empty)
- Switch to Exchange Rate sheet
- Ensure P3 has cloud data (or manually create via Supabase)
- Wait ~100ms

**Expected:**
- Console shows: `[CLOUD][READ][PERIOD][EXCHANGE_RATE] applied`
- Exchange Rate sheet shows cloud data (if cloud data exists)

**Pass Criteria:** Cloud data applied when local is empty

---

### Step 7: Period Switch Triggers Cloud Read
**Test:**
- In P1 with local data, switch periodSelector to P2 (should be empty locally)
- Navigate to Exchange Rate sheet (if not already there)
- Wait ~100ms

**Expected:**
- Console shows: `[PERIOD][SWITCH] { from: "P1", to: "P2" }`
- Console shows: `[CLOUD][READ][PERIOD][EXCHANGE_RATE] query` with `periodId: "P2"`
- If cloud data exists for P2, it's applied

**Pass Criteria:** Cloud read triggered after period switch

---

### Step 8: Offline Save Shows Red Error
**Test:**
- Disable network (DevTools → Network → Offline)
- Enter data in Period/Exchange Rate
- Click "Save to Cloud"

**Expected:**
- Button shows "Saving…"
- After error: Status shows red "Save failed: ..."
- Console shows: `[UI][SAVE][PERIOD][EXCHANGE_RATE] error`
- Button restored to "Save to Cloud" (enabled)

**Pass Criteria:** Error handled gracefully, button restored

---

### Step 9: Model/Company Save Still Works
**Test:**
- Switch to Model mode → Company sheet
- Click "Save to Cloud" button

**Expected:**
- Status shows "Saved ✓ HH:MM:SS"
- Console shows: `[UI][SAVE][COMPANY] trigger` and `[CLOUD][WRITE][COMPANY] ok`
- No errors, no regression

**Pass Criteria:** Model/Company save unchanged, works as before

---

### Step 10: Three Periods Independent Cloud Records
**Test:**
- P1: Save data A1="P1Data"
- P2: Save data A1="P2Data"
- P3: Save data A1="P3Data"
- Check Supabase dashboard

**Expected:**
- Three separate records:
  - `period__default__P1__exchange_rate`
  - `period__default__P2__exchange_rate`
  - `period__default__P3__exchange_rate`
- Each record has correct payload data

**Pass Criteria:** All three periods maintain separate cloud records

---

## Log Prefixes

**Cloud Write:**
- `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] start` - Before write
- `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] ok` - Success
- `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] error` - Failure

**Cloud Read:**
- `[CLOUD][READ][PERIOD][EXCHANGE_RATE] query` - Before query
- `[CLOUD][READ][PERIOD][EXCHANGE_RATE] result` - Query result
- `[CLOUD][READ][PERIOD][EXCHANGE_RATE] SKIP apply (local_has_data)` - Guard skip
- `[CLOUD][READ][PERIOD][EXCHANGE_RATE] applied` - Successfully applied
- `[CLOUD][READ][PERIOD][EXCHANGE_RATE] done` - Function completion

**UI Save:**
- `[UI][SAVE][PERIOD][EXCHANGE_RATE] trigger` - Save button clicked
- `[UI][SAVE][PERIOD][EXCHANGE_RATE] ok` - Save succeeded
- `[UI][SAVE][PERIOD][EXCHANGE_RATE] error` - Save failed
