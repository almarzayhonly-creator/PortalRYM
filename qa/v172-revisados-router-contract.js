/* V172 clean QA - Revisados router contract */
(function(w){
  'use strict';
  const fail=m=>{throw new Error('V172 Revisados QA: '+m)};
  if(!w.RYM_REVISADOS_ROUTER)fail('RYM_REVISADOS_ROUTER missing');
  const expected=['dashboard','operations','monthly','daily','history','stats','boletas','cupos'];
  const routes=w.RYM_REVISADOS_ROUTER.routes();
  expected.forEach(r=>{if(!routes.includes(r))fail('route missing: '+r)});
  if(typeof w.RYM_REVISADOS_ROUTER.open!=='function')fail('open missing');
  if(typeof w.RYM_REVISADOS_ROUTER.leave!=='function')fail('leave missing');
  if(!w.RYM_MODULES?.has('revisados'))fail('revisados module missing');
  console.info('[V172 QA] Revisados router contract OK');
})(window);
