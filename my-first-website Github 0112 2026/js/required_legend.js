/* =========================================================
  MODULE: 12C_REQUIRED_LEGEND
  AREA: show a small legend text (ZH/EN) indicating required color
========================================================= */
(function requiredLegend(){

  function getLang(){
    try { return (typeof lang !== "undefined" && lang === "en") ? "en" : "zh"; }
    catch { return "zh"; }
  }

  function ensureLegendEl(){
    let el = document.getElementById("requiredLegend");
    if (el) return el;

    const hint = document.getElementById("hintText");
    if (!hint) return null;

    el = document.createElement("div");
    el.id = "requiredLegend";
    el.style.marginTop = "6px";
    el.style.fontSize = "12px";
    el.style.color = "#6b7280";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.gap = "8px";
    el.style.flexWrap = "wrap";

    hint.insertAdjacentElement("afterend", el);
    return el;
  }

  function renderLegend(){
    const el = ensureLegendEl();
    if (!el) return;

    const swatch = `
      <span aria-hidden="true" style="
        display:inline-block;
        width:14px; height:14px;
        border-radius:4px;
        background: rgba(245, 158, 11, 0.10);
        box-shadow: inset 0 0 0 2px rgba(245, 158, 11, 0.45);
      "></span>
    `;

    const text = (getLang() === "en")
      ? "This color indicates required fields."
      : "此顏色代表必填欄位。";

    el.innerHTML = `${swatch}<span>${text}</span>`;
  }

  // 初次載入
  window.addEventListener("DOMContentLoaded", () => {
    renderLegend();
    setTimeout(renderLegend, 200);
  });

  // 跟著語言切換
  (function hookApplyLangUI(){
    function tryHook(){
      if (typeof window.applyLangUI !== "function") return false;
      if (window.applyLangUI.__requiredLegendHooked) return true;

      const _orig = window.applyLangUI;
      window.applyLangUI = function(){
        const ret = _orig.apply(this, arguments);
        try { renderLegend(); } catch {}
        return ret;
      };
      window.applyLangUI.__requiredLegendHooked = true;
      return true;
    }
    tryHook();
    setTimeout(tryHook, 0);
    setTimeout(tryHook, 200);
    setTimeout(tryHook, 800);
  })();

})();
