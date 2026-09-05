/* Portal RYM · Panapass Supervisor Dashboard V5
   Internal AM/PM logic remains internal. Visible UI focuses on operational outcome. */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_SUPERVISOR_V5__) return;
  w.__RYM_PANAPASS_SUPERVISOR_V5__=true;
  let raf=0;

  const txt=(node,sel)=>String(node?.querySelector(sel)?.textContent||'').trim();
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const num=s=>{const m=String(s||'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0};

  function isPan(){return d.body?.dataset?.rymModule==='panapass'&&d.body?.classList.contains('rym-panapass-proposal2')}
  function phase(){return d.body?.dataset?.rymPanapassPhase||'am'}

  function galeraName(root){return txt(root,'.rym-p2-gal-name')||String(txt(root,'.galera-kpi-title h3').split('·').pop()||'Tu galera').trim()}
  function negatives(root){return num(txt(root,'.rym-p2-galera .rym-gal-metric.bad b'))}
  function payments(root){return num(txt(root,'.rym-p2-galera .rym-gal-metric.pay b'))}
  function paidAmount(root){return num(txt(root,'.rym-p2-galera .rym-gal-metric.pay small'))}
  function titleBefore(panel){const prev=panel?.previousElementSibling;return prev?.classList?.contains('galera-kpi-title')?prev:null}
  function captureOriginal(panel){if(!panel.__rymSupervisorOriginal)panel.__rymSupervisorOriginal=panel.innerHTML}
  function restoreOriginal(panel){captureOriginal(panel);if(panel.dataset.p5Mode==='working')panel.innerHTML=panel.__rymSupervisorOriginal}

  function renderWorking(root,panel,title){
    const gal=galeraName(root),neg=negatives(root);
    captureOriginal(panel);
    panel.dataset.p5Mode='working';
    panel.className='rym-rank-panel rym-p5-rank-empty';
    panel.innerHTML=`<div class="rym-p5-empty-icon">◎</div><div class="rym-p5-empty-copy"><span>GESTIÓN EN CURSO</span><strong>Cobranza activa</strong><p>Hoy se detectaron ${neg} unidades negativas. El resultado de desempeño se mostrará cuando finalice la gestión operativa.</p></div><div class="rym-p5-empty-metrics"><div><b>${neg}</b><span>negativas detectadas</span></div><div><b>—</b><span>resultado del día</span></div><small>${esc(gal)}</small></div>`;
    if(title){const h=title.querySelector('h3'),s=title.querySelector('span');if(h)h.textContent=`Gestión de hoy · ${gal}`;if(s)s.textContent='Seguimiento de cobranza dentro de tu galera.'}
  }

  function renderResult(root,panel,title){
    const gal=galeraName(root),paid=payments(root),amount=paidAmount(root),neg=negatives(root);
    restoreOriginal(panel);
    panel.dataset.p5Mode='result';
    panel.className=`rym-rank-panel rym-p5-rank-live ${paid===0?'rym-p5-perfect':''}`;

    const rows=[...panel.querySelectorAll('.rym-rank-row')];
    const zeroCount=rows.filter(r=>/^0\s+pagadas/i.test(txt(r,'.rym-rank-value'))).length;
    const me=rows.find(r=>r.classList.contains('me'));

    if(title){
      const h=title.querySelector('h3'),s=title.querySelector('span');
      if(h)h.textContent=`Resultado de gestión · ${gal}`;
      if(s)s.textContent='Menos unidades que terminan requiriendo pago representa mejor gestión.';
    }

    const hero=panel.querySelector('.rym-rank-hero');
    if(hero){
      hero.className='rym-rank-hero rym-p6-result-hero';
      hero.innerHTML=`<div class="rym-p6-result-main"><span>RESULTADO DE HOY</span><strong>${paid} pagadas</strong><small>${paid===0?'Excelente: ninguna unidad necesitó pago.':'El objetivo es reducir al mínimo las unidades que terminan requiriendo pago.'}</small></div><div class="rym-p6-result-stats"><div><b>${neg}</b><span>negativas detectadas</span></div><div><b>B/. ${amount.toFixed(2)}</b><span>monto pagado</span></div><div><b>${zeroCount||'—'}</b><span>${zeroCount===1?'supervisora con 0 pagos':'supervisoras con 0 pagos'}</span></div></div>`;
    }

    rows.forEach((row,i)=>{
      row.classList.toggle('rym-p5-first',i===0);
      row.classList.toggle('rym-p6-best-result',/^0\s+pagadas/i.test(txt(row,'.rym-rank-value')));
      if(row.classList.contains('me'))row.setAttribute('aria-label','Tu resultado actual');
    });
    if(me)me.classList.add('rym-p6-current');
  }

  function run(){
    if(!isPan())return;
    const root=d.querySelector('#view #phase4GaleraKpis.rym-p2-galeras');
    const panel=root?.querySelector('.rym-rank-panel');
    if(!root||!panel)return;
    root.classList.add('rym-p5-supervisor-view');
    const signature=`${phase()}:${payments(root)}:${negatives(root)}:${paidAmount(root)}`;
    if(panel.dataset.p5Signature===signature)return;
    panel.dataset.p5Signature=signature;
    const title=titleBefore(panel);
    if(phase()==='pm')renderResult(root,panel,title);else renderWorking(root,panel,title);
  }

  function schedule(){if(raf)return;raf=w.requestAnimationFrame(()=>{raf=0;run()})}
  const observer=new MutationObserver(schedule);
  observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-rym-module','data-rym-panapass-phase','data-p2-enhanced','data-rym-ready']});
  d.addEventListener('click',schedule,true);w.addEventListener('load',schedule,{once:true});schedule();
})(window,document);
