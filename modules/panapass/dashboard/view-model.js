/* Portal RYM - Panapass Dashboard V2 Clean view model. */
(function(w){
  'use strict';
  if(w.RYM_PANAPASS_CLEAN_VM) return;
  const norm=s=>String(s||'').trim().toUpperCase();
  const num=n=>Number.isFinite(Number(n))?Number(n):0;
  const pick=(o,keys)=>{for(const k of keys)if(o&&o[k]!==undefined&&o[k]!==null)return o[k];return undefined};
  const iso=x=>String(x||'').slice(0,10);
  const unitOf=x=>String(pick(x,['unidad','numero_unidad','unidad_id'])||'').trim();
  const dateOf=x=>iso(pick(x,['fecha','fecha_pago','created_at','dia']));
  const amountOf=x=>num(pick(x,['a_pagar','monto','monto_pagado','importe']));

  function shift(ymd,days){const x=new Date(`${ymd}T12:00:00-05:00`);x.setDate(x.getDate()+days);return x.toISOString().slice(0,10)}
  function dates7(hoy){return Array.from({length:7},(_,i)=>shift(hoy,i-6))}
  function phase(){const h=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Panama',hour:'2-digit',hour12:false}).format(new Date()));return h>=12?'PM':'AM'}

  function paymentsToday(raw){
    const dated=(raw.pagos||[]).filter(x=>dateOf(x)===raw.hoy),rows=dated.length?dated:[];
    const units=new Set();let amount=0;
    rows.forEach(x=>{const u=unitOf(x);if(u)units.add(norm(u));amount+=amountOf(x)});
    return {units:units.size,amount};
  }
  function trendFor(raw,galera){
    const dates=dates7(raw.hoy),g=norm(galera),map=new Map(dates.map(d=>[d,{date:d,units:new Set(),amount:0}]));
    for(const row of raw.pagos||[]){
      if(g&&norm(pick(row,['galera','galera_codigo']))!==g)continue;
      const d=dateOf(row);if(!map.has(d))continue;
      const cell=map.get(d),u=unitOf(row);if(u)cell.units.add(norm(u));cell.amount+=amountOf(row);
    }
    return dates.map(d=>{const x=map.get(d);return {date:d,units:x.units.size,amount:x.amount}});
  }
  function bajasObject(raw){return raw.bajas&&typeof raw.bajas==='object'?raw.bajas:{}}
  function alertSource(raw){const b=bajasObject(raw);if(Array.isArray(b.alertas))return b.alertas;if(Array.isArray(b.data?.alertas))return b.data.alertas;return []}
  function noPanapass(raw){const fromAlerts=alertSource(raw).filter(x=>norm(pick(x,['tipo','codigo']))==='PANAPASS_NO_ASIGNADO').length;return fromAlerts||num(pick(raw.summary,['sin_panapass','no_panapass']))}
  function bajas(raw){const b=bajasObject(raw);if(Array.isArray(b.pendientes))return b.pendientes.length;return num(pick(b,['pendientes_total','bajas_pendientes','pendientes']))}
  function kpis(raw){
    const s=raw.summary||{},c=raw.control||{},pay=paymentsToday(raw);
    return Object.freeze({
      active:num(pick(s,['unidades_visibles','unidades_activas','activas'])??pick(c,['activas','unidades_activas'])),
      negatives:num(pick(s,['negativos_hoy','negativos_am','negativos'])),
      requiredPayment:pay.units||num(pick(s,['pagos_hoy','requieren_pago','requirieron_pago'])),
      paidAmount:pay.amount||num(pick(s,['monto_pagado_hoy','monto_pagado'])),
      recurrentes:num(pick(s,['recurrentes_mes','recurrentes'])),
      noPanapass:noPanapass(raw),
      bajas:bajas(raw)
    });
  }
  function galeraRows(raw){
    return (raw.galeras||[]).map(x=>({
      galera:norm(pick(x,['galera','galera_codigo'])),
      units:num(pick(x,['unidades','unidades_visibles','activas'])),
      negatives:num(pick(x,['negativos','negativos_hoy','negativos_am'])),
      negativeAmount:Math.abs(num(pick(x,['saldo_negativo','monto_negativo']))),
      paidUnits:num(pick(x,['unidades_pagadas','pagadas_hoy','requirieron_pago'])),
      paidAmount:num(pick(x,['monto_pagado','monto_pagado_hoy'])),
      trend:trendFor(raw,pick(x,['galera','galera_codigo']))
    })).filter(x=>x.galera);
  }
  function rankOrder(rows,field){
    return [...rows].filter(x=>String(pick(x,['supervisora_nombre','supervisora','nombre'])||'').trim()).sort((a,b)=>num(a[field]||999)-num(b[field]||999)||num(pick(a,['unidades_pagadas']))-num(pick(b,['unidades_pagadas']))||String(pick(a,['supervisora_nombre','supervisora','nombre'])||'').localeCompare(String(pick(b,['supervisora_nombre','supervisora','nombre'])||''),'es'));
  }
  function meRow(rows,policy){
    const id=String(policy.identity.supervisoraId||'');
    if(id){const found=rows.find(r=>String(pick(r,['supervisora_id','id']))===id);if(found)return found}
    const name=norm(policy.identity.name),first=name.split(' ')[0];
    return rows.find(r=>norm(pick(r,['supervisora_nombre','supervisora','nombre'])).split(' ')[0]===first)||null;
  }
  function resolvedGalera(policy,allGaleraRows,rankRows){
    if(policy.primaryGalera)return policy.primaryGalera;
    if(policy.scope==='galera'&&allGaleraRows.length===1)return allGaleraRows[0].galera;
    const me=meRow(rankRows,policy);return norm(pick(me,['galera','galera_codigo']))||'';
  }
  function ranking(raw,policy,galera){
    const all=raw.rankingDay||[];
    if(policy.scope==='company')return Object.freeze({local:[],global:rankOrder(all,'posicion_global'),me:null});
    const local=rankOrder(all.filter(x=>!galera||norm(pick(x,['galera','galera_codigo']))===galera),'posicion_galera');
    return Object.freeze({local,global:[],me:meRow(local,policy)});
  }
  function performance(galeras,rank,policy){
    if(policy.scope!=='company')return null;
    const score=x=>x.units?x.paidUnits/x.units:999;
    const gs=[...galeras].sort((a,b)=>score(a)-score(b)||a.paidAmount-b.paidAmount||a.galera.localeCompare(b.galera));
    const rs=[...(rank.global||[])].sort((a,b)=>num(pick(a,['unidades_pagadas']))-num(pick(b,['unidades_pagadas']))||num(pick(a,['monto_pagado']))-num(pick(b,['monto_pagado'])));
    return Object.freeze({bestGalera:gs[0]||null,worstGalera:gs.at(-1)||null,bestSupervisor:rs[0]||null,worstSupervisor:rs.at(-1)||null});
  }
  function alerts(raw){return alertSource(raw).slice(0,8).map(x=>({tipo:norm(pick(x,['tipo','codigo'])),unidad:String(pick(x,['unidad','numero_unidad'])||''),placa:String(pick(x,['placa'])||''),detalle:String(pick(x,['detalle','mensaje','observacion'])||'')}))}
  function companyCompare(raw){return (raw.companyCompare||[]).map(x=>({galera:norm(pick(x,['galera','galera_codigo'])),units:num(pick(x,['unidades','unidades_visibles'])),negatives:num(pick(x,['negativos','negativos_hoy'])),paidUnits:num(pick(x,['unidades_pagadas','pagadas_hoy'])),paidAmount:num(pick(x,['monto_pagado']))})).filter(x=>x.galera)}
  function supervisorCompare(rank){const me=rank.me;if(!me||!rank.local.length)return null;const avg=rank.local.reduce((a,x)=>a+num(pick(x,['unidades_pagadas'])),0)/rank.local.length;return Object.freeze({myPaidUnits:num(pick(me,['unidades_pagadas'])),galeraAverage:avg,localPosition:num(pick(me,['posicion_galera'])),localTotal:num(pick(me,['total_galera']))||rank.local.length,globalPosition:num(pick(me,['posicion_global'])),globalTotal:num(pick(me,['total_global']))})}

  function build(raw,policy){
    const allGaleras=galeraRows(raw),galera=resolvedGalera(policy,allGaleras,raw.rankingDay||[]),rank=ranking(raw,policy,galera);
    const visibleGaleras=policy.scope==='company'?allGaleras:allGaleras.filter(x=>!galera||x.galera===galera);
    return Object.freeze({
      version:'2-clean',role:policy.role,scope:policy.scope,view:policy.view,policy,date:raw.hoy,phase:phase(),
      name:policy.identity.name||'Usuario',galera,kpis:kpis(raw),
      galeras:Object.freeze(visibleGaleras),allGaleras:Object.freeze(allGaleras),ranking:rank,
      performance:performance(allGaleras,rank,policy),alerts:Object.freeze(alerts(raw)),
      scopeTrend:Object.freeze(trendFor(raw,policy.scope==='galera'?galera:'')),
      companyComparison:Object.freeze(companyCompare(raw)),companyCompareAvailable:Boolean(raw.companyCompareAvailable),
      supervisorComparison:supervisorCompare(rank),
      actions:Object.freeze({negatives:'negativos_hoy',payments:'pagos_hoy',recurrentes:'panapass-recurrentes',bajas:'panapass-bajas'})
    });
  }
  w.RYM_PANAPASS_CLEAN_VM=Object.freeze({build});
})(window);
