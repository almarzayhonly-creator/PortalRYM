/* Portal RYM · Panapass Dashboard UI V6
   Final presentation layer: hides internal AM/PM terminology, unifies sidebar,
   removes legacy flash, and makes supervisor performance outcome-centric. */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_UI_V6__) return;
  w.__RYM_PANAPASS_UI_V6__=true;
  let raf=0;

  const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toUpperCase();
  const txt=(node,sel)=>String(node?.querySelector(sel)?.textContent||'').trim();
  const num=s=>{const m=String(s||'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0};
  function role(){try{return norm(w.RYM_CONTEXT?.session?.()?.role||w.state?.profile?.rol||'')}catch(_){return norm(w.state?.profile?.rol||'')}}
  function isPan(){return d.body?.dataset?.rymModule==='panapass'}

  function cleanHeader(){
    const header=d.querySelector('#view .rym-p2-header');if(!header)return;
    header.querySelector('.rym-p3-phase-badge')?.remove();
    const subtitle=header.querySelector('p');
    if(subtitle)subtitle.textContent='Control de cobranza y rendimiento operativo en tiempo real';
    header.querySelectorAll('.rym-p5-result-badge').forEach(x=>{if(!x.closest('.rym-rank-hero'))x.remove()});
  }

  function cleanPerformanceCopy(){
    d.querySelectorAll('#view .rym-p3-phase-lead>span').forEach(x=>x.textContent='RENDIMIENTO OPERATIVO');
    d.querySelectorAll('#view .rym-p3-performance-strip').forEach(strip=>{
      strip.classList.remove('am','pm');
      const strong=strip.querySelector('.rym-p3-phase-lead>strong');
      const small=strip.querySelector('.rym-p3-phase-lead>small');
      if(strong&&/cobranza en curso/i.test(strong.textContent||''))strong.textContent='Gestión de cobranza';
      if(strong&&/rendimiento de cobranza|resultado de cobranza|excelente gestión/i.test(strong.textContent||''))strong.textContent='Resultado de gestión';
      if(small)small.textContent='Menos unidades que terminan requiriendo pago representa mejor gestión para la empresa.';
    });
  }

  function supervisorPerformance(){
    if(role()!=='SUPERVISORA')return;
    const root=d.querySelector('#view #phase4GaleraKpis.rym-p2-galeras');
    const panel=root?.querySelector('.rym-rank-panel');
    const card=root?.querySelector('.rym-p2-galera');
    if(!root||!panel||!card)return;
    const paid=num(txt(card,'.rym-gal-metric.pay b'));
    const paidAmount=num(txt(card,'.rym-gal-metric.pay small'));
    const negatives=num(txt(card,'.rym-gal-metric.bad b'));
    const gal=txt(card,'.rym-p2-gal-name')||'Tu galera';
    const rows=[...panel.querySelectorAll('.rym-rank-row')];
    const zeroCount=rows.filter(r=>/^0\s+pagadas/i.test(txt(r,'.rym-rank-value'))).length;
    const title=panel.previousElementSibling?.classList?.contains('galera-kpi-title')?panel.previousElementSibling:null;
    if(title){
      const h=title.querySelector('h3'),s=title.querySelector('span');
      if(h)h.textContent=`Resultado de gestión · ${gal}`;
      if(s)s.textContent='Compara cuántas unidades terminaron requiriendo pago; menos es mejor.';
    }
    const hero=panel.querySelector('.rym-rank-hero');
    if(hero){
      hero.classList.add('rym-p6-result-hero');
      hero.innerHTML=`<div class="rym-p6-result-main"><span>RESULTADO DE HOY</span><strong>${paid} pagadas</strong><small>${paid===0?'Excelente: ninguna unidad necesitó pago.':'Menos unidades pagadas significa mejor gestión.'}</small></div><div class="rym-p6-result-stats"><div><b>${negatives}</b><span>negativas detectadas</span></div><div><b>B/. ${paidAmount.toFixed(2)}</b><span>monto pagado</span></div><div><b>${zeroCount||'—'}</b><span>${zeroCount===1?'supervisora con 0 pagos':'supervisoras con 0 pagos'}</span></div></div>`;
    }
    rows.forEach(r=>{
      if(/^0\s+pagadas/i.test(txt(r,'.rym-rank-value')))r.classList.add('rym-p6-best-result');
    });
    panel.classList.add('rym-p6-performance');
  }

  function releaseBoot(){
    if(d.querySelector('#view .rym-p2-shell')&&d.querySelector('#view #phase4GaleraKpis.rym-p2-galeras')){
      d.body.classList.remove('rym-panapass-booting');
    }
  }

  function run(){
    if(!isPan())return;
    cleanHeader();cleanPerformanceCopy();supervisorPerformance();releaseBoot();
  }
  function schedule(){if(raf)return;raf=w.requestAnimationFrame(()=>{raf=0;run()})}
  const observer=new MutationObserver(schedule);
  observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-rym-module','data-p2-enhanced','data-rym-ready']});
  d.addEventListener('click',schedule,true);w.addEventListener('load',schedule,{once:true});schedule();
})(window,document);
