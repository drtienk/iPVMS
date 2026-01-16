// === cloud_presence_heartbeat.js - Presence heartbeat write-only helper ===
console.log("✅ [cloud_presence_heartbeat] loaded");
console.log("✅ [PRESENCE][RT] module loaded");

// Constants for presence detection
const PRESENCE_ACTIVE_WINDOW_SEC = 45;
const PRESENCE_HEARTBEAT_SEC = 20;

// Storage key for instance ID
const KEY = "__presence_instance_id__";

// Ensure instance ID is stable within the same tab session (reload-safe)
function ensureInstanceId() {
  if (window.__PRESENCE_INSTANCE_ID__) {
    return window.__PRESENCE_INSTANCE_ID__;
  }
  
  // Read from sessionStorage first
  let id = null;
  try {
    id = sessionStorage.getItem(KEY);
  } catch (e) {
    // Ignore storage errors
  }
  
  // If missing, generate new
  if (!id) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      // Fallback: generate random string
      id = "inst_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    }
    
    // Save back to sessionStorage
    try {
      sessionStorage.setItem(KEY, id);
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  // Assign to window.__PRESENCE_INSTANCE_ID__
  window.__PRESENCE_INSTANCE_ID__ = id;
  return id;
}

// Initialize instance ID on load
ensureInstanceId();

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

    // Ensure instance ID exists (stable within tab session)
    ensureInstanceId();

    // Build minimal payload (include instance_id for multi-window detection)
    const payload = {
      company_id: companyId,
      instance_id: window.__PRESENCE_INSTANCE_ID__,
      active_mode: window.activeMode || "model",
      active_key: window.activeKey || "",
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

    // Ensure instance ID exists (stable within tab session)
    ensureInstanceId();

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
    const currentMode = window.activeMode || "model";
    const currentKey = window.activeKey || "";
    
    let otherActiveAnyCount = 0;
    let otherActiveSameContextCount = 0;
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
              otherActiveAnyCount++;
              
              // Check if same context (same active_mode and active_key)
              const rowMode = payload.active_mode || "model";
              const rowKey = payload.active_key || "";
              if (rowMode === currentMode && rowKey === currentKey) {
                otherActiveSameContextCount++;
              }
            }
          }
        }
      } catch (parseErr) {
        // Skip rows that can't be parsed
        continue;
      }
    }

    // Compute two booleans
    const otherActiveAny = otherActiveAnyCount > 0;
    const otherActiveSameContext = otherActiveSameContextCount > 0;

    // Log result with unambiguous format
    console.log(`[PRESENCE][READ] otherAny=${otherActiveAny} otherSame=${otherActiveSameContext} countSame=${otherActiveSameContextCount}`);

    // Wire banner to presence read result (based on SAME CONTEXT only)
    if (typeof window.presenceBannerSet === "function") {
      window.presenceBannerSet(otherActiveSameContext);
    }
  } catch (err) {
    // Never throw; catch all errors
    console.log("[PRESENCE][READ] error:", err.message);
  }
};

// Realtime subscription for immediate presence updates
window.presenceRealtimeSubscribe = function presenceRealtimeSubscribe() {
  try {
    // Get companyId and check prerequisites first (for logging)
    const companyId = (sessionStorage.getItem("companyId") || "").trim() || 
                      (window.documentMeta?.companyId || "").trim();
    const hasSB = !!window.SB;
    const already = !!window.__PRESENCE_RT_SUB__;

    // Log function call with diagnostics
    console.log("[PRESENCE][RT] subscribe() called", { hasSB, companyId, already });

    // Guard against duplicates
    if (window.__PRESENCE_RT_SUB__) {
      console.log("[PRESENCE][RT] already subscribed, skipping");
      return;
    }
    window.__PRESENCE_RT_SUB__ = true;
    
    if (!window.SB || !companyId) {
      console.warn("[PRESENCE][RT] missing SB/companyId", { hasSB, hasCompanyId: !!companyId });
      window.__PRESENCE_RT_SUB__ = false; // Reset flag so retry can work
      return;
    }

    // Confirm SB is available
    console.log("[PRESENCE][RT] SB_OK", hasSB);

    // Create channel name
    const channelName = `presence_${companyId}`;

    // Throttle: allow calling presenceReadOnce at most once every 300ms
    let lastReadCall = 0;
    const THROTTLE_MS = 300;

    // Create Realtime channel
    const channel = window.SB.channel(channelName);

    // Subscribe to Postgres changes on cloud_status table
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'cloud_status'
    }, (payload) => {
      try {
        // Filter: only handle presence records for this company
        const id = payload.new?.id || payload.old?.id || '';
        const companyId2 = (sessionStorage.getItem("companyId") || "").trim() || 
                          (window.documentMeta?.companyId || "").trim();
        const isPresence = id.startsWith(`presence_${companyId2}_`);
        
        // Log event (always, even if not presence)
        console.log("[PRESENCE][RT] event", payload.eventType, { id, isPresence });

        if (!isPresence) {
          // Not a presence record for this company, ignore
          return;
        }

        // Throttle: only call presenceReadOnce if enough time has passed
        const now = Date.now();
        if (now - lastReadCall >= THROTTLE_MS) {
          lastReadCall = now;
          
          // Call presenceReadOnce to refresh banner
          if (typeof window.presenceReadOnce === "function") {
            window.presenceReadOnce();
          }
        }
      } catch (rtErr) {
        // Never throw from event handler
        console.warn("[PRESENCE][RT] event handler error", rtErr.message);
      }
    });

    // Subscribe to channel
    channel.subscribe((status, err) => {
      console.log("[PRESENCE][RT] status", status, err?.message || "");
      if (status === 'SUBSCRIBED') {
        console.log("[PRESENCE][RT] subscribed", channelName);
      } else if (status === 'CHANNEL_ERROR') {
        console.warn("[PRESENCE][RT] channel error", channelName);
      } else if (status === 'TIMED_OUT') {
        console.warn("[PRESENCE][RT] subscription timeout", channelName);
      } else if (status === 'CLOSED') {
        console.log("[PRESENCE][RT] channel closed", channelName);
      }
    });

    // Store channel on window for cleanup
    window.__PRESENCE_RT_CHANNEL__ = channel;

  } catch (err) {
    // Must never throw; fail gracefully
    console.warn("[PRESENCE][RT] subscribe error", err.message);
    window.__PRESENCE_RT_SUB__ = false; // Reset flag on error
  }
};

// Auto-initialize Realtime subscription with retry logic (if SB/companyId not ready at load time)
(function autoInitRealtimeSubscription() {
  let retryCount = 0;
  const MAX_RETRIES = 10;
  const RETRY_INTERVAL_MS = 500;

  function trySubscribe() {
    const companyId = (sessionStorage.getItem("companyId") || "").trim() || 
                      (window.documentMeta?.companyId || "").trim();
    const hasSB = !!window.SB;
    const hasCompanyId = !!companyId;

    if (hasSB && hasCompanyId) {
      // Prerequisites ready, try to subscribe
      if (typeof window.presenceRealtimeSubscribe === "function") {
        window.presenceRealtimeSubscribe();
      }
    } else if (retryCount < MAX_RETRIES) {
      // Not ready yet, retry
      retryCount++;
      console.log("[PRESENCE][RT] retry", retryCount, { hasSB, companyId });
      setTimeout(trySubscribe, RETRY_INTERVAL_MS);
    } else {
      // Max retries reached
      console.warn("[PRESENCE][RT] max retries reached, giving up", { hasSB, hasCompanyId });
    }
  }

  // Start retry logic after a short delay (allow modules to initialize)
  setTimeout(trySubscribe, 100);
})();

// Optional cleanup: delete this instance's row on beforeunload (non-blocking)
(function setupBeforeUnloadCleanup() {
  try {
    function cleanup() {
      try {
        // Must be wrapped in try/catch and must not block navigation
        if (!window.SB || !window.__PRESENCE_INSTANCE_ID__) {
          return;
        }

        const companyId = (sessionStorage.getItem("companyId") || "").trim();
        if (!companyId) {
          return;
        }

        // Unsubscribe from Realtime channel (best effort)
        if (window.__PRESENCE_RT_CHANNEL__) {
          try {
            window.__PRESENCE_RT_CHANNEL__.unsubscribe();
            window.__PRESENCE_RT_CHANNEL__ = null;
          } catch (rtCleanupErr) {
            // Ignore Realtime cleanup errors
          }
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
    }

    window.addEventListener("beforeunload", cleanup, { once: true });
    window.addEventListener("pagehide", cleanup, { once: true });
  } catch (setupErr) {
    // Ignore setup errors (cleanup is optional)
  }
})();
