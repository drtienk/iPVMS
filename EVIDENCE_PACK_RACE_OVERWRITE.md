# Evidence Pack: Race/Overwrite Bug Across Tabs After Refresh

## 1. Evidence Pack — What the Human Should Paste Back to ChatGPT

### EXACT Reproduction Steps (numbered, 6–10 steps)

1. Open Tab A: Navigate to `app.html` with Company sheet visible (model mode)
2. In Tab A: Type "aaa" in a specific cell (e.g., Company sheet, row 0, col 0) and wait for autosave (check localStorage or wait 2 seconds)
3. Open Tab B: Same `app.html`, same company, same sheet/cell location
4. In Tab B: Type "aaaa" in the SAME cell (row 0, col 0) and wait for autosave
5. Switch back to Tab A
6. In Tab A: Press F5 (refresh)
7. **Observe**: The cell shows "aaaa" briefly, then becomes blank or older value

### EXACT Console Filters

**Copy/paste ALL lines containing these prefixes (in Tab A console, after F5):**

```
[DIAG]
[CLOUD][READ][COMPANY]
[SYNC]
```

**Expected log markers (in chronological order):**

1. `[DIAG][app_init] initAppOnce START`
2. `[DIAG][app_init] BEFORE loadFromLocalByMode('model')`
3. `[DIAG][loadFromLocalByMode] BEFORE apply`
4. `[DIAG][loadFromLocalByMode] AFTER apply` ← **OVERWRITER #1**: Should show "aaaa" applied
5. `[DIAG][app_init] AFTER loadFromLocalByMode('model')`
6. `[DIAG][app_init] BEFORE scheduling cloudModelCompanyTryReadOnce`
7. `[DIAG][app_init] INSIDE setTimeout, BEFORE calling cloudModelCompanyTryReadOnce`
8. `[DIAG][CLOUD][READ][COMPANY] BEFORE Object.assign` ← Check if cloud data differs from local
9. `[DIAG][CLOUD][READ][COMPANY] AFTER Object.assign` ← **POTENTIAL OVERWRITER #2**: Check fpBefore vs fpAfter
10. `[DIAG][CLOUD][READ][COMPANY] BEFORE render`
11. `[DIAG][CLOUD][READ][COMPANY] AFTER render`

**Key fingerprint fields to compare:**
- `fpCompany.firstRow` (should show the cell value)
- `fpCompany.rowCount`
- `fpCompany.len` (JSON length)

**If DIAG logs are insufficient:**
- Proposed minimal addition: Add `[DIAG][applySheetDefsByModeAndTrim]` marker at `js/sheets_core_store.js:72` (before the trim loop) and at `js/sheets_core_store.js:113` (after trim)

---

## 2. Two Overwriters Map

### Overwriter #1 (makes Tab A show "aaaa" after F5)

**Candidate function(s):**
- `loadFromLocalByMode("model")` → `getStore()?.loadFromLocalByMode?.(mode)` → `Object.assign(sheets[k], parsed[k])`
- **File+line**: `js/app_mode_storage.js:72-73`
- **Called from**: `js/app_init.js:118` (initAppOnce step 4)

**Why it can bring B's value into A:**
- Both tabs share the same `localStorage` key (scoped by companyId, not by tab)
- When Tab B types "aaaa" and autosaves, it writes to `localStorage` with key from `storageKeyByMode("model")`
- When Tab A refreshes (F5), `loadFromLocalByMode("model")` reads from the SAME `localStorage` key
- `Object.assign(window.sheets.company, parsed[k])` merges Tab B's saved data into Tab A's `window.sheets.company`
- This happens SYNCHRONOUSLY during init, BEFORE cloud read

**What log would prove it ran:**
- `[DIAG][loadFromLocalByMode] AFTER apply` showing `fpAfter.firstRow` contains "aaaa"
- Compare `fpBefore` vs `fpAfter` in that log entry

**Code excerpt:**
```72:78:js/app_mode_storage.js
      const sheets = window.sheets || {};
      for (const k in parsed) {
        if (sheets[k]) Object.assign(sheets[k], parsed[k]);
      }

      // Log AFTER applying
      const fpAfter = fpCompany();
      console.log("[DIAG][loadFromLocalByMode] AFTER apply", { mode, keysToApply, fpBefore, fpAfter });
```

### Overwriter #2 (makes the value disappear)

**Candidate function(s) — ranked by likelihood:**

#### Hypothesis A: `applySheetDefsByModeAndTrim()` trims data arrays
- **File+line**: `js/sheets_core_store.js:99-103`
- **Called from**: `js/app_init.js:124` (initAppOnce step 5, BEFORE cloud read)
- **Evidence**: Line 101: `s.data[r].length = s.cols;` — if `s.cols` is less than actual data length, it truncates cells
- **Rank**: ⚠️ **MEDIUM SUSPICION** — Timing suggests it runs BEFORE cloud read, but if `cols` is wrong, it could truncate

#### Hypothesis B: `cloudModelCompanyTryReadOnce()` applies cloud data (empty/different)
- **File+line**: `js/cloud_model_company_read.js:188`
- **Called from**: `js/app_init.js:162` (initAppOnce step 7.5, scheduled 100ms AFTER initial render)
- **Evidence**: Line 188: `Object.assign(window.sheets.company, companySheetFromCloud);` — if cloud payload is empty, missing that cell, or has old data, it overwrites
- **Rank**: 🔥 **HIGH SUSPICION** — Timing matches: runs AFTER initial render, could bring stale/empty cloud data
- **Why**: Cloud write from Tab B may not have completed yet, or cloud read fetches Tab A's older snapshot

#### Hypothesis C: Second `loadFromLocalByMode()` call after cloud read
- **Evidence**: No code path found for this
- **Rank**: ❌ **LOW SUSPICION** — No such call exists in codebase

**What log would prove Hypothesis B (most likely):**
- `[DIAG][CLOUD][READ][COMPANY] BEFORE Object.assign` showing `cloudRowCount` or `cloudLen` differs from local
- `[DIAG][CLOUD][READ][COMPANY] AFTER Object.assign` showing `fpAfter.firstRow` is blank/different from `fpBefore.firstRow`

**What log would prove Hypothesis A:**
- Proposed: Add `[DIAG][applySheetDefsByModeAndTrim]` log at `js/sheets_core_store.js:72` (before) and `js/sheets_core_store.js:113` (after)
- Check if `s.cols` is less than actual data array length in any row

---

## 3. Key Code Excerpts

### app_init init order excerpt

```84:164:js/app_init.js
      console.log("[DIAG][app_init] initAppOnce START", { fpCompany: fpCompany() });

      // ====== 1) admin buttons ======
      // ... (skipped)

      // ====== 4) load data by mode ======
      if ((window.activeMode || "model") === "period") {
        // ... period mode
      } else {
        const fpBeforeLoad = fpCompany();
        console.log("[DIAG][app_init] BEFORE loadFromLocalByMode('model')", { fpBeforeLoad });
        window.loadFromLocalByMode?.("model");
        const fpAfterLoad = fpCompany();
        console.log("[DIAG][app_init] AFTER loadFromLocalByMode('model')", { fpBeforeLoad, fpAfterLoad });
      }

      // ====== 5) apply defs & trim ======
      window.applySheetDefsByModeAndTrim?.();

      // ... (restore active tab, apply lang, refreshUI)

      // safety: ensure first paint
      if (typeof window.render === "function") window.render();

      // ====== 7.5) Try cloud read once (after initial render) ======
      try {
        if (!window.__CLOUD_COMPANY_READ_ONCE__) {
          window.__CLOUD_COMPANY_READ_ONCE__ = true;
          const fpBeforeSchedule = fpCompany();
          console.log("[DIAG][app_init] BEFORE scheduling cloudModelCompanyTryReadOnce", { fpBeforeSchedule });
          if (typeof window.cloudModelCompanyTryReadOnce === "function") {
            // Run asynchronously to not block init
            setTimeout(() => {
              const fpBeforeCall = fpCompany();
              console.log("[DIAG][app_init] INSIDE setTimeout, BEFORE calling cloudModelCompanyTryReadOnce", { fpBeforeCall });
              window.cloudModelCompanyTryReadOnce?.();
            }, 100);
          }
        }
      } catch (err) {
        console.warn("[app_init] cloud read hook error (non-fatal):", err.message);
      }
```

**Sequence:**
1. `loadFromLocalByMode("model")` ← **OVERWRITER #1**: Applies localStorage (Tab B's "aaaa")
2. `applySheetDefsByModeAndTrim()` ← **POTENTIAL OVERWRITER #2**: Trims arrays to cols
3. `render()` ← First paint (shows "aaaa")
4. `setTimeout(..., 100)` → `cloudModelCompanyTryReadOnce()` ← **MOST LIKELY OVERWRITER #2**: Applies cloud data (may be stale/empty)

### loadFromLocalByMode excerpt

```47:82:js/app_mode_storage.js
  function loadFromLocalByMode(mode){
    try {
      // Fingerprint helper
      function fpCompany() {
        const hasCompany = !!(window.sheets && window.sheets.company);
        return {
          hasCompany: hasCompany,
          len: hasCompany ? JSON.stringify(window.sheets.company).length : 0,
          rowCount: hasCompany && Array.isArray(window.sheets.company.data) ? window.sheets.company.data.length : 0,
          firstRow: hasCompany && Array.isArray(window.sheets.company.data) && window.sheets.company.data.length > 0 
            ? window.sheets.company.data[0]?.slice(0, 3) : null
        };
      }

      // Log BEFORE applying
      const fpBefore = fpCompany();
      const parsed = getStore()?.loadFromLocalByMode?.(mode);
      if (!parsed) {
        console.log("[DIAG][loadFromLocalByMode] no parsed data", { mode, fpBefore });
        return;
      }
      const keysToApply = Object.keys(parsed);
      console.log("[DIAG][loadFromLocalByMode] BEFORE apply", { mode, keysToApply, fpBefore });

      const sheets = window.sheets || {};
      for (const k in parsed) {
        if (sheets[k]) Object.assign(sheets[k], parsed[k]);
      }

      // Log AFTER applying
      const fpAfter = fpCompany();
      console.log("[DIAG][loadFromLocalByMode] AFTER apply", { mode, keysToApply, fpBefore, fpAfter });
    } catch (err) {
      window.showErr?.(err);
    }
  }
```

**Key issue:** `Object.assign(sheets[k], parsed[k])` at line 73 overwrites `window.sheets.company` with localStorage data (shared across tabs).

### cloud apply excerpt

```181:217:js/cloud_model_company_read.js
      // Apply cloud data to in-memory sheets
      try {
        const fpBefore = fpCompany();
        const cloudLen = JSON.stringify(companySheetFromCloud).length;
        const cloudRowCount = Array.isArray(companySheetFromCloud.data) ? companySheetFromCloud.data.length : 0;
        console.log("[DIAG][CLOUD][READ][COMPANY] BEFORE Object.assign", { marker, fpBefore, cloudLen, cloudRowCount });

        Object.assign(window.sheets.company, companySheetFromCloud);

        const fpAfter = fpCompany();
        console.log("[DIAG][CLOUD][READ][COMPANY] AFTER Object.assign", { marker, fpBefore, fpAfter });
      } catch (assignErr) {
        console.warn("[CLOUD][READ][COMPANY] apply:assign_fail", { marker }, assignErr);
        return done({ 
          ok: false, 
          step: "assign_fail", 
          companyId: companyIdStr, 
          id: cloudId 
        });
      }

      // Call helper functions if available (do NOT throw)
      try {
        window.ensureHeadersForActiveSheet?.();
      } catch (e) {
        console.warn("[CLOUD][READ][COMPANY] post:ensureHeaders_fail", { marker }, e);
      }

      try {
        const fpBeforeRender = fpCompany();
        console.log("[DIAG][CLOUD][READ][COMPANY] BEFORE render", { marker, fpBeforeRender });
        window.render?.();
        const fpAfterRender = fpCompany();
        console.log("[DIAG][CLOUD][READ][COMPANY] AFTER render", { marker, fpBeforeRender, fpAfterRender });
      } catch (e) {
        console.warn("[CLOUD][READ][COMPANY] post:render_fail", { marker }, e);
      }
```

**Key issue:** `Object.assign(window.sheets.company, companySheetFromCloud)` at line 188 overwrites local data. If cloud data is stale (before Tab B's write) or missing the cell, it clears the value.

### applySheetDefsByModeAndTrim excerpt (potential trim issue)

```72:113:js/sheets_core_store.js
  function applySheetDefsByModeAndTrim(sheets, activeMode){
    const mode = (activeMode === "period") ? "period" : "model";
    const map = (mode === "period") ? ctx.PERIOD_DEF_MAP : ctx.MODEL_DEF_MAP;

    for (const k in sheets) {
      const def = map[k];
      if (!def) continue;

      const s = sheets[k];
      s.title = def.title;

      s.cols = Math.max(Number(s.cols || 0), Number(def.cols || 0));

      // ... (migration logic for "ac" sheet)

      if (!Array.isArray(s.headers)) s.headers = [];
      for (let c=0; c<def.headers.length; c++) {
        if (s.headers[c] == null || String(s.headers[c]).trim() === "") {
          s.headers[c] = def.headers[c] ?? ("Col " + (c+1));
        }
      }
      while (s.headers.length < s.cols) s.headers.push("");
      if (s.headers.length > s.cols) s.headers.length = s.cols;

      if (Array.isArray(s.data)) {
        for (let r=0; r<s.data.length; r++) {
          if (Array.isArray(s.data[r])) s.data[r].length = s.cols;
        }
      }
      // ... (period mode special handling)
    }
  }
```

**Potential issue:** Line 101 `s.data[r].length = s.cols;` truncates each row to `cols`. If `cols` is less than the actual data length, cells are lost.

### Sync hook excerpt (not likely cause, but logged)

```22:44:js/app_mode_storage.js
  function saveToLocalByMode(mode){
    try {
      getStore()?.saveToLocalByMode?.(mode, window.sheets);
      
      // Trigger sync entrypoint (non-fatal, log only)
      try {
        if (typeof window.syncCellChange === "function") {
          console.log("[SYNC][HOOK] saveToLocalByMode -> syncCellChange", { mode, key: window.activeKey });
          window.syncCellChange({
            reason: "local-autosave",
            mode: mode,
            key: window.activeKey,
            companyId: window.documentMeta?.companyId || window.companyScopeKey?.(),
            ts: new Date().toISOString()
          });
        }
      } catch (syncErr) {
        // Non-fatal: sync failure should not break local save
        console.warn("[SYNC][HOOK] syncCellChange error (non-fatal):", syncErr.message);
      }
    } catch (err) {
      window.showErr?.(err);
    }
  }
```

**Note:** Sync hooks are LOG-ONLY (see `js/sync_entrypoint.js`). No cross-tab write from sync events.

---

## 4. Ranked Hypotheses

### Hypothesis #1: Cloud read applies stale/empty data after local load (MOST LIKELY)

**Likelihood:** 🔥 **90%**

**Explanation:**
1. Tab A types "aaa" → saved to localStorage (no cloud write yet, or async write pending)
2. Tab B types "aaaa" → saved to localStorage (shared key) → cloud write triggered (async, may take 100-500ms)
3. Tab A refreshes (F5):
   - `loadFromLocalByMode("model")` reads localStorage → gets "aaaa" (Tab B's write) ✅
   - `applySheetDefsByModeAndTrim()` trims (should be safe if cols >= actual length)
   - `render()` shows "aaaa" ✅
   - 100ms later: `cloudModelCompanyTryReadOnce()` runs
   - Cloud query fetches data from BEFORE Tab B's cloud write completed → gets stale data (missing "aaaa" or has old "aaa")
   - `Object.assign(window.sheets.company, companySheetFromCloud)` overwrites "aaaa" with stale data → cell becomes blank/old value ❌

**How to falsify with logs:**
- Compare `[DIAG][CLOUD][READ][COMPANY] BEFORE Object.assign` → `cloudRowCount` and `fpBefore.firstRow` (should be "aaaa")
- Compare `[DIAG][CLOUD][READ][COMPANY] AFTER Object.assign` → `fpAfter.firstRow` (should be blank/different)
- If `fpAfter.firstRow` differs from `fpBefore.firstRow`, Hypothesis #1 is CONFIRMED.

**Fix direction:**
- Skip cloud read if local data is newer (compare timestamps)
- OR: Merge cloud data more carefully (preserve non-empty local cells)
- OR: Delay cloud read until after a grace period (e.g., 500ms) to allow Tab B's cloud write to complete

---

### Hypothesis #2: applySheetDefsByModeAndTrim trims data arrays incorrectly (MEDIUM)

**Likelihood:** ⚠️ **25%**

**Explanation:**
- `applySheetDefsByModeAndTrim()` runs at `app_init.js:124` (BEFORE cloud read)
- Line 101 of `sheets_core_store.js`: `s.data[r].length = s.cols;` truncates rows to `cols`
- If `s.cols` is incorrectly set (e.g., from def.cols) and is LESS than actual data length, cells beyond `cols` are lost
- However, timing suggests this runs BEFORE cloud read, so if it trims, the value would never show "aaaa" in the first place

**How to falsify with logs:**
- **PROPOSED ADDITION:** Add `[DIAG][applySheetDefsByModeAndTrim]` log at `js/sheets_core_store.js:72` (before loop) and `js/sheets_core_store.js:113` (after loop)
- Log `s.cols` vs `s.data[r].length` for each row
- If any `s.data[r].length > s.cols` before trim and `s.data[r].length === s.cols` after, Hypothesis #2 is CONFIRMED

**Fix direction:**
- Only trim if `s.data[r].length > s.cols` AND validate `cols` is correct
- OR: Preserve data beyond `cols` in a `meta.extraCols` field

---

### Hypothesis #3: Second loadFromLocalByMode call after cloud read (UNLIKELY)

**Likelihood:** ❌ **5%**

**Explanation:**
- No code path found that calls `loadFromLocalByMode` after cloud read
- However, if there's an event listener on localStorage change (not found in codebase), it could trigger a reload

**How to falsify with logs:**
- Search for `addEventListener("storage", ...)` — NONE FOUND
- If `[DIAG][loadFromLocalByMode]` appears AFTER `[DIAG][CLOUD][READ][COMPANY] AFTER render`, Hypothesis #3 is CONFIRMED

**Fix direction:**
- Remove any storage event listeners that trigger reload

---

## 5. Proposed Minimal DIAG Additions (IF NEEDED)

**File:** `js/sheets_core_store.js`

**Location 1:** Before trim loop (line 72)

```javascript
  function applySheetDefsByModeAndTrim(sheets, activeMode){
    const mode = (activeMode === "period") ? "period" : "model";
    const map = (mode === "period") ? ctx.PERIOD_DEF_MAP : ctx.MODEL_DEF_MAP;

    // ADD THIS:
    console.log("[DIAG][applySheetDefsByModeAndTrim] START", { mode, sheetsKeys: Object.keys(sheets) });

    for (const k in sheets) {
      // ... existing code ...
      if (Array.isArray(s.data)) {
        // ADD THIS (before trim):
        const maxRowLen = Math.max(...s.data.map(r => Array.isArray(r) ? r.length : 0), 0);
        if (maxRowLen > s.cols) {
          console.log("[DIAG][applySheetDefsByModeAndTrim] TRIM WARNING", { 
            sheet: k, 
            cols: s.cols, 
            maxRowLen,
            willTruncate: true 
          });
        }
        for (let r=0; r<s.data.length; r++) {
          if (Array.isArray(s.data[r])) s.data[r].length = s.cols;
        }
      }
    }
    
    // ADD THIS (after loop):
    console.log("[DIAG][applySheetDefsByModeAndTrim] END", { mode });
  }
```

**NOTE:** Only add these logs if existing `[DIAG]` logs are insufficient to identify the second overwriter.

---

## Summary

**Most Likely Sequence:**
1. Tab A F5 → `loadFromLocalByMode("model")` applies "aaaa" from localStorage (Tab B's write) ← **OVERWRITER #1**
2. `render()` shows "aaaa"
3. 100ms later → `cloudModelCompanyTryReadOnce()` applies stale cloud data (missing "aaaa") ← **OVERWRITER #2**

**Next Steps:**
- Capture console logs with `[DIAG]` and `[CLOUD][READ][COMPANY]` filters
- Compare `fpBefore` vs `fpAfter` in cloud read logs
- If cloud read overwrites "aaaa", Hypothesis #1 is confirmed → implement cloud/local merge logic or delay cloud read
