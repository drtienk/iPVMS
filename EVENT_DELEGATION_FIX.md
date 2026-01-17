# Event Delegation Fix for Save to Cloud Button

## Files Changed

### 1. app.html
**Changes:**
- Added stable ID to toolbar container: `id="toolbarRoot"`

**Location:** Line 285

**Modified HTML:**
```html
<div class="toolbar" id="toolbarRoot">
```

### 2. js/toolbar_ops.js
**Changes:**
- Removed direct `on()` binding for `btnSaveCloudCompany` from `bindToolbarEvents()`
- Added `window.bindCloudSaveDelegateOnce()` function at end of IIFE
- Function uses event delegation on stable `toolbarRoot` container
- Includes guard check using `window.activeMode` and `window.activeKey`

**Location:** After BLOCK: 04_EXPORTS_END (line ~703)

**Added Function:**
```javascript
window.bindCloudSaveDelegateOnce = function bindCloudSaveDelegateOnce() {
  if (window.__cloudSaveDelegateBound) return;
  window.__cloudSaveDelegateBound = true;

  const root = document.getElementById("toolbarRoot") || document.querySelector(".toolbar");
  if (!root) {
    console.warn("[UI][SAVE][COMPANY] toolbar container not found, retrying...");
    setTimeout(bindCloudSaveDelegateOnce, 100);
    return;
  }

  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("#btnSaveCloudCompany");
    if (!btn) return;

    console.log("[UI][SAVE][COMPANY] trigger");

    const status = document.getElementById("cloudSaveStatus");
    if (!status) return;

    // Get active mode and key using same pattern as toolbar_ops
    const activeMode = (window.activeMode || "model").toLowerCase();
    const activeKey = (window.activeKey || "company");

    // Guard: only works when activeMode === "model" AND activeSheetKey === "company"
    if (activeMode !== "model" || activeKey !== "company") {
      status.textContent = "Company sheet only";
      status.style.color = "#ef4444"; // red
      return;
    }

    // ... rest of save logic (disable button, status, call cloudModelCompanyWriteOnce, etc.)
  });

  console.log("[UI][SAVE][COMPANY] delegate_bound");
};
```

### 3. js/app_init.js
**Changes:**
- Added call to `window.bindCloudSaveDelegateOnce()` after first render

**Location:** After line 149 (after `window.render()` call)

**Added Code:**
```javascript
// ====== 7.4) Bind cloud save delegate (event delegation on stable toolbar container) ======
if (typeof window.bindCloudSaveDelegateOnce === "function") {
  window.bindCloudSaveDelegateOnce();
}
```

## Implementation Details

- **Event Delegation:** Uses `root.addEventListener()` on stable `toolbarRoot` container
- **Bind Once Guard:** `window.__cloudSaveDelegateBound` flag prevents duplicate handlers
- **Fallback Container:** Falls back to `.toolbar` selector if `toolbarRoot` ID not found
- **Retry Logic:** If container not found, retries after 100ms (handles late DOM rendering)
- **State Access:** Uses `window.activeMode` and `window.activeKey` directly (same as existing pattern)
- **Event Target:** Uses `e.target.closest("#btnSaveCloudCompany")` to handle button clicks even if DOM changes

## Why This Fix Works

1. **Stable Container:** `toolbarRoot` div persists across renders (not replaced)
2. **Event Delegation:** Handler on container works even if button is recreated
3. **Bind Once:** Guard flag prevents duplicate listeners on refresh/re-render
4. **Init Timing:** Called after first render in `app_init.js`, ensuring toolbar exists

## 5-Step Manual Test Checklist

### Step 1: Click -> see [UI][SAVE][COMPANY] trigger
**Test:**
- Navigate to Model mode → Company sheet
- Open browser console
- Click "Save to Cloud" button

**Expected:**
- Console shows: `[UI][SAVE][COMPANY] trigger`
- Console shows: `[UI][SAVE][COMPANY] delegate_bound` (on page load/init)

**Pass Criteria:** Trigger log appears, no errors

---

### Step 2: Click -> see [CLOUD][WRITE][COMPANY] start/ok
**Test:**
- Click "Save to Cloud" button
- Watch console

**Expected:**
- Console shows: `[UI][SAVE][COMPANY] trigger`
- Console shows: `[CLOUD][WRITE][COMPANY] start`
- Console shows: `[CLOUD][WRITE][COMPANY] ok` (success)
- Console shows: `[UI][SAVE][COMPANY] ok` with timestamp
- Status shows: "Saved ✓ HH:MM:SS"

**Pass Criteria:** All logs appear in sequence, success message shown

---

### Step 3: Switch to BU -> click -> red "Company sheet only"
**Test:**
- Switch to Model mode → Business Unit (BU) sheet
- Click "Save to Cloud" button

**Expected:**
- Status immediately shows red text: "Company sheet only"
- Button remains enabled (no disabled state)
- No console logs from cloud write (no `[CLOUD][WRITE][COMPANY]`)

**Pass Criteria:** Guard message shown, no save attempted

---

### Step 4: Refresh -> still works (no duplicate trigger logs)
**Test:**
- Click "Save to Cloud" button (successfully saves)
- Press F5 to refresh page
- Click "Save to Cloud" button again
- Watch console

**Expected:**
- Console shows: `[UI][SAVE][COMPANY] delegate_bound` (once on init)
- Console shows: `[UI][SAVE][COMPANY] trigger` (once per click, not duplicated)
- Button works normally after refresh

**Pass Criteria:** Only one delegate_bound log, one trigger log per click (no duplicates)

---

### Step 5: Offline -> click -> red error message
**Test:**
- Open browser DevTools → Network tab
- Select "Offline" mode (or disable network)
- Click "Save to Cloud" button

**Expected:**
- Button shows "Saving…" (disabled)
- Status shows "Saving…"
- After timeout/error: Status shows red error text "Save failed: ..."
- Console shows: `[UI][SAVE][COMPANY] error` with error object
- Console shows: `[CLOUD][WRITE][COMPANY] error` (from cloud write function)
- Button text returns to "Save to Cloud" and is enabled

**Pass Criteria:** Red error message displayed, button restored, no crash
