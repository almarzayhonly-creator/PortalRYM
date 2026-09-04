/* Portal RYM · Panapass Supervisor Dashboard V5
   Makes supervisor ranking truthful and polished:
   - no-pay day: neutral empty state, no misleading positions
   - with payments: styled live ranking */
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

  function renderWaiting(root,panel,title){
    const gal=galeraName(root),neg=negatives(root);
    if(!panel.__rymSupervisorOriginal) panel.__rymSupervisorOriginal=panel.innerHTML;
    panel.className='rym-rank-panel rym-p5-rank-empty';
    panel.innerHTML=`<div class="rym-p5-empty-icon">◎</div><div class="rym-p5-empty-copy"><span>RENDIMIENTO DE HOY</span><strong>Sin pagos gestionados todavía</strong><p>El ranking no es representativo mientras las supervisoras permanezcan en 0 pagadas. Cuando se registre gestión de pago, aquí aparecerán las posiciones reales.</p></div><div class="rym-p5-empty-metrics"><div><b>${neg}</b><span>negativas detectadas</span></div><div><b>0</b><span>pagadas hoy</span></div><small>${esc(gal)}</small></div>`;
    if(title){
      const h=title.querySelector('h3'),s=title.querySelector('span');
      if(h)h.textContent=`Rendimiento de hoy · ${gal}`;
      if(s)s.textContent='La prioridad sigue siendo la cobranza; el ranking aparece cuando existan pagos.';
    }
  }

  function renderLive(root,panel,title){
    const gal=galeraName(root);
    if(panel.classList.contains('rym-p5-rank-empty')&&panel.__rymSupervisorOriginal){
      panel.innerHTML=panel.__rymSupervisorOriginal;
    }
    panel.className='rym-rank-panel rym-p5-rank-live';
    if(title){
      const h=title.querySelector('h3'),s=title.querySelector('span');
      if(h)h.textContent=`Tu ranking · ${gal}`;
      if(s)s.textContent='Menos unidades pagadas obtiene mejor posición.';
    }
    const rows=[...panel.querySelectorAll('.rym-rank-row')];
    rows.forEach((row,i)=>{
      row.classList.toggle('rym-p5-first',i===0);
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
    const paid=payments(root);
    if(phase()==='am'||paid===0) renderWaiting(root,panel,title);
    else renderLive(root,panel,title);
  }

  function schedule(){if(raf)return;raf=w.requestAnimationFrame(()=>{raf=0;run()})}
  const observer=new MutationObserver(schedule);
  observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-rym-module','data-rym-panapass-phase','data-p2-enhanced']});
  d.addEventListener('click',schedule,true);
  w.addEventListener('load',schedule,{once:true});
  schedule();
})(window,document);
