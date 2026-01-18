# P1/P2/P3 Removal Summary - Switch to YYYY-MM Period System

## Files Changed

### 1. app.html
**Changes:**
- Removed `<select id="periodSelector">` dropdown (P1/P2/P3)
- Removed script tag for `js/period_id_store.js`
- Added script tag for `js/period_id_helper.js` (new helper for YYYY-MM as periodId)

**Removed:**
```html
<select id="periodSelector" style="...">
  <option value="P1">P1</option>
  <option value="P2">P2</option>
  <option value="P3">P3</option>
</select>
```

**Added:**
```html
<script src="js/period_id_helper.js"></script>
```

### 2. js/period_id_store.js
**Status:** DELETED
- File removed (no longer needed)

### 3. js/period_id_helper.js (NEW FILE)
**Changes:**
- Created helper functions to use `activePeriod` (YYYY-MM) as `periodId`
- `window.getActivePeriodId()` returns activePeriod (YYYY-MM)
- `window.setActivePeriodId(v)` sets activePeriod to keep in sync

**Created Functions:**
```javascript
window.getActivePeriodId = function getActivePeriodId() {
  return sessionStorage.getItem("activePeriod") || 
         document.getElementById("periodSelect")?.value || 
         (window.activePeriod || "").trim() || 
         "";
};

window.setActivePeriodId = function setActivePeriodId(v) {
  const periodStr = String(v || "").trim();
  if (periodStr) {
    sessionStorage.setItem("activePeriod", periodStr);
    window.activePeriod = periodStr;
    const sel = document.getElementById("periodSelect");
    if (sel) sel.value = periodStr;
  }
  return periodStr;
};
```

### 4. js/mode_router.js
**Changes:**
- Removed `periodSelector` change handler (P1/P2/P3)
- Enhanced `periodSelect` change handler with logging and cloud read trigger
- Removed periodSelector initialization in DOMContentLoaded

**Removed:**
- Entire `periodSelector` change handler (lines 103-166)

**Enhanced periodSelect Handler:**
```javascript
on("periodSelect","change", () => {
  const p = String(sel.value || "").trim();
  const prevPeriodId = (typeof window.getActivePeriodId === "function") ? window.getActivePeriodId() : "";
  
  console.log("[PERIOD][SWITCH]", { from: prevPeriodId || "(none)", to: p });
  
  // Save, set activePeriod, load, render (existing logic)
  // ...
  
  // Log storage key
  const storageKey = (typeof storageKeyByMode === "function") ? storageKeyByMode("period") : "";
  console.log("[PERIOD][KEY]", storageKey);
  
  // Step 8: Trigger cloud read after period switch if landing on exchange_rate
  if (activeMode === "period" && activeKey === "exchange_rate") {
    setTimeout(() => {
      if (typeof window.cloudPeriodExchangeRateTryReadOnce === "function") {
        window.cloudPeriodExchangeRateTryReadOnce({ reason: "period_switch" });
      }
    }, 100);
  }
});
```

### 5. js/mode_storage_store.js
**Changes:**
- Updated `ctx.periodId` getter to use `window.getActivePeriodId()` (returns YYYY-MM)
- Simplified `storageKeyByMode` to always use periodId (which now is YYYY-MM from activePeriod)
- Simplified `saveToLocalByMode` and `loadFromLocalByMode` checks

**Modified:**
```javascript
get periodId(){ return (window.getActivePeriodId?.() || "").trim(); }

// In storageKeyByMode:
const periodId = ctx.periodId || ctx.activePeriod;
const safe = periodId ? String(periodId).trim() : "__NO_PERIOD__";
return `miniExcel_autosave_period_v1__${scope}__${safe}`;
```

### 6. js/cloud_period_exchange_rate_write.js
**Status:** No changes needed
- Already uses `window.getActivePeriodId()` which now returns YYYY-MM
- Cloud record ID will be: `period__${companyId}__2023-02__exchange_rate` (correct)

### 7. js/cloud_period_exchange_rate_read.js
**Status:** No changes needed
- Already uses `window.getActivePeriodId()` which now returns YYYY-MM
- Cloud record ID query uses YYYY-MM format (correct)

## Implementation Details

### Period ID Source
- **Single source of truth:** `sessionStorage.activePeriod` (YYYY-MM format)
- **Helper function:** `window.getActivePeriodId()` reads from activePeriod
- **No P1/P2/P3:** All periodId references now use YYYY-MM strings

### Storage Key Format
- **Period mode:** `miniExcel_autosave_period_v1__${companyId}__${periodId}`
- Where `periodId` is YYYY-MM format (e.g., "2023-01", "2023-02")

### Cloud Record ID Format
- **Period/Exchange Rate:** `period__${companyId}__${periodId}__exchange_rate`
- Where `periodId` is YYYY-MM format (e.g., `period__default__2023-02__exchange_rate`)

## 6-Step Smoke Test Checklist

### Step 1: Change #periodSelect from 2023-01 to 2023-02 -> Data Isolates (Local)
**Test:**
- Switch to Period mode
- Select periodSelect to "2023-01"
- Navigate to Exchange Rate sheet
- Enter data: A1="USD2023-01"
- Change periodSelect to "2023-02"
- Check Exchange Rate sheet

**Expected:**
- Console shows: `[PERIOD][SWITCH] { from: "2023-01", to: "2023-02" }`
- Console shows: `[PERIOD][KEY] "miniExcel_autosave_period_v1__default__2023-02"`
- Exchange Rate sheet is blank (2023-02 has no data yet)
- Switch back to "2023-01" → data returns (A1="USD2023-01")

**Pass Criteria:** Data isolated per YYYY-MM period, localStorage keys different

---

### Step 2: Period Exchange Rate Save -> Writes to Supabase id period__<company>__2023-02__exchange_rate
**Test:**
- Set periodSelect to "2023-02"
- Enter data in Exchange Rate: A1="GBP", B1="USD", C1="1.25"
- Click "Save to Cloud"

**Expected:**
- Console shows: `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] start` with `id: "period__default__2023-02__exchange_rate"`
- Console shows: `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] ok`
- Supabase record ID is exactly: `period__default__2023-02__exchange_rate`

**Pass Criteria:** Cloud write uses YYYY-MM in record ID

---

### Step 3: Switch Back to 2023-01 -> Different Record ID
**Test:**
- Switch periodSelect to "2023-01"
- Enter different data: A1="EUR", B1="USD", C1="1.10"
- Click "Save to Cloud"

**Expected:**
- Console shows: `[CLOUD][WRITE][PERIOD][EXCHANGE_RATE] start` with `id: "period__default__2023-01__exchange_rate"`
- Supabase has separate record: `period__default__2023-01__exchange_rate`

**Pass Criteria:** Different periods create separate cloud records

---

### Step 4: Clear localStorage -> Reload -> Cloud Restore Works
**Test:**
- Ensure 2023-02 has cloud data (from Step 2)
- Clear localStorage: `localStorage.clear()` in console
- Refresh page (F5)
- Set periodSelect to "2023-02"
- Navigate to Exchange Rate sheet
- Wait ~100ms

**Expected:**
- Console shows: `[CLOUD][READ][PERIOD][EXCHANGE_RATE] query` with `periodId: "2023-02"`
- Console shows: `[CLOUD][READ][PERIOD][EXCHANGE_RATE] applied`
- Exchange Rate sheet shows cloud data (A1="GBP", etc.)

**Pass Criteria:** Cloud data restored using YYYY-MM period ID

---

### Step 5: Guard Prevents Overwrite When Local Has Data
**Test:**
- In 2023-02: Enter local data A1="LOCAL"
- Ensure no cloud data exists for 2023-02 (or clear cloud record)
- Switch to another sheet, then switch back to Exchange Rate

**Expected:**
- Console shows: `[CLOUD][READ][PERIOD][EXCHANGE_RATE] query`
- Console shows: `[CLOUD][READ][PERIOD][EXCHANGE_RATE] SKIP apply (local_has_data)`
- Local data remains: A1="LOCAL" (not overwritten)

**Pass Criteria:** Guard prevents cloud overwrite, local data preserved

---

### Step 6: Model/Company Save Still Works
**Test:**
- Switch to Model mode → Company sheet
- Click "Save to Cloud" button

**Expected:**
- Status shows "Saved ✓ HH:MM:SS"
- Console shows: `[UI][SAVE][COMPANY] trigger` and `[CLOUD][WRITE][COMPANY] ok`
- No errors, no regression

**Pass Criteria:** Model/Company save unchanged, works as before
