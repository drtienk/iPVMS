// === cloud_presence_heartbeat.js - Presence heartbeat write-only helper ===
console.log("✅ [cloud_presence_heartbeat] loaded");

// Constants for presence detection
const PRESENCE_ACTIVE_WINDOW_SEC = 45;
const PRESENCE_HEARTBEAT_SEC = 20;

// Generate and store instance ID once per tab (reload-safe)
if (!window.__PRESENCE_INSTANCE_ID__) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    window.__PRESENCE_INSTANCE_ID__ = crypto.randomUUID();
  } else {
    // Fallback: generate random string
    window.__PRESENCE_INSTANCE_ID__ = "inst_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }
}

// Export / attach one function only: window.presenceHeartbeatOnce()
window.presenceHeartbeatOnce = async function presenceHeartbeatOnce() {
  try {
    // Check window.SB exists; if not, log and return safely
    if (!window.SB) {
      console.log("[PRESENCE][WRITE] window.SB not available, skipping");
      return;
    }

    // Get company_id from sessionStorage
    const companyId = (sessionStorage.getItem("companyId") || "").trim();
    if (!companyId) {
      console.log("[PRESENCE][WRITE] companyId not found in sessionStorage, skipping");
      return;
    }

    // Ensure instance ID exists
    if (!window.__PRESENCE_INSTANCE_ID__) {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        window.__PRESENCE_INSTANCE_ID__ = crypto.randomUUID();
      } else {
        window.__PRESENCE_INSTANCE_ID__ = "inst_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      }
    }

    // Build minimal payload (include instance_id for multi-window detection)
    const payload = {
      company_id: companyId,
      instance_id: window.__PRESENCE_INSTANCE_ID__,
      ts: new Date().toISOString(),
      source: "heartbeat"
    };

    // Use deterministic id: presence_<companyId>_<instanceId> (each window has own row)
    const recordId = `presence_${companyId}_${window.__PRESENCE_INSTANCE_ID__}`;

    // Write to Supabase using upsert (table: cloud_status)
    const { error } = await window.SB
      .from("cloud_status")
      .upsert({
        id: recordId,
        payload: JSON.stringify(payload)
      }, {
        onConflict: "id"
      });

    // Log success / failure with clear [PRESENCE][WRITE] prefix
    if (error) {
      console.log("[PRESENCE][WRITE] error:", error.message);
    } else {
      console.log("[PRESENCE][WRITE] ok");
    }
  } catch (err) {
    // Must never throw (catch all errors)
    console.log("[PRESENCE][WRITE] error:", err.message);
  }
};

// Add read function: window.presenceReadOnce()
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

    // Ensure instance ID exists
    if (!window.__PRESENCE_INSTANCE_ID__) {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        window.__PRESENCE_INSTANCE_ID__ = crypto.randomUUID();
      } else {
        window.__PRESENCE_INSTANCE_ID__ = "inst_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      }
    }

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
    let otherActiveCount = 0;
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
              otherActiveCount++;
            }
          }
        }
      } catch (parseErr) {
        // Skip rows that can't be parsed
        continue;
      }
    }

    // Log result with improved format
    if (otherActiveCount > 0) {
      const ageInfo = newestOtherAgeSec !== null ? ` newestOtherAge=${newestOtherAgeSec}s` : "";
      console.log(`[PRESENCE][READ] other active = true (count=${otherActiveCount}${ageInfo} threshold=${PRESENCE_ACTIVE_WINDOW_SEC}s)`);
    } else {
      const ageInfo = newestOtherAgeSec !== null ? ` newestOtherAge=${newestOtherAgeSec}s` : " newestOtherAge=null";
      console.log(`[PRESENCE][READ] other active = false (${ageInfo} threshold=${PRESENCE_ACTIVE_WINDOW_SEC}s)`);
    }
  } catch (err) {
    // Never throw; catch all errors
    console.log("[PRESENCE][READ] error:", err.message);
  }
};

// Optional cleanup: delete this instance's row on beforeunload (non-blocking)
(function setupBeforeUnloadCleanup() {
  try {
    window.addEventListener("beforeunload", function() {
      try {
        // Must be wrapped in try/catch and must not block navigation
        if (!window.SB || !window.__PRESENCE_INSTANCE_ID__) {
          return;
        }

        const companyId = (sessionStorage.getItem("companyId") || "").trim();
        if (!companyId) {
          return;
        }

        // Attempt to delete this instance's row (non-blocking, fire-and-forget)
        // Use sendBeacon or fetch with keepalive=false to avoid blocking navigation
        window.SB
          .from("cloud_status")
          .delete()
          .eq("id", `presence_${companyId}_${window.__PRESENCE_INSTANCE_ID__}`)
          .then(() => {
            // Success (may not complete before navigation)
          })
          .catch(() => {
            // Ignore errors (cleanup is best-effort)
          });
      } catch (cleanupErr) {
        // Ignore cleanup errors (must not block navigation)
      }
    }, { once: true });
  } catch (setupErr) {
    // Ignore setup errors (cleanup is optional)
  }
})();
