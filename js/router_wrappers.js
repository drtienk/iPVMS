/* =========================================================
  MODULE: 14A_ROUTER_WRAPPERS
  FILE: js/router_wrappers.js
  AREA: provide refreshUI/switchMode/setActive wrappers for init()
========================================================= */
(function routerWrappers(){

  window.refreshUI = function refreshUI(){
    return window.DEFS?.ROUTER?.refreshUI?.();
  };

  window.switchMode = function switchMode(nextMode){
    return window.DEFS?.ROUTER?.switchMode?.(nextMode);
  };

  window.setActive = function setActive(nextKey){
    return window.DEFS?.ROUTER?.setActive?.(nextKey);
  };

})();
