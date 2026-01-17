# Company Gate A Implementation Summary

## Files Changed

### 1. js/sync_entrypoint.js
**Changes:**
- Added debounce guard variable: `__lastCompanyCloudWrite__` and `COMPANY_CLOUD_WRITE_DEBOUNCE_MS = 1500`
- Extended `syncCellChange(payload)` function to:
  - Check if `mode === "model"` AND `key === "company"`
  - If conditions met, check debounce (1500ms since last write)
  - If not debounced, trigger `window.cloudModelCompanyWriteOnce()` asynchronously
  - Log triggers and skips with required prefixes

**Modified Function:**
```javascript
window.syncCellChange = function syncCellChange(payload) {
  // ... existing log code ...
  
  // PART A: Wire cloud write for Model / Company
  try {
    const mode = String(info.mode || window.activeMode || "").trim();
    const key = String(info.key || window.activeKey || "").trim();
    
    if (mode === "model" && key === "company") {
      const now = Date.now();
      const timeSinceLastWrite = now - __lastCompanyCloudWrite__;
      
      if (timeSinceLastWrite >= COMPANY_CLOUD_WRITE_DEBOUNCE_MS) {
        __lastCompanyCloudWrite__ = now;
        console.log("[SYNC][COMPANY][CLOUD_WRITE] trigger");
        
        // Trigger cloud write asynchronously (non-blocking)
        if (typeof window.cloudModelCompanyWriteOnce === "function") {
          window.cloudModelCompanyWriteOnce().catch(err => {
            console.warn("[SYNC][COMPANY][CLOUD_WRITE] error (non-fatal):", err.message || err);
          });
        }
      } else {
        console.log("[SYNC][COMPANY][CLOUD_WRITE] skip (debounce)", { 
          timeSinceLastWrite, 
          remaining: COMPANY_CLOUD_WRITE_DEBOUNCE_MS - timeSinceLastWrite 
        });
      }
    }
  } catch (cloudWriteErr) {
    console.warn("[SYNC][COMPANY][CLOUD_WRITE] trigger error (non-fatal):", cloudWriteErr.message || cloudWriteErr);
  }
  
  // ... rest of function ...
};
```

### 2. js/cloud_model_company_read.js
**Changes:**
- Added reusable helper function `shouldApplyCloudOverLocal(localSheet, cloudSheet)` before the guard section
- Added strict "local-newer" protection guard rule before `Object.assign` (after existing guards)
- Guard checks if local sheet has any non-empty cells; if yes, skips cloud overwrite

**Added Helper Function (PART C):**
```javascript
function shouldApplyCloudOverLocal(localSheet, cloudSheet) {
  if (!localSheet) return true; // No local sheet, allow cloud
  
  // Check if local sheet has any rows
  if (!Array.isArray(localSheet.data) || localSheet.data.length === 0) {
    return true; // Empty local sheet, allow cloud
  }
  
  // Check if any cell in local sheet has non-empty value
  for (let r = 0; r < localSheet.data.length; r++) {
    const row = localSheet.data[r];
    if (!Array.isArray(row)) continue;
    
    for (let c = 0; c < row.length; c++) {
      const cellValue = String(row[c] || "").trim();
      if (cellValue !== "") {
        return false; // Local has data, don't overwrite
      }
    }
  }
  
  return true; // Local is completely empty, allow cloud
}
```

**Added Guard Rule (PART B):**
```javascript
// PART B: Strict local-newer protection - check if local has any non-empty cell
if (!shouldApplyCloudOverLocal(window.sheets.company, companySheetFromCloud)) {
  console.warn("[CLOUD][READ][COMPANY] SKIP apply (local_has_data)", {
    marker, cloudLen, currentLen, cloudRowCount, currentRowCount, reason: "local_has_data"
  });
  return done({
    ok: true,
    step: "skip_apply_stale",
    companyId: companyIdStr,
    id: cloudId,
    reason: "local_has_data"
  });
}

// Only reaches here if local is completely empty
Object.assign(window.sheets.company, companySheetFromCloud);
```

**Location:** Guard rule inserted at line 257-268, immediately before `Object.assign` (line 272)

## Log Prefixes Added

### PART A (Cloud Write Trigger):
- `[SYNC][COMPANY][CLOUD_WRITE] trigger` - When cloud write is triggered (after debounce check passes)
- `[SYNC][COMPANY][CLOUD_WRITE] skip (debounce)` - When skipped due to debounce (includes timing info)

### PART B (Cloud Read Guard):
- `[CLOUD][READ][COMPANY] SKIP apply (local_has_data)` - When cloud overwrite is skipped because local has data

## 5-Step Manual Verification Checklist

### Step 1: Single Tab Edit + Refresh
**Test:** Edit a cell in Company sheet → Refresh (F5)

**Expected:**
- Value persists after refresh
- Console shows: `[SYNC][COMPANY][CLOUD_WRITE] trigger` (after edit, within 1500ms window)
- Console shows: `[DIAG][loadFromLocalByMode] AFTER apply` with value in `fpAfter.firstRow`
- Console shows: `[CLOUD][READ][COMPANY] SKIP apply (local_has_data)` (cloud read skips because local has data)

**Pass Criteria:** Value persists, cloud write triggered, cloud overwrite skipped

---

### Step 2: Two Tabs Edit + Refresh (Race Condition Test)
**Test:**
- Tab A: Type "aaa" in A1 → Wait 2 seconds
- Tab B (same company): Type "aaaa" in A1 → Wait 2 seconds  
- Tab A: Press F5

**Expected:**
- Tab A shows "aaaa" (from localStorage, Tab B's write)
- Console shows: `[DIAG][CLOUD][READ][COMPANY] BEFORE Object.assign` with `fpBefore.firstRow` containing "aaaa"
- Console shows: `[CLOUD][READ][COMPANY] SKIP apply (local_has_data)` (guard prevents cloud overwrite)
- Tab A value remains "aaaa" (not overwritten by stale cloud)

**Pass Criteria:** Local data preserved, cloud overwrite skipped

---

### Step 3: Cloud Write Trigger Visibility
**Test:** Type value in any Company cell → Watch console

**Expected:**
- Console shows: `[SYNC][HOOK] saveToLocalByMode -> syncCellChange` (immediate)
- Console shows: `[SYNC][COMPANY][CLOUD_WRITE] trigger` (within 1 second)
- Console shows: `[CLOUD][WRITE][COMPANY] start` (from cloud write function)
- Console shows: `[CLOUD][WRITE][COMPANY] ok` (success) or error message (non-fatal)

**Pass Criteria:** Cloud write trigger log appears, cloud write function executes

---

### Step 4: Cloud Overwrite Skip Log
**Test:** Fill Company sheet with data → Refresh (F5) → Watch console

**Expected:**
- Console shows: `[DIAG][CLOUD][READ][COMPANY] BEFORE Object.assign` with `fpBefore` showing local data
- Console shows: `[CLOUD][READ][COMPANY] SKIP apply (local_has_data)` with `reason: "local_has_data"`
- Local data remains unchanged
- No `[DIAG][CLOUD][READ][COMPANY] AFTER Object.assign` showing data change

**Pass Criteria:** Skip log appears with correct reason, local data preserved

---

### Step 5: Clear localStorage → Cloud Restore Works
**Test:** 
- Clear localStorage: `localStorage.clear()` in console
- Refresh page (F5)
- Watch console

**Expected:**
- Console shows: `[DIAG][loadFromLocalByMode] no parsed data` or `fpAfter.firstRow` is `null` (empty local)
- Console shows: `[CLOUD][READ][COMPANY] query` (cloud read triggered)
- Console shows: `[CLOUD][READ][COMPANY] result` with `hasData: true` (if cloud data exists)
- Console shows: `[DIAG][CLOUD][READ][COMPANY] AFTER Object.assign` with cloud data applied
- Company sheet shows cloud data (if exists)

**Pass Criteria:** Cloud data loads when local is empty, `shouldApplyCloudOverLocal` returns `true` for empty local

---

## Additional Notes

- **Debounce timing:** Cloud write is triggered at most once per 1500ms for Company sheet
- **Non-blocking:** Cloud write failures do not block UI or localStorage saves
- **Guard order:** Local-data check runs AFTER size checks (cloudLen, cloudRowCount) but BEFORE Object.assign
- **Reusability:** `shouldApplyCloudOverLocal()` helper can be extracted and reused for Period sheets later
- **No breaking changes:** All changes are additive, existing behavior preserved when conditions not met
