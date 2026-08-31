const URL='https://avczyvcpmicpuhdkmxzx.supabase.co';
const KEY='sb_publishable_Xq9jQFfPrywG4kbmw1dOuQ_IyjsrlsQ';
const app=document.querySelector('#app');
const state={token:'',refreshToken:'',expiresAt:0,sessionVersion:0,profile:null,modules:[],allModules:[],active:'dashboard',today:null,meta:null,cobraCache:null,cobraCacheAt:0};
const labels={dashboard:'Dashboard',ranking:'Ranking',negativos_hoy:'Negativos Hoy',pagos_hoy:'Pagos Hoy',historial:'Historial / Pendiente a Cobra',pendientes_externo:'Historial / Pendiente a Cobra',recurrentes:'Recurrentes',operaciones:'Operación AM / PM',operacion_am:'Operación AM / PM',operacion_pm:'Operación AM / PM',reportes:'Reportes',usuarios:'Usuarios'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
function H(){const h={'apikey':KEY,'Content-Type':'application/json'};if(state.token)h.Authorization='Bearer '+state.token;return h}
let authRefreshPromise=null;
function resetUserRuntime(){
  state.profile=null;state.modules=[];state.allModules=[];state.active='dashboard';state.today=null;state.meta=null;state.cobraCache=null;state.cobraCacheAt=0;
  ['__rymRevisadosPrefetch','__v106RevisadosCache','__v117ControlSummary','__v117HomeSummary','__v117Prefetching','__v126HomeGps','__v126Operational','__v96Reports'].forEach(k=>{try{delete window[k]}catch(_){window[k]=null}});
  document.querySelectorAll('#v101CheckModal,#v123PortalTransition,#v125PortalTransition,.v66-modal.open').forEach(x=>x.remove());
  document.body.className='';
}
function clearSession(){state.sessionVersion=Number(state.sessionVersion||0)+1;state.token='';state.refreshToken='';state.expiresAt=0;authRefreshPromise=null;resetUserRuntime()}
async function refreshSessionToken(){
  if(!state.refreshToken)throw Error('Tu sesión expiró. Ingresa nuevamente.');
  if(authRefreshPromise)return authRefreshPromise;
  const sessionVersion=state.sessionVersion;
  const pending=(async()=>{
    const r=await fetch(URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:state.refreshToken})});
    const t=await r.text();let d;try{d=t?JSON.parse(t):null}catch{d=t}
    if(sessionVersion!==state.sessionVersion)throw Error('La sesión cambió.');
    if(!r.ok||!d?.access_token){clearSession();throw Error('Tu sesión expiró. Ingresa nuevamente.')}
    state.token=String(d.access_token||'');
    state.refreshToken=String(d.refresh_token||state.refreshToken||'');
    state.expiresAt=Number(d.expires_at||0)||Math.floor(Date.now()/1000)+Number(d.expires_in||3600);
    return state.token;
  })();
  authRefreshPromise=pending;
  try{return await pending}finally{if(authRefreshPromise===pending)authRefreshPromise=null}
}
async function req(path,opt={}){
  const sessionVersion=state.sessionVersion;
  const canRefresh=!!state.refreshToken;
  if(canRefresh&&state.expiresAt&&Math.floor(Date.now()/1000)>=Number(state.expiresAt)-60)await refreshSessionToken();
  const send=()=>fetch(URL+path,{...opt,headers:{...H(),...(opt.headers||{})}});
  let r=await send(),t=await r.text(),d;try{d=t?JSON.parse(t):null}catch{d=t}
  const msg=String(d?.message||d?.error_description||d?.error||t||'');
  const jwtProblem=r.status===401&&/invalid jwt|jwt expired|token.*expired|expired.*token/i.test(msg);
  if(jwtProblem&&canRefresh){await refreshSessionToken();r=await send();t=await r.text();try{d=t?JSON.parse(t):null}catch{d=t}}
  if(sessionVersion!==state.sessionVersion)throw Error('La sesión cambió.');
  if(!r.ok){const m=String(d?.message||d?.error_description||d?.error||t||('HTTP '+r.status));if(r.status===401&&/invalid jwt|jwt expired|token.*expired|expired.*token/i.test(m)){clearSession();throw Error('Tu sesión expiró. Ingresa nuevamente.')}throw Error(m)}
  return {data:d,headers:r.headers}
}
async function rest(table,q=''){return (await req('/rest/v1/'+table+(q?'?'+q:''))).data}
async function rpc(fn,body={}){return (await req('/rest/v1/rpc/'+fn,{method:'POST',body:JSON.stringify(body)})).data}
function money(v){return (Number(v)||0).toFixed(2)}
function chipNum(n){n=Number(n)||0;return `<span class="chip ${n>=3?'bad':n===2?'warn':''}">${n}</span>`}
function cobraChip(v){const s=String(v||'SIN VALIDAR');const u=s.toUpperCase();const ok=u==='CARGADO A COBRA';const warn=u.includes('MONTO DIFERENTE')||u==='SIN VALIDAR';return `<span class="chip ${ok?'':warn?'warn':'bad'}">${esc(s)}</span>`}


async function cobraLive(desde,hasta,force=false){
  const key=String(desde||'')+'|'+String(hasta||'');
  const now=Date.now();
  if(!force && state.cobraCache && state.cobraCache.key===key && (now-state.cobraCacheAt)<300000)return state.cobraCache.data;
  const {data}=await req('/functions/v1/validar-cobra',{method:'POST',body:JSON.stringify({desde,hasta,soloPendientes:true,persistir:false})});
  if(!data?.ok)throw Error(data?.error||'No se pudo consultar Cobra en vivo.');
  state.cobraCache={key,data};state.cobraCacheAt=now;
  return data;
}

async function cobraValidate(desde,hasta,{soloNoValidados=true,soloPendientes=false}={}){
  const {data}=await req('/functions/v1/validar-cobra',{method:'POST',body:JSON.stringify({desde,hasta,soloPendientes,persistir:true,soloNoValidados})});
  if(!data?.ok)throw Error(data?.error||'No se pudo validar Cobra.');
  state.cobraCache=null;state.cobraCacheAt=0;
  return data;
}
function monthRanges(desde,hasta){
  const out=[];let d=new Date(desde+'T12:00:00Z'),end=new Date(hasta+'T12:00:00Z');
  while(d<=end){const y=d.getUTCFullYear(),m=d.getUTCMonth();const a=new Date(Date.UTC(y,m,1)),b=new Date(Date.UTC(y,m+1,0));out.push({desde:a<new Date(desde+'T12:00:00Z')?desde:a.toISOString().slice(0,10),hasta:b>end?hasta:b.toISOString().slice(0,10)});d=new Date(Date.UTC(y,m+1,1));}
  return out;
}

function loginView(msg=''){app.innerHTML=`<main class="login"><section class="login-card"><div class="login-logo"><img src="https://drive.google.com/thumbnail?id=1f65vwdwsAraUrK2h7cb5l_eVOQKuHsL8&sz=w1000" alt="Portal RYM" onerror="this.style.display='none'"></div><div class="brand">Portal RYM</div><h1>Portal RYM</h1><p class="muted login-help">Ingresa con tu usuario y contraseña.</p>${msg?`<div class="alert">${esc(msg)}</div>`:''}<form id="f"><input name="usuario" autocomplete="username" placeholder="Usuario" required><input name="password" type="password" autocomplete="current-password" placeholder="Contraseña" required><button id="loginBtn">Entrar</button></form></section></main>`;document.querySelector('#f').onsubmit=login}
async function login(e){e.preventDefault();const f=new FormData(e.currentTarget),b=document.querySelector('#loginBtn');b.disabled=true;b.textContent='Ingresando...';try{const {data}=await req('/functions/v1/auth-username',{method:'POST',body:JSON.stringify({usuario:f.get('usuario'),password:f.get('password')})});if(!data?.ok||!data.access_token)throw Error(data?.error||'No se pudo iniciar sesión.');const nextToken=data.access_token,nextRefresh=String(data.refresh_token||''),nextExpires=Number(data.expires_at||0)||0;clearSession();state.token=nextToken;state.refreshToken=nextRefresh;state.expiresAt=nextExpires;if(data.profile&&data.modules){state.profile=data.profile;state.modules=data.modules;if(data.profile.must_change_password){passwordChangeView();return}state.active=state.modules.includes('dashboard')?'dashboard':(state.modules[0]||'dashboard');shell();render().catch(x=>{const v=document.querySelector('#view');if(v)v.innerHTML=`<div class="alert">${esc(x.message||x)}</div>`});return}await loadApp()}catch(x){clearSession();loginView(x.message)}}
function passwordChangeView(){app.innerHTML=`<main class="login"><section class="password-panel"><div class="login-logo"><img src="https://drive.google.com/thumbnail?id=1f65vwdwsAraUrK2h7cb5l_eVOQKuHsL8&sz=w1000" alt="Portal RYM"></div><div class="brand" style="text-align:center">Portal RYM</div><h1>Cambia tu contraseña</h1><p class="muted">Por seguridad debes crear una contraseña personal antes de continuar.</p><form id="pc"><input name="p1" type="password" autocomplete="new-password" placeholder="Nueva contraseña" minlength="8" required><input name="p2" type="password" autocomplete="new-password" placeholder="Confirmar contraseña" minlength="8" required><button>Guardar contraseña</button></form><div id="pcMsg"></div></section></main>`;document.querySelector('#pc').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),m=document.querySelector('#pcMsg'),p1=String(f.get('p1')||''),p2=String(f.get('p2')||'');if(p1!==p2){m.innerHTML='<div class="alert">Las contraseñas no coinciden.</div>';return}m.innerHTML='<div class="card">Guardando...</div>';try{const {data}=await req('/functions/v1/change-password',{method:'POST',body:JSON.stringify({password:p1})});if(!data?.ok)throw Error(data?.error||'No se pudo cambiar la contraseña.');m.innerHTML='<div class="success">Contraseña actualizada.</div>';setTimeout(loadApp,350)}catch(x){m.innerHTML=`<div class="alert">${esc(x.message)}</div>`}}}
async function loadApp(){try{const me=(await req('/auth/v1/user')).data;const p=(await rest('perfiles_usuario','select=id,nombre,email,usuario,rol,activo,supervisora_id,must_change_password&id=eq.'+me.id))[0];if(!p?.activo)throw Error('Tu usuario no está habilitado.');state.profile=p;if(p.must_change_password){passwordChangeView();return}const [mods,ovs,metaRes]=await Promise.all([rest('rol_modulo_permisos','select=modulo_codigo,puede_ver&rol=eq.'+encodeURIComponent(String(p.rol).toUpperCase())+'&puede_ver=eq.true'),rest('usuario_permisos','select=modulo_codigo,puede_ver&user_id=eq.'+me.id),rpc('panapass_meta').catch(()=>[])]);const map=new Map((mods||[]).map(x=>[x.modulo_codigo,true]));for(const o of ovs||[]){if(o.puede_ver===true)map.set(o.modulo_codigo,true);if(o.puede_ver===false)map.delete(o.modulo_codigo)}state.modules=[...map.keys()];state.active=state.modules.includes('dashboard')?'dashboard':(state.modules[0]||'dashboard');state.meta=metaRes?.[0]||null;shell();try{await render()}catch(x){const v=document.querySelector('#view');if(v)v.innerHTML=`<div class="alert">${esc(x.message||x)}</div>`}}catch(x){clearSession();loginView(x.message)}}
function shell(){
  document.body.classList.remove('capture-mode');
  let navModules=[...state.modules];
  const hasOps=navModules.some(m=>['operaciones','operacion_am','operacion_pm'].includes(m));
  navModules=navModules.filter(m=>!['operacion_am','operacion_pm','pendientes_externo'].includes(m));
  if(hasOps&&!navModules.includes('operaciones'))navModules.push('operaciones');
  if(['operacion_am','operacion_pm'].includes(state.active))state.active='operaciones';
  app.innerHTML=`<div class="shell"><aside class="side"><div class="brand-logo-app"><img src="https://drive.google.com/thumbnail?id=1f65vwdwsAraUrK2h7cb5l_eVOQKuHsL8&sz=w1000" alt="Portal RYM" onerror="this.parentElement.innerHTML='<div class=&quot;brand&quot;>Portal RYM</div>'"></div><div class="portal-name-side">Portal RYM</div><nav class="nav">${navModules.map(m=>`<button data-m="${m}" class="${m===state.active?'active':''}">${labels[m]||m}</button>`).join('')}</nav><div class="user"><strong>${esc(state.profile.nombre||state.profile.email)}</strong><span>${esc(state.profile.rol)}</span><button class="logout" id="out" title="Cerrar sesión">Salir</button></div></aside><main class="main"><header class="top"><div><h1>${labels[state.active]||state.active}</h1><div class="portal-kicker">Portal RYM</div></div><span class="pill">${esc(state.profile.rol)}</span></header><section id="view"></section></main></div>`;
  document.querySelectorAll('[data-m]').forEach(b=>b.onclick=async()=>{state.active=b.dataset.m;shell();await render()});
  document.querySelector('#out').onclick=()=>{clearSession();loginView()}
}
async function render(){const v=document.querySelector('#view');v.innerHTML='<div class="card">Cargando...</div>';try{if(state.active==='dashboard')return dashboard(v);if(state.active==='ranking')return ranking(v);if(state.active==='negativos_hoy')return negativos(v);if(state.active==='pagos_hoy')return isAdminRole()?pagosTrabajo(v):pagosConsultaHoy(v);if(state.active==='historial')return historial(v);if(state.active==='pendientes_externo'){state.active='historial';shell();return historial(document.querySelector('#view'));}if(state.active==='recurrentes')return recurrentes(v);if(state.active==='operaciones'||state.active==='operacion_am'||state.active==='operacion_pm')return operaciones(v);if(state.active==='reportes')return reportes(v);if(state.active==='usuarios')return usuarios(v);v.innerHTML=`<div class="card"><h2>${esc(labels[state.active]||state.active)}</h2><p class="muted">Módulo preparado para la siguiente fase operativa.</p></div>`}catch(x){v.innerHTML=`<div class="alert">${esc(x.message||x)}</div>`}}
function role(){return String(state.profile?.rol||'').toUpperCase()}
function isAdminRole(){return ['ADMIN_TOTAL','ADMIN','SISTEMA','PAGADOR'].includes(role())}
function isFullAdmin(){return ['ADMIN_TOTAL','ADMIN','SISTEMA'].includes(role())}
function isManager(){return role()==='GERENTE_GALERA'}
function fmtDT(v){if(!v)return '-';try{return new Date(v).toLocaleString('es-PA',{timeZone:'America/Panama',dateStyle:'short',timeStyle:'short'})}catch{return String(v)}}
function dlBase64(name,b64,mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'){const a=document.createElement('a');a.href=`data:${mime};base64,${b64}`;a.download=name;document.body.appendChild(a);a.click();a.remove()}
function fileB64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||'').split(',').pop()||'');r.onerror=reject;r.readAsDataURL(file)})}

