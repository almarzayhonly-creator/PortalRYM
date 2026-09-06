/* Portal RYM - Panapass Dashboard V2 Clean runtime adapter. */
(function(w,d){
  'use strict';
  if(w.RYM_PANAPASS_CLEAN_RUNTIME) return;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=s=>String(s||'').trim().toUpperCase();
  const PANAPASS_ROUTES=Object.freeze(['dashboard','negativos_hoy','ranking','pagos_hoy','cargar_pagos','historial','recurrentes','operaciones','operacion_am','operacion_pm','reportes','bajas_panapass']);
  let ownerInstalled=false;
  let legacyDashboard=null;

  function legacyRpc(){return typeof w.rpc==='function'?w.rpc:null}
  function state(){return w.state&&typeof w.state==='object'?w.state:null}
  function profile(){return state()?.profile||null}
  function session(){
    const p=profile()||{};
    return Object.freeze({
      role:norm(p.rol||p.role),
      userId:String(p.id||p.user_id||''),
      profile:p
    });
  }
  function call(name,params){
    const fn=legacyRpc();
    if(!fn) throw new Error('RPC no disponible');
    return fn(name,params||{});
  }
  function root(){return d.querySelector('#view')}
  function ready(){return Boolean(profile()&&root()&&legacyRpc())}
  async function waitReady(timeoutMs){
    const until=Date.now()+(timeoutMs||60000);
    while(Date.now()<until){if(ready())return true;await sleep(120)}
    throw new Error('Portal no quedo listo para Dashboard Panapass Clean');
  }
  function allModules(){
    const s=state();if(!s)return [];
    const src=Array.isArray(s.allModules)&&s.allModules.length?s.allModules:(Array.isArray(s.modules)?s.modules:[]);
    return src.map(x=>String(x));
  }
  function hasPanapassScope(){
    const mods=allModules();
    return mods.includes('dashboard')&&mods.some(x=>PANAPASS_ROUTES.includes(x)&&x!=='dashboard');
  }
  function isDashboardRoute(){
    const s=state();
    return Boolean(w.RYM_PANAPASS_CLEAN_ENABLED===true&&profile()&&s&&String(s.active||'')==='dashboard'&&hasPanapassScope());
  }
  function openRoute(route){
    if(!route)return null;
    const s=state();if(s)s.active=String(route);
    if(typeof w.shell==='function')w.shell();
    if(typeof w.render==='function')return w.render();
    try{if(typeof render==='function')return render()}catch(_){}
    return null;
  }

  function installDashboardOwner(handlers){
    if(ownerInstalled)return Object.freeze({installed:true,reused:true,dashboardGate:Boolean(w.dashboard?.__rymPanapassCleanOwner)});
    const renderDashboard=handlers?.renderDashboard;
    if(typeof renderDashboard!=='function')throw new Error('renderDashboard requerido');

    legacyDashboard=typeof w.dashboard==='function'?w.dashboard:null;
    const cleanDashboard=async function(target){
      if(isDashboardRoute())return renderDashboard({target:target||root(),source:'dashboard-handler'});
      if(typeof legacyDashboard==='function')return legacyDashboard.apply(this,arguments);
      return null;
    };
    cleanDashboard.__rymPanapassCleanOwner=true;
    w.dashboard=cleanDashboard;
    try{dashboard=cleanDashboard}catch(_){}

    ownerInstalled=true;
    return Object.freeze({installed:true,reused:false,dashboardGate:true,legacyDashboard:Boolean(legacyDashboard)});
  }

  function ownership(){return Object.freeze({installed:ownerInstalled,dashboardGate:Boolean(w.dashboard?.__rymPanapassCleanOwner),dashboard:isDashboardRoute()})}

  w.RYM_PANAPASS_CLEAN_RUNTIME=Object.freeze({profile,session,rpc:call,root,ready,waitReady,openRoute,norm,allModules,hasPanapassScope,isDashboardRoute,installDashboardOwner,ownership});
})(window,document);
