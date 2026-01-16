// === presence_ui_banner.js - Presence UI banner helper ===
console.log("✅ [presence_ui_banner] loaded");
console.log("✅ [presence_ui_banner] banner language forced to EN");

// Define bilingual text constants
const PRESENCE_TEXT = {
  en: "Someone else is viewing this sheet.",
  zh: "有人正在查看這張表。"
};

// Helper function to get language key
function getLangKey() {
  let rawValue = null;
  
  // Determine language in this priority order (first non-empty wins)
  // 1. document.documentElement.lang
  if (document.documentElement && document.documentElement.lang) {
    rawValue = document.documentElement.lang;
  }
  
  // 2. sessionStorage.getItem("lang")
  if (!rawValue) {
    try {
      const sessionLang = sessionStorage.getItem("lang");
      if (sessionLang) {
        rawValue = sessionLang;
      }
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  // 3. localStorage.getItem("lang")
  if (!rawValue) {
    try {
      const localLang = localStorage.getItem("lang");
      if (localLang) {
        rawValue = localLang;
      }
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  // 4. window.currentLang
  if (!rawValue && typeof window.currentLang !== "undefined" && window.currentLang) {
    rawValue = window.currentLang;
  }
  
  // 5. window.lang
  if (!rawValue && typeof window.lang !== "undefined" && window.lang) {
    rawValue = window.lang;
  }
  
  // 6. default "zh"
  if (!rawValue) {
    return "zh";
  }
  
  // Normalize: Convert to string, trim, lowercase
  const normalized = String(rawValue).trim().toLowerCase();
  
  // If it starts with "en" → return "en", else return "zh"
  if (normalized.startsWith("en")) {
    return "en";
  } else {
    return "zh";
  }
}

// A) window.presenceBannerEnsure()
// Creates a div with id presenceBanner if it doesn't exist
window.presenceBannerEnsure = function presenceBannerEnsure() {
  try {
    // Must be safe if called multiple times (id check)
    if (document.getElementById("presenceBanner")) {
      return;
    }

    // Create banner div
    const banner = document.createElement("div");
    banner.id = "presenceBanner";
    
    // Style minimally using inline style
    banner.style.cssText = "position: fixed; top: 0; left: 0; right: 0; padding: 8px 12px; font-size: 12px; background: #111827; color: #fff; z-index: 99998; display: none; text-align: center;";
    
    // Set banner text (forced to English only)
    banner.textContent = "Someone else is viewing this sheet.";

    // Append to body
    if (document.body) {
      document.body.appendChild(banner);
    } else {
      // If body not ready, wait for DOMContentLoaded
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function() {
          if (document.body && !document.getElementById("presenceBanner")) {
            document.body.appendChild(banner);
          }
        });
      } else {
        // Fallback: try after a short delay
        setTimeout(function() {
          if (document.body && !document.getElementById("presenceBanner")) {
            document.body.appendChild(banner);
          }
        }, 0);
      }
    }
  } catch (err) {
    // Must not throw
    console.warn("[presence_ui_banner] ensure error:", err.message);
  }
};

// B) window.presenceBannerSet(isOtherActive)
// Calls presenceBannerEnsure() first
// If isOtherActive === true: show banner
// Else: hide banner
window.presenceBannerSet = function presenceBannerSet(isOtherActive) {
  try {
    // Call presenceBannerEnsure() first
    window.presenceBannerEnsure();

    // Get banner element
    const banner = document.getElementById("presenceBanner");
    if (!banner) {
      // If not found, ensure again and retry
      window.presenceBannerEnsure();
      setTimeout(function() {
        const bannerRetry = document.getElementById("presenceBanner");
        if (bannerRetry) {
          // Update text before showing (forced to English only)
          bannerRetry.textContent = "Someone else is viewing this sheet.";
          bannerRetry.style.display = isOtherActive ? "block" : "none";
          // Debug log every time (lightweight)
          console.log("[PRESENCE][BANNER] show=", !!isOtherActive);
        }
      }, 10);
      return;
    }

    // Update banner text (forced to English only)
    banner.textContent = "Someone else is viewing this sheet.";

    // If isOtherActive === true: show banner
    // Else: hide banner
    banner.style.display = isOtherActive ? "block" : "none";
    
    // Debug log every time (lightweight)
    console.log("[PRESENCE][BANNER] show=", !!isOtherActive);
  } catch (err) {
    // Must not throw
    console.warn("[presence_ui_banner] set error:", err.message);
  }
};
