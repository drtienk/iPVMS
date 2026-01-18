
 console.log("[defs.js] loaded");

/* =========================================================
  LOAD CHAIN AUDIT: Visible Badge (確保 script 載入可見)
========================================================= */
(function createLoadBadge(){
  function insertBadge(){
    // 如果已存在，不重複建立
    if (document.getElementById("loadBadge")) return;
    
    const badge = document.createElement("div");
    badge.id = "loadBadge";
    const timestamp = new Date().toLocaleTimeString("zh-TW", { hour12: false });
    badge.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #10b981;
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-family: monospace;
      z-index: 99999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      line-height: 1.4;
    `;
    badge.textContent = "LOADED: defs.js " + timestamp;
    
    if (document.body) {
      document.body.appendChild(badge);
    } else {
      // 如果 body 還沒準備好，延遲插入
      setTimeout(insertBadge, 10);
    }
  }
  
  // 立即嘗試插入
  insertBadge();
  
  // 在 DOMContentLoaded 時也插入（確保一定執行）
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", insertBadge);
  } else {
    insertBadge();
  }
  
  // 多重保險：延遲插入
  setTimeout(insertBadge, 0);
  setTimeout(insertBadge, 100);
})();

/* =========================================================
  MODULE: 07_SHEET_DEFS
  AREA: Sheet definitions only (NO logic)
  CONTENT:
    - MODEL_DEF_MAP
    - PERIOD_DEF_MAP
  NOTE:
    - Loaded BEFORE app.js
    - app.js uses:
        const MODEL_DEF_MAP  = window.DEFS.MODEL_DEF_MAP;
        const PERIOD_DEF_MAP = window.DEFS.PERIOD_DEF_MAP;
  SAFE TO REPLACE WHOLE FILE
========================================================= */

// ✅ 先建立「全域容器」，之後我們再把 MODEL/PERIOD 放進來
window.DEFS = window.DEFS || {};

window.DEFS.MODEL_DEF_MAP= {
  company: { title:"Company", headers:["Company","Description","Currency","Resource Level","Activity Center Level","Activity Level"], cols:6 },
  bu:      { title:"Company_Copy", headers:["Business Unit","Description","Currency","Region"], cols:4 },
  cr:      { title:"Company Resource", headers:["Resource Code","Resource - Level 1","Resource - Level 2","Description","A.C. or Value Object Type","Resource Driver","Product Cost Type"], cols:7 },

   
  ac: {
    title:"Activity Center",
    headers:["Business Unit","Activity Center Code 1","Description 1","Activity Center Code 2",
      "Description 2","Allocation","ABC-Implemented","Sales Revenue"], cols:8
  },

  nc:      { title:"Normal Capacity", headers:["Activity Code","Activity Name","Description"], cols:3 },
  act:     { title:"Activity", headers:["Activity Code","Activity - Level 1","Activity - Level 2","Activity - Level 3","Activity - Level 4","Activity Name","Description","Activity Driver","Quality Attribute","Customer Service Attribute","Productivity Attribute","Value-added Attribute","Reason Group","Value Object Type","Product Cost Type"], cols:15 },
  daf:     { title:"Driver and Allocation Formula", headers:["Entity","Driver Name or Allocation","Description"], cols:3 },
  mach:    { title:"Machine (Activity Center Driver)", headers:["Activity Center Code","Machine Code","Machine Quantity","Machine Name"], cols:4 },
  mat:     { title:"Material", headers:["Material Code","Description"], cols:2 },
  pp:      { title:"Product Project", headers:["Activity Center","Project Code","Description","Project Driver"], cols:4 },
  prod:    { title:"Product", headers:["Product Code","Description"], cols:2 },
  cust:    { title:"Customer", headers:["Customer Code","Description"], cols:2 },
  sd:      { title:"Service Driver", headers:["Entity Code","Service Driver"], cols:2 },

  mm:      { title:"Manufacture Material", headers:["Business Unit","MO","Material Code","Quantity","Amount"], cols:5 },
  pmwip:   { title:"Purchased Material and WIP", headers:["Business Unit","Material Code","Quantity","Amount","End Inventory Qty","Unit","End Inventory Amount"], cols:7 },
  epv:     { title:"Expected Project Value", headers:["Project Code","Total Project Driver Value"], cols:2 },
  sr:      { title:"Sales Revenue", headers:["Order No","Customer Code","Product Code","Quantity","Amount","Sales Activity Center Code","Shipment","Business Unit (Currency)"], cols:8 },
  rit:     { title:"Revenue (Internal Transaction)", headers:["Business Unit","Resource Code","Activity Center Code","Amount","Supported Activity Center Code","Product Code","Quantity"], cols:7 },
};

window.DEFS.PERIOD_DEF_MAP = {
  company: { title:"Exchange Rate", headers:["Business Unit Currency","Company Currency","Exchange Rate"], cols:3, maxDataRows: 1, lockExtraRows: true },
  exchange_rate: { title:"Exchange Rate", headers:["Business Unit Currency","Company Currency","Exchange Rate"], cols:3, maxDataRows: 1, lockExtraRows: true },
  bu:      { title:"Resource", headers:["Business Unit","Resource Code","(Resource description)","Activity Center Code","(Activity center description)","Amount","Value Object Type","Value Object Code","Machine Code","Product Code"], cols:10 },
  cr:      { title:"Resource Driver (Activity Center)", headers:["Activity Center Code","(Activity Center)","Floor Space","Activity Center Headcount","Supervising Hours"], cols:5 },
  ac:      { title:"Resource Driver (Value Object)", headers:["Business Unit","Value Object Type","Value Object Code","Driver Code","Driver Value"], cols:5 },
  nc:      { title:"Resource Driver (Machine)", headers:["Activity Center Code","Machine Code","Driver Code","Driver Value"], cols:4 },
  act:     { title:"Resource Driver (M. A. C.)", headers:["Activity Center Code","(Activity Center)","Machine Code"], cols:3 },
  daf:     { title:"Resource Driver (S. A. C.)", headers:["Activity Center Code","(Activity Center)","Machine Code","","",""], cols:6 },
  mach:    { title:"Activity Center Driver (Normal Capacity)", headers:["Activity Center Code","Machine Code","Activity Code","Normal Capacity Hours"], cols:4 },
  mat:     { title:"Activity Center Driver (A. Capacity)", headers:["Activity Center Code","(Activity Center)","Machine Code","Supported Activity Center Code","Activity Code","Actual Capacity Hours","Value Object Code","Value Object Type","Product Code"], cols:9 },
  pp:      { title:"Activity Driver", headers:["Activity Center Code","(Activity Center)","Machine Code","Activity Code","(Activity)","Activity Driver","Activity Driver Value","Value Object Code","Value Object Type","Product Code"], cols:10 },
  prod:    { title:"Product Project Driver", headers:["Product Code","Project Driver","Project Driver Value"], cols:3 },
  cust:    { title:"Manufacture Order", headers:["Business Unit","MO","Product Code","Quantity","Closed"], cols:5 },
  mm:      { title:"Manufacture Material", headers:["Business Unit","MO","Material Code","Quantity","Amount"], cols:5 },
  pmwip:   { title:"Purchased Material and WIP", headers:["Business Unit","Material Code","Quantity","Amount","End Inventory Qty","Unit","End Inventory Amount"], cols:7 },
  epv:     { title:"Expected Project Value", headers:["Project Code","Total Project Driver Value"], cols:2 },
  sr:      { title:"Sales Revenue", headers:["Order No","Customer Code","Product Code","Quantity","Amount","Sales Activity Center Code","Shipment","Business Unit (Currency)"], cols:8 },
  rit:     { title:"Revenue (Internal Transaction)", headers:["Business Unit","Resource Code","Activity Center Code","Amount","Supported Activity Center Code","Product Code","Quantity"], cols:7 },
  sd:      { title:"Service Driver", headers:["Business Unit","Customer Code","Product Code","Hours"], cols:4 },
}; 
/* ======================= END MODULE: 07_SHEET_DEFS ======================= */

