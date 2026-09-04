/* Portal RYM · Panapass Dashboard Date Window V4
   Replaces 7/30/90 controls with one operational date selector.
   The selected date is the end of a rolling 7-day window. */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_DATE_WINDOW_V4__) return;
  w.__RYM_PANAPASS_DATE_WINDOW_V4__=true;

  const cache=new Map();
  let raf=0;
  const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toUpperCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const txt=(node,sel)=>String(node?.querySelector(sel)?.textContent||'').trim();

  function context(){return w.RYM_CONTEXT&&typeof w.RYM_CONTEXT.create==='function'?w.RYM_CONTEXT.create('panapass-dashboard-date-v4'):null}
  function isPan(){return d.body?.dataset?.rymModule==='panapass'&&d.body?.classList.contains('rym-panapass-proposal2')}

  function panamaISO(){
    try{
      const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).reduce((a,x)=>(a[x.type]=x.value,a),{});
      return `${parts.year}-${parts.month}-${parts.day}`;
    }catch(_){return new Date().toISOString().slice(0,10)}
  }
  function shiftISO(iso,days){
    const [y,m,day]=String(iso).split('-').map(Number),dt=new Date(Date.UTC(y,m-1,day+Number(days||0)));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;
  }
  function labelDate(iso,short=false){
    try{
      const dt=new Date(`${iso}T12:00:00-05:00`);
      return new Intl.DateTimeFormat('es-PA',short?{day:'2-digit',month:'short',timeZone:'America/Panama'}:{weekday:'short',day:'2-digit',month:'short',year:'numeric',timeZone:'America/Panama'}).format(dt).replace('.','');
    }catch(_){return iso}
  }
  function dayLabel(iso){
    try{return new Intl.DateTimeFormat('es-PA',{weekday:'short',timeZone:'America/Panama'}).format(new Date(`${iso}T12:00:00-05:00`)).replace('.','').slice(0,3).toUpperCase()}catch(_){return iso.slice(8)}
  }

  async function fetchWindow(endDate){
    const startDate=shiftISO(endDate,-6),key=`${startDate}:${endDate}`;
    if(cache.has(key))return cache.get(key);
    const c=context();if(!c?.api?.call)throw new Error('Contexto Panapass no disponible');
    const p=Promise.resolve(c.api.call('panapass_reporte_pagos_rango',{p_desde:startDate,p_hasta:endDate,p_galera:null})).then(rows=>Array.isArray(rows)?rows:[]);
    cache.set(key,p);
    try{return await p}catch(e){cache.delete(key);throw e}
  }

  function aggregate(rows,endDate,galera){
    const startDate=shiftISO(endDate,-6);
    const dates=Array.from({length:7},(_,i)=>shiftISO(startDate,i));
    const map=new Map(dates.map(date=>[date,{date,amount:0,units:new Set()}]));
    for(const row of rows||[]){
      if(norm(row.galera)!==norm(galera))continue;
      const date=String(row.fecha||'').slice(0,10),bucket=map.get(date);if(!bucket)continue;
      bucket.amount+=Number(row.a_pagar||0);
      if(row.unidad)bucket.units.add(norm(row.unidad));
    }
    return dates.map(date=>({date,day:dayLabel(date),amount:map.get(date).amount,units:map.get(date).units.size}));
  }

  function sparkline(values,color){
    const vals=values.length?values:[0,0,0,0,0,0,0],max=Math.max(...vals,1),min=Math.min(...vals,0),span=Math.max(1,max-min);
    const coords=vals.map((v,i)=>({x:Number((i/(Math.max(1,vals.length-1))*100).toFixed(1)),y:Number((34-((v-min)/span)*26).toFixed(1))}));
    const pts=coords.map(p=>`${p.x},${p.y}`).join(' '),area=`0,38 ${pts} 100,38`,id=`dw${Math.random().toString(36).slice(2,8)}`;
    const points=coords.map((p,i)=>`<circle class="rym-p2-spark-point" data-p2-point="${i}" cx="${p.x}" cy="${p.y}" r="2.3" fill="${color}"/>`).join('');
    return `<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#${id})"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${points}</svg>`;
  }

  function bindInteraction(card){
    const bars=[...card.querySelectorAll('.rym-p2-bar-day')],points=[...card.querySelectorAll('.rym-p2-spark-point')];
    const clear=()=>{bars.forEach(x=>x.classList.remove('active'));points.forEach(x=>x.classList.remove('active'))};
    const activate=i=>{clear();bars[i]?.classList.add('active');points[i]?.classList.add('active')};
    bars.forEach((bar,i)=>{bar.onmouseenter=()=>activate(i);bar.onmouseleave=clear;bar.onfocus=()=>activate(i);bar.onblur=clear});
  }

  function renderCard(card,meta){
    const spark=card.querySelector('.rym-p2-spark'),bars=card.querySelector('.rym-p2-bars'),foot=card.querySelector('.rym-p2-gal-foot');if(!spark||!bars||!foot)return;
    const color=card.style.getPropertyValue('--gal-color').trim()||'#1677ff';
    const maxAmount=Math.max(...meta.map(x=>x.amount),1),avgAmount=meta.reduce((a,x)=>a+x.amount,0)/7,avgUnits=meta.reduce((a,x)=>a+x.units,0)/7;
    spark.innerHTML=sparkline(meta.map(x=>x.units),color);
    bars.className='rym-p2-bars rym-p4-date-bars';
    bars.style.gridTemplateColumns='repeat(7,minmax(0,1fr))';
    bars.innerHTML=meta.map((x,i)=>{
      const unitsLabel=`${x.units} ${x.units===1?'unidad':'unidades'}`;
      return `<div class="rym-p2-bar-day rym-p4-date-bar" data-p2-day="${i}" tabindex="0" aria-label="${esc(`${labelDate(x.date)}: B/. ${x.amount.toFixed(2)}, ${unitsLabel}`)}"><strong>${x.amount>0?x.amount.toFixed(2):'—'}</strong><span class="rym-p2-bar-track"><i style="height:${x.amount>0?Math.max(16,Math.round((x.amount/maxAmount)*100)):8}%"></i></span><span class="rym-p2-bar-label">${esc(x.day)}</span><span class="rym-p2-bar-tooltip"><b>${esc(labelDate(x.date))}</b><em>${x.amount>0?`B/. ${x.amount.toFixed(2)}`:'Sin pago'}</em><small>${esc(unitsLabel)}</small></span></div>`;
    }).join('');
    const label=foot.querySelector('span'),avg=foot.querySelector('strong');
    if(label)label.textContent='Línea: unidades · Barras: monto';
    if(avg)avg.textContent=`Prom. B/. ${avgAmount.toFixed(2)} · ${avgUnits.toFixed(1)} unid./día`;
    bindInteraction(card);
  }

  async function applyDate(root,endDate){
    const today=panamaISO();if(!/^\d{4}-\d{2}-\d{2}$/.test(endDate))return;
    if(endDate>today)endDate=today;
    root.dataset.selectedEnd=endDate;
    const control=root.querySelector('.rym-p4-date-window'),input=control?.querySelector('input[type="date"]'),prev=control?.querySelector('[data-step="-1"]'),next=control?.querySelector('[data-step="1"]'),todayBtn=control?.querySelector('[data-today]'),caption=control?.querySelector('.rym-p4-window-caption');
    if(input){input.max=today;input.value=endDate;input.disabled=true}
    if(prev)prev.disabled=true;if(next)next.disabled=true;if(todayBtn)todayBtn.disabled=true;
    root.classList.add('rym-p4-window-loading');
    const startDate=shiftISO(endDate,-6);
    if(caption)caption.textContent=`${labelDate(startDate,true)} — ${labelDate(endDate,true)}`;
    const headingText=root.querySelector('.galera-kpi-title>div>span')||root.querySelector('.galera-kpi-title span');
    if(headingText)headingText.textContent=`Pagos de los 7 días que terminan el ${labelDate(endDate)}.`;
    try{
      const rows=await fetchWindow(endDate);
      [...root.querySelectorAll('.rym-p2-galera')].forEach(card=>renderCard(card,aggregate(rows,endDate,txt(card,'.rym-p2-gal-name'))));
      root.querySelector('.rym-p4-date-error')?.remove();
    }catch(e){
      console.warn('Panapass date window',e);
      let note=root.querySelector('.rym-p4-date-error');if(!note){note=d.createElement('div');note.className='rym-p4-date-error';root.querySelector('.galera-kpi-title')?.insertAdjacentElement('afterend',note)}
      note.textContent='No fue posible consultar esa ventana de 7 días. Intenta otra fecha.';
    }finally{
      root.classList.remove('rym-p4-window-loading');
      if(input)input.disabled=false;if(prev)prev.disabled=false;if(next)next.disabled=endDate>=today;if(todayBtn)todayBtn.disabled=endDate===today;
    }
  }

  function createControl(root,range){
    if(!range)return;
    range.className='rym-p4-date-window';
    range.innerHTML=`<div class="rym-p4-date-copy"><span>Corte al</span><strong class="rym-p4-window-caption">7 días</strong></div><button type="button" class="rym-p4-date-step" data-step="-1" aria-label="Día anterior">‹</button><label class="rym-p4-date-input"><span>Fecha</span><input type="date"/></label><button type="button" class="rym-p4-date-step" data-step="1" aria-label="Día siguiente">›</button><button type="button" class="rym-p4-today" data-today>Hoy</button>`;
    const input=range.querySelector('input'),prev=range.querySelector('[data-step="-1"]'),next=range.querySelector('[data-step="1"]'),todayBtn=range.querySelector('[data-today]');
    const today=panamaISO();input.max=today;input.value=root.dataset.selectedEnd||today;
    input.onchange=()=>void applyDate(root,input.value||today);
    prev.onclick=()=>void applyDate(root,shiftISO(root.dataset.selectedEnd||input.value||today,-1));
    next.onclick=()=>void applyDate(root,shiftISO(root.dataset.selectedEnd||input.value||today,1));
    todayBtn.onclick=()=>void applyDate(root,today);
    root.dataset.dateWindowBound='1';
    void applyDate(root,input.value);
  }

  function run(){
    if(!isPan())return;
    const root=d.querySelector('#view #phase4GaleraKpis.rym-p2-galeras');if(!root)return;
    const range=root.querySelector('.rym-p2-range,.rym-p4-date-window');if(!range)return;
    if(range.classList.contains('rym-p4-date-window')&&root.dataset.dateWindowBound==='1')return;
    createControl(root,range);
  }

  function schedule(){if(raf)return;raf=w.requestAnimationFrame(()=>{raf=0;run()})}
  const observer=new MutationObserver(schedule);observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-rym-module','data-p2-enhanced']});
  d.addEventListener('click',schedule,true);w.addEventListener('load',schedule,{once:true});schedule();
})(window,document);
