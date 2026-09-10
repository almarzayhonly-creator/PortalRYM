/* Portal RYM - Panapass Dashboard V2 view model. Prepared, not wired. */
(function(w){
  'use strict';
  if(w.RYM_PANAPASS_DASHBOARD_V2_VM) return;

  const P=()=>w.RYM_PANAPASS_DASHBOARD_V2_POLICY;
  const norm=s=>String(s||'').trim().toUpperCase();
  const num=n=>Number.isFinite(Number(n))?Number(n):0;
  const iso=x=>String(x||'').slice(0,10);

  function dateShift(ymd,days){const x=new Date(`${ymd}T12:00:00-05:00`);x.setDate(x.getDate()+days);return x.toISOString().slice(0,10)}
  function dates7(hoy){return Array.from({length:7},(_,i)=>dateShift(hoy,i-6))}

  function paymentsToday(raw){
    const rows=(raw.pagos||[]).filter(x=>iso(x.fecha)===raw.hoy),units=new Set();let amount=0;
    rows.forEach(x=>{if(x.unidad)units.add(norm(x.unidad));amount+=num(x.a_pagar??x.monto)});
    return {units:units.size,amount};
  }

  function trendFor(raw,galera){
    const dates=dates7(raw.hoy),g=norm(galera),map=new Map(dates.map(d=>[d,{date:d,units:new Set(),amount:0}]));
    for(const row of raw.pagos||[]){
      if(g&&norm(row.galera)!==g)continue;
      const d=iso(row.fecha);if(!map.has(d))continue;
      const cell=map.get(d);if(row.unidad)cell.units.add(norm(row.unidad));cell.amount+=num(row.a_pagar??row.monto);
    }
    return dates.map(d=>{const x=map.get(d);return {date:d,units:x.units.size,amount:x.amount}});
  }

  function noPanCount(raw){const a=Array.isArray(raw.bajas?.alertas)?raw.bajas.alertas:[];return a.filter(x=>norm(x.tipo)==='PANAPASS_NO_ASIGNADO').length}
  function bajasCount(raw){return Array.isArray(raw.bajas?.pendientes)?raw.bajas.pendientes.length:0}

  function kpis(raw){
    const pay=paymentsToday(raw),summary=raw.summary||{},control=raw.control||{};
    return Object.freeze({
      active:num(summary.unidades_visibles??control.activas),
      negatives:num(summary.negativos_hoy),
      paidUnits:pay.units,
      paidAmount:pay.amount,
      recurrentes:num(summary.recurrentes_mes),
      bajas:bajasCount(raw),
      noPanapass:noPanCount(raw)
    });
  }

  function galeraRows(raw){
    return (raw.galeras||[]).map(x=>({
      galera:norm(x.galera),units:num(x.unidades),negatives:num(x.negativos),negativeAmount:Math.abs(num(x.saldo_negativo)),
      paidUnits:num(x.unidades_pagadas),paidAmount:num(x.monto_pagado),trend:trendFor(raw,x.galera)
    })).filter(x=>x.galera);
  }

  function rankOrder(rows,field){
    return [...rows].filter(x=>String(x.supervisora_nombre||x.supervisora||'').trim()).sort((a,b)=>
      num(a[field]||999)-num(b[field]||999)||num(a.unidades_pagadas)-num(b.unidades_pagadas)||num(a.monto_pagado)-num(b.monto_pagado)||
      String(a.supervisora_nombre||a.supervisora).localeCompare(String(b.supervisora_nombre||b.supervisora),'es')
    );
  }

  function meRow(rows,policy){
    const id=String(policy.identity.supervisoraId||'');
    if(id){const x=rows.find(r=>String(r.supervisora_id||'')===id);if(x)return x}
    const first=norm(policy.identity.name).split(' ')[0];
    return rows.find(r=>norm(r.supervisora_nombre||r.supervisora).split(' ')[0]===first)||null;
  }

  function ranking(raw,policy){
    const all=raw.rankingDay||[],gal=norm(policy.primaryGalera);
    if(policy.scope==='company'){
      return Object.freeze({local:[],global:rankOrder(all,'posicion_global'),me:null});
    }
    const local=rankOrder(all.filter(x=>!gal||norm(x.galera)===gal),'posicion_galera');
    const me=meRow(local,policy);
    return Object.freeze({local,global:[],me});
  }

  function performance(galeras,rankingModel,policy){
    if(policy.scope!=='company')return null;
    const gs=[...galeras].sort((a,b)=>a.paidUnits-b.paidUnits||a.paidAmount-b.paidAmount||a.galera.localeCompare(b.galera));
    const rs=rankOrder(rankingModel.global,'posicion_global');
    return Object.freeze({bestGalera:gs[0]||null,worstGalera:gs.at(-1)||null,bestSupervisor:rs[0]||null,worstSupervisor:rs.at(-1)||null});
  }

  function alerts(raw){
    const src=Array.isArray(raw.bajas?.alertas)?raw.bajas.alertas:[];
    return src.slice(0,8).map(x=>({tipo:norm(x.tipo),unidad:String(x.unidad||x.numero_unidad||''),placa:String(x.placa||''),galera:norm(x.galera),detalle:String(x.detalle||x.mensaje||x.observacion||'')}));
  }

  function companyComparison(raw,policy){
    const rows=(raw.companyCompare||[]).map(x=>({galera:norm(x.galera),units:num(x.unidades),negatives:num(x.negativos),paidUnits:num(x.unidades_pagadas),paidAmount:num(x.monto_pagado)})).filter(x=>x.galera);
    if(policy.scope==='company'&&!rows.length)return galeraRows(raw).map(x=>({galera:x.galera,units:x.units,negatives:x.negatives,paidUnits:x.paidUnits,paidAmount:x.paidAmount}));
    return rows;
  }

  function supervisorComparison(rank){
    const me=rank.me;if(!me||!rank.local.length)return null;
    const avg=rank.local.reduce((a,x)=>a+num(x.unidades_pagadas),0)/rank.local.length;
    return Object.freeze({myPaidUnits:num(me.unidades_pagadas),galeraAverage:avg,localPosition:num(me.posicion_galera),localTotal:num(me.total_galera||rank.local.length),globalPosition:num(me.posicion_global),globalTotal:num(me.total_global)});
  }

  function phase(raw){return paymentsToday(raw).units>0?'PM':'AM'}

  function build(raw){
    const policy=P()?.forSession(raw.session);if(!policy)throw new Error('Panapass Dashboard V2 policy unavailable');
    const gs=galeraRows(raw),rank=ranking(raw,policy),baseKpis=kpis(raw);
    const ownGalera=policy.primaryGalera||gs[0]?.galera||'';
    return Object.freeze({
      version:'2-prepared',policy,role:policy.role,scope:policy.scope,view:policy.view,
      date:raw.hoy,phase:phase(raw),name:policy.identity.name||'Usuario',galera:ownGalera,
      kpis:baseKpis,alerts:Object.freeze(alerts(raw)),galeras:Object.freeze(gs),ranking:rank,
      performance:performance(gs,rank,policy),companyComparison:Object.freeze(companyComparison(raw,policy)),
      supervisorComparison:supervisorComparison(rank),scopeTrend:Object.freeze(trendFor(raw,policy.scope==='company'?'':ownGalera)),
      companyCompareAvailable:Boolean(raw.optional?.companyCompareAvailable),
      actions:Object.freeze({negatives:'negativos_hoy',payments:'pagos_hoy',recurrentes:'panapass-recurrentes',bajas:'panapass-bajas'})
    });
  }

  w.RYM_PANAPASS_DASHBOARD_V2_VM=Object.freeze({build});
})(window);

