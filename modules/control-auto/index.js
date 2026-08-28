/* Portal RYM V172 clean - Control de Auto module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES) return;
  w.RYM_MODULES.register('control-auto',{
    open:async function(ctx={}){
      d.body.dataset.rymModule='control-auto';
      if(!w.RYM_CONTROL_ROUTER) throw new Error('Control de Auto router unavailable');
      const route=String(ctx.route||ctx.tab||'dashboard');
      return w.RYM_CONTROL_ROUTER.open(route);
    }
  });
})(window,document);
