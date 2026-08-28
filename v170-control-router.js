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
  const LABELS={
    v75ControlDashboard:'Dashboard',
    v75ControlUnits:'Unidades',
    v94ControlCuposATTT:'Cupos ATTT',
    v75ControlAudit:'Auditoría',
    v80OpenEcarValidator:'Validador eCarCheck'
  };
  let desired=null,pending=null,busy=false,generation=0,repairs=0;

  function routeFor(label){return ROUTES[N(label)]||null;}
  function viewText(){return N(document.querySelector('#view')?.textContent||'')}
  function matches(fnName){
    if(!document.body.classList.contains('v70-control')) return false;
    const top=N(document.querySelector('.top h1')?.textContent||'');
    const text=viewText();
    if(fnName==='v75ControlDashboard') return top.includes('DASHBOARD')||!!document.querySelector('.v75-control-dashboard');
    if(fnName==='v75ControlUnits') return top.includes('UNIDADES')&&!top.includes('CUPOS');
    if(fnName==='v94ControlCuposATTT') return !!document.querySelector('.v94-cupos')||text.includes('ECARCHECK / ATTT ES LA INFORMACION OFICIAL');
    if(fnName==='v75ControlAudit') return !!document.querySelector('.ca-audit,.v112-audit-master')||text.includes('CUPOS OFICIALES DETECTADOS EN ECARCHECK')||text.includes('TRASPASOS DETECTADOS POR TITULAR / CUPO');
    if(fnName==='v80OpenEcarValidator') return !!document.querySelector('.v80-validator')||text.includes('VALIDACION MANUAL POR GALERA');
    return true;
  }
  function setSwitch(on){try{document.body.classList.toggle('v123-control-switch',!!on)}catch(_){}}

  function removeGuard(){document.querySelector('#v170ControlRouteGuard')?.remove()}
  function showGuard(fnName){
    if(fnName!=='v75ControlAudit'&&fnName!=='v80OpenEcarValidator')return;
    let g=document.querySelector('#v170ControlRouteGuard');
    if(!g){
      g=document.createElement('div');g.id='v170ControlRouteGuard';
      Object.assign(g.style,{position:'fixed',zIndex:'9997',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(248,250,252,.97)',backdropFilter:'blur(2px)',pointerEvents:'none',borderRadius:'14px'});
      document.body.appendChild(g);
    }
    const v=document.querySelector('#view');
    if(v){const r=v.getBoundingClientRect();Object.assign(g.style,{left:Math.max(0,r.left)+'px',top:Math.max(0,r.top)+'px',width:Math.max(1,r.width)+'px',height:Math.max(1,r.height)+'px'});}
    else Object.assign(g.style,{left:'0',top:'64px',right:'0',bottom:'0',width:'auto',height:'auto'});
    const label=LABELS[fnName]||'vista';
    g.innerHTML='<div style="text-align:center;padding:28px;color:#183b6b"><div style="font-size:13px;font-weight:900;letter-spacing:.02em">Cargando '+label+'…</div><div style="font-size:10px;color:#6b7c91;margin-top:6px">Preparando la vista sin salir de Control de Auto</div></div>';
    const top=document.querySelector('.top h1');if(top)top.textContent=label;
  }
  function refreshGuard(){if(desired)showGuard(desired)}

  async function invoke(fnName){
    const fn=window[fnName];
    if(typeof fn!=='function') throw new Error('missing canonical route '+fnName);
    showGuard(fnName);
    /* Cupos owns #view and its own RPC. Its legacy implementation preloads
       the full Units screen first; suppress only that redundant nested preload. */
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

  async function waitForSettle(fnName){
    const guarded=fnName==='v94ControlCuposATTT'||fnName==='v75ControlAudit'||fnName==='v80OpenEcarValidator';
    if(!guarded)return true;
    const start=Date.now();
    const minimum=fnName==='v75ControlAudit'?650:(fnName==='v94ControlCuposATTT'?450:150);
    while(Date.now()-start<10000){
      if(Date.now()-start>=minimum&&matches(fnName))return true;
      await new Promise(r=>setTimeout(r,100));
    }
    return false;
  }

  function scheduleIntegrity(gen){
    [350,1200,2800,5200,9000].forEach(ms=>setTimeout(()=>{
      if(gen!==generation||busy||pending||!desired)return;
      if(matches(desired)){removeGuard();return}
      if(repairs>=2){try{console.error('[V170 Control router] view did not settle',desired)}catch(_){};removeGuard();return}
      repairs++;pending=desired;showGuard(desired);runQueue();
    },ms));
  }

  async function runQueue(){
    if(busy)return;
    busy=true;setSwitch(true);
    try{
      while(pending){
        const fnName=pending;pending=null;
        try{
          await invoke(fnName);
          const settled=await waitForSettle(fnName);
          if(!settled&&desired===fnName)try{console.error('[V170 Control router] view did not settle',fnName)}catch(_){}
        }catch(err){try{console.error('[V170 Control router]',fnName,err)}catch(_){}}
        if(pending)refreshGuard();
      }
    }finally{
      busy=false;setSwitch(false);
      const gen=generation;
      if(desired&&matches(desired))removeGuard();else if(desired)showGuard(desired);else removeGuard();
      scheduleIntegrity(gen);
      if(pending)runQueue();
    }
  }

  function request(fnName){desired=fnName;pending=fnName;generation++;repairs=0;showGuard(fnName);runQueue()}

  window.addEventListener('resize',()=>{if(document.querySelector('#v170ControlRouteGuard'))refreshGuard()},{passive:true});
  document.addEventListener('click',function(ev){
    if(!document.body.classList.contains('v70-control'))return;
    const btn=ev.target.closest&&ev.target.closest('button,a,[role="button"],[role="tab"]');
    if(!btn)return;
    /* #ca6Audit is the legacy internal functional hook used by v75ControlAudit.
       It must reach its original handler; intercepting it prevents the audit
       renderer from running and leaves later routes queued. */
    if(btn.id==='ca6Audit')return;
    const fnName=routeFor(btn.innerText||btn.textContent);if(!fnName)return;
    ev.preventDefault();ev.stopImmediatePropagation();request(fnName);
  },true);
})();
