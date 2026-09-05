/* Portal RYM - Panapass Dashboard V2 Clean runtime adapter. */
(function(w,d){
  'use strict';
  if(w.RYM_PANAPASS_CLEAN_RUNTIME) return;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const norm=s=>String(s||'').trim().toUpperCase();

  function profile(){return w.state?.profile||null}
  function session(){
    const p=profile()||{};
    return Object.freeze({
      role:norm(p.rol||p.role),
      userId:String(p.id||p.user_id||''),
      profile:p
    });
  }
  function rpc(name,params){
    const fn=w.rpc||(typeof rpc==='function'?rpc:null);
    if(typeof fn!=='function') throw new Error('RPC no disponible');
    return fn(name,params||{});
  }
  function root(){return d.querySelector('#view')}
  function ready(){return Boolean(profile()&&root()&&typeof (w.rpc||(typeof rpc==='function'?rpc:null))==='function')}
  async function waitReady(timeoutMs){
    const until=Date.now()+(timeoutMs||60000);
    while(Date.now()<until){if(ready())return true;await sleep(120)}
    throw new Error('Portal no quedo listo para Dashboard Panapass Clean');
  }
  function openRoute(route){
    if(!route)return null;
    if(w.state)w.state.active=String(route);
    if(typeof w.shell==='function')w.shell();
    if(typeof w.render==='function')return w.render();
    return null;
  }

  w.RYM_PANAPASS_CLEAN_RUNTIME=Object.freeze({profile,session,rpc,root,ready,waitReady,openRoute,norm});
})(window,document);
