/* Portal RYM V172 clean - Usuarios module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES)return;
  w.RYM_MODULES.register('usuarios',{
    open:function(ctx={}){
      d.body.dataset.rymModule='usuarios';
      if(!w.RYM_USERS_APP||typeof w.RYM_USERS_APP.open!=='function')throw new Error('Usuarios app unavailable');
      return w.RYM_USERS_APP.open(ctx);
    }
  });
})(window,document);
