# Company Creation Feature - Test Checklist

## Feature: Admin Create New Company (clone from template)

### Prerequisites
- Login as admin (username: `admin`, password: `admin`)
- Template company `TEST_CO` should exist with some data

### Test Steps

#### 1. Create New Company
- [ ] Login as admin
- [ ] After admin verification, company dropdown appears
- [ ] "Create New Company" button is visible below dropdown
- [ ] Click "Create New Company" button
- [ ] Prompt appears asking for company name
- [ ] Enter company name (e.g., "John.co")
- [ ] Company is created with generated ID (e.g., "JOHN_CO")
- [ ] Success alert shows company name and ID
- [ ] New company appears in dropdown
- [ ] New company is automatically selected

#### 2. Verify Cloned Data
After creating company "John.co" (ID: "JOHN_CO"):

**Check localStorage keys exist:**
- [ ] `miniExcel_company_directory_v1` contains new company entry
- [ ] `miniExcel_sheet_visibility_v1__JOHN_CO` exists (cloned from TEST_CO)
- [ ] `check_visibility_per_tab_company_JOHN_CO` exists (cloned from TEST_CO)
- [ ] `miniExcel_autosave_model_v4__JOHN_CO` exists (structure cloned, data cleared)
- [ ] `miniExcel_period_list_v1__JOHN_CO` exists (if template had periods)

**Verify workspace data structure:**
- [ ] Model workspace has same sheets as template
- [ ] Model workspace has headers preserved
- [ ] Model workspace has cols/rows preserved
- [ ] Model workspace has all cell data cleared (empty strings)
- [ ] Period workspaces (if any) have same structure, data cleared

#### 3. Login with New Company
- [ ] Select new company in dropdown
- [ ] Click "Login" button
- [ ] Redirects to app.html
- [ ] App loads without errors
- [ ] Company name/ID is correct in sessionStorage
- [ ] Sheets are visible (based on cloned visibility settings)
- [ ] Check button visibility matches template settings
- [ ] Workspace data is empty (ready for new data entry)

#### 4. Edge Cases
- [ ] Try creating company with duplicate name → Shows error
- [ ] Try creating company with duplicate ID → Shows error
- [ ] Try creating company with empty name → Cancels
- [ ] Try creating company with special characters → ID is sanitized correctly
- [ ] Console shows clear logs for each cloned key

#### 5. Persistence
- [ ] Refresh login page
- [ ] New company still appears in dropdown
- [ ] Directory persists after browser restart

### Console Logs to Check
When creating a company, console should show:
```
[createNewCompany] Creating: name="John.co", id="JOHN_CO", template="TEST_CO"
[createNewCompany] ✅ Cloned: miniExcel_sheet_visibility_v1__TEST_CO -> miniExcel_sheet_visibility_v1__JOHN_CO
[createNewCompany] ✅ Cloned: check_visibility_per_tab_company_TEST_CO -> check_visibility_per_tab_company_JOHN_CO
[createNewCompany] ✅ Cloned: miniExcel_autosave_model_v4__TEST_CO -> miniExcel_autosave_model_v4__JOHN_CO (cleared data)
[createNewCompany] ✅ Cloned period list: miniExcel_period_list_v1__TEST_CO -> miniExcel_period_list_v1__JOHN_CO
[createNewCompany] ✅ Cloned: miniExcel_autosave_period_v4__TEST_CO__2024-01 -> miniExcel_autosave_period_v4__JOHN_CO__2024-01 (cleared data)
[createNewCompany] ✅ Added to directory: John.co (JOHN_CO)
```

### Expected localStorage Structure
```javascript
// Company directory
localStorage.getItem("miniExcel_company_directory_v1")
// Should contain: [{"companyName":"TEST CO.","companyId":"TEST_CO"}, {"companyName":"ABC CO.","companyId":"ABC_CO"}, {"companyName":"John.co","companyId":"JOHN_CO"}]

// Sheet visibility (cloned)
localStorage.getItem("miniExcel_sheet_visibility_v1__JOHN_CO")
// Should match structure of TEST_CO version

// Check visibility (cloned)
localStorage.getItem("check_visibility_per_tab_company_JOHN_CO")
// Should match structure of TEST_CO version

// Model workspace (structure cloned, data cleared)
localStorage.getItem("miniExcel_autosave_model_v4__JOHN_CO")
// Should have same sheets as TEST_CO, but all data arrays are empty strings
```
