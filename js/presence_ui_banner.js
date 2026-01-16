// === presence_ui_banner.js - Presence UI banner helper ===
console.log("✅ [presence_ui_banner] loaded");

// Define bilingual text constants
const PRESENCE_TEXT = {
  en: "Someone else is using this workspace.",
  zh: "有人正在使用這個工作區。"
};

// Helper function to detect current language safely
function detectCurrentLang() {
  // Determine language in this order (safe checks)
  let langValue = null;
  
  if (typeof window.currentLang !== "undefined" && window.currentLang) {
    langValue = String(window.currentLang);
  } else if (typeof window.lang !== "undefined" && window.lang) {
    langValue = String(window.lang);
  } else {
    // Default to "zh"
    return "zh";
  }
  
  // Treat as English if value starts with "en", Chinese otherwise
  const langLower = langValue.toLowerCase();
  if (langLower.startsWith("en")) {
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
    
    // Set banner text dynamically based on current language
    const langKey = detectCurrentLang();
    banner.textContent = PRESENCE_TEXT[langKey] || PRESENCE_TEXT.zh;

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
          // Update text before showing
          const langKey = detectCurrentLang();
          bannerRetry.textContent = PRESENCE_TEXT[langKey] || PRESENCE_TEXT.zh;
          bannerRetry.style.display = isOtherActive ? "block" : "none";
        }
      }, 10);
      return;
    }

    // Update banner text dynamically before showing (language may have changed)
    const langKey = detectCurrentLang();
    banner.textContent = PRESENCE_TEXT[langKey] || PRESENCE_TEXT.zh;

    // If isOtherActive === true: show banner
    // Else: hide banner
    banner.style.display = isOtherActive ? "block" : "none";
  } catch (err) {
    // Must not throw
    console.warn("[presence_ui_banner] set error:", err.message);
  }
};
