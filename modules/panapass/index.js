/* Portal RYM Architecture V2 - Panapass boundary.
   Legacy rendering remains compatible through RYM_LEGACY_ROUTES only. */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES)return;
  w.RYM_MODULES.register('panapass',{
    open:function(){
      d.body.dataset.rymModule='panapass';
      const legacy=w.RYM_LEGACY_ROUTES;
      if(!legacy||typeof legacy.open!=='function')throw new Error('Panapass legacy bridge unavailable');
      return legacy.open('panapass');
    }
  });
})(window,document);
