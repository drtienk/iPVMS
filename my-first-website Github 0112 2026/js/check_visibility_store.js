console.log("✅ [check_visibility_store] loaded");

/* =========================================================
  MODULE: CHECK_VISIBILITY_STORE
  AREA: localStorage API for Check button visibility per company and per tab
  SAFE TO REPLACE WHOLE MODULE
  
  PURPOSE:
    Store and retrieve per-company and per-tab settings for whether non-admin
    users can see the Check button.
    
    - Admin always sees Check button on all tabs (handled by canUserSeeCheckOnTab)
    - Non-admin users: 
      * Default: ALL tabs OFF (hidden)
      * Global toggle: if OFF, users never see Check anywhere
      * Per-tab toggle: if global ON, users see Check only on enabled tabs
    - Settings scoped by companyId in localStorage
========================================================= */

window.DEFS = window.DEFS || {};
window.DEFS.CHECK_VISIBILITY = window.DEFS.CHECK_VISIBILITY || {};

(function installCheckVisibilityStore(){
  if (window.__CHECK_VISIBILITY_STORE_INSTALLED__) return;
  window.__CHECK_VISIBILITY_STORE_INSTALLED__ = true;

  // Storage key prefixes
  const STORAGE_KEY_PREFIX_GLOBAL = "check_visibility_company_";
  const STORAGE_KEY_PREFIX_PER_TAB = "check_visibility_per_tab_company_";

  /**
   * Get current companyId from documentMeta or sessionStorage
   * @returns {string} companyId (default: "default")
   */
  function getCompanyId() {
    try {
      // Try documentMeta first (from app_state_login.js)
      if (window.documentMeta && window.documentMeta.companyId) {
        const id = String(window.documentMeta.companyId).trim();
        if (id) return id;
      }
    } catch {}

    try {
      // Fallback to sessionStorage
      const stored = sessionStorage.getItem("companyId");
      if (stored) {
        const id = String(stored).trim();
        if (id) return id;
      }
    } catch {}

    return "default";
  }

  /**
   * Get storage key for global setting
   * @param {string} companyId
   * @returns {string}
   */
  function globalStorageKey(companyId) {
    const id = String(companyId || "default").trim() || "default";
    return STORAGE_KEY_PREFIX_GLOBAL + id;
  }

  /**
   * Get storage key for per-tab settings
   * @param {string} companyId
   * @returns {string}
   */
  function perTabStorageKey(companyId) {
    const id = String(companyId || "default").trim() || "default";
    return STORAGE_KEY_PREFIX_PER_TAB + id;
  }

  /**
   * Get whether non-admin users can see Check button for a company (global toggle)
   * @param {string} companyId - Company ID (defaults to current company)
   * @returns {boolean} true if enabled, false if disabled (default: false)
   */
  function getGlobalUserCheckEnabled(companyId) {
    const id = companyId || getCompanyId();
    const key = globalStorageKey(id);
    
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return false; // default: OFF
      return stored === "true";
    } catch {
      return false; // default: OFF on error
    }
  }

  /**
   * Set whether non-admin users can see Check button for a company (global toggle)
   * @param {string} companyId - Company ID (defaults to current company)
   * @param {boolean} enabled - true to enable, false to disable
   */
  function setGlobalUserCheckEnabled(companyId, enabled) {
    const id = companyId || getCompanyId();
    const key = globalStorageKey(id);
    
    try {
      localStorage.setItem(key, enabled ? "true" : "false");
      return true;
    } catch (err) {
      console.warn("[check_visibility_store] Failed to save global setting:", err);
      return false;
    }
  }

  /**
   * Get per-tab visibility map for a company
   * @param {string} companyId - Company ID (defaults to current company)
   * @returns {Object} Map of { [sheetKey]: boolean } (default: all false)
   */
  function getPerTabUserCheckMap(companyId) {
    const id = companyId || getCompanyId();
    const key = perTabStorageKey(id);
    
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return {}; // default: all OFF
      
      const parsed = JSON.parse(stored);
      if (typeof parsed !== "object" || parsed === null) return {};
      return parsed;
    } catch {
      return {}; // default: all OFF on error
    }
  }

  /**
   * Set per-tab visibility for a specific tab
   * @param {string} companyId - Company ID (defaults to current company)
   * @param {string} sheetKey - Sheet key (e.g., "company", "bu", "cr")
   * @param {boolean} enabled - true to enable, false to disable
   */
  function setPerTabUserCheck(companyId, sheetKey, enabled) {
    const id = companyId || getCompanyId();
    const key = perTabStorageKey(id);
    const sheet = String(sheetKey || "").trim();
    
    if (!sheet) {
      console.warn("[check_visibility_store] Invalid sheetKey:", sheetKey);
      return false;
    }
    
    try {
      // Load current map
      const map = getPerTabUserCheckMap(id);
      
      // Update map
      if (enabled) {
        map[sheet] = true;
      } else {
        delete map[sheet];
      }
      
      // Save back
      localStorage.setItem(key, JSON.stringify(map));
      return true;
    } catch (err) {
      console.warn("[check_visibility_store] Failed to save per-tab setting:", err);
      return false;
    }
  }

  /**
   * Check if a user (admin or non-admin) can see the Check button on a specific tab
   * @param {string} companyId - Company ID (defaults to current company)
   * @param {string} sheetKey - Sheet key (e.g., "company", "bu", "cr")
   * @param {boolean} isAdmin - Whether the user is an admin
   * @returns {boolean} true if user can see Check button on this tab
   */
  function canUserSeeCheckOnTab(companyId, sheetKey, isAdmin) {
    // Admin always sees Check button on all tabs
    if (isAdmin === true) return true;
    
    const id = companyId || getCompanyId();
    const sheet = String(sheetKey || "").trim();
    
    // Check global toggle first
    const globalEnabled = getGlobalUserCheckEnabled(id);
    if (!globalEnabled) {
      // Global OFF: users never see Check anywhere
      return false;
    }
    
    // Global ON: check per-tab setting
    const perTabMap = getPerTabUserCheckMap(id);
    return perTabMap[sheet] === true;
  }

  /**
   * Check if a user (admin or non-admin) can see the Check button (legacy API, uses current activeKey)
   * @param {string} companyId - Company ID (defaults to current company)
   * @param {boolean} isAdmin - Whether the user is an admin
   * @returns {boolean} true if user can see Check button
   */
  function canUserSeeCheck(companyId, isAdmin) {
    // Admin always sees Check button
    if (isAdmin === true) return true;
    
    const id = companyId || getCompanyId();
    
    // Check global toggle
    const globalEnabled = getGlobalUserCheckEnabled(id);
    if (!globalEnabled) {
      return false; // Global OFF: users never see Check
    }
    
    // Global ON: need to check per-tab, but we don't have activeKey here
    // This function is kept for backward compatibility
    // For per-tab logic, use canUserSeeCheckOnTab instead
    return true; // If global is ON, assume visible (per-tab check happens in custom_rules.js)
  }

  // Expose API
  window.DEFS.CHECK_VISIBILITY.getCompanyId = getCompanyId;
  window.DEFS.CHECK_VISIBILITY.getGlobalUserCheckEnabled = getGlobalUserCheckEnabled;
  window.DEFS.CHECK_VISIBILITY.setGlobalUserCheckEnabled = setGlobalUserCheckEnabled;
  window.DEFS.CHECK_VISIBILITY.getPerTabUserCheckMap = getPerTabUserCheckMap;
  window.DEFS.CHECK_VISIBILITY.setPerTabUserCheck = setPerTabUserCheck;
  window.DEFS.CHECK_VISIBILITY.canUserSeeCheckOnTab = canUserSeeCheckOnTab;
  window.DEFS.CHECK_VISIBILITY.canUserSeeCheck = canUserSeeCheck; // Legacy API

  console.log("✅ [check_visibility_store] API ready (global + per-tab)");
})();
