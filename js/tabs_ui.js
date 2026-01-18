console.log("✅ [tabs_ui.js] loaded");

window.DEFS = window.DEFS || {};
window.DEFS.TABS_UI = window.DEFS.TABS_UI || {};

(function installTabsUI(){

  // ✅ 不用 $，用原生 DOM，避免 app.js 尚未載入
  function getTabBar(){
    return document.getElementById("tabBar");
  }

  // ✅ 用全域 store，避免 tabs 物件在不同檔案各一份
  function getStore(){
    window.__TABS_UI = window.__TABS_UI || { tabs:{} };
    return window.__TABS_UI;
  }

  function buildTabs() {
    const tabBar = getTabBar();
    if (!tabBar) return;

    const store = getStore();
    const tabs = store.tabs;

    tabBar.innerHTML = "";
    Object.keys(tabs).forEach(k => delete tabs[k]);

    // Period mode: Use PERIOD_DEF_MAP as single source of truth
    if (activeMode === "period") {
      tabBar.innerHTML = "";
      const periodDefMap = window.DEFS?.PERIOD_DEF_MAP || window.PERIOD_DEF_MAP || {};
      const sheetKeys = Object.keys(periodDefMap);

      const row = document.createElement("div");
      row.className = "tab-group";

      const btnWrap = document.createElement("div");
      btnWrap.className = "tab-group-buttons";
      row.appendChild(btnWrap);

      sheetKeys.forEach(sheetKey => {
        const def = periodDefMap[sheetKey];
        if (!def || !def.title) return;

        // Skip if sheet is not visible
        if (typeof isSheetVisible === "function" && !isSheetVisible(activeMode, sheetKey)) return;

        const btn = document.createElement("button");
        btn.id = `tab${sheetKey.charAt(0).toUpperCase() + sheetKey.slice(1).replace(/_/g, '')}`;
        btn.type = "button";
        btn.className = "tab-btn";
        btn.dataset.sheetKey = sheetKey;
        btn.textContent = def.title;

        btn.addEventListener("click", () => {
          if (typeof isSheetVisible === "function" && !isSheetVisible(activeMode, sheetKey)) return;
          setActive(sheetKey);
        });

        btnWrap.appendChild(btn);
        tabs[sheetKey] = btn;
      });

      if (btnWrap.children.length > 0) {
        tabBar.appendChild(row);
      }

      // HOTFIX: Remove legacy "Exchange Rate" span nodes without dataset.sheetKey
      document.querySelectorAll("span").forEach(sp => {
        if ((sp.textContent || "").trim() === "Exchange Rate" && !(sp.dataset && sp.dataset.sheetKey)) {
          sp.remove();
        }
      });
    } else {
      // Model mode: Use existing TAB_CONFIG and TAB_GROUPS_MODEL
      const cfgMap = Object.fromEntries(TAB_CONFIG.map(tcfg => [tcfg.key, tcfg]));
      const groups = TAB_GROUPS_MODEL;

      groups.forEach(g => {
        const row = document.createElement("div");
        row.className = "tab-group";

        const title = document.createElement("span");
        title.className = "tab-group-title";
        title.textContent = window.DEFS?.TABS?.groupLabel?.(g.labelEn, g.labelZh) || g.labelEn;

        const btnWrap = document.createElement("div");
        btnWrap.className = "tab-group-buttons";

        row.appendChild(title);
        row.appendChild(btnWrap);

        g.keys.forEach(key => {
          const tcfg = cfgMap[key];
          if (!tcfg) return;

          const btn = document.createElement("button");
          btn.id = tcfg.id;
          btn.type = "button";
          btn.className = "tab-btn";
          btn.dataset.sheetKey = tcfg.key;
          btn.textContent = window.DEFS?.TABS?.tabLabel?.(tcfg) || tcfg.enModel;

          btn.addEventListener("click", () => {
            if (!isSheetVisible(activeMode, tcfg.key)) return;
            setActive(tcfg.key);
          });

          btnWrap.appendChild(btn);
          tabs[tcfg.key] = btn;
        });

        tabBar.appendChild(row);
      });
    }
  }

  function applyTabUI() {
    const store = getStore();
    const tabs = store.tabs;

    if (activeMode === "period") {
      // Period mode: Update from PERIOD_DEF_MAP
      const periodDefMap = window.DEFS?.PERIOD_DEF_MAP || window.PERIOD_DEF_MAP || {};
      Object.keys(tabs).forEach(sheetKey => {
        const btn = tabs[sheetKey];
        if (!btn) return;
        const def = periodDefMap[sheetKey];
        if (def && def.title) {
          btn.textContent = def.title;
        }
        if (typeof isSheetVisible === "function") {
          btn.style.display = isSheetVisible(activeMode, sheetKey) ? "" : "none";
        }
      });
    } else {
      // Model mode: Update from TAB_CONFIG
      TAB_CONFIG.forEach(tcfg => {
        const el = document.getElementById(tcfg.id);
        if (!el) return;
        el.textContent = window.DEFS?.TABS?.tabLabel?.(tcfg) || tcfg.enModel;
        el.style.display = isSheetVisible(activeMode, tcfg.key) ? "" : "none";
      });
    }

    ensureActiveKeyVisible();
    Object.keys(tabs).forEach(k => tabs[k]?.classList.toggle("active", k === activeKey));

    // ✅ 更新 Normal Capacity tab 的已檢查狀態
    try {
      if (window.DEFS?.CHECKS?.normalCapacityUpdateTabUI) {
        const checked = sessionStorage.getItem("nc_checked_status") === "1";
        window.DEFS.CHECKS.normalCapacityUpdateTabUI(checked);
      }
    } catch(e) {}
  }

  // ✅ export
  window.DEFS.TABS_UI.buildTabs = buildTabs;
  window.DEFS.TABS_UI.applyTabUI = applyTabUI;

  // ✅ NEW: language switch helper (no DOM structure change)
  window.DEFS.TABS_UI.refreshTabText = function(){
    try { applyTabUI(); } catch(e) {}
  };

  console.log(
    "✅ [tabs_ui.js] tabs ui installed:",
    !!window.DEFS.TABS_UI.buildTabs,
    !!window.DEFS.TABS_UI.applyTabUI,
    "refreshTabText:",
    !!window.DEFS.TABS_UI.refreshTabText
  );
})();
