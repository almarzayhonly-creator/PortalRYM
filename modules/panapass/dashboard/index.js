/* Panapass Dashboard V2 owner. Rendering is explicit; loading has no side effects. */
(function(w){
  'use strict';
  if(w.RYM_PANAPASS_DASHBOARD_V2)return;
  const policy=()=>w.RYM_PANAPASS_CLEAN_POLICY;
  const model=()=>w.RYM_PANAPASS_CLEAN_VM;
  function render(input){
    const ctx=input||{},target=ctx.target;
    if(!target)throw new Error('Panapass Dashboard V2 requiere target');
    const p=policy()?.forSession(ctx.session);
    const vm=model()?.build(ctx.data,p);
    const view=w.RYM_PANAPASS_DASHBOARD_V2_VIEWS?.[vm.view];
    if(typeof view!=='function')throw new Error('Vista V2 no disponible: '+vm.view);
    target.innerHTML=view(vm);
    return Object.freeze({role:vm.role,view:vm.view,route:ctx.route||'dashboard'});
  }
  w.RYM_PANAPASS_DASHBOARD_V2=Object.freeze({render});
})(window);
