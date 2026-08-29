(function(){
  'use strict';
  if(window.__RYM_V165_PERF__) return;
  window.__RYM_V165_PERF__ = true;

  const isHome = () => !!(document.body && document.body.classList.contains('v99-home'));
  const tracked = new Set([
    '/functions/v1/portal-home-resumen',
    '/functions/v1/gps-rym-admin',
    '/functions/v1/control-auto-resumen-supervisoras',
    '/functions/v1/revisados-final'
  ]);
  const homeTtl = {
    '/functions/v1/portal-home-resumen': 3000,
    '/functions/v1/gps-rym-admin': 5000,
    '/functions/v1/control-auto-resumen-supervisoras': 4000,
    '/functions/v1/revisados-final': 4000
  };
  const inflight = new Map();
  const recent = new Map();

  function userKey(){
    try{return String((window.state && state.profile && (state.profile.id || state.profile.usuario || state.profile.email)) || 'anon');}
    catch(_){return 'anon';}
  }
  function bodyKey(opt){
    try{
      if(!opt || opt.body == null) return '';
      if(typeof opt.body === 'string') return opt.body;
      return JSON.stringify(opt.body);
    }catch(_){return '';}
  }
  function routeKey(path,opt){ return userKey()+'|'+String(path)+'|'+bodyKey(opt); }
  function shareResult(path,z){
    try{
      if(!z || !z.data || z.data.ok === false) return;
      const k=userKey();
      if(path==='/functions/v1/gps-rym-admin'){
        window.__v164GpsPortalData={key:k,data:z.data};
        window.__v163GpsPortalCache={key:k,at:Date.now(),data:z.data};
      }else if(path==='/functions/v1/control-auto-resumen-supervisoras'){
        window.__v126Operational=z.data;
      }else if(path==='/functions/v1/revisados-final'){
        window.__v106RevisadosCache=z.data;
      }
    }catch(_){ }
  }

  if(typeof window.req === 'function'){
    const reqBase = window.req;
    window.req = async function(path,opt={}){
      const p=String(path||'');
      if(!tracked.has(p)) return reqBase(path,opt);
      const key=routeKey(p,opt);
      const now=Date.now();
      const ttl=isHome() ? (homeTtl[p]||0) : 0;
      const saved=recent.get(key);
      if(ttl && saved && (now-saved.at)<ttl) return saved.value;
      if(inflight.has(key)) return inflight.get(key);
      const job=Promise.resolve()
        .then(()=>reqBase(path,opt))
        .then(z=>{
          shareResult(p,z);
          if(isHome() && ttl && z && z.data && z.data.ok!==false){
            recent.set(key,{at:Date.now(),value:z});
          }
          return z;
        })
        .finally(()=>inflight.delete(key));
      inflight.set(key,job);
      return job;
    };
    try{req=window.req}catch(_){ }
  }

  if(typeof window.rymPrefetchRevisados === 'function'){
    const prefetchBase=window.rymPrefetchRevisados;
    window.rymPrefetchRevisados=function(){
      if(isHome()) return Promise.resolve(null);
      return prefetchBase.apply(this,arguments);
    };
  }

  setInterval(()=>{
    const now=Date.now();
    for(const [k,v] of recent){ if(!v || now-v.at>15000) recent.delete(k); }
  },15000);
})();
