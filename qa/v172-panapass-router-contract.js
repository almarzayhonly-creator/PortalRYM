/* V172 clean QA - Panapass router contract */
(function(w){
  'use strict';
  const fail=m=>{throw new Error('V172 Panapass QA: '+m)};
  if(!w.RYM_PANAPASS_ROUTER)fail('RYM_PANAPASS_ROUTER missing');
  const expected=['dashboard','negativos_hoy','ranking','pagos_hoy','cargar_pagos','historial','recurrentes','operaciones','reportes','recorrido','bajas_panapass'];
  const routes=w.RYM_PANAPASS_ROUTER.routes();
  expected.forEach(r=>{if(!routes.includes(r))fail('route missing: '+r)});
  if(typeof w.RYM_PANAPASS_ROUTER.open!=='function')fail('open missing');
  if(typeof w.RYM_PANAPASS_ROUTER.leave!=='function')fail('leave missing');
  if(!w.RYM_MODULES?.has('panapass'))fail('panapass module missing');
  if(!w.RYM_MODULES?.has('panapass-ranking'))fail('ranking module missing');
  if(!w.RYM_MODULES?.has('panapass-recurrentes'))fail('recurrentes module missing');
  if(!w.RYM_MODULES?.has('panapass-bajas'))fail('bajas module missing');
  console.info('[V172 QA] Panapass router contract OK');
})(window);
