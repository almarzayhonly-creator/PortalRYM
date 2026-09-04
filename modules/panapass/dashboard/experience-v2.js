/* Portal RYM - Panapass Dashboard Proposal 2
   Progressive DOM enhancement over the existing dashboard data/rendering.
   Keeps existing business logic and click handlers while applying the approved visual composition. */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_PROPOSAL2__) return;
  w.__RYM_PANAPASS_PROPOSAL2__=true;

  const LABELS={active:'UNIDADES ACTIVAS',negatives:'NEGATIVOS HOY',paid:'REQUIRIERON PAGO',recurrent:'RECURRENTES',bajas:'BAJAS PANAPASS',noPan:'SIN PANAPASS'};
  const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toUpperCase();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const el=(tag,cls,html)=>{const x=d.createElement(tag);if(cls)x.className=cls;if(html!=null)x.innerHTML=html;return x};
  const txt=(node,sel)=>String(node?.querySelector(sel)?.textContent||'').trim();

  function purgeLegacyVisuals(){
    d.querySelector('#rym-admin-dash-style-v11')?.remove();
    d.body?.classList.remove('rym-panapass-command');
    const view=d.querySelector('#view');
    if(view){view.style.removeProperty('display');view.style.removeProperty('grid-template-columns');view.style.removeProperty('width');view.style.removeProperty('max-width')}
  }

  function cardMap(top){
    const out={};
    [...top.querySelectorAll('.rym-admin-kpi')].forEach(card=>{
      const label=norm(card.querySelector('.label')?.textContent);
      for(const [key,value] of Object.entries(LABELS)) if(label===value) out[key]=card;
    });
    return out;
  }

  function setCard(card,role){if(!card)return;card.className='rym-admin-kpi click rym-p2-card';card.dataset.p2Role=role}
  function todayLabel(){try{return new Intl.DateTimeFormat('es-PA',{timeZone:'America/Panama',weekday:'short',day:'2-digit',month:'short',year:'numeric'}).format(new Date())}catch(_){return 'Hoy'}}

  function sparkline(values,color){
    const vals=values.length?values:[0,0,0,0,0,0,0];
    const max=Math.max(...vals,1),min=Math.min(...vals,0),span=Math.max(1,max-min);
    const pts=vals.map((v,i)=>`${(i/(Math.max(1,vals.length-1))*100).toFixed(1)},${(34-((v-min)/span)*26).toFixed(1)}`).join(' ');
    const area=`0,38 ${pts} 100,38`;
    const id=`g${Math.random().toString(36).slice(2,8)}`;
    return `<svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#${id})"/><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function amountFromDay(day){
    const raw=txt(day,'b');
    if(/sin gesti/i.test(raw)) return 0;
    const m=raw.match(/-?\d+(?:[.,]\d+)?/);
    if(!m)return 0;
    const n=Number(m[0].replace(',','.'));
    return Number.isFinite(n)?n:0;
  }

  function enhanceTop(top){
    if(!top||top.dataset.p2Enhanced==='1'||top.dataset.rymReady!=='1')return false;
    const cards=cardMap(top),exec=top.querySelector('.rym-exec-strip');
    if(!cards.active||!cards.negatives||!cards.noPan||!cards.bajas||!cards.paid||!cards.recurrent||!exec)return false;
    purgeLegacyVisuals();

    setCard(cards.active,'active');setCard(cards.negatives,'negative');setCard(cards.noPan,'missing');setCard(cards.bajas,'bajas');setCard(cards.recurrent,'mini-recurrent');setCard(cards.paid,'mini-paid');

    const header=el('header','rym-p2-header');
    header.innerHTML=`<div><span class="rym-p2-eyebrow">PANAPASS</span><h1>Dashboard Panapass</h1><p>Control total de tu operación en tiempo real</p></div><div class="rym-p2-head-actions"><div class="rym-p2-date"><span>Hoy</span><strong>${todayLabel()}</strong><small>● Datos actualizados</small></div><button type="button" class="rym-p2-refresh">↻ <span>Actualizar</span></button></div>`;
    header.querySelector('.rym-p2-refresh').onclick=()=>{top.dataset.p2Enhanced='0';try{w.dashboard?.()}catch(_){w.location.reload()}};

    const hero=el('section','rym-p2-hero');
    const primary=el('div','rym-p2-primary-kpis');primary.append(cards.active,cards.negatives,cards.noPan,cards.bajas);
    const mini=el('div','rym-p2-mini-stack');mini.append(cards.recurrent,cards.paid);
    hero.append(primary,mini);

    const alert=el('section','rym-p2-alert');
    alert.innerHTML=`<div class="rym-p2-alert-head"><span class="rym-p2-alert-icon">!</span><div><strong>Requiere atención</strong><small>Hay 3 áreas que necesitan tu revisión inmediata.</small></div><button type="button">Ver detalles →</button></div><div class="rym-p2-alert-items"></div>`;
    const alertItems=alert.querySelector('.rym-p2-alert-items');
    [['negative',cards.negatives,'Negativos hoy'],['missing',cards.noPan,'Sin Panapass'],['bajas',cards.bajas,'Bajas Panapass']].forEach(([kind,card,label])=>{
      const item=el('button',`rym-p2-alert-item ${kind}`);item.type='button';item.innerHTML=`<b>${txt(card,'strong')}</b><span><strong>${label}</strong><small>${txt(card,'small')}</small></span><i>›</i>`;item.onclick=()=>card.click();alertItems.appendChild(item);
    });
    alert.querySelector('.rym-p2-alert-head>button').onclick=()=>cards.negatives.click();

    const payment=el('section','rym-p2-payment');
    const payStats=[...exec.querySelectorAll('.rym-exec-stat strong')];
    const payAvg=String(payStats[0]?.textContent||'—').trim();
    const payAmount=String(payStats[1]?.textContent||payStats.at(-1)?.textContent||'B/. —').trim();
    payment.innerHTML=`<div class="rym-p2-panel-title"><span>$</span><div><strong>Pagos de hoy</strong><small>Movimiento operativo del día</small></div></div><div class="rym-p2-payment-main"><div><strong>${esc(payAmount)}</strong><small>Monto pagado hoy</small></div><div class="rym-p2-mini-bars"><i style="height:28%"></i><i style="height:46%"></i><i style="height:38%"></i><i style="height:68%"></i><i style="height:54%"></i><i style="height:82%"></i><i style="height:64%"></i></div></div><div class="rym-p2-payment-foot"><span>Promedio 7 días</span><strong>${esc(payAvg)}</strong><button type="button">Ver detalle →</button></div>`;
    payment.querySelector('button').onclick=()=>cards.paid.click();

    const context=el('section','rym-p2-context');
    context.innerHTML=`<div class="rym-p2-panel-title"><span>▤</span><div><strong>Contexto</strong><small>Volumen de operación y recurrencia.</small></div></div><div class="rym-p2-context-grid"><button type="button"><span>Unidades activas</span><strong>${txt(cards.active,'strong')}</strong><small>${txt(cards.active,'small')}</small></button><button type="button"><span>Recurrentes</span><strong>${txt(cards.recurrent,'strong')}</strong><small>${txt(cards.recurrent,'small')}</small></button></div>`;
    const cb=context.querySelectorAll('button');cb[0].onclick=()=>cards.active.click();cb[1].onclick=()=>cards.recurrent.click();

    const mid=el('div','rym-p2-mid');mid.append(alert,payment,context);
    top.className='kpis rym-admin-kpis rym-p2-shell';
    top.replaceChildren(header,hero,mid);
    top.dataset.p2Enhanced='1';
    return true;
  }

  function enhanceGaleraCard(card,index){
    if(!card||card.dataset.p2Enhanced==='1')return;
    const metrics=card.querySelector('.rym-gal-metrics'),days=[...card.querySelectorAll('.rym-day')];
    if(!metrics||!days.length)return;

    const name=txt(card,'.rym-gal-name')||'GALERA';
    const today=txt(card,'.rym-gal-today')||'HOY';
    const rankNode=card.querySelector('.rym-gal-rank');
    const rank=String(rankNode?.textContent||'').trim();
    const rankClass=rankNode?.classList.contains('best')?'best':rankNode?.classList.contains('watch')?'watch':'';
    const palette=['#1570ef','#10a37f','#7c3aed','#f59e0b'];const color=palette[index%palette.length];
    const vals=days.map(amountFromDay),positive=vals.filter(v=>v>0),mean=positive.length?positive.reduce((a,b)=>a+b,0)/positive.length:0,max=Math.max(...vals,1);
    const bars=vals.map(v=>`<i style="height:${v>0?Math.max(18,Math.round((v/max)*100)):10}%"></i>`).join('');

    const topbar=el('div','rym-p2-gal-top');
    topbar.style.setProperty('--gal-color',color);
    topbar.innerHTML=`<div class="rym-p2-gal-identity"><strong class="rym-p2-gal-name">${esc(name)}</strong>${rank?`<span class="rym-p2-gal-status ${rankClass}">${esc(rank)}</span>`:''}</div><span class="rym-p2-gal-date">${esc(today)}</span><span class="rym-p2-gal-arrow">›</span>`;

    const visual=el('div','rym-p2-gal-visual');visual.innerHTML=`<div class="rym-p2-spark">${sparkline(vals,color)}</div><div class="rym-p2-bars" style="--gal-color:${color}">${bars}</div>`;
    const foot=el('div','rym-p2-gal-foot');foot.innerHTML=`<span>Tendencia · 7 días</span><strong>Promedio B/. ${mean.toFixed(2)}</strong><button type="button">Ver galera →</button>`;foot.querySelector('button').onclick=e=>{e.stopPropagation();card.click()};
    card.className='rym-gal-card rym-p2-galera';
    card.replaceChildren(topbar,metrics,visual,foot);card.style.setProperty('--gal-color',color);card.dataset.p2Enhanced='1';
  }

  function enhanceGalera(root){
    if(!root||root.dataset.p2Enhanced==='1'||root.dataset.rymReady!=='1')return false;
    purgeLegacyVisuals();
    const grid=root.querySelector('.galera-kpi-grid');if(!grid)return false;
    [...grid.querySelectorAll('.rym-gal-card')].forEach(enhanceGaleraCard);
    const heading=root.querySelector('.galera-kpi-title');
    if(heading){const h=heading.querySelector('h3'),s=heading.querySelector('span');if(h)h.textContent='Resumen por galera';if(s)s.textContent='Comparativo de volumen, incidencias y tendencia de 7 días.';const tabs=el('div','rym-p2-range','<button class="active">7 días</button><button>30 días</button><button>90 días</button>');heading.appendChild(tabs)}
    root.className='rym-admin-galeras rym-p2-galeras';root.dataset.p2Enhanced='1';return true;
  }

  function enhance(){
    const body=d.body,view=d.querySelector('#view'),isPan=body?.dataset?.rymModule==='panapass',top=view?.querySelector('.rym-admin-kpis'),gal=view?.querySelector('#phase4GaleraKpis');
    if(!isPan||!top||!gal){body?.classList.remove('rym-panapass-proposal2');return}

    /* Keep the styled legacy skeleton visible until both async data blocks are ready.
       Removing its stylesheet before hydration caused the raw CARGANDO screen flash. */
    if(top.dataset.rymReady!=='1'||gal.dataset.rymReady!=='1') return;

    purgeLegacyVisuals();
    const a=enhanceTop(top),b=enhanceGalera(gal);if(a||b||top.dataset.p2Enhanced==='1')body.classList.add('rym-panapass-proposal2');
  }

  let raf=0;function schedule(){if(raf)return;raf=w.requestAnimationFrame(()=>{raf=0;enhance()})}
  const observer=new MutationObserver(schedule);observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-rym-ready','data-rym-module']});
  d.addEventListener('click',schedule,true);w.addEventListener('load',schedule,{once:true});schedule();
})(window,document);
