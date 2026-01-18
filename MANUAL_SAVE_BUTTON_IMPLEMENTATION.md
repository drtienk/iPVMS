# Manual Save Button Implementation Summary

## Files Changed

### 1. app.html
**Changes:**
- Added "Save to Cloud" button in toolbar (after Check button)
- Added status display span (`cloudSaveStatus`) next to button

**Location:** Line 290-291 (in toolbar section)

**Added HTML:**
```html
<button id="btnSaveCloudCompany" type="button">Save to Cloud</button>
<span id="cloudSaveStatus" style="margin-left: 8px; font-size: 14px;"></span>
```

### 2. js/toolbar_ops.js
**Changes:**
- Added click event handler for `btnSaveCloudCompany` button in `bindToolbarEvents()` function
- Handler includes guard check for Model mode + Company sheet
- Implements async save operation with UI state management

**Location:** After `clearLocalBtn` handler (line ~692)

**Added Code:**
```javascript
// Save to Cloud (Model / Company only)
on("btnSaveCloudCompany","click", async () => {
  const btn = $("btnSaveCloudCompany");
  const status = $("cloudSaveStatus");
  if (!btn || !status) return;

  // Guard: only works when activeMode === "model" AND activeSheetKey === "company"
  if (CTX.activeMode !== "model" || CTX.activeKey !== "company") {
    status.textContent = "Company sheet only";
    status.style.color = "#ef4444"; // red
    return;
  }

  // Disable button and set saving state
  btn.disabled = true;
  btn.textContent = "Saving…";
  status.textContent = "Saving…";
  status.style.color = ""; // default color

  try {
    // Call cloud write function
    const result = await (typeof window.cloudModelCompanyWriteOnce === "function"
      ? window.cloudModelCompanyWriteOnce({ reason: "manual_save" })
      : window.cloudModelCompanyWriteOnce());

    if (result && result.ok) {
      // Success: show "Saved ✓ HH:MM:SS"
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      status.textContent = `Saved ✓ ${timeStr}`;
      status.style.color = ""; // default color (not red)
      console.log("[UI][SAVE][COMPANY] ok", { timestamp: now.toISOString() });
    } else {
      // Failure: show error message
      const errorMsg = result?.error || result?.reason || "Unknown error";
      status.textContent = `Save failed: ${errorMsg}`;
      status.style.color = "#ef4444"; // red
      console.log("[UI][SAVE][COMPANY] error", result);
    }
  } catch (err) {
    // Catch any errors
    const errorMsg = err?.message || String(err) || "Unknown error";
    status.textContent = `Save failed: ${errorMsg}`;
    status.style.color = "#ef4444"; // red
    console.log("[UI][SAVE][COMPANY] error", err);
  } finally {
    // Restore button state
    btn.disabled = false;
    btn.textContent = "Save to Cloud";
  }
});
```

## Implementation Details

- **Button ID:** `btnSaveCloudCompany`
- **Status Element ID:** `cloudSaveStatus`
- **Guard Logic:** Checks `CTX.activeMode === "model" && CTX.activeKey === "company"`
- **Error Handling:** Non-blocking, shows red error text in status
- **Time Format:** HH:MM:SS (24-hour format)
- **Event Binding:** Uses `on()` helper function (same pattern as other toolbar buttons)
- **Conflict Policy:** Last-write-wins (cloud write uses upsert, no prompts)

## Console Logs

**Success:**
- `[UI][SAVE][COMPANY] ok` - with timestamp object

**Failure:**
- `[UI][SAVE][COMPANY] error` - with error object/result

**Note:** Existing cloud write logs from `cloud_model_company_write.js` are also preserved:
- `[CLOUD][WRITE][COMPANY] start`
- `[CLOUD][WRITE][COMPANY] ok` (success)
- `[CLOUD][WRITE][COMPANY] error` (failure)

## 5-Step Manual Test Checklist

### Step 1: In Model/Company click Save -> shows Saving... then Saved ✓ time
**Test:**
- Navigate to Model mode → Company sheet
- Click "Save to Cloud" button
- Observe button and status changes

**Expected:**
- Button text changes to "Saving…" and button is disabled
- Status shows "Saving…"
- After completion: Status shows "Saved ✓ HH:MM:SS" (e.g., "Saved ✓ 14:23:45")
- Button text returns to "Save to Cloud" and is enabled
- Console shows: `[UI][SAVE][COMPANY] ok` and `[CLOUD][WRITE][COMPANY] ok`

**Pass Criteria:** Status shows success message with timestamp, button restored

---

### Step 2: Disable network -> click Save -> shows red error
**Test:**
- Open browser DevTools → Network tab
- Select "Offline" mode (or disable network)
- Click "Save to Cloud" button

**Expected:**
- Button shows "Saving…" (disabled)
- After timeout/error: Status shows red error text "Save failed: ..."
- Button text returns to "Save to Cloud" and is enabled
- Console shows: `[UI][SAVE][COMPANY] error` and `[CLOUD][WRITE][COMPANY] error`

**Pass Criteria:** Red error message displayed, button restored, no crash

---

### Step 3: Switch to non-company sheet -> click Save -> shows red "Company sheet only"
**Test:**
- Navigate to Model mode → Switch to any sheet other than "company" (e.g., "bu", "ac")
- Click "Save to Cloud" button

**Expected:**
- Status immediately shows red text: "Company sheet only"
- Button remains enabled (no disabled state)
- No network request attempted
- No console logs from cloud write

**Pass Criteria:** Guard message shown, no save attempted

---

### Step 4: Refresh page -> button still works, no duplicate clicks/logs
**Test:**
- Click "Save to Cloud" button (successfully saves)
- Press F5 to refresh page
- Click "Save to Cloud" button again

**Expected:**
- Button works normally after refresh
- Only one click handler registered (no duplicate event listeners)
- Console shows single set of logs (not duplicated)
- Status updates correctly

**Pass Criteria:** Button works after refresh, no duplicate handlers

**Note:** Event binding uses `on()` helper which handles single registration. The `bindToolbarEvents()` function is only called once via `toolbar_delegate.js`.

---

### Step 5: Check Supabase cloud_status record updated (model_company__${companyId})
**Test:**
- Make changes to Company sheet (e.g., edit A1 cell)
- Click "Save to Cloud" button
- Wait for success message
- Check Supabase Dashboard → `cloud_status` table

**Expected:**
- Record with `id = "model_company__${companyId}"` exists/updated
- `payload` field contains JSON string of Company sheet
- `updated_at` timestamp matches save time
- Payload includes the latest changes from Company sheet

**Pass Criteria:** Supabase record updated with latest Company sheet data

**Verification Method:**
- Supabase Dashboard → Table Editor → `cloud_status` table
- Filter by `id = "model_company__<your-company-id>"`
- Compare `updated_at` timestamp with save time
- Decode `payload` JSON to verify it contains Company sheet with latest changes

---

## Additional Notes

- **Event Binding:** Uses existing `on()` helper from utils, registered in `bindToolbarEvents()` which is called once by `toolbar_delegate.js`
- **State Management:** Button disabled state prevents double-clicks during save operation
- **Error Recovery:** All errors are caught and displayed, button always restored in `finally` block
- **Status Persistence:** Status message persists until next save attempt (no auto-clear)
- **Conflict Policy:** Implements last-write-wins via Supabase `upsert` operation (no conflict prompts)
