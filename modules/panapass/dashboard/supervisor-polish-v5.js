/* Portal RYM · Panapass Supervisor Dashboard V5
   Supervisor semantics:
   - AM: collection in progress
   - PM: result stage, even when zero payments were required
   - PM + 0 paid is an excellent result, not missing activity */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_SUPERVISOR_V5__) return;
  w.__RYM_PANAPASS_SUPERVISOR_V5__=true;
  let raf=0;

  const txt=(node,sel)=>String(node?.querySelector(sel)?.textContent||'').trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function isPan(){return d.body?.dataset?.rymModule==='panapass'&&d.body?.classList.contains('rym-panapass-proposal2')}
  function phase(){return d.body?.dataset?.rymPanapassPhase||'am'}

  function galeraName(root){
    return txt(root,'.rym-p2-gal-name')||String(txt(root,'.galera-kpi-title h3').split('·').pop()||'Tu galera').trim();
  }

  function negatives(root){
    const n=Number(txt(root,'.rym-p2-galera .rym-gal-metric.bad b').replace(/[^0-9.-]/g,''));
    return Number.isFinite(n)?n:0;
  }

  function payments(root){
    const n=Number(txt(root,'.rym-p2-galera .rym-gal-metric.pay b').replace(/[^0-9.-]/g,''));
    return Number.isFinite(n)?n:0;
  }

  function titleBefore(panel){
    const prev=panel?.previousElementSibling;
    return prev?.classList?.contains('galera-kpi-title')?prev:null;
  }

  function captureOriginal(panel){
    if(!panel.__rymSupervisorOriginal) panel.__rymSupervisorOriginal=panel.innerHTML;
  }

  function restoreOriginal(panel){
    captureOriginal(panel);
    if(panel.dataset.p5Mode==='am') panel.innerHTML=panel.__rymSupervisorOriginal;
  }

  function renderAM(root,panel,title){
    const gal=galeraName(root),neg=negatives(root);
    captureOriginal(panel);
    panel.dataset.p5Mode='am';
    panel.className='rym-rank-panel rym-p5-rank-empty';
    panel.innerHTML=`<div class="rym-p5-empty-icon">◎</div><div class="rym-p5-empty-copy"><span>FASE AM</span><strong>Cobranza en curso</strong><p>Hoy se detectaron ${neg} unidades negativas. El resultado de desempeño se consolidará en PM, después de la gestión de cobranza.</p></div><div class="rym-p5-empty-metrics"><div><b>${neg}</b><span>negativas AM</span></div><div><b>—</b><span>resultado PM</span></div><small>${esc(gal)}</small></div>`;
    if(title){
      const h=title.querySelector('h3'),s=title.querySelector('span');
      if(h)h.textContent=`Gestión en curso · ${gal}`;
      if(s)s.textContent='La posición de rendimiento se evalúa en PM.';
    }
  }

  function renderPM(root,panel,title){
    const gal=galeraName(root),paid=payments(root),neg=negatives(root);
    restoreOriginal(panel);
    panel.dataset.p5Mode='pm';
    panel.className=`rym-rank-panel rym-p5-rank-live ${paid===0?'rym-p5-perfect':''}`;

    if(title){
      const h=title.querySelector('h3'),s=title.querySelector('span');
      if(h)h.textContent=`Rendimiento PM · ${gal}`;
      if(s)s.textContent=paid===0
        ?'Excelente resultado: ninguna unidad necesitó pago.'
        :'Menos unidades pagadas obtiene mejor posición.';
    }

    const hero=panel.querySelector('.rym-rank-hero');
    if(hero){
      let badge=hero.querySelector('.rym-p5-result-badge');
      if(!badge){badge=d.createElement('span');badge.className='rym-p5-result-badge';hero.appendChild(badge)}
      badge.className=`rym-p5-result-badge ${paid===0?'perfect':'standard'}`;
      badge.textContent=paid===0?'★ Gestión perfecta':'Resultado PM';
      const label=hero.querySelector('small');
      if(label)label.textContent=paid===0?'Resultado de hoy en tu galera':'Posición de hoy en tu galera';
      const value=hero.querySelector('b');
      if(value&&paid===0)value.textContent=`0 unidades pagadas · ${neg} negativas resueltas sin pago`;
    }

    const rows=[...panel.querySelectorAll('.rym-rank-row')];
    rows.forEach((row,i)=>{
      row.classList.toggle('rym-p5-first',i===0);
      const value=txt(row,'.rym-rank-value');
      if(/^0\s+pagadas/i.test(value)) row.classList.add('rym-p5-zero-paid');
      if(row.classList.contains('me')) row.setAttribute('aria-label','Tu posición actual');
    });
  }

  function run(){
    if(!isPan())return;
    const root=d.querySelector('#view #phase4GaleraKpis.rym-p2-galeras');
    const panel=root?.querySelector('.rym-rank-panel');
    if(!root||!panel)return;
    root.classList.add('rym-p5-supervisor-view');
    const title=titleBefore(panel);
    if(phase()==='pm') renderPM(root,panel,title);
    else renderAM(root,panel,title);
  }

  function schedule(){if(raf)return;raf=w.requestAnimationFrame(()=>{raf=0;run()})}
  const observer=new MutationObserver(schedule);
  observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-rym-module','data-rym-panapass-phase','data-p2-enhanced']});
  d.addEventListener('click',schedule,true);
  w.addEventListener('load',schedule,{once:true});
  schedule();
})(window,document);
