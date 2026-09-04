/* Portal RYM Architecture V2 - legacy project entrypoint bridge */
(function(w,d){
  'use strict';
  if(w.RYM_LEGACY_ROUTES) return;

  const originals=new Map();
  const wrappers=new Map();
  const routing=new Set();
  const definitions=[
    {key:'panapass',global:'v70OpenPanapass',module:'panapass'},
    {key:'revisados',global:'v60OpenRevisados',module:'revisados'},
    {key:'control-auto',global:'v70OpenControl',module:'control-auto'},
    {key:'gps',global:'v113OpenGps',module:'gps'},
    {key:'usuarios',global:'v70OpenUsers',module:'usuarios'}
  ];

  function get(key){return originals.get(String(key))||null}

  function install(def){
    const current=w[def.global];
    const installed=wrappers.get(def.global);
    if(installed&&current===installed)return true;
    if(typeof current!=='function')return false;
    if(current&&current.__rymV2RouteBridge===def.module)return true;

    /* Capture the canonical legacy implementation once. Later legacy wrappers
       may replace window[name], but they must never replace this preserved entrypoint. */
    if(!originals.has(def.key)) originals.set(def.key,current);

    const wrapped=async function(...args){
      const canonical=originals.get(def.key);
      if(!w.RYM_MODULES||typeof w.RYM_MODULES.open!=='function'){
        if(typeof canonical!=='function') throw new Error(def.module+' canonical entrypoint unavailable');
        return canonical.apply(this,args);
      }
      if(routing.has(def.module)){
        if(typeof canonical!=='function') throw new Error(def.module+' canonical entrypoint unavailable');
        return canonical.apply(this,args);
      }
      routing.add(def.module);
      try{
        return await w.RYM_MODULES.open(def.module,{legacyArgs:args,source:'legacy-entrypoint'});
      }finally{
        routing.delete(def.module);
      }
    };
    Object.defineProperty(wrapped,'__rymV2RouteBridge',{value:def.module});
    wrappers.set(def.global,wrapped);
    w[def.global]=wrapped;
    return true;
  }

  let originalHome=null,homeWrapper=null;
  function installHome(){
    const current=w.v36PortalHome;
    if(homeWrapper&&current===homeWrapper)return true;
    if(typeof current!=='function')return false;
    if(current&&current.__rymV2RouteBridge==='home')return true;
    if(!originalHome) originalHome=current;
    homeWrapper=async function(...args){
      if(w.RYM_MODULES&&typeof w.RYM_MODULES.unmount==='function')await w.RYM_MODULES.unmount();
      return originalHome.apply(this,args);
    };
    Object.defineProperty(homeWrapper,'__rymV2RouteBridge',{value:'home'});
    w.v36PortalHome=homeWrapper;
    return true;
  }

  function installAll(){
    definitions.forEach(install);
    installHome();
  }

  const api=Object.freeze({
    get,
    install:installAll,
    isBridged(globalName){
      const fn=w[String(globalName||'')];
      return !!(fn&&fn.__rymV2RouteBridge);
    }
  });
  w.RYM_LEGACY_ROUTES=api;

  function start(){
    installAll();
    let attempts=0;
    const timer=w.setInterval(()=>{
      installAll();
      attempts++;
      if(attempts>=40)w.clearInterval(timer);
    },250);
  }

  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})(window,document);
