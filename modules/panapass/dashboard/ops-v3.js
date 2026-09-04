/* Portal RYM · Panapass Dashboard Ops V3
   Adds business-phase intelligence (AM/PM), operational performance callouts,
   and compact 7/30/90-day historical chart controls on top of Proposal 2. */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_OPS_V3__) return;
  w.__RYM_PANAPASS_OPS_V3__=true;

  const rangeCache=new Map();
  let rankingPromise=null;
  let raf=0;

  const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toUpperCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const txt=(node,sel)=>String(node?.querySelector(sel)?.textContent||'').trim();
  const num=s=>{const m=String(s||'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0};
  const moneyNum=s=>{const m=String(s||'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0};

  function context(){return w.RYM_CONTEXT&&typeof w.RYM_CONTEXT.create==='function'?w.RYM_CONTEXT.create('panapass-dashboard-ops-v3'):null}
  function isPan(){return d.body?.dataset?.rymModule==='panapass'&&d.body?.classList.contains('rym-panapass-proposal2')}

  function panamaISO(){
    try{
      const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).reduce((a,x)=>(a[x.type]=x.value,a),{});
      return `${p.year}-${p.month}-${p.day}`;
    }catch(_){return new Date().toISOString().slice(0,10)}
  }
  function shiftISO(iso,days){
    const [y,m,day]=String(iso).split('-').map(Number),dt=new Date(Date.UTC(y,m-1,day+Number(days||0)));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;
  }
  function dayIndex(iso){return Math.floor(Date.parse(`${iso}T00:00:00Z`)/86400000)}
  function rangeLabel(iso,compact=false){
    try{
      const dt=new Date(`${iso}T12:00:00-05:00`);
      if(compact)return new Intl.DateTimeFormat('es-PA',{day:'2-digit',timeZone:'America/Panama'}).format(dt);
      return new Intl.DateTimeFormat('es-PA',{day:'2-digit',month:'short',timeZone:'America/Panama'}).format(dt).replace('.','').toUpperCase();
    }catch(_){return iso.slice(5)}
  }

  function cardKinds(top){
    const cards=[...top.querySelectorAll('.rym-p2-card')];
    cards.forEach(card=>{
      if(card.dataset.opsKind)return;
      const role=card.dataset.p2Role||'';
      if(role==='active')card.dataset.opsKind='active';
      else if(role==='negative')card.dataset.opsKind='negative';
      else if(role==='missing')card.dataset.opsKind='missing';
      else if(role==='bajas')card.dataset.opsKind='bajas';
      else if(role==='mini-recurrent')card.dataset.opsKind='recurrent';
      else if(role==='mini-paid')card.dataset.opsKind='paid';
      const label=card.querySelector('.label');
      const small=card.querySelector('small');
      if(label&&!card.dataset.opsLabel)card.dataset.opsLabel=label.textContent||'';
      if(small&&!card.dataset.opsSmall)card.dataset.opsSmall=small.textContent||'';
    });
    const out={};cards.forEach(c=>{if(c.dataset.opsKind)out[c.dataset.opsKind]=c});return out;
  }

  function phaseFrom(cards){return num(txt(cards.paid,'strong'))>0?'pm':'am'}

  function setPhaseBadge(header,phase){
    const left=header?.firstElementChild;if(!left)return;
    let badge=left.querySelector('.rym-p3-phase-badge');
    if(!badge){badge=d.createElement('span');badge.className='rym-p3-phase-badge';left.querySelector('.rym-p2-eyebrow')?.insertAdjacentElement('afterend',badge)}
    badge.className=`rym-p3-phase-badge ${phase}`;
    badge.textContent=phase==='pm'?'CIERRE PM':'FASE AM';
  }

  function applyPhase(top){
    if(!top)return null;
    const cards=cardKinds(top),primary=top.querySelector('.rym-p2-primary-kpis'),mini=top.querySelector('.rym-p2-mini-stack'),header=top.querySelector('.rym-p2-header');
    if(!cards.active||!cards.negative||!cards.paid||!cards.missing||!cards.bajas||!cards.recurrent||!primary||!mini)return null;
    const phase=phaseFrom(cards);top.dataset.opsPhase=phase;d.body.dataset.rymPanapassPhase=phase;
    setPhaseBadge(header,phase);
    const subtitle=header?.querySelector('p');
    const negLabel=cards.negative.querySelector('.label'),negSmall=cards.negative.querySelector('small');

    if(phase==='pm'){
      cards.paid.dataset.p2Role='paid-primary';
      cards.negative.dataset.p2Role='mini-negative';
      if(negLabel)negLabel.textContent='Negativos AM';
      if(negSmall)negSmall.textContent='Referencia del inicio del día';
      primary.append(cards.active,cards.paid,cards.missing,cards.bajas);
      mini.append(cards.recurrent,cards.negative);
      if(subtitle)subtitle.textContent='Cierre PM · compara pagos y rendimiento de gestión';
      const alert=top.querySelector('.rym-p2-alert');
      if(alert){
        alert.classList.add('is-pm');
        const title=alert.querySelector('.rym-p2-alert-head>div>strong'),small=alert.querySelector('.rym-p2-alert-head>div>small'),button=alert.querySelector('.rym-p2-alert-head>button');
        if(title)title.textContent='Pendientes secundarios';
        if(small)small.textContent='Con pagos registrados, los negativos AM quedan solo como referencia del día.';
        alert.querySelector('.rym-p2-alert-item.negative')?.classList.add('ops-hidden');
        if(button){button.textContent='Ver bajas →';button.onclick=()=>cards.bajas.click()}
      }
    }else{
      cards.paid.dataset.p2Role='mini-paid';
      cards.negative.dataset.p2Role='negative';
      if(negLabel)negLabel.textContent=cards.negative.dataset.opsLabel||'Negativos hoy';
      if(negSmall)negSmall.textContent=cards.negative.dataset.opsSmall||'Punto de partida';
      primary.append(cards.active,cards.negative,cards.missing,cards.bajas);
      mini.append(cards.recurrent,cards.paid);
      if(subtitle)subtitle.textContent='Fase AM · consulta ENA y gestión de cobro en curso';
      const alert=top.querySelector('.rym-p2-alert');
      if(alert){
        alert.classList.remove('is-pm');
        const title=alert.querySelector('.rym-p2-alert-head>div>strong'),small=alert.querySelector('.rym-p2-alert-head>div>small'),button=alert.querySelector('.rym-p2-alert-head>button');
        if(title)title.textContent='Requiere atención';
        if(small)small.textContent='Las unidades negativas detectadas en la mañana son la prioridad de cobro.';
        alert.querySelector('.rym-p2-alert-item.negative')?.classList.remove('ops-hidden');
        if(button){button.textContent='Ver detalles →';button.onclick=()=>cards.negative.click()}
      }
    }
    return {phase,cards};
  }

  function galeraPerformance(root){
    const rows=[...root.querySelectorAll('.rym-p2-galera')].map(card=>({
      card,
      name:txt(card,'.rym-p2-gal-name')||'GALERA',
      paid:num(txt(card,'.rym-gal-metric.pay b')),
      amount:moneyNum(txt(card,'.rym-gal-metric.pay small'))
    })).filter(x=>x.name);
    if(!rows.length)return {rows,best:null,worst:null};
    rows.sort((a,b)=>a.paid-b.paid||a.amount-b.amount||a.name.localeCompare(b.name));
    return {rows,best:rows[0],worst:rows[rows.length-1]};
  }

  async function hydrateSupervisorPerformance(strip){
    if(!strip||strip.dataset.supLoaded==='1'||strip.dataset.supLoading==='1')return;
    strip.dataset.supLoading='1';
    try{
      const c=context();if(!c?.api?.panapass?.ranking)return;
      if(!rankingPromise)rankingPromise=Promise.resolve(c.api.panapass.ranking('DIA')).catch(e=>{rankingPromise=null;throw e});
      const rows=await rankingPromise;if(!Array.isArray(rows)||!rows.length)return;
      const sorted=[...rows].sort((a,b)=>Number(a.posicion_global||999)-Number(b.posicion_global||999)||Number(a.unidades_pagadas||0)-Number(b.unidades_pagadas||0));
      const best=sorted[0],worst=[...sorted].sort((a,b)=>Number(b.posicion_global||0)-Number(a.posicion_global||0)||Number(b.unidades_pagadas||0)-Number(a.unidades_pagadas||0))[0];
      const bestEl=strip.querySelector('[data-ops-best-sup]'),worstEl=strip.querySelector('[data-ops-worst-sup]');
      if(bestEl&&best)bestEl.textContent=`Supervisora: ${best.supervisora_nombre||'—'} · ${Number(best.unidades_pagadas||0)} pagadas`;
      if(worstEl&&worst)worstEl.textContent=`Supervisora: ${worst.supervisora_nombre||'—'} · ${Number(worst.unidades_pagadas||0)} pagadas`;
      strip.dataset.supLoaded='1';
    }catch(e){console.warn('Panapass PM ranking',e)}finally{delete strip.dataset.supLoading}
  }

  function renderPerformanceStrip(top,root,phaseInfo){
    if(!top||!root||!phaseInfo)return;
    let strip=top.querySelector('.rym-p3-performance-strip');
    if(!strip){strip=d.createElement('section');top.querySelector('.rym-p2-hero')?.insertAdjacentElement('afterend',strip)}
    const {phase,cards}=phaseInfo;
    if(phase==='am'){
      const negatives=num(txt(cards.negative,'strong'));
      strip.className='rym-p3-performance-strip am';
      strip.innerHTML=`<div class="rym-p3-phase-lead"><span>FASE AM</span><strong>Cobranza en curso</strong><small>La prioridad es resolver las unidades negativas detectadas por ENA hoy.</small></div><div class="rym-p3-am-metric"><b>${negatives}</b><span>negativas detectadas</span><small>Este dato pertenece al día de hoy; no se arrastra como rendimiento histórico.</small></div>`;
      return;
    }
    const perf=galeraPerformance(root);if(!perf.best||!perf.worst)return;
    strip.className='rym-p3-performance-strip pm';
    strip.innerHTML=`<div class="rym-p3-phase-lead"><span>CIERRE PM</span><strong>Rendimiento de cobranza</strong><small>Menos unidades que requirieron pago = mejor gestión y menor incidencia de pago.</small></div><article class="rym-p3-perf-card best"><span>🏆 Mejor gestión</span><strong>${esc(perf.best.name)}</strong><b>${perf.best.paid} pagadas · B/. ${perf.best.amount.toFixed(2)}</b><small data-ops-best-sup>Calculando mejor supervisora…</small></article><article class="rym-p3-perf-card worst"><span>⚠ Mayor incidencia</span><strong>${esc(perf.worst.name)}</strong><b>${perf.worst.paid} pagadas · B/. ${perf.worst.amount.toFixed(2)}</b><small data-ops-worst-sup>Calculando supervisora con mayor incidencia…</small></article>`;
    void hydrateSupervisorPerformance(strip);
  }

  function snapshotSeven(card){
    if(card.__rymOpsSeven)return;
    const spark=card.querySelector('.rym-p2-spark'),bars=card.querySelector('.rym-p2-bars'),foot=card.querySelector('.rym-p2-gal-foot');
    card.__rymOpsSeven={spark:spark?.innerHTML||'',bars:bars?.innerHTML||'',label:foot?.querySelector('span')?.textContent||'Tendencia · 7 días',avg:foot?.querySelector('strong')?.textContent||''};
  }

  function bindChartInteraction(card){
    const bars=[...card.querySelectorAll('.rym-p2-bar-day')],points=[...card.querySelectorAll('.rym-p2-spark-point')];
    const clear=()=>{bars.forEach(x=>x.classList.remove('active'));points.forEach(x=>x.classList.remove('active'))};
    const activate=i=>{clear();bars[i]?.classList.add('active');points[i]?.classList.add('active')};
    bars.forEach((bar,i)=>{bar.onmouseenter=()=>activate(i);bar.onmouseleave=clear;bar.onfocus=()=>activate(i);bar.onblur=clear});
  }

  function chartSpark(values,color){
    const vals=values.length?values:[0],max=Math.max(...vals,1),min=Math.min(...vals,0),span=Math.max(1,max-min);
    const coords=vals.map((v,i)=>({x:Number((i/(Math.max(1,vals.length-1))*100).toFixed(1)),y:Number((34-((v-min)/span)*26).toFixed(1))}));
    const pts=coords.map(p=>`${p.x},${p.y}`).join(' '),area=`0,38 ${pts} 100,38`,id=`p3${Math.random().toString(36).slice(2,8)}`;
    const points=coords.map((p,i)=>`<circle class="rym-p2-spark-point" data-p2-point="${i}" cx="${p.x}" cy="${p.y}" r="2.3" fill="${color}"/>`).join('');
    return `<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#${id})"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${points}</svg>`;
  }

  function buildBars(meta,range,max){
    return meta.map((x,i)=>{
      const unitsLabel=`${x.units||0} ${(x.units||0)===1?'unidad':'unidades'}`;
      const showAmount=range!==90;
      return `<div class="rym-p2-bar-day rym-p3-range-bar" data-p2-day="${i}" tabindex="0" aria-label="${esc(`${x.detail||x.day}: B/. ${Number(x.value||0).toFixed(2)}, ${unitsLabel}`)}"><strong class="${showAmount?'':'range-hidden-amount'}">${showAmount?Number(x.value||0).toFixed(2):''}</strong><span class="rym-p2-bar-track"><i style="height:${x.value>0?Math.max(14,Math.round((x.value/max)*100)):7}%"></i></span><span class="rym-p2-bar-label">${esc(x.day||'—')}</span><span class="rym-p2-bar-tooltip"><b>${esc(x.detail||x.day||'Periodo')}</b><em>B/. ${Number(x.value||0).toFixed(2)}</em><small>${esc(unitsLabel)}</small></span></div>`;
    }).join('');
  }

  function renderRangeCard(card,meta,range){
    const spark=card.querySelector('.rym-p2-spark'),bars=card.querySelector('.rym-p2-bars'),foot=card.querySelector('.rym-p2-gal-foot');if(!spark||!bars||!foot)return;
    const color=card.style.getPropertyValue('--gal-color').trim()||'#1677ff',vals=meta.map(x=>Number(x.value||0)),max=Math.max(...vals,1),avg=meta.length?vals.reduce((a,b)=>a+b,0)/meta.length:0;
    spark.innerHTML=chartSpark(vals,color);
    bars.className=`rym-p2-bars rym-p3-range-bars range-${range}`;
    bars.style.gridTemplateColumns=`repeat(${Math.max(1,meta.length)},minmax(0,1fr))`;
    bars.innerHTML=buildBars(meta,range,max);
    const label=foot.querySelector('span'),avgEl=foot.querySelector('strong');
    if(label)label.textContent=range===7?'Tendencia · 7 días':`Tendencia · ${range} días · agrupado por semana`;
    if(avgEl)avgEl.textContent=range===7?`Promedio B/. ${avg.toFixed(2)}`:`Promedio semanal B/. ${avg.toFixed(2)}`;
    bindChartInteraction(card);
  }

  function restoreSeven(card){
    snapshotSeven(card);const s=card.__rymOpsSeven,spark=card.querySelector('.rym-p2-spark'),bars=card.querySelector('.rym-p2-bars'),foot=card.querySelector('.rym-p2-gal-foot');if(!s||!spark||!bars||!foot)return;
    spark.innerHTML=s.spark;bars.className='rym-p2-bars';bars.removeAttribute('style');bars.innerHTML=s.bars;
    const label=foot.querySelector('span'),avg=foot.querySelector('strong');if(label)label.textContent=s.label;if(avg)avg.textContent=s.avg;bindChartInteraction(card);
  }

  async function fetchRange(days){
    if(rangeCache.has(days))return rangeCache.get(days);
    const c=context();if(!c?.api?.call)throw new Error('Contexto Panapass no disponible');
    const hasta=panamaISO(),desde=shiftISO(hasta,-(days-1));
    const p=Promise.resolve(c.api.call('panapass_reporte_pagos_rango',{p_desde:desde,p_hasta:hasta,p_galera:null})).then(rows=>Array.isArray(rows)?rows:[]);
    rangeCache.set(days,p);try{return await p}catch(e){rangeCache.delete(days);throw e}
  }

  function weeklyMeta(rows,days,galera){
    const hasta=panamaISO(),desde=shiftISO(hasta,-(days-1)),startIndex=dayIndex(desde),count=Math.ceil(days/7);
    const buckets=Array.from({length:count},(_,i)=>{const start=shiftISO(desde,i*7),end=shiftISO(start,Math.min(6,days-1-i*7));return {start,end,value:0,units:new Set()}});
    for(const r of rows||[]){
      if(norm(r.galera)!==norm(galera))continue;
      const fecha=String(r.fecha||'').slice(0,10);if(!fecha)continue;
      const idx=Math.floor((dayIndex(fecha)-startIndex)/7);if(idx<0||idx>=buckets.length)continue;
      buckets[idx].value+=Number(r.a_pagar||0);if(r.unidad)buckets[idx].units.add(norm(r.unidad));
    }
    return buckets.map((b,i)=>({day:days===90?(i%2===0?rangeLabel(b.start,true):''):rangeLabel(b.start,false),detail:`${rangeLabel(b.start,false)} – ${rangeLabel(b.end,false)}`,value:b.value,units:b.units.size}));
  }

  async function setRange(root,range,button){
    const buttons=[...root.querySelectorAll('.rym-p2-range button')];buttons.forEach(b=>b.classList.toggle('active',b===button));
    const heading=root.querySelector('.galera-kpi-title>div>span')||root.querySelector('.galera-kpi-title span');
    const cards=[...root.querySelectorAll('.rym-p2-galera')];cards.forEach(snapshotSeven);
    if(range===7){cards.forEach(restoreSeven);if(heading)heading.textContent='Comparativo de volumen, incidencias y tendencia de 7 días.';return}
    root.classList.add('rym-p3-range-loading');buttons.forEach(b=>b.disabled=true);
    try{
      const rows=await fetchRange(range);
      cards.forEach(card=>renderRangeCard(card,weeklyMeta(rows,range,txt(card,'.rym-p2-gal-name')),range));
      if(heading)heading.textContent=range===30?'Histórico de pagos · 30 días agrupados por semana.':'Histórico de pagos · 90 días resumidos en 13 semanas.';
      root.querySelector('.rym-p3-range-error')?.remove();
    }catch(e){
      console.warn('Panapass historical range',e);
      let note=root.querySelector('.rym-p3-range-error');if(!note){note=d.createElement('div');note.className='rym-p3-range-error';root.querySelector('.galera-kpi-title')?.insertAdjacentElement('afterend',note)}
      note.textContent='El histórico ampliado no está disponible para este perfil. La vista de 7 días sigue activa.';
      cards.forEach(restoreSeven);buttons.forEach(b=>b.classList.toggle('active',String(b.dataset.range)==='7'));
    }finally{root.classList.remove('rym-p3-range-loading');buttons.forEach(b=>b.disabled=false)}
  }

  function bindRanges(root){
    if(!root||root.dataset.opsRanges==='1')return;
    const buttons=[...root.querySelectorAll('.rym-p2-range button')];if(buttons.length<3)return;
    [7,30,90].forEach((range,i)=>{const b=buttons[i];b.dataset.range=String(range);b.onclick=e=>{e.preventDefault();e.stopPropagation();void setRange(root,range,b)}});
    [...root.querySelectorAll('.rym-p2-galera')].forEach(snapshotSeven);
    root.dataset.opsRanges='1';
  }

  function run(){
    if(!isPan())return;
    const view=d.querySelector('#view'),top=view?.querySelector('.rym-p2-shell'),root=view?.querySelector('#phase4GaleraKpis.rym-p2-galeras');if(!top||!root)return;
    const phaseInfo=applyPhase(top);renderPerformanceStrip(top,root,phaseInfo);bindRanges(root);
  }

  function schedule(){if(raf)return;raf=w.requestAnimationFrame(()=>{raf=0;run()})}
  const observer=new MutationObserver(schedule);observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-rym-module','data-p2-enhanced']});
  d.addEventListener('click',schedule,true);w.addEventListener('load',schedule,{once:true});schedule();
})(window,document);
