/* Portal RYM V172 clean - Control de Auto owns its tab navigation */
(function(w,d){
  'use strict';
  if(w.RYM_CONTROL_ROUTER) return;

  const routes=Object.freeze({
    dashboard:'v75ControlDashboard',
    unidades:'v75ControlUnits',
    cupos:'v94ControlCuposATTT',
    auditoria:'v75ControlAudit',
    validador:'v80OpenEcarValidator'
  });

  let current='dashboard';
  let busy=false;
  let queued=null;

  function normalize(name){
    const n=String(name||'').trim().toLowerCase();
    if(n==='validator'||n==='validar'||n==='validador ecarcheck') return 'validador';
    if(n==='cupos attt'||n==='cupos-attt') return 'cupos';
    if(n==='audit'||n==='auditoria') return 'auditoria';
    return n;
  }

  function legacyView(name){
    const key=normalize(name);
    const fnName=routes[key];
    if(!fnName) throw new Error('Ruta Control de Auto invalida: '+key);
    const fn=w[fnName];
    if(typeof fn!=='function') throw new Error('Vista Control de Auto no disponible: '+fnName);
    return {key,fn};
  }

  function routeFromButton(btn){
    if(!btn) return null;
    if(btn.matches('[data-v75-control="dashboard"]')) return 'dashboard';
    if(btn.matches('[data-v75-control="unidades"]')) return 'unidades';
    if(btn.matches('[data-v75-control="auditoria"]')) return 'auditoria';
    if(btn.matches('[data-v80-control="validator"]')) return 'validador';
    if(btn.matches('[data-v94-control="cupos"]')) return 'cupos';
    return null;
  }

  function replaceNavButton(btn,route){
    const clone=btn.cloneNode(true);
    clone.onclick=null;
    clone.classList.toggle('active',route===current);
    clone.addEventListener('click',ev=>{
      ev.preventDefault();
      open(route).catch(err=>console.error('[Control Auto router]',err));
    });
    btn.replaceWith(clone);
    return clone;
  }

  function bindNavigation(){
    const nav=d.querySelector('.side .nav');
    if(nav){
      Array.from(nav.querySelectorAll('button')).forEach(btn=>{
        const route=routeFromButton(btn);
        if(route) replaceNavButton(btn,route);
      });
    }

    const out=d.querySelector('#out');
    if(out){
      const clone=out.cloneNode(true);
      clone.onclick=null;
      clone.textContent='Volver al Portal';
      clone.addEventListener('click',ev=>{
        ev.preventDefault();
        leave().catch(err=>console.error('[Control Auto router]',err));
      });
      out.replaceWith(clone);
    }

    d.body.dataset.rymControlRoute=current;
  }

  async function invoke(name){
    const {key,fn}=legacyView(name);
    d.body.dataset.rymModule='control-auto';
    d.body.dataset.rymControlRoute=key;
    await fn.call(w);
    current=key;
    bindNavigation();
    return key;
  }

  async function open(name){
    const key=normalize(name);
    if(!routes[key]) throw new Error('Ruta Control de Auto invalida: '+key);
    if(busy){queued=key;return false;}
    busy=true;
    try{
      await invoke(key);
    }finally{
      busy=false;
    }
    if(queued){
      const next=queued;queued=null;
      if(next!==current) return open(next);
    }
    return true;
  }

  async function leave(){
    queued=null;
    if(busy) return false;
    d.body.dataset.rymControlRoute='';
    if(typeof w.v36PortalHome==='function'){
      await w.v36PortalHome();
      return true;
    }
    return w.RYM_ROUTER?.home?.()||false;
  }

  function active(){return current}
  function isBusy(){return busy}
  function rebind(){bindNavigation();return true}

  w.RYM_CONTROL_ROUTER=Object.freeze({open,leave,active,isBusy,rebind,routes});
})(window,document);
