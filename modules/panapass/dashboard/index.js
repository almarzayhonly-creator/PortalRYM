/* Portal RYM · Panapass Dashboard V2 Native
   Native renderer: data -> approved dashboard markup directly.
   No legacy dashboard DOM, no post-render transformation layers. */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_DASHBOARD_NATIVE_V2__) return;
  w.__RYM_PANAPASS_DASHBOARD_NATIVE_V2__=true;

  const GALS=['VCARS','VCOMP','VIPCO','VINDU'];
  const COLORS={VCARS:'#1677ff',VCOMP:'#10a37f',VIPCO:'#7c3aed',VINDU:'#f59e0b'};
  const norm=s=>String(s||'').trim().toUpperCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const nval=v=>Number(v||0)||0;

  let legacyDashboard=null;
  let cache=null;
  let cacheAt=0;
  let loading=null;
  let installTimer=null;
  let renderToken=0;
  const rangeCache=new Map();

  function ctx(){return w.RYM_CONTEXT&&typeof w.RYM_CONTEXT.create==='function'?w.RYM_CONTEXT.create('panapass-dashboard-v2'):null}
  function profile(){return ctx()?.session?.profile||null}
  function role(){return norm(ctx()?.session?.role||profile()?.rol||'')}
  function supported(){return ['ADMIN_TOTAL','ADMIN','GERENTE_GALERA','SUPERVISORA'].includes(role())}
  function isSupervisor(){return role()==='SUPERVISORA'}
  function isAdminTotal(){return role()==='ADMIN_TOTAL'}
  function displayName(){const p=profile();return String(p?.nombre||p?.name||'').trim()||'Usuario'}

  function todayPanama(){
    try{
      const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).reduce((a,x)=>(a[x.type]=x.value,a),{});
      return `${p.year}-${p.month}-${p.day}`;
    }catch(_){return new Date().toISOString().slice(0,10)}
  }
  function panamaHour(){
    try{return Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Panama',hour:'2-digit',hourCycle:'h23'}).format(new Date()))||0}catch(_){return new Date().getHours()}
  }
  function phase(){const configured=Number(w.RYM_PANAPASS_PM_START_HOUR);const cutoff=Number.isFinite(configured)&&configured>=0&&configured<=23?configured:12;return panamaHour()>=cutoff?'pm':'am'}
  function shiftDate(iso,days){
    const [y,m,day]=String(iso).split('-').map(Number),dt=new Date(Date.UTC(y,m-1,day+Number(days||0)));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;
  }
  function dateLabel(iso,short=false){
    try{
      const dt=new Date(`${iso}T12:00:00-05:00`);
      return new Intl.DateTimeFormat('es-PA',short?{day:'2-digit',month:'short',timeZone:'America/Panama'}:{weekday:'short',day:'2-digit',month:'short',year:'numeric',timeZone:'America/Panama'}).format(dt).replace('.','');
    }catch(_){return iso}
  }
  function dayLabel(iso){
    try{return new Intl.DateTimeFormat('es-PA',{weekday:'short',timeZone:'America/Panama'}).format(new Date(`${iso}T12:00:00-05:00`)).replace('.','').slice(0,3).toUpperCase()}catch(_){return iso.slice(8)}
  }

  async function fetchWindow(endDate){
    const startDate=shiftDate(endDate,-6),key=`${startDate}:${endDate}`;
    if(rangeCache.has(key))return rangeCache.get(key);
    const c=ctx();if(!c?.api?.call)throw new Error('Panapass dashboard API unavailable');
    const p=Promise.resolve(c.api.call('panapass_dashboard_pagos_rango',{p_desde:startDate,p_hasta:endDate,p_galera:null})).then(v=>Array.isArray(v)?v:[]);
    rangeCache.set(key,p);
    try{return await p}catch(e){rangeCache.delete(key);throw e}
  }

  async function loadData(force=false){
    if(!force&&cache&&Date.now()-cacheAt<30000)return cache;
    if(loading)return loading;
    const c=ctx();if(!c)throw new Error('Panapass dashboard context unavailable');
    const hoy=todayPanama(),desde=shiftDate(hoy,-6);
    loading=(async()=>{
      const jobs=await Promise.allSettled([
        c.api.call('dashboard_resumen'),
        c.api.call('panapass_control_auto_resumen'),
        c.api.call('panapass_bajas_centro_v7'),
        c.api.call('panapass_dashboard_galeras'),
        c.api.call('panapass_dashboard_pagos_rango',{p_desde:desde,p_hasta:hoy,p_galera:null}),
        c.api.panapass.ranking('DIA'),
        c.api.panapass.ranking('MES')
      ]);
      const one=i=>jobs[i].status==='fulfilled'?jobs[i].value:null;
      const first=v=>Array.isArray(v)?v[0]:v;
      const out={
        hoy,desde,
        summary:first(one(0)),
        control:first(one(1)),
        bajas:one(2)||{},
        galeras:Array.isArray(one(3))?one(3):[],
        pagos:Array.isArray(one(4))?one(4):[],
        rankingDay:Array.isArray(one(5))?one(5):[],
        rankingMonth:Array.isArray(one(6))?one(6):[]
      };
      cache=out;cacheAt=Date.now();return out;
    })().finally(()=>{loading=null});
    return loading;
  }

  function aggregateWindow(rows,endDate,galera){
    const start=shiftDate(endDate,-6),dates=Array.from({length:7},(_,i)=>shiftDate(start,i));
    const map=new Map(dates.map(date=>[date,{date,amount:0,units:new Set()}]));
    for(const r of rows||[]){
      if(norm(r.galera)!==norm(galera))continue;
      const date=String(r.fecha||'').slice(0,10),b=map.get(date);if(!b)continue;
      b.amount+=nval(r.a_pagar??r.monto);
      if(r.unidad)b.units.add(norm(r.unidad));
    }
    return dates.map(date=>({date,day:dayLabel(date),amount:map.get(date).amount,units:map.get(date).units.size}));
  }

  function todayPayments(data){
    const rows=(data.pagos||[]).filter(r=>String(r.fecha||'').slice(0,10)===data.hoy&&nval(r.a_pagar??r.monto)>0);
    const units=new Set(rows.map(r=>norm(r.unidad)).filter(Boolean));
    return {rows,units:units.size,amount:rows.reduce((a,r)=>a+nval(r.a_pagar??r.monto),0)};
  }
  function noPanCount(data){const alerts=Array.isArray(data?.bajas?.alertas)?data.bajas.alertas:[];return alerts.filter(x=>norm(x.tipo)==='PANAPASS_NO_ASIGNADO').length}
  function bajasCount(data){return Array.isArray(data?.bajas?.pendientes)?data.bajas.pendientes.length:0}
  function visibleGalRows(data){return Array.isArray(data.galeras)?data.galeras:[]}
  function activeCount(data){return nval(data.summary?.unidades_visibles??data.control?.activas)}
  function negativeCount(data){const fallback=visibleGalRows(data).reduce((a,x)=>a+nval(x.negativos),0);return nval(data.summary?.negativos_hoy??fallback)}
  function recurrentCount(data){return nval(data.summary?.recurrentes_mes)}

  function go(route){try{return ctx()?.router?.open?.(route)}catch(e){console.warn('Panapass nav',e)}}
  async function openModule(id){
    try{
      if(w.RYM_MODULES?.has?.(id))return await w.RYM_MODULES.open(id,w.RYM_CONTEXT.create(id,{source:'dashboard-v2'}));
    }catch(e){console.warn('Panapass module',id,e)}
    return null;
  }
  function bindAction(node,fn){if(node)node.onclick=e=>{e.preventDefault();fn()}}
  function action(key){
    if(key==='actives'){if(typeof w.v70OpenControl==='function')return w.v70OpenControl();return}
    if(key==='negatives')return go('negativos_hoy');
    if(key==='paid')return go('pagos_hoy');
    if(key==='recurrentes')return openModule('panapass-recurrentes');
    if(key==='bajas')return openModule('panapass-bajas');
    if(key==='sinpan')return openModule('panapass-bajas');
  }

  function icon(name){const m={active:'▦',negative:'!',paid:'$',recurrent:'↻',missing:'—',bajas:'↓'};return m[name]||'•'}
  function kpi({kind,label,value,note,actionKey,mini=false}){
    return `<button type="button" class="rym-d2-kpi ${mini?'is-mini':''}" data-kind="${esc(kind)}" data-action="${esc(actionKey||'')}"><span class="rym-d2-kpi-icon">${esc(icon(kind))}</span><span class="rym-d2-kpi-label">${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note||'')}</small></button>`;
  }

  function headerMarkup(data){
    return `<header class="rym-d2-header"><div><span class="rym-d2-eyebrow">PANAPASS</span><h1>Dashboard Panapass</h1><p>Control de cobranza y rendimiento operativo en tiempo real</p></div><div class="rym-d2-head-actions"><div class="rym-d2-date"><span>Hoy</span><strong>${esc(dateLabel(data.hoy))}</strong><small>● Datos actualizados</small></div><button type="button" class="rym-d2-refresh" data-action="refresh">↻ Actualizar</button></div></header>`;
  }

  function topMarkup(data){
    const paid=todayPayments(data),active=activeCount(data),neg=negativeCount(data),missing=noPanCount(data),bajas=bajasCount(data),rec=recurrentCount(data),pm=phase()==='pm';
    const primary=pm?[
      {kind:'active',label:'Unidades activas',value:active,note:isAdminTotal()?'4 galeras':'Tus unidades',actionKey:'actives'},
      {kind:'paid',label:'Requirieron pago',value:paid.units,note:`B/. ${money(paid.amount)}`,actionKey:'paid'},
      {kind:'missing',label:'Sin Panapass',value:missing,note:'Unidades sin número',actionKey:'sinpan'},
      {kind:'bajas',label:'Bajas Panapass',value:bajas,note:`${Array.isArray(data.bajas?.procesadas)?data.bajas.procesadas.length:0} procesadas`,actionKey:'bajas'}
    ]:[
      {kind:'active',label:'Unidades activas',value:active,note:isAdminTotal()?'4 galeras':'Tus unidades',actionKey:'actives'},
      {kind:'negative',label:'Negativos hoy',value:neg,note:'Punto de partida',actionKey:'negatives'},
      {kind:'missing',label:'Sin Panapass',value:missing,note:'Unidades sin número',actionKey:'sinpan'},
      {kind:'bajas',label:'Bajas Panapass',value:bajas,note:`${Array.isArray(data.bajas?.procesadas)?data.bajas.procesadas.length:0} procesadas`,actionKey:'bajas'}
    ];
    const secondary=pm?[
      {kind:'recurrent',label:'Recurrentes',value:rec,note:'5+ pagos en el mes',actionKey:'recurrentes',mini:true},
      {kind:'negative',label:'Negativos de hoy',value:neg,note:'Referencia del inicio del día',actionKey:'negatives',mini:true}
    ]:[
      {kind:'recurrent',label:'Recurrentes',value:rec,note:'5+ pagos en el mes',actionKey:'recurrentes',mini:true},
      {kind:'paid',label:'Requirieron pago',value:paid.units,note:`B/. ${money(paid.amount)}`,actionKey:'paid',mini:true}
    ];
    return `<section class="rym-d2-hero"><div class="rym-d2-primary">${primary.map(kpi).join('')}</div><div class="rym-d2-secondary">${secondary.map(kpi).join('')}</div></section>`;
  }

  function perfRows(data){
    return visibleGalRows(data).map(r=>({name:norm(r.galera),paid:nval(r.unidades_pagadas),amount:nval(r.monto_pagado),neg:nval(r.negativos)})).sort((a,b)=>a.paid-b.paid||a.amount-b.amount||a.name.localeCompare(b.name));
  }
  function performanceMarkup(data){
    const rows=perfRows(data),neg=negativeCount(data),paid=todayPayments(data),pm=phase()==='pm';
    if(!pm){
      return `<section class="rym-d2-performance is-collection"><div class="rym-d2-performance-intro"><span>PRIORIDAD OPERATIVA</span><strong>Gestión de cobranza</strong><p>Las unidades negativas detectadas hoy son la prioridad de trabajo.</p></div><div class="rym-d2-performance-stat"><b>${neg}</b><span>negativas detectadas</span><small>Este dato sirve como punto de partida de la gestión del día.</small></div></section>`;
    }
    if(isSupervisor()){
      const r=rows[0]||{name:'TU GALERA',paid:paid.units,amount:paid.amount,neg};
      const perfect=r.paid===0;
      return `<section class="rym-d2-performance is-result ${perfect?'is-perfect':''}"><div class="rym-d2-performance-intro"><span>RESULTADO DE GESTIÓN</span><strong>${perfect?'Excelente gestión':'Resultado del día'}</strong><p>${perfect?'Ninguna unidad terminó requiriendo pago. Este es el mejor resultado para la empresa.':'Menos unidades que terminan requiriendo pago representa mejor gestión para la empresa.'}</p></div><div class="rym-d2-performance-card"><span>${esc(r.name)}</span><strong>${r.paid} pagadas</strong><b>B/. ${money(r.amount)}</b><small>${r.neg||neg} negativas detectadas como contexto del día</small></div></section>`;
    }
    if(!rows.length)return '';
    const best=rows[0],worst=rows[rows.length-1];
    return `<section class="rym-d2-performance is-result"><div class="rym-d2-performance-intro"><span>RESULTADO DE GESTIÓN</span><strong>Rendimiento de cobranza</strong><p>Menos unidades que terminaron requiriendo pago representa mejor gestión para la empresa.</p></div><article class="rym-d2-perf-card best"><span>🏆 Mejor gestión</span><strong>${esc(best.name)}</strong><b>${best.paid} pagadas · B/. ${money(best.amount)}</b></article><article class="rym-d2-perf-card watch"><span>⚠ Mayor incidencia</span><strong>${esc(worst.name)}</strong><b>${worst.paid} pagadas · B/. ${money(worst.amount)}</b></article></section>`;
  }

  function sparkline(meta,color){
    const vals=meta.map(x=>x.units),max=Math.max(...vals,1),min=Math.min(...vals,0),span=Math.max(1,max-min);
    const pts=vals.map((v,i)=>`${(i/6*100).toFixed(1)},${(35-((v-min)/span)*27).toFixed(1)}`).join(' ');
    const id='g'+Math.random().toString(36).slice(2,8);
    const circles=vals.map((v,i)=>{const x=(i/6*100).toFixed(1),y=(35-((v-min)/span)*27).toFixed(1);return `<circle cx="${x}" cy="${y}" r="2.2" fill="${color}"/>`}).join('');
    return `<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".24"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><polygon points="0,39 ${pts} 100,39" fill="url(#${id})"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>${circles}</svg>`;
  }

  function chartMarkup(meta,color){
    const max=Math.max(...meta.map(x=>x.amount),1);
    const bars=meta.map(x=>{
      const height=x.amount>0?Math.max(14,Math.round(x.amount/max*100)):7;
      const units=`${x.units} ${x.units===1?'unidad':'unidades'}`;
      return `<div class="rym-d2-day" tabindex="0"><strong>${x.amount>0?money(x.amount):'—'}</strong><span class="rym-d2-bar"><i style="height:${height}%;background:${color}"></i></span><b>${esc(x.day)}</b><span class="rym-d2-tip"><em>${esc(dateLabel(x.date))}</em><strong>${x.amount>0?'B/. '+money(x.amount):'Sin pago'}</strong><small>${esc(units)}</small></span></div>`;
    }).join('');
    return `<div class="rym-d2-chart"><div class="rym-d2-spark">${sparkline(meta,color)}</div><div class="rym-d2-bars">${bars}</div></div>`;
  }

  function galeraCard(row,payRows,endDate,rank){
    const g=norm(row.galera),color=COLORS[g]||'#1677ff',meta=aggregateWindow(payRows,endDate,g),avgAmount=meta.reduce((a,x)=>a+x.amount,0)/7,avgUnits=meta.reduce((a,x)=>a+x.units,0)/7;
    const badge=rank?.best===g?'<span class="rym-d2-badge best">Mejor desempeño</span>':rank?.watch===g?'<span class="rym-d2-badge watch">Mayor incidencia</span>':'';
    return `<article class="rym-d2-galera" data-galera="${esc(g)}" style="--gal:${color}"><header><div><strong>${esc(g)}</strong>${badge}</div><span>HOY · ${esc(String(todayPanama()).slice(5))}</span></header><div class="rym-d2-metrics"><div><span>Unidades</span><strong>${nval(row.unidades)}</strong></div><div class="bad"><span>Negativos hoy</span><strong>${nval(row.negativos)}</strong><b>B/. ${money(Math.abs(nval(row.saldo_negativo)))}</b></div><div class="pay"><span>Requirieron pago</span><strong>${nval(row.unidades_pagadas)}</strong><b>B/. ${money(row.monto_pagado)}</b></div></div>${chartMarkup(meta,color)}<footer><span>Línea: unidades · Barras: monto</span><strong>Prom. B/. ${money(avgAmount)} · ${avgUnits.toFixed(1)} unid./día</strong><button type="button" data-open-gal="${esc(g)}">Ver galera →</button></footer></article>`;
  }

  function rankingMarkup(data){
    if(!isSupervisor())return '';
    const id=String(profile()?.supervisora_id||''),rows=data.rankingDay||[];
    const me=rows.find(x=>String(x.supervisora_id||'')===id)||rows.find(x=>norm(x.supervisora_nombre)===norm(displayName()).split(' ')[0]);
    const gal=norm(me?.galera||visibleGalRows(data)[0]?.galera||'');
    const same=rows.filter(x=>norm(x.galera)===gal).sort((a,b)=>nval(a.posicion_galera)-nval(b.posicion_galera));
    const shown=same.slice(0,7),mine=nval(me?.unidades_pagadas),amount=nval(me?.monto_pagado),neg=nval(visibleGalRows(data)[0]?.negativos),perfect=mine===0&&phase()==='pm';
    return `<section class="rym-d2-ranking"><header><div><span>RESULTADO DE GESTIÓN</span><h2>${esc(gal||'Tu galera')}</h2><p>Menos unidades pagadas representa mejor resultado. Los empates en cero son igualmente excelentes.</p></div></header><div class="rym-d2-ranking-hero ${perfect?'perfect':''}"><div><span>Tu resultado hoy</span><strong>${mine} pagadas</strong><small>${perfect?'Excelente: ninguna unidad necesitó pago.':'Resultado operativo del día.'}</small></div><div><b>${neg}</b><span>negativas detectadas</span></div><div><b>B/. ${money(amount)}</b><span>monto pagado</span></div></div><div class="rym-d2-ranking-list">${shown.map(x=>{const mineRow=String(x.supervisora_id||'')===String(me?.supervisora_id||''),zero=nval(x.unidades_pagadas)===0;return `<div class="rym-d2-rank-row ${mineRow?'me':''} ${zero?'zero':''}"><span class="pos">#${nval(x.posicion_galera)||'—'}</span><div><strong>${esc(x.supervisora_nombre||'')}</strong><small>${esc(x.galera||'')}</small></div><div class="value"><b>${nval(x.unidades_pagadas)} pagadas</b><small>B/. ${money(x.monto_pagado)}</small></div></div>`}).join('')}</div></section>`;
  }

  function rangeControl(endDate){
    return `<div class="rym-d2-range"><div><span>CORTE AL</span><strong data-range-caption>${esc(dateLabel(shiftDate(endDate,-6),true))} — ${esc(dateLabel(endDate,true))}</strong></div><button type="button" data-range-step="-1" aria-label="Día anterior">‹</button><label><span>Fecha</span><input type="date" value="${esc(endDate)}" max="${esc(todayPanama())}"></label><button type="button" data-range-step="1" aria-label="Día siguiente">›</button><button type="button" data-range-today>Hoy</button></div>`;
  }

  function galerasMarkup(data,payRows,endDate){
    const rows=visibleGalRows(data),ordered=[...rows].sort((a,b)=>nval(a.unidades_pagadas)-nval(b.unidades_pagadas)||nval(a.monto_pagado)-nval(b.monto_pagado));
    const rank=rows.length>1?{best:norm(ordered[0]?.galera),watch:norm(ordered[ordered.length-1]?.galera)}:{};
    return `<section class="rym-d2-galeras"><div class="rym-d2-section-head"><div><h2>${isSupervisor()?'Resumen de tu galera':'Resumen por galera'}</h2><p data-window-copy>Pagos de los 7 días que terminan el ${esc(dateLabel(endDate))}.</p></div>${rangeControl(endDate)}</div><div class="rym-d2-gal-grid ${rows.length===1?'one':''}">${rows.map(r=>galeraCard(r,payRows,endDate,rank)).join('')}</div>${rankingMarkup(data)}</section>`;
  }

  function skeleton(){
    return `<main class="rym-d2"><header class="rym-d2-header"><div><span class="rym-d2-eyebrow">PANAPASS</span><h1>Dashboard Panapass</h1><p>Preparando información operativa…</p></div></header><section class="rym-d2-loading"><span></span><span></span><span></span><span></span></section></main>`;
  }

  function bindDashboard(root,data){
    root.querySelectorAll('[data-action]').forEach(x=>{
      const key=x.dataset.action;
      if(key==='refresh')bindAction(x,()=>nativeDashboard(true));
      else bindAction(x,()=>action(key));
    });
    root.querySelectorAll('[data-open-gal]').forEach(x=>bindAction(x,()=>{try{if(typeof w.phase4OpenGalera==='function')w.phase4OpenGalera(x.dataset.openGal)}catch(e){console.warn(e)}}));
    const range=root.querySelector('.rym-d2-range'),input=range?.querySelector('input[type="date"]');
    if(range&&input){
      const apply=async end=>{
        const today=todayPanama();if(end>today)end=today;if(!/^\d{4}-\d{2}-\d{2}$/.test(end))return;
        input.value=end;range.classList.add('loading');
        try{
          const rows=await fetchWindow(end);
          const section=root.querySelector('.rym-d2-galeras');if(!section)return;
          const oldRank=section.querySelector('.rym-d2-ranking');
          const galRows=visibleGalRows(data),ordered=[...galRows].sort((a,b)=>nval(a.unidades_pagadas)-nval(b.unidades_pagadas)||nval(a.monto_pagado)-nval(b.monto_pagado));
          const rank=galRows.length>1?{best:norm(ordered[0]?.galera),watch:norm(ordered[ordered.length-1]?.galera)}:{};
          const grid=section.querySelector('.rym-d2-gal-grid');
          if(grid)grid.innerHTML=galRows.map(r=>galeraCard(r,rows,end,rank)).join('');
          const copy=section.querySelector('[data-window-copy]');if(copy)copy.textContent=`Pagos de los 7 días que terminan el ${dateLabel(end)}.`;
          const cap=section.querySelector('[data-range-caption]');if(cap)cap.textContent=`${dateLabel(shiftDate(end,-6),true)} — ${dateLabel(end,true)}`;
          section.querySelectorAll('[data-open-gal]').forEach(x=>bindAction(x,()=>{try{if(typeof w.phase4OpenGalera==='function')w.phase4OpenGalera(x.dataset.openGal)}catch(e){console.warn(e)}}));
          if(oldRank&&!section.querySelector('.rym-d2-ranking'))section.appendChild(oldRank);
          range.dataset.end=end;
          const next=range.querySelector('[data-range-step="1"]');if(next)next.disabled=end>=today;
          const todayBtn=range.querySelector('[data-range-today]');if(todayBtn)todayBtn.disabled=end===today;
        }catch(e){console.warn('Panapass date window',e)}finally{range.classList.remove('loading')}
      };
      range.dataset.end=input.value;
      input.onchange=()=>apply(input.value);
      range.querySelector('[data-range-step="-1"]')?.addEventListener('click',()=>apply(shiftDate(range.dataset.end||input.value,-1)));
      range.querySelector('[data-range-step="1"]')?.addEventListener('click',()=>apply(shiftDate(range.dataset.end||input.value,1)));
      range.querySelector('[data-range-today]')?.addEventListener('click',()=>apply(todayPanama()));
      const next=range.querySelector('[data-range-step="1"]');if(next)next.disabled=input.value>=todayPanama();
      const todayBtn=range.querySelector('[data-range-today]');if(todayBtn)todayBtn.disabled=input.value===todayPanama();
    }
  }

  async function renderNative(view,force=false){
    const token=++renderToken;
    d.body.classList.add('rym-panapass-dashboard-native');
    view.innerHTML=skeleton();
    d.body.classList.remove('rym-panapass-booting');
    try{
      const data=await loadData(force);if(token!==renderToken||!d.body.dataset.rymModule)return;
      const root=view.querySelector('.rym-d2');if(!root)return;
      root.innerHTML=headerMarkup(data)+topMarkup(data)+performanceMarkup(data)+galerasMarkup(data,data.pagos,data.hoy);
      bindDashboard(root,data);
    }catch(e){
      console.error('Panapass dashboard native',e);
      view.innerHTML=`<main class="rym-d2"><section class="rym-d2-error"><strong>No fue posible cargar el Dashboard Panapass.</strong><button type="button">Reintentar</button></section></main>`;
      bindAction(view.querySelector('.rym-d2-error button'),()=>nativeDashboard(true));
    }
  }

  function nativeDashboard(force=false){
    if(!supported()&&legacyDashboard)return legacyDashboard.apply(this,arguments);
    const view=d.querySelector('#view');if(!view)return null;
    return renderNative(view,force===true);
  }

  function install(){
    if(w.__RYM_PANAPASS_DASHBOARD_NATIVE_INSTALLED__)return true;
    if(typeof w.dashboard!=='function')return false;
    legacyDashboard=w.dashboard;
    w.dashboard=nativeDashboard;
    w.RYM_PANAPASS_DASHBOARD_V2=Object.freeze({dashboard:nativeDashboard,refresh:()=>nativeDashboard(true),original:legacyDashboard,native:true});
    w.__RYM_PANAPASS_DASHBOARD_NATIVE_INSTALLED__=true;
    return true;
  }

  if(!install()){
    installTimer=w.setInterval(()=>{if(install()&&installTimer){clearInterval(installTimer);installTimer=null}},50);
    w.setTimeout(()=>{if(installTimer){clearInterval(installTimer);installTimer=null}},15000);
  }
  d.addEventListener('DOMContentLoaded',install,{once:true});
})(window,document);
