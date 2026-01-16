// === presence_ui_banner.js - Presence UI banner helper ===
console.log("✅ [presence_ui_banner] loaded");

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
    
    // Banner text (detect language or show both)
    // If app is zh-Hant, default to Chinese; otherwise show both
    const lang = (document.documentElement.lang || "").toLowerCase();
    const isZh = lang.includes("zh") || lang.includes("hant") || lang.includes("hans");
    
    if (isZh) {
      banner.textContent = "有人正在使用這個工作區。";
    } else {
      banner.textContent = "Someone else is using this workspace. / 有人正在使用這個工作區。";
    }

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
          bannerRetry.style.display = isOtherActive ? "block" : "none";
        }
      }, 10);
      return;
    }

    // If isOtherActive === true: show banner
    // Else: hide banner
    banner.style.display = isOtherActive ? "block" : "none";
  } catch (err) {
    // Must not throw
    console.warn("[presence_ui_banner] set error:", err.message);
  }
};
