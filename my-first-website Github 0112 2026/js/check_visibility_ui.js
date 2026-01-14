console.log("✅ [check_visibility_ui] loaded");

/* =========================================================
  MODULE: CHECK_VISIBILITY_UI
  AREA: Admin login page UI for Check button visibility toggle (global + per-tab)
  SAFE TO REPLACE WHOLE MODULE
  
  PURPOSE:
    Add toggle UI on the admin login page (after company selection)
    to control whether non-admin users can see the Check button.
    
    - Global toggle: Enable/disable Check for all tabs
    - Per-tab checklist: Enable/disable Check for specific tabs (only shown when global is ON)
    - Only visible when admin has selected a company
    - Shows current saved values
    - Saves to localStorage immediately on change
========================================================= */

(function installCheckVisibilityUI(){
  // Only run on login page
  const path = (window.location?.pathname || "").toLowerCase();
  if (!path.endsWith("login.html") && !path.includes("/login.html")) return;
  if (!document.getElementById("companyRow")) return;
  if (window.__CHECK_VISIBILITY_UI_INSTALLED__) return;
  window.__CHECK_VISIBILITY_UI_INSTALLED__ = true;

  // Wait for store to be available (loads after this script)
  function getStore() {
    return window.DEFS?.CHECK_VISIBILITY;
  }

  // Wait for TAB_CONFIG to be available
  function getTabConfig() {
    return window.DEFS?.TABS?.TAB_CONFIG || [];
  }

  // Company ID mapping (from login.html)
  const COMPANY_ID_MAP = {
    "TEST CO.": "TEST_CO",
    "ABC CO.": "ABC_CO"
  };

  /**
   * Get companyId from company name
   */
  function getCompanyIdFromName(companyName) {
    return COMPANY_ID_MAP[companyName] || companyName;
  }

  /**
   * Get all sheet keys from TAB_CONFIG
   */
  function getAllSheetKeys() {
    const tabConfig = getTabConfig();
    if (!tabConfig || tabConfig.length === 0) {
      // Fallback: wait a bit and try again
      setTimeout(() => {
        if (document.getElementById("checkVisibilityTabsList")) {
          updateTabsList();
        }
      }, 200);
      return [];
    }
    
    return tabConfig.map(t => t.key).filter(Boolean);
  }

  /**
   * Get tab label for display
   */
  function getTabLabel(sheetKey) {
    const tabConfig = getTabConfig();
    const tab = tabConfig.find(t => t.key === sheetKey);
    if (!tab) return sheetKey;
    
    // Use English label (or Chinese if available)
    const lang = localStorage.getItem("app_lang") || "en";
    if (lang === "zh") {
      return tab.zhModel || tab.zhPeriod || tab.enModel || sheetKey;
    }
    return tab.enModel || tab.enPeriod || sheetKey;
  }

  /**
   * Create and insert the toggle UI
   */
  function createToggleUI() {
    // Check if already created
    if (document.getElementById("checkVisibilityRow")) return;

    const companyRow = document.getElementById("companyRow");
    if (!companyRow) return;

    // Create container
    const container = document.createElement("div");
    container.id = "checkVisibilityRow";
    container.style.cssText = "display:none; margin-top:12px; padding-top:12px; border-top:1px solid #e5e7eb;";

    // Global toggle
    const globalRow = document.createElement("div");
    globalRow.style.cssText = "margin-bottom:12px;";
    
    const globalLabel = document.createElement("label");
    globalLabel.style.cssText = "display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:600;";
    
    const globalCheckbox = document.createElement("input");
    globalCheckbox.type = "checkbox";
    globalCheckbox.id = "checkVisibilityToggle";
    globalCheckbox.style.cssText = "width:auto; margin:0; cursor:pointer;";
    
    const globalLabelText = document.createElement("span");
    globalLabelText.textContent = "Allow users to see Check button for this company";
    
    globalLabel.appendChild(globalCheckbox);
    globalLabel.appendChild(globalLabelText);
    globalRow.appendChild(globalLabel);
    container.appendChild(globalRow);

    // Per-tab checklist (initially hidden)
    const tabsContainer = document.createElement("div");
    tabsContainer.id = "checkVisibilityTabsContainer";
    tabsContainer.style.cssText = "display:none; margin-top:12px; padding-left:20px; border-left:2px solid #e5e7eb;";
    
    const tabsTitle = document.createElement("div");
    tabsTitle.style.cssText = "font-weight:600; margin-bottom:8px; color:#374151;";
    tabsTitle.textContent = "Per-tab settings (only applies when global is ON):";
    tabsContainer.appendChild(tabsTitle);
    
    const tabsList = document.createElement("div");
    tabsList.id = "checkVisibilityTabsList";
    tabsList.style.cssText = "display:flex; flex-direction:column; gap:6px; max-height:300px; overflow-y:auto;";
    tabsContainer.appendChild(tabsList);
    
    container.appendChild(tabsContainer);

    // Insert after companyRow
    companyRow.parentNode.insertBefore(container, companyRow.nextSibling);

    // Bind global toggle change event
    globalCheckbox.addEventListener("change", function() {
      const companySelect = document.getElementById("company");
      if (!companySelect || !companySelect.value) return;

      const companyName = companySelect.value;
      const companyId = getCompanyIdFromName(companyName);
      const enabled = this.checked;

      const store = getStore();
      if (!store) {
        console.warn("[check_visibility_ui] Store not available yet");
        return;
      }

      const saved = store.setGlobalUserCheckEnabled(companyId, enabled);
      if (saved) {
        console.log(`✅ [check_visibility_ui] Saved global: company=${companyId}, enabled=${enabled}`);
        // Show/hide per-tab list
        updateTabsContainerVisibility();
        // Update tabs list if needed
        if (enabled) {
          updateTabsList();
        }
      }
    });
  }

  /**
   * Update tabs list visibility
   */
  function updateTabsContainerVisibility() {
    const companySelect = document.getElementById("company");
    const globalCheckbox = document.getElementById("checkVisibilityToggle");
    const tabsContainer = document.getElementById("checkVisibilityTabsContainer");
    
    if (!companySelect || !globalCheckbox || !tabsContainer) return;
    
    const companyName = companySelect.value;
    if (!companyName || !globalCheckbox.checked) {
      tabsContainer.style.display = "none";
      return;
    }
    
    tabsContainer.style.display = "block";
  }

  /**
   * Render the per-tab checklist
   */
  function updateTabsList() {
    const tabsList = document.getElementById("checkVisibilityTabsList");
    if (!tabsList) return;

    const companySelect = document.getElementById("company");
    if (!companySelect || !companySelect.value) return;

    const companyName = companySelect.value;
    const companyId = getCompanyIdFromName(companyName);
    const store = getStore();
    
    if (!store) {
      setTimeout(updateTabsList, 100);
      return;
    }

    // Get all sheet keys
    const sheetKeys = getAllSheetKeys();
    if (sheetKeys.length === 0) {
      tabsList.innerHTML = "<div style='color:#6b7280; font-size:13px;'>Loading tabs...</div>";
      return;
    }

    // Get current per-tab map
    const perTabMap = store.getPerTabUserCheckMap(companyId);

    // Clear existing
    tabsList.innerHTML = "";

    // Create checkbox for each tab
    sheetKeys.forEach(sheetKey => {
      const row = document.createElement("label");
      row.style.cssText = "display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px;";
      
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.sheetKey = sheetKey;
      checkbox.style.cssText = "width:auto; margin:0; cursor:pointer;";
      checkbox.checked = perTabMap[sheetKey] === true;
      
      const labelText = document.createElement("span");
      labelText.textContent = getTabLabel(sheetKey);
      
      row.appendChild(checkbox);
      row.appendChild(labelText);
      tabsList.appendChild(row);

      // Bind change event
      checkbox.addEventListener("change", function() {
        const enabled = this.checked;
        const saved = store.setPerTabUserCheck(companyId, sheetKey, enabled);
        if (saved) {
          console.log(`✅ [check_visibility_ui] Saved per-tab: company=${companyId}, tab=${sheetKey}, enabled=${enabled}`);
        }
      });
    });
  }

  /**
   * Update toggle UI when company selection changes
   */
  function updateToggleUI() {
    const companySelect = document.getElementById("company");
    const container = document.getElementById("checkVisibilityRow");
    const globalCheckbox = document.getElementById("checkVisibilityToggle");
    
    if (!companySelect || !container || !globalCheckbox) return;

    const companyName = companySelect.value;
    if (!companyName) {
      container.style.display = "none";
      return;
    }

    // Show container
    container.style.display = "block";

    // Load current global setting
    const companyId = getCompanyIdFromName(companyName);
    const store = getStore();
    
    if (!store) {
      // Store not loaded yet, wait a bit
      setTimeout(updateToggleUI, 100);
      return;
    }

    const globalEnabled = store.getGlobalUserCheckEnabled(companyId);
    globalCheckbox.checked = globalEnabled;
    
    // Update per-tab container visibility
    updateTabsContainerVisibility();
    
    // Update per-tab list if global is ON
    if (globalEnabled) {
      updateTabsList();
    }
  }

  /**
   * Initialize UI when company dropdown is shown
   */
  function initUI() {
    createToggleUI();
    
    const companySelect = document.getElementById("company");
    if (!companySelect) return;

    // Watch for company selection changes
    companySelect.addEventListener("change", function() {
      updateToggleUI();
    });
    
    // Initial update (if company already selected)
    setTimeout(updateToggleUI, 100);
  }

  // Hook into existing showCompanyDropdown function
  // We'll intercept when companyRow is shown
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === "attributes" && mutation.attributeName === "style") {
        const companyRow = document.getElementById("companyRow");
        if (companyRow && companyRow.style.display !== "none") {
          initUI();
        }
      }
    });
  });

  // Watch for companyRow visibility changes
  const companyRow = document.getElementById("companyRow");
  if (companyRow) {
    observer.observe(companyRow, { attributes: true, attributeFilter: ["style"] });
    
    // Also check on DOMContentLoaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function() {
        if (companyRow.style.display !== "none") {
          initUI();
        }
      });
    } else {
      if (companyRow.style.display !== "none") {
        initUI();
      }
    }
  }

  // Also try to initialize after a delay (in case showCompanyDropdown is called programmatically)
  setTimeout(initUI, 500);
  setTimeout(initUI, 1000);
})();
