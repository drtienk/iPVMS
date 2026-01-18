# Step 7 Complete - Period Selector UI and Switching Logic

## Files Changed

### 1. app.html
**Changes:**
- Added `<select id="periodSelector">` dropdown with P1/P2/P3 options in periodBar area

**Location:** Line 244-247 (in periodBar section, after periodSelect)

**Added HTML:**
```html
<select id="periodSelector" style="padding:6px 8px; border:1px solid var(--bd); border-radius:8px; background:#fff;">
  <option value="P1">P1</option>
  <option value="P2">P2</option>
  <option value="P3">P3</option>
</select>
```

### 2. js/mode_router.js
**Changes:**
- Added `periodSelector` change event handler for P1/P2/P3 switching
- Added initialization logic to set default periodId to P1 if not set
- Switch flow includes: save current → set new periodId → load new period → re-apply defs → render
- Added concise logs: `[PERIOD][SWITCH]` and `[PERIOD][KEY]`

**Location:** After `newPeriodBtn` handler (line ~92), before `periodSelect` handler

**Added Handler:**
```javascript
on("periodSelector","change", () => {
  const sel = $id("periodSelector");
  const newPeriodId = sel ? String(sel.value || "").trim() : "";
  if (!newPeriodId || !["P1", "P2", "P3"].includes(newPeriodId)) return;

  const prevPeriodId = (typeof window.getActivePeriodId === "function") ? window.getActivePeriodId() : "";
  
  console.log("[PERIOD][SWITCH]", { from: prevPeriodId || "(none)", to: newPeriodId });

  // 1) Save current work
  if (activeMode === "period") {
    if (typeof saveToLocalByMode === "function") {
      saveToLocalByMode("period");
    }
  }

  // 2) Set new periodId
  if (typeof window.setActivePeriodId === "function") {
    window.setActivePeriodId(newPeriodId);
  }

  // Log storage key
  const storageKey = (typeof storageKeyByMode === "function") ? storageKeyByMode("period") : "";
  console.log("[PERIOD][KEY]", storageKey);

  // 3) Load new period data
  if (activeMode === "period") {
    try { for (const k in sheets) sheets[k].data = []; } catch {}
    if (typeof loadFromLocalByMode === "function") {
      loadFromLocalByMode("period");
    }

    // If no data exists, reset to blank
    const raw = localStorage.getItem(storageKey || "");
    if (!raw && typeof resetSheetsToBlankForMode === "function") {
      resetSheetsToBlankForMode("period");
      if (typeof saveToLocalByMode === "function") {
        saveToLocalByMode("period");
      }
    }
  }

  // 4) Re-apply defs and render
  if (typeof applySheetDefsByModeAndTrim === "function") {
    applySheetDefsByModeAndTrim();
  }

  activeKey = "company";
  if (typeof ensureActiveKeyVisible === "function") {
    ensureActiveKeyVisible();
  }

  refreshUI();
  setActive(activeKey);
});
```

**Added Initialization:**
```javascript
// In DOMContentLoaded handler:
const periodSel = $id("periodSelector");
if (periodSel && typeof window.getActivePeriodId === "function") {
  const currentPeriodId = window.getActivePeriodId() || "P1";
  periodSel.value = currentPeriodId;
  // Set default to P1 if not set
  if (!window.getActivePeriodId()) {
    window.setActivePeriodId("P1");
  }
}
```

## Implementation Details

### Switch Flow
1. **Save current work:** `saveToLocalByMode("period")` saves current sheets to localStorage
2. **Set new periodId:** `window.setActivePeriodId(newPeriodId)` updates sessionStorage
3. **Clear in-memory data:** Clears `sheets` data arrays before loading new period
4. **Load new period:** `loadFromLocalByMode("period")` loads from new localStorage key
5. **Reset if empty:** If no data exists for new period, resets to blank sheets
6. **Re-apply defs:** `applySheetDefsByModeAndTrim()` ensures sheet structure is correct
7. **Render:** `refreshUI()` and `setActive()` trigger render and required marks re-apply

### Storage Key Format
- Uses `miniExcel_autosave_period_v1__${companyId}__${periodId}` (from mode_storage_store.js)
- Each periodId (P1/P2/P3) gets isolated localStorage key

### Logs
- `[PERIOD][SWITCH] { from: "P1", to: "P2" }` - Period switch event
- `[PERIOD][KEY] "miniExcel_autosave_period_v1__default__P2"` - Computed localStorage key

## 6-Step Smoke Test Checklist

### Step 1: Period Selector Appears and Initializes
**Test:**
- Navigate to Period mode
- Check periodBar area

**Expected:**
- `<select id="periodSelector">` visible with P1/P2/P3 options
- P1 selected by default (if no periodId in sessionStorage)
- Console: No errors on page load

**Pass Criteria:** Selector visible, P1 selected by default

---

### Step 2: Switch P1 -> P2 and Verify Isolation
**Test:**
- In Period mode → Exchange Rate sheet
- Enter data in P1: A1="USD", B1="EUR", C1="0.85"
- Switch selector to P2
- Check Exchange Rate sheet

**Expected:**
- Console shows: `[PERIOD][SWITCH] { from: "P1", to: "P2" }`
- Console shows: `[PERIOD][KEY] "miniExcel_autosave_period_v1__...__P2"`
- Exchange Rate sheet is blank (P2 has no data yet)
- P1 data is saved (can verify in localStorage)

**Pass Criteria:** P1 data saved, P2 shows blank sheet

---

### Step 3: Enter Data in P2, Switch Back to P1
**Test:**
- In P2: Enter data A1="GBP", B1="USD", C1="1.25"
- Switch selector back to P1
- Check Exchange Rate sheet

**Expected:**
- Console shows: `[PERIOD][SWITCH] { from: "P2", to: "P1" }`
- P1 data returns: A1="USD", B1="EUR", C1="0.85"
- P2 data is saved separately

**Pass Criteria:** P1 and P2 data isolated and persist correctly

---

### Step 4: F5 Persistence Per Period
**Test:**
- Set selector to P2
- Enter data in Exchange Rate: A1="JPY", B1="USD", C1="0.007"
- Press F5 (refresh page)

**Expected:**
- After refresh, selector still shows P2
- Exchange Rate sheet shows P2 data (A1="JPY", etc.)
- Console: No switch logs (no change occurred)

**Pass Criteria:** P2 data persists after refresh

---

### Step 5: Required Marks Re-apply After Switch
**Test:**
- Switch to P1 → Exchange Rate sheet
- Observe all 4 columns have yellow tint (req-col)
- Switch to P2 → Exchange Rate sheet
- Observe all 4 columns still have yellow tint

**Expected:**
- All 4 column headers and cells have yellow tint after switch
- Required marks visible immediately (no need to refresh)

**Pass Criteria:** Required marks visible after period switch

---

### Step 6: All Three Periods Isolated
**Test:**
- P1: Enter A1="P1Data"
- P2: Enter A1="P2Data"
- P3: Enter A1="P3Data"
- Switch between all three periods

**Expected:**
- Each period shows its own data
- Data persists when switching back and forth
- Console shows correct `[PERIOD][SWITCH]` and `[PERIOD][KEY]` logs for each switch

**Pass Criteria:** All three periods maintain separate data

---

## Integration Notes

- **Period Selector Location:** Placed in periodBar (same area as existing periodSelect for yyyy-mm periods)
- **Default Period:** Initializes to P1 if no periodId in sessionStorage
- **Switch Timing:** Save/load happens synchronously during change event
- **Render Hook:** Uses existing `refreshUI()` and `setActive()` which trigger `window.render()`, which hooks into `period_exchange_rate_required.js` to re-apply required marks

## Known Behavior

- Period selector only works in Period mode (when periodBar is visible)
- Switching periods resets activeKey to "company" (consistent with existing periodSelect behavior)
- If no data exists for a period, sheets are reset to blank automatically
