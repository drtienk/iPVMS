# MODEL / COMPANY VERIFICATION PACK

## A. Company Sheet Spec

### Full Header List (in order)
1. Company
2. Description
3. Currency
4. Resource Level
5. Activity Center Level
6. Activity Level

**Source:** `js/defs.js:72` (MODEL_DEF_MAP.company)
- Total columns: 6
- Sheet key: "company"
- Title: "Company"

### Required Fields List
- **All 6 columns are required** (all headers and all cells in Company sheet)
- Applied via `js/model_all_required_company_bu.js` (applyCompanyAllRequired function)
- Visual indication: CSS class `req-col` applied to all `<th>` and `<td>` elements
- Tag identifier: `req-company` (used for clearing marks)

**Source:** `js/model_all_required_company_bu.js:72-80, 175-196`

### Type/Format Constraints
- **NOT FOUND**: No explicit type/format constraints found in code
- All fields appear to accept string values
- No date/number/select validators found for Company sheet

### Cross-Field Rules
- **Check rule:** `CHECKS_BY_SHEET.company` validates that `data[0][0]` (A1 cell) matches `documentMeta.companyName` (system company name from sessionStorage)
- Location: `js/custom_rules.js:1123-1154`
- Error message: "Company Name mismatch" if A1 differs from system company name

## B. Data Flow (Local + Cloud)

### localStorage Key Rule (Model/Company)
- **Pattern:** `miniExcel_autosave_model_v4__${companyId}`
- Where `companyId` comes from: `window.companyScopeKey()` → falls back to `"default"` if not set
- **Source:** `js/mode_storage_store.js:18-28` (storageKeyByMode function)

### Autosave Triggers
- **Location 1:** `js/table_core.js:222` - Immediate save on cell input change
  - Event: `input` event on `<td>` elements
  - Function: `ctx.saveToLocalByMode(ctx.activeMode)`
  
- **Location 2:** `js/table_core.js:274` - Save after paste operation
  - Event: `paste` event on `<td>` elements
  - Function: `ctx.saveToLocalByMode(ctx.activeMode)` (called in setTimeout(0))

- **Location 3:** `js/mode_router.js:58, 99-100, 111` - Save on mode/period switch

- **Location 4:** `js/toolbar_ops.js:350, 365, 396, 656, 677, 681` - Save after toolbar operations (add row/col, etc.)

**Note:** Autosave is **immediate** (no 2-second debounce found in code)

### Cloud Write Path
- **File:** `js/cloud_model_company_write.js`
- **Function:** `window.cloudModelCompanyWriteOnce(opts)`
- **Supabase Table:** `cloud_status`
- **Record ID Format:** `model_company__${companyIdStr}`
- **Payload:** JSON stringified `window.sheets.company` object
- **Operation:** `upsert` with `onConflict: "id"`

**Current Status:** Function is defined but **NOT FOUND** automatic trigger in codebase
- Manual trigger: `window.cloudModelCompanyWriteOnce()` in console
- Expected hook location would be after `saveToLocalByMode` for Model mode + company sheet

**Console Log Prefixes:**
- `[CLOUD][WRITE][COMPANY] start` - Before write
- `[CLOUD][WRITE][COMPANY] ok` - Success
- `[CLOUD][WRITE][COMPANY] error` - Failure

### Cloud Read Path
- **File:** `js/cloud_model_company_read.js`
- **Function:** `window.cloudModelCompanyTryReadOnce(opts)`
- **Supabase Table:** `cloud_status`
- **Record ID Format:** `model_company__${companyIdStr}`
- **When it runs:** Called in `js/app_init.js:162` inside `setTimeout(..., 100)` **after initial render**
- **Execution Order:**
  1. `loadFromLocalByMode("model")` (synchronous, line 118)
  2. `applySheetDefsByModeAndTrim()` (synchronous, line 124)
  3. `render()` (synchronous, line 149)
  4. `setTimeout(..., 100)` → `cloudModelCompanyTryReadOnce()` (asynchronous, line 162)

**Console Log Prefixes:**
- `[CLOUD][READ][COMPANY] query` - Before query
- `[CLOUD][READ][COMPANY] result` - Query result
- `[DIAG][CLOUD][READ][COMPANY] BEFORE Object.assign` - Before applying cloud data
- `[DIAG][CLOUD][READ][COMPANY] AFTER Object.assign` - After applying cloud data
- `[CLOUD][READ][COMPANY] done` - Function completion

### "Cloud Does Not Overwrite Newer Local" Guard

**Location:** `js/cloud_model_company_read.js:188-230` (inside cloudModelCompanyTryReadOnce function)

**Decision Rules (applied in order):**
1. Skip if `companySheetFromCloud` is `null` or `undefined` → reason: "null_or_undefined"
2. Skip if `cloudRowCount === 0` → reason: "cloudRowCount_zero"
3. Skip if `cloudLen < currentLen` (cloud JSON string length < local JSON string length) → reason: "cloudLen_smaller"
4. If none of above, apply via `Object.assign(window.sheets.company, companySheetFromCloud)`

**Decision Logic:**
- Compares `cloudLen` (JSON.stringify length of cloud data) vs `currentLen` (JSON.stringify length of local data)
- Compares `cloudRowCount` (cloud data array length) vs `currentRowCount` (local data array length)
- **Does NOT compare timestamps** (timestamp comparison not found in code)

**What Logs Indicate Guard Worked:**
- Look for: `[CLOUD][READ][COMPANY] SKIP apply (stale/empty)` with reason field
- If guard skips: `{ ok: true, step: "skip_apply_stale", reason: "..." }`
- If guard allows: `[DIAG][CLOUD][READ][COMPANY] AFTER Object.assign` shows `fpAfter` differs from `fpBefore`

**Known Gap:**
- Guard uses size comparison (JSON length) rather than timestamp/version comparison
- Can fail if cloud data is newer but smaller (e.g., deleted rows)

## C. Known Issues / TODO (only for Company)

### Race Conditions / Multi-Tab Issues
- **Issue:** When Tab A and Tab B edit the same cell, Tab A refresh (F5) will:
  1. Load localStorage (contains Tab B's latest write) ✅
  2. Show Tab B's value ✅
  3. 100ms later: Cloud read may overwrite with stale cloud data if cloud write from Tab B hasn't completed ❌
  
- **Evidence:** Documented in `EVIDENCE_PACK_RACE_OVERWRITE.md`
- **Location:** `js/cloud_model_company_read.js:232` - `Object.assign` overwrites without timestamp comparison
- **Mitigation:** Guard exists (cloudLen < currentLen) but incomplete (no timestamp check)

### Flicker Issues
- **Potential:** Initial render shows localStorage data, then cloud read (100ms later) may trigger re-render
- **Location:** `js/app_init.js:149` (first render) → `js/app_init.js:162` (cloud read after 100ms)
- **Mitigation:** Cloud read calls `window.render()` again after applying data

### i18n Issues Affecting Company
- **NOT FOUND**: No specific i18n issues identified for Company sheet
- Headers are hardcoded in English in `js/defs.js:72`
- Check error messages support both "en" and "zh" via `lang` variable (`js/custom_rules.js:1126, 1133-1136, 1144-1149`)

### Step 5 (syncCellChange) Gaps Related to Company
- **Current Status:** `syncCellChange` in `js/sync_entrypoint.js` is **LOG ONLY** (no cloud write)
- **Hook Location:** `js/app_mode_storage.js:28-36` - Called after `saveToLocalByMode` via try/catch
- **Console Log Prefix:** `[SYNC][HOOK] saveToLocalByMode -> syncCellChange`
- **Gap:** `syncCellChange` logs but does not trigger `cloudModelCompanyWriteOnce`
- **Expected Flow (not implemented):** `saveToLocalByMode` → `syncCellChange` → `cloudModelCompanyWriteOnce` for Model mode + company sheet

## D. Quick Smoke Test Checklist

1. **Basic Load Test**
   - Open `app.html` → Navigate to Model mode → Company sheet
   - Expected: 6 columns visible with headers: Company, Description, Currency, Resource Level, Activity Center Level, Activity Level
   - Console: `[DIAG][app_init] initAppOnce START`, `[DIAG][loadFromLocalByMode] AFTER apply`

2. **All Fields Required Marking**
   - Verify all 6 column headers have yellow tint (CSS class `req-col`)
   - Verify all cells in Company sheet have yellow tint
   - Console: No specific log (applied via DOM mutation observer in `model_all_required_company_bu.js`)

3. **Edit and Autosave (Local)**
   - Type "TestCo" in A1 (row 0, col 0)
   - Expected: Value appears immediately
   - Check localStorage: Key `miniExcel_autosave_model_v4__${companyId}` should contain updated data
   - Console: `[SYNC][HOOK] saveToLocalByMode -> syncCellChange` (if logging enabled)

4. **Check Validation**
   - Click "Check" button (violet button in toolbar)
   - Expected: Error if A1 does not match `sessionStorage.getItem("companyName")`
   - Console: No specific log (check runs via `window.CHECKS_BY_SHEET.company()`)

5. **Refresh Persistence (Local)**
   - Type value in any cell → Press F5
   - Expected: Value persists after refresh
   - Console: `[DIAG][loadFromLocalByMode] AFTER apply` should show `fpAfter.firstRow` contains the value

6. **Multi-Tab Race Test**
   - Tab A: Type "aaa" in A1 → Wait 2 seconds
   - Tab B (same company): Type "aaaa" in A1 → Wait 2 seconds
   - Tab A: Press F5
   - Expected: Shows "aaaa" (from localStorage) then may flicker if cloud read overwrites
   - Console: `[DIAG][CLOUD][READ][COMPANY] BEFORE Object.assign`, check if guard skips with `SKIP apply (stale/empty)`

7. **Cloud Read After Init**
   - Clear localStorage: `localStorage.clear()`
   - Refresh page (F5)
   - Expected: Cloud data loads (if exists) 100ms after initial render
   - Console: `[CLOUD][READ][COMPANY] query`, `[DIAG][CLOUD][READ][COMPANY] AFTER Object.assign`

8. **Guard Skip Test (Cloud Stale)**
   - Set localStorage with large dataset → Refresh
   - Expected: If cloud data is smaller (cloudLen < currentLen), guard should skip
   - Console: `[CLOUD][READ][COMPANY] SKIP apply (stale/empty)` with `reason: "cloudLen_smaller"`

9. **Add Row Test**
   - Click "新增一列" (Add Row) button
   - Expected: New row appears with all 6 columns marked as required (yellow tint)
   - Console: `[SYNC][HOOK] saveToLocalByMode -> syncCellChange` (if logging)

10. **Export Test**
    - Fill some data in Company sheet
    - Click "匯出 CSV（目前分頁）" (Export CSV) or Actions → Export CSV
    - Expected: CSV file downloads with 6 columns matching headers
    - Console: No specific log (export handled in `toolbar_ops.js`)
