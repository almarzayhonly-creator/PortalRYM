/* Portal RYM Architecture V2 - core bootstrap boundary.
   It only composes existing core services; it never owns business routes. */
(function(w){
  'use strict';
  if(w.RYM_BOOTSTRAP) return;

  let started = null;
  function start(){
    if(started) return started;
    started = Promise.resolve().then(()=>{
      if(!w.RYM_MODULES||!w.RYM_CONTEXT||!w.RYM_EVENTS||!w.RYM_STYLES||!w.RYM_LEGACY_ROUTES){
        throw new Error('Architecture V2 core incompleto');
      }
      w.RYM_LEGACY_ROUTES.install();
      return Object.freeze({
        architecture:'v2',
        modules:w.RYM_MODULES.list(),
        routeBoundary:'legacy-route-bridge',
        styleBoundary:'style-manager'
      });
    }).catch(error=>{started=null;throw error});
    return started;
  }

  function status(){return started?'started':'idle'}
  w.RYM_BOOTSTRAP=Object.freeze({start,status});
})(window);
