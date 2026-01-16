# Evidence Pack — Bug #2 Residual & Bug #1

## ============================================================================
## PART 1: BUG #2 RESIDUAL — Tab B needs F5 to reflect presence changes
## ============================================================================

### WHERE READS HAPPEN (file + function + excerpt)

**File:** `js/app_init.js`  
**Function:** `initAppOnce()`  
**Lines:** 220-233

```220:233:js/app_init.js
      // ====== 11) Start presence read polling ======
      if (!window.__PRESENCE_READ_STARTED__) {
        window.__PRESENCE_READ_STARTED__ = true;
        // Call once immediately
        if (typeof window.presenceReadOnce === "function") {
          window.presenceReadOnce();
        }
        // Set up interval (every 25 seconds)
        window.__PRESENCE_READ_TIMER__ = setInterval(() => {
          if (typeof window.presenceReadOnce === "function") {
            window.presenceReadOnce();
          }
        }, 25000);
      }
```

**File:** `js/cloud_presence_heartbeat.js`  
**Function:** `presenceReadOnce()`  
**Lines:** 105-214

```105:214:js/cloud_presence_heartbeat.js
window.presenceReadOnce = async function presenceReadOnce() {
  try {
    // Never throw; catch all errors
    if (!window.SB) {
      console.log("[PRESENCE][READ] SB missing");
      return;
    }

    // Determine companyId
    const companyId = (sessionStorage.getItem("companyId") || "").trim();
    if (!companyId) {
      console.log("[PRESENCE][READ] missing companyId");
      return;
    }

    // Ensure instance ID exists (stable within tab session)
    ensureInstanceId();

    // Query cloud_status for presence records for this company
    // Select all columns to handle unknown timestamp column
    const { data, error } = await window.SB
      .from("cloud_status")
      .select("*")
      .like("id", `presence_${companyId}_%`);

    if (error) {
      console.log("[PRESENCE][READ] error:", error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log("[PRESENCE][READ] other active = false");
      return;
    }

    // Parse rows and check for other active instances
    const now = Date.now();
    const thresholdMs = PRESENCE_ACTIVE_WINDOW_SEC * 1000;
    const currentMode = window.activeMode || "model";
    const currentKey = window.activeKey || "";
    
    let otherActiveAnyCount = 0;
    let otherActiveSameContextCount = 0;
    let newestOtherAgeSec = null; // Only track "other" instances, not self

    for (const row of data) {
      try {
        const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
        
        // Check if source is heartbeat (if source exists)
        if (payload.source && payload.source !== "heartbeat") {
          continue;
        }

        // Extract timestamp (try ts first, then updated_at, then parse from row)
        let tsMs = null;
        if (payload.ts) {
          tsMs = new Date(payload.ts).getTime();
        } else if (payload.updated_at) {
          tsMs = new Date(payload.updated_at).getTime();
        } else if (row.updated_at) {
          tsMs = new Date(row.updated_at).getTime();
        }

        if (tsMs && !isNaN(tsMs)) {
          const ageMs = now - tsMs;
          const ageSec = Math.round(ageMs / 1000);

          // Check if this is another instance (not current window)
          if (payload.instance_id && payload.instance_id !== window.__PRESENCE_INSTANCE_ID__) {
            // Track newest "other" instance age
            if (newestOtherAgeSec === null || ageSec < newestOtherAgeSec) {
              newestOtherAgeSec = ageSec;
            }

            // Count if within threshold
            if (ageMs <= thresholdMs) {
              otherActiveAnyCount++;
              
              // Check if same context (same active_mode and active_key)
              const rowMode = payload.active_mode || "model";
              const rowKey = payload.active_key || "";
              if (rowMode === currentMode && rowKey === currentKey) {
                otherActiveSameContextCount++;
              }
            }
          }
        }
      } catch (parseErr) {
        // Skip rows that can't be parsed
        continue;
      }
    }

    // Compute two booleans
    const otherActiveAny = otherActiveAnyCount > 0;
    const otherActiveSameContext = otherActiveSameContextCount > 0;

    // Log result with unambiguous format
    console.log(`[PRESENCE][READ] otherAny=${otherActiveAny} otherSame=${otherActiveSameContext} countSame=${otherActiveSameContextCount}`);

    // Wire banner to presence read result (based on SAME CONTEXT only)
    if (typeof window.presenceBannerSet === "function") {
      window.presenceBannerSet(otherActiveSameContext);
    }
  } catch (err) {
    // Never throw; catch all errors
    console.log("[PRESENCE][READ] error:", err.message);
  }
};
```

**FINDING:** No focus/visibilitychange/pagehide/pageshow event listeners found for presence reads.  
**Search result:** `grep` for "addEventListener.*focus|blur|visibility|pageshow|pagehide" found only one unrelated match in `table_render_core.js` (input blur handler).

### WHY TAB B WAITS (most likely reason)

**Root Cause:** `presenceReadOnce()` is ONLY scheduled via `setInterval` (25 seconds) in `app_init.js` lines 228-232. There is NO focus/visibilitychange event listener to trigger reads when Tab B comes to foreground.

**Evidence:**
- Initial read happens once on page load (line 225)
- Subsequent reads ONLY via interval timer (lines 228-232)
- No window event listeners found for `focus`, `blur`, `visibilitychange`, `pageshow`, `pagehide`
- When Tab B is backgrounded, the interval continues running, but Tab B doesn't know when Tab A changes sheets
- Tab B only updates when the next 25-second interval tick fires after Tab A's change

### WHAT LOGS TO CAPTURE (exact filter and steps)

**Console Filter:** `[PRESENCE][READ]` or `[PRESENCE][BANNER]`

**Reproduction Steps:**
1. Open Tab A (e.g., Chrome)
2. Open Tab B (e.g., Firefox or second Chrome window)
3. Both tabs on same company/sheet
4. In Tab B console, filter: `[PRESENCE][READ]`
5. In Tab A, switch to a different sheet (e.g., from "company" to another sheet)
6. **Observe Tab B console:** Watch for presence read logs
7. Wait up to 25 seconds without refreshing Tab B
8. After 25 seconds, Tab B should show: `[PRESENCE][READ] otherAny=... otherSame=...`
9. Before the 25-second tick, Tab B banner does NOT update

**What to paste back:**
```
[PRESENCE][READ] otherAny=true otherSame=false countSame=0
[PRESENCE][BANNER] show= false
(... wait 25 seconds ...)
[PRESENCE][READ] otherAny=true otherSame=true countSame=1
[PRESENCE][BANNER] show= true
```

**Expected vs Actual:**
- Expected: Tab B should read presence immediately on focus/visibilitychange
- Actual: Tab B only reads on the next 25-second interval tick

---

## ============================================================================
## PART 2: BUG #1 — "aaa" disappears after F5
## ============================================================================

### DIAG INSTRUMENTATION LOCATIONS

**File:** `js/app_init.js`  
**Lines with [DIAG] logs:**
- Line 84: `[DIAG][app_init] initAppOnce START`
- Line 117: `[DIAG][app_init] BEFORE loadFromLocalByMode('model')`
- Line 120: `[DIAG][app_init] AFTER loadFromLocalByMode('model')`
- Line 156: `[DIAG][app_init] BEFORE scheduling cloudModelCompanyTryReadOnce`
- Line 161: `[DIAG][app_init] INSIDE setTimeout, BEFORE calling cloudModelCompanyTryReadOnce`

**File:** `js/app_mode_storage.js`  
**Lines with [DIAG] logs:**
- Line 65: `[DIAG][loadFromLocalByMode] no parsed data`
- Line 69: `[DIAG][loadFromLocalByMode] BEFORE apply`
- Line 78: `[DIAG][loadFromLocalByMode] AFTER apply`

**File:** `js/cloud_model_company_read.js`  
**Lines with [DIAG] logs:**
- Line 186: `[DIAG][CLOUD][READ][COMPANY] BEFORE Object.assign`
- Line 191: `[DIAG][CLOUD][READ][COMPANY] AFTER Object.assign`
- Line 211: `[DIAG][CLOUD][READ][COMPANY] BEFORE render`
- Line 214: `[DIAG][CLOUD][READ][COMPANY] AFTER render`

### DIAG CAPTURE CHECKLIST (exact copy/paste instructions)

**Console Filter:** `[DIAG]`

**Reproduction Steps:**
1. Open Tab A
2. Type "aaa" in any cell (e.g., company sheet, first row, first column)
3. **Don't refresh yet** — verify "aaa" is visible in Tab A
4. Open Tab B (or use same browser, new tab)
5. In Tab B console, filter: `[DIAG]`
6. Press F5 in Tab B (refresh)
7. **Immediately paste all console logs with [DIAG] prefix**

**What to paste back:**
```
[DIAG][app_init] initAppOnce START {fpCompany: {...}}
[DIAG][app_init] BEFORE loadFromLocalByMode('model') {fpBeforeLoad: {...}}
[DIAG][loadFromLocalByMode] BEFORE apply {mode: "model", keysToApply: [...], fpBefore: {...}}
[DIAG][loadFromLocalByMode] AFTER apply {mode: "model", keysToApply: [...], fpBefore: {...}, fpAfter: {...}}
[DIAG][app_init] AFTER loadFromLocalByMode('model') {fpBeforeLoad: {...}, fpAfterLoad: {...}}
[DIAG][app_init] BEFORE scheduling cloudModelCompanyTryReadOnce {fpBeforeSchedule: {...}}
[DIAG][app_init] INSIDE setTimeout, BEFORE calling cloudModelCompanyTryReadOnce {fpBeforeCall: {...}}
[DIAG][CLOUD][READ][COMPANY] BEFORE Object.assign {marker: "...", fpBefore: {...}, cloudLen: ..., cloudRowCount: ...}
[DIAG][CLOUD][READ][COMPANY] AFTER Object.assign {marker: "...", fpBefore: {...}, fpAfter: {...}}
[DIAG][CLOUD][READ][COMPANY] BEFORE render {marker: "...", fpBeforeRender: {...}}
[DIAG][CLOUD][READ][COMPANY] AFTER render {marker: "...", fpBeforeRender: {...}, fpAfterRender: {...}}
```

**Key Observations to Note:**
- `fpBeforeLoad.firstRow` value (should show "aaa" or null)
- `fpAfterLoad.firstRow` value (should show "aaa" or null)
- `fpBefore` in `loadFromLocalByMode` AFTER apply (should show "aaa")
- `fpAfter` in `loadFromLocalByMode` AFTER apply (should show "aaa")
- `fpBefore` in `BEFORE Object.assign` (should show "aaa")
- `fpAfter` in `AFTER Object.assign` (might show different value)
- `fpBeforeRender` vs `fpAfterRender` (check if "aaa" is lost after render)

### OTHER OVERWRITE SUSPECTS (ranked list with evidence excerpts)

#### SUSPECT #1 (HIGHEST): `loadFromLocalByMode` called AFTER cloud read completes

**File:** `js/app_init.js`  
**Lines:** 116-120

```116:120:js/app_init.js
        const fpBeforeLoad = fpCompany();
        console.log("[DIAG][app_init] BEFORE loadFromLocalByMode('model')", { fpBeforeLoad });
        window.loadFromLocalByMode?.("model");
        const fpAfterLoad = fpCompany();
        console.log("[DIAG][app_init] AFTER loadFromLocalByMode('model')", { fpBeforeLoad, fpAfterLoad });
```

**Timing:** Runs BEFORE cloud read is scheduled (line 118 runs synchronously, cloud read scheduled at line 159 with 100ms delay).

**Evidence:** If cloud read applies data at ~100ms, but `loadFromLocalByMode` runs again later (via `mode_router.js` switchMode line 77), it would overwrite cloud data with stale localStorage.

**Rank:** ⚠️ **HIGHEST SUSPICION** — localStorage might be stale (doesn't have "aaa" yet) and gets applied after cloud data.

---

#### SUSPECT #2: `applySheetDefsByModeAndTrim` called after cloud read

**File:** `js/app_init.js`  
**Line:** 124

```124:124:js/app_init.js
      window.applySheetDefsByModeAndTrim?.();
```

**Timing:** Runs synchronously in init (BEFORE cloud read, which is scheduled at line 159).

**Evidence:** `applySheetDefsByModeAndTrim` might trim/modify sheet data. If called again after cloud read, it could remove "aaa".

**Rank:** ⚠️ **MEDIUM SUSPICION** — Function name suggests it trims data, but timing suggests it runs before cloud read.

**File:** `js/mode_router.js`  
**Line:** 78

```78:78:js/mode_router.js
    if (typeof applySheetDefsByModeAndTrim === "function") applySheetDefsByModeAndTrim();
```

**Evidence:** `switchMode` also calls this. If mode switch happens after cloud read, it could trim data.

---

#### SUSPECT #3: `mode_router.js` switchMode calls `loadFromLocalByMode`

**File:** `js/mode_router.js`  
**Lines:** 55-78

```55:78:js/mode_router.js
  function switchMode(nextMode) {
    if (nextMode === activeMode) return;

    if (typeof saveToLocalByMode === "function") saveToLocalByMode(activeMode);
    try { for (const k in sheets) sheets[k].data = []; } catch {}

    activeMode = nextMode;
    try { sessionStorage.setItem("activeMode", activeMode); } catch {}

    if (typeof loadVisibility === "function") loadVisibility();

    if (activeMode === "period") {
      if (typeof renderPeriodBar === "function") renderPeriodBar();
      if (!activePeriod) {
        if (typeof openPeriodModal === "function") openPeriodModal();
        activeKey = "company";
        if (typeof refreshUI === "function") refreshUI();
        setActive(activeKey);
        return;
      }
    }

    if (typeof loadFromLocalByMode === "function") loadFromLocalByMode(activeMode);
    if (typeof applySheetDefsByModeAndTrim === "function") applySheetDefsByModeAndTrim();
```

**Evidence:** Line 77 calls `loadFromLocalByMode(activeMode)`. If `switchMode("model")` is called after cloud read, it would reload from localStorage (which may not have "aaa" if Tab A didn't save yet).

**Rank:** ⚠️ **MEDIUM SUSPICION** — Depends on whether `switchMode` is called after cloud read.

---

#### SUSPECT #4: `render()` rebuilds from stale data

**File:** `js/cloud_model_company_read.js`  
**Lines:** 209-214

```209:214:js/cloud_model_company_read.js
      try {
        const fpBeforeRender = fpCompany();
        console.log("[DIAG][CLOUD][READ][COMPANY] BEFORE render", { marker, fpBeforeRender });
        window.render?.();
        const fpAfterRender = fpCompany();
        console.log("[DIAG][CLOUD][READ][COMPANY] AFTER render", { marker, fpBeforeRender, fpAfterRender });
```

**Evidence:** `render()` is called AFTER `Object.assign` applies cloud data. If `render()` reads from a different source (e.g., localStorage) or rebuilds from cached data, it could overwrite.

**Rank:** ⚠️ **LOW-MEDIUM SUSPICION** — `render()` typically just displays data, but if it reads from localStorage internally, it could be the culprit.

**Note:** DIAG logs should show if `fpAfterRender` differs from `fpBeforeRender`.

---

#### SUSPECT #5: Race condition — localStorage save in Tab A hasn't completed when Tab B reads

**Timing Issue:** 
- Tab A types "aaa" → autosave triggers → `saveToLocalByMode` writes to localStorage (async/non-blocking)
- Tab B presses F5 → `loadFromLocalByMode` reads localStorage → if save hasn't completed, Tab B reads old data
- Cloud read then applies cloud data (which might also be stale if Tab A didn't sync yet)

**Evidence:** No explicit timing guard found. `saveToLocalByMode` doesn't return a promise in the code examined.

**Rank:** ⚠️ **MEDIUM SUSPICION** — Classic race condition scenario.

---

## ============================================================================
## RANKED HYPOTHESES
## ============================================================================

### BUG #2 (Tab B needs F5 to reflect presence changes)

**Hypothesis #1 (MOST LIKELY): Missing focus/visibilitychange listener**
- **Confidence:** 95%
- **Root Cause:** `presenceReadOnce()` is ONLY scheduled via `setInterval(25000)`. No event listener triggers reads when Tab B comes to foreground.
- **Fix Direction:** Add `window.addEventListener("focus", ...)` and/or `document.addEventListener("visibilitychange", ...)` to call `presenceReadOnce()` immediately when tab becomes visible.

**Hypothesis #2 (UNLIKELY): Interval throttling when tab is backgrounded**
- **Confidence:** 5%
- **Root Cause:** Browsers may throttle timers in background tabs, delaying the 25-second interval.
- **Fix Direction:** Same as Hypothesis #1 (add focus/visibilitychange listener).

---

### BUG #1 ("aaa" disappears after F5)

**Hypothesis #1 (MOST LIKELY): localStorage read AFTER cloud apply overwrites cloud data**
- **Confidence:** 60%
- **Root Cause:** `loadFromLocalByMode("model")` in `app_init.js` line 118 runs BEFORE cloud read. However, if localStorage doesn't have "aaa" yet (Tab A hasn't saved), then cloud read applies "aaa", but if `loadFromLocalByMode` is called again later (e.g., via `mode_router.js` switchMode line 77), it overwrites with stale localStorage (without "aaa").
- **Fix Direction:** Ensure `loadFromLocalByMode` is NOT called after cloud read completes, OR ensure localStorage is saved before Tab B reads, OR add a guard to skip `loadFromLocalByMode` if cloud data is newer.

**Hypothesis #2 (MEDIUM): Race condition — Tab A hasn't saved "aaa" to localStorage/cloud yet**
- **Confidence:** 30%
- **Root Cause:** Tab A types "aaa" → autosave hasn't completed → Tab B presses F5 → reads stale localStorage → cloud read also returns stale cloud data → "aaa" never appears in Tab B.
- **Fix Direction:** Add explicit save trigger on cell edit, OR add delay before cloud read in Tab B, OR use a different sync mechanism (e.g., websocket).

**Hypothesis #3 (LOW-MEDIUM): `render()` rebuilds from stale source**
- **Confidence:** 10%
- **Root Cause:** `render()` function might read from localStorage or cached data instead of `window.sheets.company`, overwriting cloud-applied data.
- **Fix Direction:** Inspect `render()` implementation to ensure it reads from `window.sheets.company` and doesn't reload from localStorage.

---

## ============================================================================
## NEXT PATCH RECOMMENDATION (NO CODE — minimal fix direction)
## ============================================================================

### Bug #2 Fix Direction

- Add `window.addEventListener("focus", ...)` listener in `app_init.js` to call `presenceReadOnce()` immediately when tab gains focus.
- Add `document.addEventListener("visibilitychange", ...)` listener to call `presenceReadOnce()` when `document.visibilityState === "visible"`.
- Place listeners after `presenceReadOnce` is defined (after `cloud_presence_heartbeat.js` loads).
- Ensure listeners are idempotent (don't cause multiple simultaneous reads).

### Bug #1 Fix Direction

- **Option A (Conservative):** Add DIAG logging to track exact sequence of `loadFromLocalByMode` calls. Identify if/when it's called AFTER cloud read completes.
- **Option B (Targeted):** Add guard in `loadFromLocalByMode` to skip if cloud data was applied recently (e.g., check a timestamp flag set by cloud read).
- **Option C (Comprehensive):** Ensure Tab A explicitly saves to localStorage BEFORE Tab B reads. Add a save completion check or use `localStorage.setItem` sync + verification.
- **Option D (Investigation First):** Inspect `render()` implementation to confirm it doesn't reload from localStorage. If it does, fix `render()` to use `window.sheets.company` only.

---

**END OF EVIDENCE PACK**
