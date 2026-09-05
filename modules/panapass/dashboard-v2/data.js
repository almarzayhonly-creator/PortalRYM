/* Portal RYM - Panapass Dashboard V2 data gateway. Prepared, not wired. */
(function(w){
  'use strict';
  if(w.RYM_PANAPASS_DASHBOARD_V2_DATA) return;

  let cache=null,cacheAt=0,loading=null;
  const TTL=30000;

  function todayPanama(){
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'})
      .formatToParts(new Date()).reduce((a,x)=>(a[x.type]=x.value,a),{});
    return `${p.year}-${p.month}-${p.day}`;
  }

  function dateShift(iso,days){
    const x=new Date(`${iso}T12:00:00-05:00`);x.setDate(x.getDate()+days);
    return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'}).format(x);
  }

  function value(job,fallback){return job&&job.status==='fulfilled'?job.value:fallback}
  function one(job){const v=value(job,null);return Array.isArray(v)?(v[0]||null):v}
  function list(job){const v=value(job,[]);return Array.isArray(v)?v:[]}

  async function load(context,options){
    if(!context?.api?.panapass) throw new Error('Panapass Dashboard V2 requiere context.api.panapass');
    const opts=options||{},force=Boolean(opts.force);
    if(!force&&cache&&Date.now()-cacheAt<TTL)return cache;
    if(loading)return loading;

    loading=(async()=>{
      const hoy=todayPanama(),desde=dateShift(hoy,-6);
      const jobs=[
        context.api.call('dashboard_resumen'),
        context.api.call('panapass_control_auto_resumen'),
        context.api.call('panapass_bajas_centro_v7'),
        context.api.call('panapass_dashboard_galeras'),
        context.api.panapass.pagos7d(),
        context.api.panapass.ranking('DIA'),
        context.api.panapass.ranking('MES')
      ];
      if(opts.includeCompanyCompare===true) jobs.push(context.api.call('panapass_dashboard_company_compare_v2'));
      const r=await Promise.allSettled(jobs);
      const out=Object.freeze({
        session:context.session||null,hoy,desde,
        summary:one(r[0]),control:one(r[1]),bajas:value(r[2],null),
        galeras:list(r[3]),pagos:list(r[4]),rankingDay:list(r[5]),rankingMonth:list(r[6]),
        companyCompare:opts.includeCompanyCompare===true?list(r[7]):[],
        optional:Object.freeze({companyCompareAvailable:opts.includeCompanyCompare===true&&r[7]?.status==='fulfilled'})
      });
      cache=out;cacheAt=Date.now();return out;
    })().finally(()=>{loading=null});
    return loading;
  }

  function clear(){cache=null;cacheAt=0;loading=null}

  w.RYM_PANAPASS_DASHBOARD_V2_DATA=Object.freeze({load,clear,todayPanama,dateShift});
})(window);
