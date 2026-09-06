/* Portal RYM - Panapass Dashboard V2 Clean runtime adapter. */
(function(w,d){
  'use strict';
  if(w.RYM_PANAPASS_CLEAN_RUNTIME) return;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=s=>String(s||'').trim().toUpperCase();
  const PANAPASS_ROUTES=Object.freeze(['dashboard','negativos_hoy','ranking','pagos_hoy','cargar_pagos','historial','recurrentes','operaciones','operacion_am','operacion_pm','reportes','bajas_panapass']);
  let ownerInstalled=false;
  let legacyRender=null;
  let legacyOpenPanapass=null;

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
    return null;
  }

  function installDashboardOwner(handlers){
    if(ownerInstalled)return Object.freeze({installed:true,reused:true});
    const renderDashboard=handlers?.renderDashboard;
    const leaveDashboard=handlers?.leaveDashboard;
    if(typeof renderDashboard!=='function')throw new Error('renderDashboard requerido');

    legacyRender=typeof w.render==='function'?w.render:null;
    const gatedRender=async function(){
      if(isDashboardRoute())return renderDashboard({source:'render-gate'});
      if(typeof leaveDashboard==='function')leaveDashboard();
      if(typeof legacyRender==='function')return legacyRender.apply(this,arguments);
      return null;
    };
    gatedRender.__rymPanapassCleanOwner=true;
    w.render=gatedRender;

    legacyOpenPanapass=typeof w.v70OpenPanapass==='function'?w.v70OpenPanapass:null;
    if(legacyOpenPanapass){
      const openClean=async function(){
        w.__RYM_PANAPASS_CLEAN_ROUTE__='PANAPASS';
        return legacyOpenPanapass.apply(this,arguments);
      };
      openClean.__rymPanapassCleanOwner=true;
      w.v70OpenPanapass=openClean;
    }

    ownerInstalled=true;
    return Object.freeze({installed:true,reused:false,renderGate:Boolean(legacyRender),routeGate:Boolean(legacyOpenPanapass)});
  }

  function ownership(){return Object.freeze({installed:ownerInstalled,renderGate:Boolean(w.render?.__rymPanapassCleanOwner),routeGate:Boolean(w.v70OpenPanapass?.__rymPanapassCleanOwner),dashboard:isDashboardRoute()})}

  w.RYM_PANAPASS_CLEAN_RUNTIME=Object.freeze({profile,session,rpc:call,root,ready,waitReady,openRoute,norm,allModules,hasPanapassScope,isDashboardRoute,installDashboardOwner,ownership});
})(window,document);
