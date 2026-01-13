console.log("✅ table_core_bootstrap.js loaded");

window.DEFS = window.DEFS || {};
window.DEFS.TABLE_BOOT = window.DEFS.TABLE_BOOT || {};

(function installTableCoreBootstrap(){

  function init(ctx){
    const TC = window.DEFS?.TABLE_CORE;
    if (!TC?.init) {
      console.warn("⚠️ TABLE_CORE not ready: js/table_core.js not loaded?");
      return;
    }

    if (window.__TABLE_CORE_INITED__) return;
    window.__TABLE_CORE_INITED__ = true;

    TC.init(ctx);
  }

  // export
  window.DEFS.TABLE_BOOT.init = init;

})();
