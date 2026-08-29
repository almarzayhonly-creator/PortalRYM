/* Portal RYM V172 clean - Usuarios module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES)return;
  const afterOpen=[];
  async function open(ctx={}){
    d.body.dataset.rymModule='usuarios';
    if(!w.RYM_USERS_APP||typeof w.RYM_USERS_APP.open!=='function')throw new Error('Usuarios app unavailable');
    const result=await w.RYM_USERS_APP.open(ctx);
    for(const fn of afterOpen)await fn({ctx,result});
    return result;
  }
  function after(fn){if(typeof fn!=='function')throw new Error('Hook Usuarios invalido');afterOpen.push(fn);return()=>{const i=afterOpen.indexOf(fn);if(i>=0)afterOpen.splice(i,1)}}
  w.RYM_USERS_HOOKS=Object.freeze({after});
  w.RYM_MODULES.register('usuarios',{open});
  for(const fn of (w.__RYM_USERS_PENDING_AFTER__||[]))after(fn);
  delete w.__RYM_USERS_PENDING_AFTER__;
})(window,document);
