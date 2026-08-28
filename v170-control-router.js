/* Portal RYM V170 Control routing guard - navigation only; no business logic. */
(function(){
  'use strict';
  if(window.__RYM_V170_CONTROL_ROUTER__) return;
  window.__RYM_V170_CONTROL_ROUTER__=true;

  const N=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();

  function routeFor(label){
    const x=N(label);
    if(x==='DASHBOARD') return 'v75ControlDash';
    if(x==='UNIDADES') return 'v70ControlUnits';
    if(x==='CUPOS ATTT') return 'v70ControlCupos';
    if(x==='AUDITORIA') return 'v70ControlAudit';
    if(x==='VALIDADOR ECARCHECK') return 'v94ControlValidador';
    return null;
  }

  document.addEventListener('click',function(ev){
    if(!document.body.classList.contains('v70-control')) return;
    const btn=ev.target.closest&&ev.target.closest('button,a,[role="button"],[role="tab"]');
    if(!btn) return;
    const fnName=routeFor(btn.innerText||btn.textContent);
    if(!fnName) return;
    const fn=window[fnName];
    if(typeof fn!=='function') return;

    ev.preventDefault();
    ev.stopImmediatePropagation();
    try{document.body.classList.add('v123-control-switch')}catch(_){ }

    Promise.resolve()
      .then(()=>fn.call(window))
      .catch(err=>{ try{console.error('[V170 Control router]',fnName,err)}catch(_){ } })
      .finally(()=>setTimeout(()=>{
        try{document.body.classList.remove('v123-control-switch')}catch(_){ }
      },250));
  },true);
})();
