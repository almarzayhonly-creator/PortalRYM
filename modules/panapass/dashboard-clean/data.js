/* Portal RYM - Panapass Dashboard V2 Clean data gateway. */
(function(w){
  'use strict';
  if(w.RYM_PANAPASS_CLEAN_DATA) return;
  const R=()=>w.RYM_PANAPASS_CLEAN_RUNTIME;
  let cache=null,cacheKey='',cacheAt=0,loading=null;
  const TTL=30000;

  function todayPanama(){
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).reduce((a,x)=>(a[x.type]=x.value,a),{});
    return `${p.year}-${p.month}-${p.day}`;
  }
  function toList(v){if(Array.isArray(v))return v;if(Array.isArray(v?.data))return v.data;if(Array.isArray(v?.rows))return v.rows;return []}
  function one(v){if(Array.isArray(v))return v[0]||null;return v||null}
  function settledValue(job,fallback){return job?.status==='fulfilled'?job.value:fallback}

  async function load(policy,options){
    const runtime=R();if(!runtime)throw new Error('Runtime Panapass Clean no disponible');
    const session=runtime.session(),key=[session.role,session.userId,policy?.primaryGalera||''].join('|');
    const force=Boolean(options?.force);
    if(!force&&cache&&cacheKey===key&&Date.now()-cacheAt<TTL)return cache;
    if(loading)return loading;

    loading=(async()=>{
      const calls=[
        runtime.rpc('dashboard_resumen',{}),
        runtime.rpc('panapass_control_auto_resumen',{}),
        runtime.rpc('panapass_bajas_centro_v7',{}),
        runtime.rpc('panapass_dashboard_galeras',{}),
        runtime.rpc('panapass_dashboard_pagos_7d',{}),
        runtime.rpc('panapass_ranking_pagos',{p_periodo:'DIA'}),
        runtime.rpc('panapass_ranking_pagos',{p_periodo:'MES'})
      ];
      const wantsCompare=policy?.companyComparison==='aggregate-only';
      if(wantsCompare)calls.push(runtime.rpc('panapass_dashboard_company_compare_v2',{}));
      const r=await Promise.allSettled(calls);
      const out=Object.freeze({
        session,hoy:todayPanama(),
        summary:one(settledValue(r[0],null)),
        control:one(settledValue(r[1],null)),
        bajas:settledValue(r[2],null),
        galeras:toList(settledValue(r[3],[])),
        pagos:toList(settledValue(r[4],[])),
        rankingDay:toList(settledValue(r[5],[])),
        rankingMonth:toList(settledValue(r[6],[])),
        companyCompare:wantsCompare?toList(settledValue(r[7],[])):[],
        companyCompareAvailable:wantsCompare&&r[7]?.status==='fulfilled'
      });
      cache=out;cacheKey=key;cacheAt=Date.now();return out;
    })().finally(()=>{loading=null});
    return loading;
  }
  function clear(){cache=null;cacheKey='';cacheAt=0;loading=null}
  w.RYM_PANAPASS_CLEAN_DATA=Object.freeze({load,clear,todayPanama});
})(window);
