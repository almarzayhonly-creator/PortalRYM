/* Portal RYM V172 clean - Control de Auto owns its tab navigation */
(function(w,d){
  'use strict';
  if(w.RYM_CONTROL_ROUTER) return;

  const routes=Object.freeze({dashboard:'dashboard',unidades:'unidades',cupos:'cupos',auditoria:'auditoria',validador:'validador'});

  let current='dashboard';
  let busy=false;
  let queued=null;
  const hooks=new Map();
  const aroundHooks=new Map();

  function normalize(name){
    const n=String(name||'').trim().toLowerCase();
    if(n==='validator'||n==='validar'||n==='validador ecarcheck') return 'validador';
    if(n==='cupos attt'||n==='cupos-attt') return 'cupos';
    if(n==='audit'||n==='auditoria') return 'auditoria';
    return n;
  }

  function appView(name){
    const key=normalize(name);
    if(!routes[key]) throw new Error('Ruta Control de Auto invalida: '+key);
    const fn=w.RYM_CONTROL_APP?.[key];
    if(typeof fn!=='function') throw new Error('Vista Control de Auto no disponible: '+key);
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
    const {key,fn}=appView(name);
    d.body.dataset.rymModule='control-auto';
    d.body.dataset.rymControlRoute=key;
    const ctx={route:key,router:w.RYM_CONTROL_ROUTER};
    let run=()=>fn.call(w);
    for(const hook of aroundHooks.get(key)||[]){const previous=run;run=()=>hook(previous,ctx);}
    await run();
    const list=hooks.get(key)||[];
    for(const hook of list) await hook(ctx);
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

  function around(route,fn){
    const key=normalize(route);if(!routes[key]||typeof fn!=='function')throw new Error('Hook around Control invalido');
    const list=aroundHooks.get(key)||[];list.push(fn);aroundHooks.set(key,list);return()=>aroundHooks.set(key,(aroundHooks.get(key)||[]).filter(x=>x!==fn));
  }
  function after(route,fn){
    const key=normalize(route);if(!routes[key]||typeof fn!=='function')throw new Error('Hook Control invalido');
    const list=hooks.get(key)||[];list.push(fn);hooks.set(key,list);return()=>hooks.set(key,(hooks.get(key)||[]).filter(x=>x!==fn));
  }

  function active(){return current}
  function isBusy(){return busy}
  function rebind(){bindNavigation();return true}

  w.RYM_CONTROL_ROUTER=Object.freeze({open,leave,active,isBusy,rebind,routes,around,after});
  for(const [route,fn] of (w.__RYM_CONTROL_PENDING_AROUND__||[])) around(route,fn);
  for(const [route,fn] of (w.__RYM_CONTROL_PENDING_AFTER__||[])) after(route,fn);
  delete w.__RYM_CONTROL_PENDING_AROUND__;delete w.__RYM_CONTROL_PENDING_AFTER__;
})(window,document);
