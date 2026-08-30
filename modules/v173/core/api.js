(() => {
  'use strict';
  const app=window.RYM173;if(!app)throw new Error('V173 bootstrap missing');
  const URL='https://avczyvcpmicpuhdkmxzx.supabase.co';
  const KEY='sb_publishable_Xq9jQFfPrywG4kbmw1dOuQ_IyjsrlsQ';
  let token='',refreshToken='',expiresAt=0,refreshing=null;

  function headers(extra={}){const h={'apikey':KEY,'Content-Type':'application/json',...extra};if(token)h.Authorization='Bearer '+token;return h;}
  function setTokens(next={}){token=String(next.access_token||'');refreshToken=String(next.refresh_token||'');expiresAt=Number(next.expires_at||0)||0;}
  function clear(){token='';refreshToken='';expiresAt=0;}
  function session(){return Object.freeze({authenticated:!!token,expiresAt});}
  async function refresh(){
    if(!refreshToken)throw new Error('Tu sesion expiro. Ingresa nuevamente.');
    if(refreshing)return refreshing;
    refreshing=(async()=>{const r=await fetch(URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken})});const d=await parse(r);if(!r.ok||!d?.access_token){clear();throw new Error('Tu sesion expiro. Ingresa nuevamente.');}setTokens({access_token:d.access_token,refresh_token:d.refresh_token||refreshToken,expires_at:d.expires_at||Math.floor(Date.now()/1000)+Number(d.expires_in||3600)});return token;})();
    try{return await refreshing;}finally{refreshing=null;}
  }
  async function parse(r){const t=await r.text();try{return t?JSON.parse(t):null;}catch(_){return t;}}
  async function request(path,opt={}){
    if(refreshToken&&expiresAt&&Math.floor(Date.now()/1000)>=expiresAt-60)await refresh();
    const send=()=>fetch(URL+path,{...opt,headers:headers(opt.headers||{})});
    let r=await send(),d=await parse(r);
    if(r.status===401&&refreshToken){await refresh();r=await send();d=await parse(r);}
    if(!r.ok)throw new Error(String(d?.message||d?.error_description||d?.error||d||('HTTP '+r.status)));
    return d;
  }
  const rest=(table,q='')=>request('/rest/v1/'+table+(q?'?'+q:''));
  const rpc=(name,body={})=>request('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(body)});
  const fn=(name,body={})=>request('/functions/v1/'+name,{method:'POST',body:JSON.stringify(body)});

  app.register('api',{request,rest,rpc,fn,setTokens,clear,session});
})();
