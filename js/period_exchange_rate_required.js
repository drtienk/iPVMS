/* =========================================================
  MODULE: PERIOD_EXCHANGE_RATE_REQUIRED
  FILE: js/period_exchange_rate_required.js
  AREA: Required marking for Period / Exchange Rate sheet (all 4 columns)
========================================================= */

(function periodExchangeRateRequired(){

  const TAG_EXCHANGE_RATE = "req-period-exchange-rate";

  function getMode(){
    return String(window.activeMode || sessionStorage.getItem("activeMode") || "");
  }

  function getSheet(){
    return (typeof window.activeSheet === "function") ? window.activeSheet() : null;
  }

  function norm(s){
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  function getHeaders(sheet){
    if (!sheet) return [];
    const headers = Array.isArray(sheet.headers) ? sheet.headers : [];
    return headers.map(norm);
  }

  function isExchangeRateByHeaders(sheet){
    if (!sheet) return false;
    const headers = getHeaders(sheet);
    const cols = Number(sheet.cols || 0);

    if (cols !== 4) return false;
    const mustHave = ["From Currency", "To Currency", "Rate", "As Of Date"];
    return mustHave.every(h => headers.includes(h));
  }

  function clearTag(){
    document.querySelectorAll("." + TAG_EXCHANGE_RATE).forEach(el => {
      el.classList.remove("req-col", TAG_EXCHANGE_RATE);
    });
  }

  function applyExchangeRateRequired(sheet){
    const cols = Number(sheet.cols || 0);
    const thead = document.getElementById("gridHead");
    const tbody = document.getElementById("gridBody");
    if (!thead || !tbody) return;

    // 1) Headers: mark all 4 columns as required
    const tr = thead.querySelector("tr");
    if (tr){
      for (let c = 0; c < Math.min(cols, 4); c++){
        const th = tr.children?.[c + 1];
        if (th) th.classList.add("req-col", TAG_EXCHANGE_RATE);
      }
    }

    // 2) All rows: mark all 4 columns as required
    for (let c = 0; c < Math.min(cols, 4); c++){
      tbody.querySelectorAll(`td[data-c="${c}"]`).forEach(td => {
        td.classList.add("req-col", TAG_EXCHANGE_RATE);
      });
    }
  }

  function apply(){
    if (getMode() !== "period"){
      clearTag();
      return;
    }

    const s = getSheet();
    if (!s){
      clearTag();
      return;
    }

    clearTag();

    if (isExchangeRateByHeaders(s)){
      applyExchangeRateRequired(s);
      return;
    }
  }

  function applySoon(){
    try { apply(); } catch {}
    setTimeout(() => { try { apply(); } catch {} }, 0);
    setTimeout(() => { try { apply(); } catch {} }, 80);
    setTimeout(() => { try { apply(); } catch {} }, 250);
  }

  // Hook render
  (function hookRender(){
    function tryHook(){
      if (typeof window.render !== "function") return false;
      if (window.render.__periodExchangeRateReqHooked) return true;

      const _orig = window.render;
      window.render = function(){
        const r = _orig.apply(this, arguments);
        applySoon();
        return r;
      };
      window.render.__periodExchangeRateReqHooked = true;
      return true;
    }
    tryHook(); setTimeout(tryHook, 0); setTimeout(tryHook, 200); setTimeout(tryHook, 800);
  })();

  // Hook tab clicks
  (function hookTabClicks(){
    if (window.__periodExchangeRateReqTabHooked) return;
    window.__periodExchangeRateReqTabHooked = true;
    document.addEventListener("click", () => applySoon(), true);
  })();

  // Observe grid head
  (function observeGridHead(){
    const thead = document.getElementById("gridHead");
    if (!thead || window.__periodExchangeRateReqHeadObs) return;

    const obs = new MutationObserver(() => applySoon());
    obs.observe(thead, { childList:true, subtree:true, characterData:true });
    window.__periodExchangeRateReqHeadObs = obs;
  })();

  // DOMContentLoaded
  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(applySoon, 0);
    setTimeout(applySoon, 200);
    setTimeout(applySoon, 800);
  });

})();
