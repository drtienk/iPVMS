/* =========================================================
  MODULE: 12D_MODEL_ALL_REQUIRED_COMPANY_BU (TAB-SWITCH FIX)
  FILE: js/model_all_required_company_bu.js

  ✅ 這支檔案在做什麼？
  - 只在「MODEL 模式」生效
  - 如果目前分頁是 Company：
      → 全部欄位都標成必填（變橘色 req-col）
  - 如果目前分頁是 Business Unit（BU）：
      → 只把 BU / Name / Code / Currency / Region 標成必填（變橘色 req-col）
  - 而且要能「重新整理」跟「切分頁」都自動套用（不用手動 refresh）

  ✅ 你不用懂 JS，只要知道：
  - 它靠「表頭文字」去判斷目前是哪一張表
  - 找到要必填的欄位後，就幫那些欄位加上 CSS class：req-col
========================================================= */

(function modelCompanyAndBURequired(){

  // ---------------------------------------------------------
  // 兩個 tag 是用來做「標記」的：
  // 之後要清掉橘色時，可以只清掉這支檔案加上去的東西
  // ---------------------------------------------------------
  const TAG_COMPANY = "req-company";
  const TAG_BU      = "req-bu";

  // ---------------------------------------------------------
  // 讀取目前模式（model / period）
  // 你的系統可能用 window.activeMode 或 sessionStorage 存
  // ---------------------------------------------------------
  function getMode(){
    return String(window.activeMode || sessionStorage.getItem("activeMode") || "");
  }

  // ---------------------------------------------------------
  // 取得目前正在顯示的 sheet（目前分頁對應的表格資料）
  // 你的系統有一個 window.activeSheet() 可以拿到目前 sheet
  // ---------------------------------------------------------
  function getSheet(){
    return (typeof window.activeSheet === "function") ? window.activeSheet() : null;
  }

  // ---------------------------------------------------------
  // 文字正規化：把多餘空白變成單一空白、去掉前後空白
  // 目的：避免表頭有奇怪空白造成比對失敗
  // ---------------------------------------------------------
  function norm(s){
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  // ---------------------------------------------------------
  // 同上，但順便轉小寫（用來做不分大小寫的比對）
  // ---------------------------------------------------------
  function normLower(s){
    return norm(s).toLowerCase();
  }

  // ---------------------------------------------------------
  // 取得表頭陣列（headers），並做 norm()
  // ---------------------------------------------------------
  function getHeaders(sheet){
    if (!sheet) return [];
    const headers = Array.isArray(sheet.headers) ? sheet.headers : [];
    return headers.map(norm);
  }

  /* =====================================================
     ✅ 判斷是否是 Company 表（維持你原本的判斷規則）
     - 必須 cols = 6
     - 表頭要包含 Company / Currency / Activity Level
  ===================================================== */
  function isCompanyByHeaders(sheet){
    if (!sheet) return false;
    const headers = getHeaders(sheet);
    const cols = Number(sheet.cols || 0);

    if (cols !== 6) return false;
    const mustHave = ["Company", "Currency", "Activity Level"];
    return mustHave.every(h => headers.includes(h));
  }

  /* =====================================================
     ✅ 判斷是否是 BU（Business Unit）表
     - 表頭有出現 business unit / bu 相關字樣
     - 而且也要有 name / description / desc（避免誤判）
  ===================================================== */
  function isBUByHeaders(sheet){
    if (!sheet) return false;
    const headersL = getHeaders(sheet).map(normLower);

    // 先確認表頭裡有沒有「BU」相關字
    const hasBUWord =
      headersL.some(h => h === "business unit") ||
      headersL.some(h => h.includes("business unit")) ||
      headersL.some(h => h === "bu") ||
      headersL.some(h => h.startsWith("bu ")) ||
      headersL.some(h => h.includes(" bu"));

    if (!hasBUWord) return false;

    // 再確認有沒有像「Name / Description」這種欄位，增加準確率
    const hasNameLike =
      headersL.some(h => h.includes("name")) ||
      headersL.some(h => h.includes("description")) ||
      headersL.some(h => h.includes("desc"));

    return hasNameLike;
  }

  /* =====================================================
     ✅ BU 需要變橘色（必填）的欄位：找出它們的「欄位 index」
     - 目前包含：BU / Name / Code / Currency / Region
     - 它會用「關鍵字」去判斷：表頭只要包含這些字就會被選中
  ===================================================== */
  function getBURequiredColIndexes(sheet){
    const headers = getHeaders(sheet);
    const headersL = headers.map(normLower);

    // 只要表頭包含這些字，就算必填欄
    const REQUIRED_KEYWORDS = [
      "business unit",
      "bu",
      "name",
      "code",
      "currency",
      "region"
    ];

    const idxs = [];

    // 逐欄掃描：如果表頭命中關鍵字，就把那個欄位 index 記下來
    for (let i = 0; i < headersL.length; i++){
      const h = headersL[i];

      // hit = 這個表頭是否命中任何關鍵字
      const hit = REQUIRED_KEYWORDS.some(k => h === k || h.includes(k));
      if (hit){
        idxs.push(i);
      }
    }

    // 保底：如果完全找不到（理論上不太會），至少把第 1 欄設為必填
    if (!idxs.length && headersL.length){
      idxs.push(0);
    }

    // 去重、並確保 index 都在有效範圍內
    return Array.from(new Set(idxs)).filter(i => i >= 0 && i < headersL.length);
  }

  /* =====================================================
     ✅ 清除橘色（req-col）用的工具函式
     - 這支檔案只會清掉自己加上的 TAG（避免誤傷其他規則）
  ===================================================== */
  function clearTag(tag){
    document.querySelectorAll("." + tag).forEach(el => {
      el.classList.remove("req-col", tag);
    });
  }

  // 清掉 Company + BU 兩種標記
  function clearAll(){
    clearTag(TAG_COMPANY);
    clearTag(TAG_BU);
  }

  /* =====================================================
     ✅ Company：全部欄位都變橘色（req-col）
     做法：
     - 表頭 th（欄名那排）加上 req-col
     - 內容 td（每個儲存格）也加上 req-col
     注意：
     - 你的表格第一欄通常是 row header，所以 th 用 c+1
  ===================================================== */
  function applyCompanyAllRequired(sheet){
    const cols = Number(sheet.cols || 0);
    const thead = document.getElementById("gridHead");
    const tbody = document.getElementById("gridBody");
    if (!thead || !tbody) return;

    // 1) 表頭那一列：把每個欄位的 th 變橘色
    const tr = thead.querySelector("tr");
    if (tr){
      for (let c = 0; c < cols; c++){
        const th = tr.children?.[c + 1]; // +1 是因為第 0 格通常不是資料欄
        if (th) th.classList.add("req-col", TAG_COMPANY);
      }
    }

    // 2) 表身每個欄位的 td：把所有該欄的儲存格變橘色
    for (let c = 0; c < cols; c++){
      tbody.querySelectorAll(`td[data-c="${c}"]`).forEach(td => {
        td.classList.add("req-col", TAG_COMPANY);
      });
    }
  }

  /* =====================================================
     ✅ BU：只把特定欄位變橘色（req-col）
     - 先找出 reqCols（要必填的欄位 index）
     - 表頭 th + 表身 td 都只套用這些欄位
  ===================================================== */
  function applyBURequired(sheet){
    const thead = document.getElementById("gridHead");
    const tbody = document.getElementById("gridBody");
    if (!thead || !tbody) return;

    const reqCols = getBURequiredColIndexes(sheet);
    if (!reqCols.length) return;

    // 1) 表頭：把命中的欄位 th 變橘色
    const tr = thead.querySelector("tr");
    if (tr){
      reqCols.forEach(c => {
        const th = tr.children?.[c + 1];
        if (th) th.classList.add("req-col", TAG_BU);
      });
    }

    // 2) 表身：把命中的欄位 td 變橘色
    reqCols.forEach(c => {
      tbody.querySelectorAll(`td[data-c="${c}"]`).forEach(td => {
        td.classList.add("req-col", TAG_BU);
      });
    });
  }

  /* =====================================================
     ✅ 主流程：apply()
     - 如果不是 model：就清掉橘色
     - 如果沒有 sheet：就清掉橘色
     - 先清乾淨再套用（避免殘留）
     - Company 優先（符合就直接 return）
     - BU 次之
  ===================================================== */
  function apply(){
    if (getMode() !== "model"){
      clearAll();
      return;
    }

    const s = getSheet();
    if (!s){
      clearAll();
      return;
    }

    clearAll();

    if (isCompanyByHeaders(s)){
      applyCompanyAllRequired(s);
      return;
    }

    if (isBUByHeaders(s)){
      applyBURequired(s);
      return;
    }
  }

  /* =====================================================
     ✅ applySoon()
     為什麼要做很多次 setTimeout？
     - 因為切分頁 / render 的時候，DOM 可能還沒畫完
     - 所以「立刻做一次」＋「等一下再補做幾次」
     - 確保最後畫面一定會套上橘色
  ===================================================== */
  function applySoon(){
    try { apply(); } catch {}
    setTimeout(() => { try { apply(); } catch {} }, 0);
    setTimeout(() => { try { apply(); } catch {} }, 80);
    setTimeout(() => { try { apply(); } catch {} }, 250);
  }

  /* =====================================================
     ✅ Hooks：掛勾點（監聽哪些時機要重新套用橘色）
     1) hookRender：你的系統每次 render() 重畫表格後，補套用
     2) hookTabClicks：任何點擊（包含切分頁）就試著補套用
     3) observeGridHead：表頭有變化（切表、換欄）就補套用
     4) DOMContentLoaded：頁面載入後補套用
  ===================================================== */

  // 1) 攔截 window.render：每次 render 完都跑 applySoon()
  (function hookRender(){
    function tryHook(){
      if (typeof window.render !== "function") return false;
      if (window.render.__companyBuReqHooked) return true;

      const _orig = window.render;
      window.render = function(){
        const r = _orig.apply(this, arguments);
        applySoon();
        return r;
      };
      window.render.__companyBuReqHooked = true;
      return true;
    }
    tryHook(); setTimeout(tryHook, 0); setTimeout(tryHook, 200); setTimeout(tryHook, 800);
  })();

  // 2) 任何 click（包含點 tab）就做 applySoon()
  (function hookTabClicks(){
    if (window.__companyBuReqTabHooked) return;
    window.__companyBuReqTabHooked = true;
    document.addEventListener("click", () => applySoon(), true);
  })();

  // 3) 監聽表頭 DOM 變動（header 一更新就重套）
  (function observeGridHead(){
    const thead = document.getElementById("gridHead");
    if (!thead || window.__companyBuReqHeadObs) return;

    const obs = new MutationObserver(() => applySoon());
    obs.observe(thead, { childList:true, subtree:true, characterData:true });
    window.__companyBuReqHeadObs = obs;
  })();

  // 4) 網頁載入完成後補套用（再多做幾次以防 render 還沒好）
  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(applySoon, 0);
    setTimeout(applySoon, 200);
    setTimeout(applySoon, 800);
  });

})();
