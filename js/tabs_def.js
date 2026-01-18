console.log("[tabs_def.js] loaded");

window.DEFS = window.DEFS || {};
window.DEFS.TABS = window.DEFS.TABS || {};

/* =========================================================
  MODULE: 04_TAB_CONFIG_GROUPS (DEFS)
  AREA: TAB_CONFIG only
  SAFE TO REPLACE WHOLE MODULE
========================================================= */

window.DEFS.TABS.TAB_CONFIG = [
  { id:"tabCompany", key:"company", enModel:"Company", zhModel:"公司", enPeriod:"Company", zhPeriod:"公司" },
  { id:"tabExchangeRate", key:"exchange_rate", enModel:"", zhModel:"", enPeriod:"Exchange Rate", zhPeriod:"匯率", periodOnly:true },
  { id:"tabBU",      key:"bu",      enModel:"Business Unit", zhModel:"事業單位", enPeriod:"Resource", zhPeriod:"資源" },
  { id:"tabCR",      key:"cr",      enModel:"Company Resource", zhModel:"公司資源", enPeriod:"Resource Driver (Activity Center)", zhPeriod:"資源動因（作業中心）" },
  { id:"tabAC",      key:"ac",      enModel:"Activity Center", zhModel:"作業中心", enPeriod:"Resource Driver (Value Object)", zhPeriod:"資源動因（價值標的）" },
  { id:"tabNC",      key:"nc",      enModel:"Normal Capacity", zhModel:"正常產能", enPeriod:"Resource Driver (Machine)", zhPeriod:"資源動因（機器）" },
  { id:"tabAct",     key:"act",     enModel:"Activity", zhModel:"作業", enPeriod:"Resource Driver (M. A. C.)", zhPeriod:"資源動因（M.A.C.）" },
  { id:"tabDAF",     key:"daf",     enModel:"Driver and Allocation Formula", zhModel:"動因與分攤公式", enPeriod:"Resource Driver (S. A. C.)", zhPeriod:"資源動因（S.A.C.）" },
  { id:"tabMach",    key:"mach",    enModel:"Machine (Activity Center Driver)", zhModel:"機器（作業中心動因）", enPeriod:"Activity Center Driver (Normal Capacity)", zhPeriod:"作業中心動因（正常產能）" },
  { id:"tabMat",     key:"mat",     enModel:"Material", zhModel:"材料", enPeriod:"Activity Center Driver (A. Capacity)", zhPeriod:"作業中心動因（實際產能）" },
  { id:"tabPP",      key:"pp",      enModel:"Product Project", zhModel:"產品專案", enPeriod:"Activity Driver", zhPeriod:"作業動因" },
  { id:"tabProd",    key:"prod",    enModel:"Product", zhModel:"產品", enPeriod:"Product Project Driver", zhPeriod:"產品專案動因" },
  { id:"tabCust",    key:"cust",    enModel:"Customer", zhModel:"客戶", enPeriod:"Manufacture Order", zhPeriod:"製造工單" },

  { id:"tabMM",      key:"mm",      enModel:"Manufacture Material", zhModel:"製造用料", enPeriod:"Manufacture Material", zhPeriod:"製造用料", periodOnly:true },
  { id:"tabPMWIP",   key:"pmwip",   enModel:"Purchased Material and WIP", zhModel:"外購材料與在製品", enPeriod:"Purchased Material and WIP", zhPeriod:"外購材料與在製品", periodOnly:true },
  { id:"tabEPV",     key:"epv",     enModel:"Expected Project Value", zhModel:"預期專案價值", enPeriod:"Expected Project Value", zhPeriod:"預期專案價值", periodOnly:true },
  { id:"tabSR",      key:"sr",      enModel:"Sales Revenue", zhModel:"銷售收入", enPeriod:"Sales Revenue", zhPeriod:"銷售收入", periodOnly:true },
  { id:"tabRIT",     key:"rit",     enModel:"Revenue (Internal Transaction)", zhModel:"收入（內部交易）", enPeriod:"Revenue (Internal Transaction)", zhPeriod:"收入（內部交易）", periodOnly:true },

  { id:"tabSD",      key:"sd",      enModel:"Service Driver", zhModel:"服務動因", enPeriod:"Service Driver", zhPeriod:"服務動因" },

];

/* ======================= END MODULE: 04_TAB_CONFIG_GROUPS (DEFS) ======================= */

window.DEFS.TABS.TAB_GROUPS_MODEL = [
  { labelEn: "Basic Info", labelZh: "基本資訊", keys: ["company", "bu"] },
  { labelEn: "Module 1",   labelZh: "模組 1",   keys: ["cr"] },
  { labelEn: "Module 2",   labelZh: "模組 2",   keys: ["ac", "nc"] },
  { labelEn: "Module 3",   labelZh: "模組 3",   keys: ["act", "daf", "mach"] },
  { labelEn: "Module 4",   labelZh: "模組 4",   keys: ["mat", "pp", "prod", "cust", "sd"] },
];

window.DEFS.TABS.TAB_GROUPS_PERIOD = [
  { labelEn: "Basic Info", labelZh: "基本資訊", keys: ["company", "exchange_rate"] },
  { labelEn: "Module 1",   labelZh: "模組 1",   keys: ["bu", "cr", "ac", "nc"] },
  { labelEn: "Module 2",   labelZh: "模組 2",   keys: ["mach", "mat"] },
  { labelEn: "Module 3",   labelZh: "模組 3",   keys: ["pp", "prod", "cust"] },
  { labelEn: "Module 4",   labelZh: "模組 4",   keys: ["mm", "pmwip", "epv", "sr", "rit", "sd"] },
];

// ===============================
// LABEL HELPERS (moved from app.js)
// ===============================
window.DEFS = window.DEFS || {};
window.DEFS.TABS = window.DEFS.TABS || {};

window.DEFS.TABS.tabLabel = function(tcfg){
  const isPeriod = (activeMode === "period");
  if (lang === "en") return isPeriod ? tcfg.enPeriod : tcfg.enModel;
  return isPeriod ? tcfg.zhPeriod : tcfg.zhModel;
};

window.DEFS.TABS.groupLabel = function(en, zh){
  return (lang === "en") ? en : zh;
};

console.log("✅ [tabs_def.js] label helpers installed:", 
  !!window.DEFS.TABS.tabLabel, 
  !!window.DEFS.TABS.groupLabel
);
