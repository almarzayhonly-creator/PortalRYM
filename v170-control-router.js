/* Portal RYM V170 Control routing guard - navigation only; no business logic. */
(function(){
  'use strict';
  if(window.__RYM_V170_CONTROL_ROUTER__) return;
  window.__RYM_V170_CONTROL_ROUTER__=true;

  const N=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase();
  const ROUTES={
    'DASHBOARD':'v75ControlDashboard',
    'UNIDADES':'v75ControlUnits',
    'CUPOS ATTT':'v94ControlCuposATTT',
    'AUDITORIA':'v75ControlAudit',
    'VALIDADOR ECARCHECK':'v80OpenEcarValidator'
  };
  let desired=null,pending=null,busy=false,generation=0,repairs=0;

  function routeFor(label){return ROUTES[N(label)]||null;}
  function matches(fnName){
    if(!document.body.classList.contains('v70-control')) return false;
    const top=N(document.querySelector('.top h1')?.textContent||'');
    if(fnName==='v75ControlDashboard') return top.includes('DASHBOARD')||!!document.querySelector('.v75-control-dashboard');
    if(fnName==='v75ControlUnits') return top.includes('UNIDADES')&&!top.includes('CUPOS');
    if(fnName==='v94ControlCuposATTT') return top.includes('CUPOS ATTT')||!!document.querySelector('.v94-cupos');
    if(fnName==='v75ControlAudit') return top.includes('AUDITOR')||!!document.querySelector('.ca-audit,.v112-audit-master');
    if(fnName==='v80OpenEcarValidator') return top.includes('VALIDADOR')||!!document.querySelector('.v80-validator');
    return true;
  }
  function setSwitch(on){try{document.body.classList.toggle('v123-control-switch',!!on)}catch(_){}}

  async function invoke(fnName){
    const fn=window[fnName];
    if(typeof fn!=='function') throw new Error('missing canonical route '+fnName);
    /* Cupos already owns #view and its own RPC. Its legacy implementation
       preloads the full Units screen first; suppress only that redundant
       nested preload while Cupos builds its own view. */
    if(fnName==='v94ControlCuposATTT'){
      const units=window.v75ControlUnits;
      if(typeof units==='function'){
        window.v75ControlUnits=async function(){return null};
        try{return await fn.call(window)}
        finally{window.v75ControlUnits=units}
      }
    }
    return await fn.call(window);
  }

  function scheduleIntegrity(gen){
    [350,1200,2800,5200,9000].forEach(ms=>setTimeout(()=>{
      if(gen!==generation||busy||pending||!desired)return;
      if(matches(desired))return;
      if(repairs>=2){try{console.error('[V170 Control router] view did not settle',desired)}catch(_){};return}
      repairs++;pending=desired;runQueue();
    },ms));
  }

  async function runQueue(){
    if(busy)return;
    busy=true;setSwitch(true);
    try{
      while(pending){
        const fnName=pending;pending=null;
        try{await invoke(fnName)}catch(err){try{console.error('[V170 Control router]',fnName,err)}catch(_){}}
      }
    }finally{
      busy=false;setSwitch(false);
      const gen=generation;scheduleIntegrity(gen);
      if(pending)runQueue();
    }
  }

  function request(fnName){desired=fnName;pending=fnName;generation++;repairs=0;runQueue()}

  document.addEventListener('click',function(ev){
    if(!document.body.classList.contains('v70-control'))return;
    const btn=ev.target.closest&&ev.target.closest('button,a,[role="button"],[role="tab"]');
    if(!btn)return;
    const fnName=routeFor(btn.innerText||btn.textContent);if(!fnName)return;
    ev.preventDefault();ev.stopImmediatePropagation();request(fnName);
  },true);
})();
