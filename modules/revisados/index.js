/* Portal RYM V172 clean - Revisados module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES)return;
  w.RYM_MODULES.register('revisados',{
    open:function(ctx={}){
      d.body.dataset.rymModule='revisados';
      if(!w.RYM_REVISADOS_ROUTER)throw new Error('Revisados router unavailable');
      return w.RYM_REVISADOS_ROUTER.open(ctx.tab||'dashboard');
    }
  });
})(window,document);
