/* V172 clean QA - Control de Auto router contract */
(function(w){
  'use strict';
  const fail=msg=>{throw new Error('V172 Control QA: '+msg)};
  if(!w.RYM_CONTROL_ROUTER) fail('RYM_CONTROL_ROUTER missing');
  const routes=w.RYM_CONTROL_ROUTER.routes||{};
  const expected=['dashboard','unidades','cupos','auditoria','validador'];
  expected.forEach(k=>{if(!routes[k]) fail('route missing: '+k)});
  if(typeof w.RYM_CONTROL_ROUTER.open!=='function') fail('open missing');
  if(typeof w.RYM_CONTROL_ROUTER.leave!=='function') fail('leave missing');
  if(typeof w.RYM_CONTROL_ROUTER.rebind!=='function') fail('rebind missing');
  if(!w.RYM_MODULES?.has('control-auto')) fail('control-auto module missing');
  console.info('[V172 QA] Control de Auto router contract OK');
})(window);
