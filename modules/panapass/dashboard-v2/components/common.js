/* Portal RYM - Panapass Dashboard V2 pure HTML components. Prepared, not wired. */
(function(w){
  'use strict';
  if(w.RYM_PANAPASS_DASHBOARD_V2_COMPONENTS) return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const integer=n=>Number(n||0).toLocaleString('en-US',{maximumFractionDigits:0});
  const avg=arr=>arr?.length?arr.reduce((a,x)=>a+Number(x.amount||0),0)/arr.length:0;

  function header(vm,title,subtitle){return `<header class="rym-pd2-header"><div><div class="rym-pd2-eyebrow">PANAPASS <span>${esc(vm.phase==='PM'?'CIERRE PM':'FASE AM')}</span></div><h1>${esc(title)}</h1><p>${esc(subtitle||'')}</p></div><div class="rym-pd2-head-right"><small>HOY</small><strong>${esc(vm.date)}</strong><span>● Datos actualizados</span><button type="button" data-pd2-action="refresh">↻ Actualizar</button></div></header>`}

  function kpi(label,value,note,tone,icon){return `<article class="rym-pd2-kpi ${esc(tone||'blue')}"><span class="rym-pd2-kpi-icon">${esc(icon||'•')}</span><small>${esc(label)}</small><strong>${esc(value)}</strong><em>${esc(note||'')}</em></article>`}

  function sectionTitle(title,sub,side){return `<div class="rym-pd2-section-title"><div><h2>${esc(title)}</h2>${sub?`<p>${esc(sub)}</p>`:''}</div>${side||''}</div>`}

  function alertCards(vm){
    const items=[
      ['Sin Panapass',vm.kpis.noPanapass,'Unidades sin numero','orange'],
      ['Bajas Panapass',vm.kpis.bajas,'Pendientes/procesadas','purple'],
      ['Recurrentes',vm.kpis.recurrentes,'5+ pagos en el mes','blue']
    ];
    return `<section class="rym-pd2-alert-panel">${sectionTitle(vm.phase==='AM'?'Requiere atencion':'Pendientes prioritarios',vm.phase==='AM'?'Prioriza incidencias operativas del dia.':'Con pagos registrados, enfoca el cierre en pendientes accionables.')}<div class="rym-pd2-alert-grid">${items.map(([a,b,c,d])=>`<article class="${d}"><b>${integer(b)}</b><span>${esc(a)}</span><small>${esc(c)}</small></article>`).join('')}</div></section>`;
  }

  function miniTrend(trend){
    const xs=(trend||[]).map(x=>Number(x.amount||0)),max=Math.max(1,...xs);
    return `<div class="rym-pd2-mini-trend">${xs.map((x,i)=>`<i style="height:${Math.max(8,Math.round(x/max*100))}%" title="${esc(trend[i]?.date)} · B/. ${money(x)}"></i>`).join('')}</div>`;
  }

  function galeraCard(g){return `<article class="rym-pd2-galera-card" data-galera="${esc(g.galera)}"><div class="rym-pd2-galera-head"><h3>${esc(g.galera)}</h3><button type="button" data-pd2-open-galera="${esc(g.galera)}">Ver galera →</button></div><div class="rym-pd2-galera-metrics"><div><small>Unidades</small><strong>${integer(g.units)}</strong></div><div><small>Negativos hoy</small><strong>${integer(g.negatives)}</strong><em>B/. ${money(g.negativeAmount)}</em></div><div><small>Requirieron pago</small><strong>${integer(g.paidUnits)}</strong><em>B/. ${money(g.paidAmount)}</em></div></div>${miniTrend(g.trend)}<footer>Prom. B/. ${money(avg(g.trend))}</footer></article>`}

  function rankTable(rows,options){
    const o=options||{},position=o.position||'posicion_galera',meId=String(o.meId||'');
    return `<div class="rym-pd2-rank-table"><div class="rym-pd2-rank-head"><span>#</span><span>Supervisora</span><span>Galera</span><span>Pagadas</span><span>Monto</span></div>${(rows||[]).map(x=>`<div class="rym-pd2-rank-row ${meId&&String(x.supervisora_id)===meId?'me':''}"><b>#${integer(x[position]||0)}</b><span>${esc(x.supervisora_nombre||x.supervisora||'—')}</span><small>${esc(x.galera||'—')}</small><strong>${integer(x.unidades_pagadas)}</strong><em>B/. ${money(x.monto_pagado)}</em></div>`).join('')||'<div class="rym-pd2-empty">Sin datos de ranking.</div>'}</div>`;
  }

  function trendPanel(title,trend){
    const total=(trend||[]).reduce((a,x)=>a+Number(x.units||0),0),maximum=Math.max(1,...(trend||[]).map(x=>Number(x.units||0)));
    return `<section class="rym-pd2-trend-panel">${sectionTitle(title,'Ultimos 7 dias')}<div class="rym-pd2-bars">${(trend||[]).map(x=>`<div><b>${integer(x.units)}</b><i style="height:${Math.max(8,Math.round(Number(x.units||0)/maximum*100))}%"></i><small>${esc(String(x.date||'').slice(5))}</small></div>`).join('')}</div><footer>Total 7 dias <strong>${integer(total)}</strong></footer></section>`;
  }

  w.RYM_PANAPASS_DASHBOARD_V2_COMPONENTS=Object.freeze({esc,money,integer,header,kpi,sectionTitle,alertCards,galeraCard,rankTable,trendPanel});
})(window);
