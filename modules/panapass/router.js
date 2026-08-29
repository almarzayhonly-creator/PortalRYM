/* Portal RYM V172 clean - Panapass owns its internal navigation */
(function(w,d){
  'use strict';
  if(w.RYM_PANAPASS_ROUTER) return;

  const TABS=Object.freeze([
    'dashboard','negativos_hoy','ranking','pagos_hoy','cargar_pagos',
    'historial','recurrentes','operaciones','reportes','recorrido','bajas_panapass'
  ]);
  const MODULE_TABS=Object.freeze({
    ranking:'panapass-ranking',
    recurrentes:'panapass-recurrentes',
    bajas_panapass:'panapass-bajas'
  });
  const LEGACY_VIEWS=Object.freeze({
    dashboard:'dashboard',
    negativos_hoy:'negativos',
    pagos_hoy:'pagosConsultaHoy',
    cargar_pagos:'pagosTrabajo',
    historial:'historial',
    operaciones:'operaciones',
    reportes:'reportes',
    recorrido:'v75Recorrido',
  });

  let current='dashboard';
  let busy=false;
  let queued=null;
  const aroundHooks=new Map();
  const afterHooks=new Map();

  function st(){try{return state}catch(_){return w.state||null}}
  function labelsMap(){try{return labels}catch(_){return w.labels||{}}}
  function normalize(v){return String(v||'').trim().toLowerCase()}
  function allModules(){
    const s=st();
    if(!s)return[];
    const all=Array.isArray(s.allModules)&&s.allModules.length?s.allModules:s.modules;
    return Array.isArray(all)?[...new Set(all.map(String))]:[];
  }
  function permittedTabs(){
    const all=allModules(),out=TABS.filter(x=>all.includes(x));
    if(all.includes('dashboard')&&!out.includes('bajas_panapass'))out.push('bajas_panapass');
    return out;
  }
  function targetTab(requested){
    const allowed=permittedTabs(),key=normalize(requested);
    if(allowed.includes(key))return key;
    if(allowed.includes('dashboard'))return'dashboard';
    return allowed[0]||'dashboard';
  }

  function legacyFn(name){
    try{
      const fn=w[name]||(typeof globalThis[name]==='function'?globalThis[name]:null);
      return typeof fn==='function'?fn:null;
    }catch(_){return typeof w[name]==='function'?w[name]:null}
  }

  function prepareState(tab){
    const s=st();if(!s)throw new Error('Panapass state no disponible');
    const full=allModules();
    if(!Array.isArray(s.allModules)||!s.allModules.length)s.allModules=full;
    s.modules=permittedTabs();
    s.active=tab;
    d.body.classList.remove('v70-portal','v70-control','v70-admin','v117-revisados','v117-control','v117-gps');
    d.body.classList.add('v117-panapass');
    d.body.dataset.rymModule='panapass';
    d.body.dataset.rymPanapassRoute=tab;
  }

  function bindShell(){
    const nav=d.querySelector('.side .nav');
    if(nav){
      Array.from(nav.querySelectorAll('[data-m]')).forEach(btn=>{
        const route=normalize(btn.dataset.m);
        if(!TABS.includes(route))return;
        const clone=btn.cloneNode(true);
        clone.onclick=null;
        clone.classList.toggle('active',route===current);
        clone.addEventListener('click',ev=>{
          ev.preventDefault();
          open(route).catch(err=>console.error('[Panapass router]',err));
        });
        btn.replaceWith(clone);
      });
    }
    const out=d.querySelector('#out');
    if(out){
      const clone=out.cloneNode(true);clone.onclick=null;clone.textContent='Volver al Portal';
      clone.addEventListener('click',ev=>{ev.preventDefault();leave().catch(err=>console.error('[Panapass router]',err))});
      out.replaceWith(clone);
    }
    const top=d.querySelector('.top h1'),map=labelsMap();
    if(top)top.textContent=map[current]||current;
    const kick=d.querySelector('.portal-kicker');if(kick)kick.textContent='Portal RYM · Panapass';
  }

  function buildShell(tab){
    prepareState(tab);
    const fn=legacyFn('shell');
    if(!fn)throw new Error('Panapass shell no disponible');
    fn.call(w);
    bindShell();
    return d.querySelector('#view');
  }

  async function baseRender(tab,view){
    if(!view)throw new Error('Panapass view no disponible');
    view.innerHTML='<div class="card">Cargando...</div>';
    const moduleName=MODULE_TABS[tab];
    if(moduleName){
      if(!w.RYM_MODULES?.has(moduleName))throw new Error('Modulo Panapass faltante: '+moduleName);
      return w.RYM_MODULES.open(moduleName,{target:view});
    }
    const fnName=LEGACY_VIEWS[tab],fn=legacyFn(fnName);
    if(!fn){
      view.innerHTML='<div class="alert">Vista Panapass no disponible: '+String(tab)+'</div>';
      return false;
    }
    return fn.call(w,view);
  }

  async function render(tab,view){
    const ctx=Object.freeze({route:tab,view,state:st(),router:null});
    let run=()=>baseRender(tab,view);
    const list=aroundHooks.get(tab)||[];
    for(const hook of list){
      const previous=run;
      run=()=>hook(previous,{...ctx,router:w.RYM_PANAPASS_ROUTER});
    }
    const result=await run();
    for(const hook of afterHooks.get(tab)||[])await hook({...ctx,router:w.RYM_PANAPASS_ROUTER,result});
    return result;
  }

  async function invoke(requested){
    const tab=targetTab(requested);
    const view=buildShell(tab);
    current=tab;
    await render(tab,view);
    bindShell();
    return tab;
  }

  async function open(requested='dashboard'){
    const tab=targetTab(requested);
    if(busy){queued=tab;return false}
    busy=true;
    try{await invoke(tab)}finally{busy=false}
    if(queued){const next=queued;queued=null;if(next!==current)return open(next)}
    return true;
  }

  async function leave(){
    queued=null;
    if(busy)return false;
    d.body.dataset.rymPanapassRoute='';
    return w.RYM_ROUTER?.home?.()||false;
  }

  function around(route,fn){
    const key=normalize(route);if(!TABS.includes(key)||typeof fn!=='function')throw new Error('Hook around Panapass invalido');
    const list=aroundHooks.get(key)||[];list.push(fn);aroundHooks.set(key,list);
    return()=>aroundHooks.set(key,(aroundHooks.get(key)||[]).filter(x=>x!==fn));
  }
  function after(route,fn){
    const key=normalize(route);if(!TABS.includes(key)||typeof fn!=='function')throw new Error('Hook after Panapass invalido');
    const list=afterHooks.get(key)||[];list.push(fn);afterHooks.set(key,list);
    return()=>afterHooks.set(key,(afterHooks.get(key)||[]).filter(x=>x!==fn));
  }
  function active(){return current}
  function isBusy(){return busy}
  function routes(){return TABS.slice()}

  w.RYM_PANAPASS_ROUTER=Object.freeze({open,leave,active,isBusy,routes,permittedTabs,around,after});
  for(const [route,fn] of (w.__RYM_PANAPASS_PENDING_AROUND__||[])) around(route,fn);
  for(const [route,fn] of (w.__RYM_PANAPASS_PENDING_AFTER__||[])) after(route,fn);
  delete w.__RYM_PANAPASS_PENDING_AROUND__;delete w.__RYM_PANAPASS_PENDING_AFTER__;
})(window,document);
