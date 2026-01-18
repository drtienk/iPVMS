# Save Button Event Delegation Fix

## Problem
Save to Cloud button loses its handler after F5/re-render because the handler was bound to DOM elements that get replaced.

## Solution
Implemented event delegation on stable `toolbarRoot` container with a bind-once guard.

## Files Changed

### 1. js/toolbar_ops.js
**Changes:**
- Updated guard flag from `__cloudSaveDelegateBound` to `__saveDelegateBound` (as specified)
- Reset guard on retry if toolbarRoot not found (prevents stuck state)
- Changed log from `[UI][SAVE][COMPANY] trigger` to `[UI][SAVE] trigger` (as required)

**Modified Code:**
```javascript
window.bindCloudSaveDelegateOnce = function bindCloudSaveDelegateOnce() {
  if (window.__saveDelegateBound) return;
  window.__saveDelegateBound = true;

  const root = document.getElementById("toolbarRoot") || document.querySelector(".toolbar");
  if (!root) {
    console.warn("[UI][SAVE] toolbar container not found, retrying...");
    window.__saveDelegateBound = false; // Reset guard on retry
    setTimeout(bindCloudSaveDelegateOnce, 100);
    return;
  }

  root.addEventListener("click", async (e) => {
    const btn = e.target.closest("#btnSaveCloudCompany");
    if (!btn) return;

    console.log("[UI][SAVE] trigger");
    // ... rest of handler logic ...
  });

  console.log("[UI][SAVE] delegate_bound");
};
```

## Implementation Details

### Event Delegation
- **Container:** `#toolbarRoot` (stable parent, persists across renders)
- **Target:** `#btnSaveCloudCompany` (detected via `e.target.closest()`)
- **Guard:** `window.__saveDelegateBound` (bind-once flag)

### Handler Logic
- Detects click on `#btnSaveCloudCompany` button
- Routes by mode/sheet:
  - Model + Company → `cloudModelCompanyWriteOnce()`
  - Period + Exchange Rate → `cloudPeriodExchangeRateWriteOnce()`
  - Else → show red "Cloud save not enabled for this sheet"
- UI behavior preserved: disable button, "Saving…", success/error messages

### Persistence
- Handler survives:
  - F5 (page refresh)
  - Sheet switching
  - Period switching
  - render()/refreshUI() calls

## Verification

### Test: Click Save Button
**Steps:**
1. Load page (F5)
2. Click "Save to Cloud" button

**Expected:**
- Console shows: `[UI][SAVE] trigger`
- Save functionality works (Model/Company or Period/Exchange Rate based on active sheet)

**Pass Criteria:** Button click logged, save executes

---

### Test: F5 Refresh
**Steps:**
1. Click Save button (verify it works)
2. Press F5 (refresh page)
3. Click Save button again

**Expected:**
- Console shows: `[UI][SAVE] delegate_bound` on page load
- Console shows: `[UI][SAVE] trigger` when clicking Save after refresh
- Save functionality works

**Pass Criteria:** Handler persists after F5

---

### Test: Sheet Switching
**Steps:**
1. In Period mode, switch to Exchange Rate sheet
2. Click Save button
3. Switch to Company sheet
4. Switch back to Exchange Rate
5. Click Save button again

**Expected:**
- Save works in Exchange Rate
- Handler still works after sheet switching

**Pass Criteria:** Handler persists through sheet switches
