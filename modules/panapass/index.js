/* Portal RYM V172 clean - Panapass module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES)return;
  w.RYM_MODULES.register('panapass',{
    open:function(ctx={}){
      d.body.dataset.rymModule='panapass';
      if(!w.RYM_PANAPASS_ROUTER)throw new Error('Panapass router unavailable');
      return w.RYM_PANAPASS_ROUTER.open(ctx.tab||'dashboard');
    }
  });
})(window,document);
