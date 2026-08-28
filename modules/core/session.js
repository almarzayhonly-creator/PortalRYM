/* Portal RYM V172 clean - canonical session manager */
(function(w){
  'use strict';
  if(w.RYM_SESSION) return;

  let cfg=null;
  let session={accessToken:'',refreshToken:'',expiresAt:0,version:0};
  let refreshPromise=null;
  const listeners=new Set();

  function configure(options){
    if(!options?.url||!options?.apikey) throw new Error('RYM_SESSION requiere url y apikey');
    cfg=Object.freeze({url:String(options.url).replace(/\/$/,''),apikey:String(options.apikey)});
  }

  function snapshot(){return Object.freeze({...session})}
  function emit(type){for(const fn of listeners){try{fn(type,snapshot())}catch(_){}}}
  function onChange(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn)}

  function set(tokens){
    session={
      accessToken:String(tokens?.access_token||tokens?.accessToken||''),
      refreshToken:String(tokens?.refresh_token||tokens?.refreshToken||''),
      expiresAt:Number(tokens?.expires_at||tokens?.expiresAt||0)||0,
      version:session.version+1
    };
    emit('session');
    return snapshot();
  }

  function clear(){
    session={accessToken:'',refreshToken:'',expiresAt:0,version:session.version+1};
    refreshPromise=null;
    emit('logout');
  }

  function isExpiringSoon(leewaySeconds=90){
    if(!session.accessToken||!session.expiresAt) return false;
    return Math.floor(Date.now()/1000)>=session.expiresAt-Number(leewaySeconds||0);
  }

  async function refresh(){
    if(!cfg) throw new Error('RYM_SESSION no configurado');
    if(!session.refreshToken) throw new Error('SESSION_EXPIRED');
    if(refreshPromise) return refreshPromise;
    const version=session.version;
    const run=(async()=>{
      const r=await fetch(cfg.url+'/auth/v1/token?grant_type=refresh_token',{
        method:'POST',
        headers:{apikey:cfg.apikey,'Content-Type':'application/json'},
        body:JSON.stringify({refresh_token:session.refreshToken})
      });
      const data=await r.json().catch(()=>null);
      if(version!==session.version) throw new Error('SESSION_CHANGED');
      if(!r.ok||!data?.access_token){clear();throw new Error('SESSION_EXPIRED')}
      session={
        accessToken:String(data.access_token),
        refreshToken:String(data.refresh_token||session.refreshToken),
        expiresAt:Number(data.expires_at||0)||Math.floor(Date.now()/1000)+Number(data.expires_in||3600),
        version:session.version
      };
      emit('refresh');
      return snapshot();
    })();
    refreshPromise=run;
    try{return await run}finally{if(refreshPromise===run)refreshPromise=null}
  }

  async function ensureFresh(){
    if(isExpiringSoon()) await refresh();
    return snapshot();
  }

  async function authorizedFetch(path,options={}){
    if(!cfg) throw new Error('RYM_SESSION no configurado');
    await ensureFresh();
    const send=()=>fetch(cfg.url+path,{...options,headers:{apikey:cfg.apikey,'Content-Type':'application/json',...(session.accessToken?{Authorization:'Bearer '+session.accessToken}:{}),...(options.headers||{})}});
    let r=await send();
    if(r.status===401&&session.refreshToken){
      await refresh();
      r=await send();
    }
    return r;
  }

  w.RYM_SESSION=Object.freeze({configure,set,clear,snapshot,onChange,isExpiringSoon,refresh,ensureFresh,authorizedFetch});
})(window);
