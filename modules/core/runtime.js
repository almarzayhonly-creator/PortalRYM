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
function role(){return String(state.profile?.rol||'').toUpperCase()}
function isAdminRole(){return ['ADMIN_TOTAL','ADMIN','SISTEMA','PAGADOR'].includes(role())}
function isFullAdmin(){return ['ADMIN_TOTAL','ADMIN','SISTEMA'].includes(role())}
function isManager(){return role()==='GERENTE_GALERA'}
function fmtDT(v){if(!v)return '-';try{return new Date(v).toLocaleString('es-PA',{timeZone:'America/Panama',dateStyle:'short',timeStyle:'short'})}catch{return String(v)}}
function dlBase64(name,b64,mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'){const a=document.createElement('a');a.href=`data:${mime};base64,${b64}`;a.download=name;document.body.appendChild(a);a.click();a.remove()}
function fileB64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||'').split(',').pop()||'');r.onerror=reject;r.readAsDataURL(file)})}

function toggleCapture(btn,selector){
  const on=document.body.classList.toggle('capture-mode');
  document.querySelector(selector+' .table-wrap')?.classList.toggle('capture',on);
  if(btn){btn.textContent=on?'Salir de captura':'Vista captura';btn.setAttribute('aria-pressed',on?'true':'false')}
  if(on)window.scrollTo({top:0,behavior:'smooth'});
}


async function ranking(v){
  v.innerHTML='<div class="card">Cargando ranking de pagos...</div>';
  let dia=[],mes=[];try{[dia,mes]=await Promise.all([rpc('panapass_ranking_pagos',{p_periodo:'DIA'}),rpc('panapass_ranking_pagos',{p_periodo:'MES'})])}catch(x){v.innerHTML=`<div class="alert">${esc(x.message)}</div>`;return}
  const all=[...dia,...mes],galeras=[...new Set(all.map(x=>x.galera).filter(Boolean))];const diaFecha=dia?.[0]?.fecha_desde||state.today||'';const esHoy=diaFecha===state.today;
  const me=dia.find(x=>x.supervisora_id===state.profile?.supervisora_id);const initial=isAdminRole()?'TODAS':(me?.galera||galeras[0]||'TODAS');
  v.innerHTML=`<div class="source-card"><span class="entity-chip">RANKING DE PAGOS</span><div class="source-text"><strong>Una sola métrica: resultado de cobranza</strong><p>Menos unidades que necesitaron pago = mejor posición. Se muestra el cierre del día y el acumulado del mes.</p></div></div>
  <div class="section-tools"><div class="field"><label>Galera</label><select id="rankGalera">${isAdminRole()?'<option value="TODAS">Todas las 4 galeras</option>':''}${galeras.map(g=>`<option ${g===initial?'selected':''}>${esc(g)}</option>`).join('')}</select></div><div class="field"><label>Periodo</label><select id="rankPeriodo"><option value="DIA">Día / último cierre</option><option value="MES">Mes</option></select></div></div>${!esHoy?`<div class="source-card" style="margin-top:12px"><span class="entity-chip">SIN PAGOS HOY</span><div class="source-text"><strong>Mostrando el último cierre con pagos: ${esc(diaFecha)}</strong><p>Hoy todavía no hay pagos registrados. Para no mostrar un ranking vacío, el portal conserva como referencia el último día con actividad.</p></div></div>`:''}<div id="rankOut"></div>`;
  const medals=['🥇','🥈','🥉'];
  function draw(){const g=document.querySelector('#rankGalera').value,per=document.querySelector('#rankPeriodo').value;let rows=(per==='DIA'?dia:mes).slice();if(g!=='TODAS')rows=rows.filter(x=>x.galera===g).sort((a,b)=>a.posicion_galera-b.posicion_galera);else rows.sort((a,b)=>a.posicion_global-b.posicion_global);const pos=x=>g==='TODAS'?x.posicion_global:x.posicion_galera;const total=x=>g==='TODAS'?x.total_global:x.total_galera;document.querySelector('#rankOut').innerHTML=`<div class="rank-podium">${rows.slice(0,3).map((x,i)=>`<div class="rank-pod r${i+1}"><div class="rank-medal">${medals[i]}</div><span class="rank-name profile-link" data-sup-id="${esc(x.supervisora_id||'')}">${esc(x.supervisora_nombre)}</span><div class="rank-stat">${esc(x.galera)} · ${x.unidades_pagadas} unidades pagadas</div><div class="rank-stat">Monto ${money(x.monto_pagado)}</div></div>`).join('')}</div><div class="panel mobile-cards" style="margin-top:14px"><div class="rank-table-title"><h3>${per==='DIA'?(esHoy?'Cierre de hoy':`Último día con pagos · ${esc(diaFecha)}`):'Acumulado del mes'}</h3><span>${g==='TODAS'?'General · 4 galeras':esc(g)}</span></div><div class="table-wrap"><table class="pretty"><thead><tr><th>Pos.</th><th>Galera</th><th>Supervisora</th><th>Unidades pagadas</th><th>Monto pagado</th></tr></thead><tbody>${rows.map(x=>`<tr class="${x.supervisora_id===state.profile?.supervisora_id?'rank-me':''}"><td data-label="Posición"><b>#${pos(x)} / ${total(x)}</b></td><td data-label="Galera">${esc(x.galera)}</td><td data-label="Supervisora"><b class="profile-link" data-sup-id="${esc(x.supervisora_id||'')}">${esc(x.supervisora_nombre)}</b></td><td data-label="Unidades pagadas">${x.unidades_pagadas}</td><td data-label="Monto">${money(x.monto_pagado)}</td></tr>`).join('')}</tbody></table></div></div>`}
  document.querySelector('#rankGalera').value=initial;document.querySelector('#rankGalera').onchange=draw;document.querySelector('#rankPeriodo').onchange=draw;draw();
  document.querySelector('#rankOut').onclick=e=>{const el=e.target.closest('[data-sup-id]');if(el?.dataset.supId)openSupervisoraProfile(el.dataset.supId)};
}
async function pagos(v){
  const minf=state.meta?.min_pago||'2025-01-02',maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10);
  v.innerHTML=`
    <div class="section-tools">
      <div class="field"><label>Fecha</label><input id="pagFecha" type="date" min="${minf}" max="${maxf}" value="${maxf}"></div>
      <div class="field"><label>Buscar</label><input id="pagQ" placeholder="Unidad, operador, N_OP o empresa"></div>
      <button id="pagBuscar">Consultar</button>
      <button id="pagCompact" class="soft-btn">Vista captura</button>
      <div class="share-note">Consulta hoy, ayer o cualquier fecha histórica.</div>
    </div>
    <div id="pagOut"><div class="card">Cargando...</div></div>`;
  let lastRows=[];
  async function draw(){
    const fecha=document.querySelector('#pagFecha').value;
    const out=document.querySelector('#pagOut');
    out.innerHTML='<div class="card">Consultando...</div>';
    try{
      lastRows=await rpc('panapass_pagos_fecha',{p_fecha:fecha||null});
      const q=document.querySelector('#pagQ').value.trim().toLowerCase();
      const rows=q?lastRows.filter(r=>[r.unidad,r.empresa,r.operador,r.n_op,r.cobrador].join(' ').toLowerCase().includes(q)):lastRows;
      const total=rows.reduce((a,x)=>a+Number(x.a_pagar||0),0);
      const boleta=rows.reduce((a,x)=>a+Number(x.boleta||0),0);
      const mx=rows.reduce((a,x)=>Math.max(a,Number(x.pag7||0)),0);
      out.innerHTML=`<div class="kpis">
        <div class="kpi"><span>Pagos</span><strong>${rows.length}</strong></div>
        <div class="kpi"><span>Total A pagar</span><strong style="color:var(--green)">${money(total)}</strong></div>
        <div class="kpi"><span>Total boleta</span><strong>${money(boleta)}</strong></div>
        <div class="kpi"><span>Máx pag 7d</span><strong>${mx}</strong></div>
      </div>${tableHtml(rows,['fecha','unidad','empresa','a_pagar','boleta','pag7','n_op','operador','cobrador','tipo','estado_cobra'],'pretty','mobile-cards')}`;
    }catch(x){out.innerHTML=`<div class="alert">${esc(x.message)}</div>`}
  }
  document.querySelector('#pagBuscar').onclick=draw;
  document.querySelector('#pagQ').oninput=draw;
  document.querySelector('#pagCompact').onclick=e=>toggleCapture(e.currentTarget,'#pagOut');
  await draw();
}
function pagosTrabajoTable(rows){
  if(!rows.length)return '<div class="panel"><div class="empty">La hoja online está vacía. Pulsa “Preparar desde pendientes PM”.</div></div>';
  return `<div class="panel pagos-online mobile-cards"><div class="table-wrap"><table class="pretty compact-table pagos-work-fit"><thead><tr><th>Unidad</th><th>Panapass</th><th>Placa</th><th>Saldo PM</th><th>Monto pagado</th><th>Boleta</th><th>N_OP</th><th>Operador</th><th>Tipo</th><th>Cobrador</th><th></th></tr></thead><tbody>${rows.map(r=>{
    const lockNop=String(r.numero_operador||'').trim()!=='';
    const lockOp=String(r.nombre_operador||'').trim()!=='';
    const empresa=r.empresa_operadora||r.empresa_duena||r.empresa||'';
    const placa=r.placa||r.placa_unica||r.placa_comercial||'';
    const panapass=r.panapass_numero||r.panapass||'';
    return `<tr data-pay-row-unit="${esc(r.unidad||'')}" data-pay-updated="${esc(r.updated_at||'')}" data-pay-saved="${r.guardado_en?'1':'0'}" data-pay-saved-at="${esc(r.guardado_en||'')}"><td data-label="Unidad" data-pay-unit-cell><b data-pay-unit>${esc(r.unidad)}</b><small data-pay-company>${esc(empresa)}</small></td><td data-label="Panapass"><b data-pay-panapass>${esc(panapass)}</b></td><td data-label="Placa"><b data-pay-plate>${esc(placa)}</b></td><td data-label="Saldo PM" class="saldo">${money(r.monto_original)}</td><td data-label="Monto pagado"><input data-pay type="number" min="0" step="0.01" value="${Number(r.a_pagar||0)}"></td><td data-label="Boleta"><b>${money(r.con_boleta)}</b></td><td data-label="N_OP"><input data-nop value="${esc(r.numero_operador||'')}" ${lockNop?'readonly class="readonly-user" title="Dato asignado automáticamente"':''}></td><td data-label="Operador"><input data-op value="${esc(r.nombre_operador||'')}" ${lockOp?'readonly class="readonly-user" title="Dato asignado automáticamente"':''}></td><td data-label="Tipo"><select data-tipo><option ${r.tipo==='PRE DIARIO'?'selected':''}>PRE DIARIO</option><option ${r.tipo==='PRE NO DIARIO'?'selected':''}>PRE NO DIARIO</option><option ${r.tipo==='GASTO'?'selected':''}>GASTO</option><option ${r.tipo==='LOGISTICA'?'selected':''}>LOGISTICA</option></select></td><td data-label="Cobrador"><input data-cobrador value="${esc(r.cobrador||'')}" readonly class="readonly-user" title="Supervisora asignada a la unidad"></td><td data-label="Acción"><button class="soft-btn" data-save-pay="${r.id}">Guardar</button></td></tr>`
  }).join('')}</tbody></table></div></div>`
}

async function pendientes(v){
  const minf=state.meta?.min_pago||'2025-01-02',maxf=state.meta?.max_pago||state.today||new Date().toISOString().slice(0,10);
  v.innerHTML=`<div class="source-card"><span class="entity-chip">PENDIENTES EXTERNO</span><div class="source-text"><strong>Todo lo pendiente dentro de tu alcance</strong><p>Por defecto muestra el histórico pendiente de la supervisora. Usa fecha solo cuando quieras revisar un día específico.</p></div></div><div class="section-tools"><div class="field"><label>Fecha opcional</label><input id="cobFecha" type="date" min="${minf}" max="${maxf}"></div><div class="field"><label>Buscar</label><input id="cobQ" placeholder="Unidad, operador o N_OP"></div><button id="cobLoad">Consultar</button>${isAdminRole()?'<button id="cobValidar" class="soft-btn">Validar fecha en Cobra</button>':''}</div><div id="cobMsg"></div><div id="cobOut"></div>`;
  let all=[];function paint(){const q=document.querySelector('#cobQ').value.trim().toLowerCase();let rows=all.filter(r=>String(r.estado_cobra||'').toUpperCase()!=='CARGADO A COBRA');if(q)rows=rows.filter(r=>[r.unidad,r.operador,r.n_op,r.cobrador].join(' ').toLowerCase().includes(q));const total=rows.reduce((a,x)=>a+Number(x.boleta||x.a_pagar||0),0);document.querySelector('#cobOut').innerHTML=`<div class="kpis"><div class="kpi"><span>Pendientes</span><strong>${rows.length}</strong></div><div class="kpi"><span>Monto pendiente</span><strong style="color:var(--red)">${money(total)}</strong></div></div>${tableHtml(rows,['fecha','unidad','a_pagar','boleta','n_op','operador','cobrador','tipo','estado_cobra'],'pretty','mobile-cards')}`}
  async function load(){const f=document.querySelector('#cobFecha').value;const o=document.querySelector('#cobOut');o.innerHTML='<div class="card">Consultando pendientes...</div>';try{if(f)all=await rpc('panapass_pagos_fecha',{p_fecha:f});else all=await rpc('panapass_historial',{p_unidad:null,p_operador:null,p_desde:minf,p_hasta:maxf,p_limit:1000});paint()}catch(x){o.innerHTML=`<div class="alert">${esc(x.message)}</div>`}}
  document.querySelector('#cobQ').oninput=paint;document.querySelector('#cobLoad').onclick=load;document.querySelector('#cobFecha').onchange=load;
  if(isAdminRole())document.querySelector('#cobValidar').onclick=async()=>{const f=document.querySelector('#cobFecha').value,m=document.querySelector('#cobMsg');if(!f){m.innerHTML='<div class="alert">Selecciona una fecha para validar Cobra.</div>';return}try{const d=await cobraValidate(f,f,{soloNoValidados:true});m.innerHTML=`<div class="success">${esc(d.mensaje)}</div>`;await load()}catch(x){m.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};await load();
}
async function recurrentes(v){
  const minf=state.meta?.min_pago||'2025-01-02',maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10);
  const now=new Date(maxf+'T12:00:00'),monthStart=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const gals=Array.isArray(state.meta?.galeras)?state.meta.galeras.filter(Boolean):[];
  v.innerHTML=`
    <div class="source-card"><span class="entity-chip">RECURRENTES</span><div class="source-text"><strong>Dos análisis independientes</strong><p>Operador y unidad se analizan por separado. 5+ pagos en el mes entra en recurrentes; 8+ se marca crítico.</p></div></div>
    <div class="section-tools">
      <div class="field"><label>Galera</label><select id="rg"><option value="">Todas las visibles</option>${gals.map(g=>`<option>${esc(g)}</option>`).join('')}</select></div>
      <div class="field"><label>Desde</label><input id="rd" type="date" value="${monthStart}" min="${minf}" max="${maxf}"></div>
      <div class="field"><label>Hasta</label><input id="rh" type="date" value="${maxf}" min="${minf}" max="${maxf}"></div>
      <div class="field"><label>Mínimo pagos/mes</label><input id="rmin" type="number" min="2" max="20" value="5"></div>
      <button id="rb">Analizar</button>
    </div>
    <div id="rout"><div class="card">Cargando análisis...</div></div>`;

  function renderSection(title,chip,rows,columns,description){
    return `<div class="source-card recurrent-section-head"><span class="entity-chip ${chip==='UNIDADES'?'unit':''}">${chip}</span><div class="source-text"><strong>${title}</strong><p>${description}</p></div></div>
      ${tableHtml(rows,columns,'pretty compact-table','mobile-cards')}`;
  }

  async function run(){
    const out=document.querySelector('#rout');
    out.innerHTML='<div class="card">Analizando frecuencias...</div>';
    try{
      const all=await rpc('panapass_recurrentes_entidad',{
        p_desde:document.querySelector('#rd').value,
        p_hasta:document.querySelector('#rh').value,
        p_galera:document.querySelector('#rg').value||null,
        p_min_pagos:Number(document.querySelector('#rmin').value||5),
        p_limit:1000
      });

      const opsRows=all.filter(x=>x.tipo_entidad==='OPERADOR').map(x=>({...x,
        n_op_recurrente:x.identificador,
        operador_recurrente:x.nombre,
        unidades_recurrente:x.unidad
      }));
      const unitRows=all.filter(x=>x.tipo_entidad==='UNIDAD').map(x=>({...x,
        unidad_recurrente:x.identificador
      }));

      const critOps=opsRows.filter(x=>x.nivel==='CRITICO').length;
      const critUnits=unitRows.filter(x=>x.nivel==='CRITICO').length;

      out.innerHTML=`<div class="kpis">
        <div class="kpi"><span>Operadores recurrentes</span><strong>${opsRows.length}</strong></div>
        <div class="kpi"><span>Operadores críticos 8+</span><strong style="color:var(--red)">${critOps}</strong></div>
        <div class="kpi"><span>Unidades recurrentes</span><strong>${unitRows.length}</strong></div>
        <div class="kpi"><span>Unidades críticas 8+</span><strong style="color:var(--red)">${critUnits}</strong></div>
      </div>
      <div class="recurrent-two-blocks">
        <section>${renderSection('Frecuencia por operador','OPERADORES',opsRows,['mes','n_op_recurrente','operador_recurrente','galera','unidades_recurrente','supervisora','pagos','dias_con_pago','total_pagado','nivel'],'Mide cuántas veces el mismo operador necesitó pago durante el periodo.')}</section>
        <section>${renderSection('Frecuencia por unidad','UNIDADES',unitRows,['mes','unidad_recurrente','galera','supervisora','pagos','dias_con_pago','total_pagado','nivel'],'Mide cuántas veces la misma unidad necesitó pago, sin depender del operador asignado.')}</section>
      </div>`;
    }catch(x){
      out.innerHTML=`<div class="alert">${esc(x.message)}</div>`;
    }
  }
  document.querySelector('#rb').onclick=run;
  await run();
}



async function usuarios(v){
  if(!isFullAdmin()){v.innerHTML='<div class="alert">Sin permiso.</div>';return}
  v.innerHTML='<div id="usersRoot"><div class="card">Cargando usuarios...</div></div>';
  async function load(){
    const root=document.querySelector('#usersRoot');
    try{
      const {data}=await req('/functions/v1/admin-users',{method:'POST',body:JSON.stringify({action:'list'})});
      if(!data?.ok)throw Error(data?.error||'No se pudieron cargar usuarios.');
      const users=data.users||[],sups=data.supervisoras||[],galeras=data.galeras||['VCARS','VCOMP','VIPCO','VINDU'],mods=(data.modulos||[]).filter(m=>!['operacion_am','operacion_pm','pendientes_externo'].includes(m.codigo)),rolePerms=data.rol_permisos||[],userPerms=data.usuario_permisos||[];
      const firstName=n=>String(n||'').trim().split(/\s+/)[0].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
      root.innerHTML=`<div class="user-admin-grid">
        <div class="card"><h2>Crear usuario</h2><p class="muted">El usuario se genera con el primer nombre. Tú asignas la contraseña inicial.</p><form id="cu" class="grid-form">
          <div class="field"><label>Nombre completo</label><input name="nombre" id="newName" placeholder="Ej. Dayana Prieto" required></div>
          <div class="field"><label>Usuario</label><input id="newUserPreview" class="readonly-user" value="" placeholder="Se genera automáticamente" readonly></div>
          <div class="field"><label>Correo</label><input name="email" type="email" placeholder="correo@empresa.com" required></div>
          <div class="field"><label>Contraseña temporal</label><input name="password" type="password" minlength="6" placeholder="Mínimo 6 caracteres" required></div>
          <div class="field"><label>Rol</label><select name="rol"><option>SUPERVISORA</option><option>GERENTE_GALERA</option><option>PAGADOR</option><option>OPERATIVO</option><option>ADMIN</option><option>SISTEMA</option><option>ADMIN_TOTAL</option></select></div>
          <div class="field"><label>Galera(s) · Gerente/Admin</label><select name="galeras_scope" multiple>${galeras.map(g=>`<option value="${g}">${g}</option>`).join('')}</select></div>
          <div class="field"><label>Supervisora(s) · rol Supervisora</label><select name="supervisoras" class="multi-sup" multiple>${sups.map(s=>`<option value="${s.id}">${esc(s.nombre)} · ${esc(s.galera||'')}</option>`).join('')}</select></div>
          <label style="display:flex;gap:8px;align-items:center"><input name="must" type="checkbox" checked style="width:auto"> Obligar a cambiar contraseña en el primer inicio</label>
          <button>Crear usuario</button></form><div id="ur"></div></div>
        <div class="card"><div class="table-summary"><div><h2 style="margin:0">Usuarios</h2><span class="muted">${users.length} accesos creados</span></div><button id="usersReload" class="soft-btn">Actualizar</button></div>
          <div class="user-list-row user-list-head"><div>Nombre</div><div>Correo</div><div>Usuario</div><div>Rol</div><div>Supervisora(s)</div><div>Estado</div><div>Acciones</div></div>
          ${users.map(u=>`<div class="user-list-row"><div><b>${esc(u.nombre||'')}</b><br><span class="muted">${u.must_change_password?'Cambio de clave pendiente':''}</span></div><div>${esc(u.email||'')}</div><div><b>${esc(u.usuario||'-')}</b></div><div><span class="pill">${esc(u.rol)}</span></div><div>${(u.supervisoras||[]).map(s=>esc(s.nombre||s.id)).join(', ')||'-'}</div><div><span class="user-status ${u.activo?'on':'off'}">${u.activo?'ACTIVO':'INACTIVO'}</span></div><div class="user-actions"><button class="soft-btn" data-open-user="${u.id}">Administrar</button><button class="danger" data-del-user="${u.id}">Eliminar</button></div></div>`).join('')}
          <div id="userEditPanel"></div>
        </div></div>`;
      document.querySelector('#usersReload').onclick=load;
      document.querySelector('#newName').oninput=e=>document.querySelector('#newUserPreview').value=firstName(e.target.value);
      document.querySelector('#cu').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),ur=document.querySelector('#ur'),supIds=[...e.currentTarget.querySelector('[name=supervisoras]').selectedOptions].map(o=>o.value),gals=[...e.currentTarget.querySelector('[name=galeras_scope]').selectedOptions].map(o=>o.value);ur.innerHTML='<div class="card">Creando usuario...</div>';try{const {data:r}=await req('/functions/v1/admin-users',{method:'POST',body:JSON.stringify({action:'create',nombre:f.get('nombre'),email:f.get('email'),password:f.get('password'),rol:f.get('rol'),supervisora_ids:supIds,galeras_scope:gals,must_change_password:f.get('must')==='on'})});if(!r?.ok)throw Error(r?.error||'No se pudo crear.');ur.innerHTML=`<div class="success">Usuario creado: <b>${esc(r.usuario)}</b>. La contraseña temporal quedó asignada.</div>`;setTimeout(load,650)}catch(x){ur.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
      document.querySelectorAll('[data-open-user]').forEach(b=>b.onclick=()=>openUser(users.find(x=>x.id===b.dataset.openUser)));
      document.querySelectorAll('[data-del-user]').forEach(b=>b.onclick=async()=>{const u=users.find(x=>x.id===b.dataset.delUser);if(!u)return;if(!confirm(`¿Eliminar el usuario ${u.nombre} (${u.usuario})?\n\nSe eliminará su acceso y sus permisos.`))return;try{const {data:r}=await req('/functions/v1/admin-users',{method:'POST',body:JSON.stringify({action:'delete',id:u.id})});if(!r?.ok)throw Error(r?.error||'No se pudo eliminar');await load()}catch(x){alert(x.message)}});
      function openUser(u){if(!u)return;const selected=new Set((u.supervisoras||[]).map(x=>x.id));const base=new Map(rolePerms.filter(x=>x.rol===u.rol).map(x=>[x.modulo_codigo,x]));const ov=new Map(userPerms.filter(x=>x.user_id===u.id).map(x=>[x.modulo_codigo,x]));const effective=(m,k)=>ov.has(m)?!!ov.get(m)[k]:!!base.get(m)?.[k];
        document.querySelector('#userEditPanel').innerHTML=`<div class="user-modal" id="userModal"><div class="user-modal-card"><div class="table-summary"><div><h3 style="margin:0">${esc(u.nombre)}</h3><span class="muted">Usuario: ${esc(u.usuario||'-')}</span></div><button class="soft-btn" id="closeUser">Cerrar</button></div>${u.source_system?`<div class="user-source-grid"><div class="user-source-item"><span>Origen</span><b>LogisticTodo</b></div><div class="user-source-item"><span>Área</span><b>${esc(u.source_area||'-')}</b></div><div class="user-source-item"><span>Función</span><b>${esc(u.source_funcion||'-')}</b></div><div class="user-source-item"><span>Nivel / Terminal</span><b>${esc(u.source_nivel_acceso??'-')} / ${esc(u.source_terminal??'-')}</b></div></div>`:''}<div class="user-card-tabs"><button class="soft-btn" data-ut="datos">Datos</button><button class="soft-btn" data-ut="permisos">Permisos</button><button class="soft-btn" data-ut="seguridad">Seguridad</button></div><div id="userTab"></div></div></div>`;
        const closeModal=()=>document.querySelector('#userEditPanel').innerHTML='';
        document.querySelector('#closeUser').onclick=closeModal;
        document.querySelector('#userModal').onclick=e=>{if(e.target.id==='userModal')closeModal()};
        const tab=document.querySelector('#userTab');
        const datos=()=>{tab.innerHTML=`<form id="ue" class="grid-form"><div class="field"><label>Nombre</label><input name="nombre" value="${esc(u.nombre||'')}" required></div><div class="field"><label>Usuario</label><input class="readonly-user" value="${esc(u.usuario||'')}" readonly></div><div class="field"><label>Correo</label><input name="email" type="email" value="${esc(u.email||'')}" required></div><div class="field"><label>Rol</label><select name="rol">${['SUPERVISORA','GERENTE_GALERA','PAGADOR','OPERATIVO','ADMIN','SISTEMA','ADMIN_TOTAL'].map(r=>`<option ${r===u.rol?'selected':''}>${r}</option>`).join('')}</select></div><label style="display:flex;gap:8px;align-items:center"><input name="activo" type="checkbox" ${u.activo?'checked':''} style="width:auto"> Usuario activo</label><div class="field"><label>Galera(s) · Gerente/Admin</label><select name="galeras_scope" multiple>${galeras.map(g=>`<option value="${g}" ${(u.galeras_scope||[]).includes(g)?'selected':''}>${g}</option>`).join('')}</select></div><div class="field"><label>Supervisora(s) · rol Supervisora</label><select name="supervisoras" class="multi-sup" multiple>${sups.map(s=>`<option value="${s.id}" ${selected.has(s.id)?'selected':''}>${esc(s.nombre)} · ${esc(s.galera||'')}</option>`).join('')}</select></div><button>Guardar datos</button></form><div id="ueMsg"></div>`;document.querySelector('#ue').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),msg=document.querySelector('#ueMsg'),supIds=[...e.currentTarget.querySelector('[name=supervisoras]').selectedOptions].map(o=>o.value),gals=[...e.currentTarget.querySelector('[name=galeras_scope]').selectedOptions].map(o=>o.value);msg.innerHTML='<div class="card">Guardando...</div>';try{const {data:r}=await req('/functions/v1/admin-users',{method:'POST',body:JSON.stringify({action:'update',id:u.id,nombre:f.get('nombre'),email:f.get('email'),rol:f.get('rol'),activo:f.get('activo')==='on',supervisora_ids:supIds,galeras_scope:gals})});if(!r?.ok)throw Error(r?.error||'No se pudo guardar');msg.innerHTML='<div class="success">Datos actualizados.</div>';setTimeout(load,500)}catch(x){msg.innerHTML=`<div class="alert">${esc(x.message)}</div>`}}};
        const permisos=()=>{const rows=mods.map(m=>`<div><b>${esc(m.nombre)}</b></div>${['puede_ver','puede_crear','puede_editar','puede_eliminar'].map(k=>`<div><label><input type="checkbox" data-pm="${m.codigo}" data-pk="${k}" ${effective(m.codigo,k)?'checked':''}></label></div>`).join('')}`).join('');tab.innerHTML=`<p class="muted">Define exactamente qué puede hacer este usuario en cada módulo.</p><div class="perm-grid"><div class="ph">Módulo</div><div class="ph">Ver</div><div class="ph">Crear</div><div class="ph">Editar</div><div class="ph">Eliminar</div>${rows}</div><div style="margin-top:14px"><button id="savePerms">Guardar permisos</button></div><div id="permMsg"></div>`;document.querySelector('#savePerms').onclick=async()=>{const msg=document.querySelector('#permMsg'),perms=mods.map(m=>{const get=k=>!!document.querySelector(`[data-pm="${m.codigo}"][data-pk="${k}"]`)?.checked;return{modulo_codigo:m.codigo,puede_ver:get('puede_ver'),puede_crear:get('puede_crear'),puede_editar:get('puede_editar'),puede_eliminar:get('puede_eliminar')}});msg.innerHTML='<div class="card">Guardando permisos...</div>';try{const {data:r}=await req('/functions/v1/admin-users',{method:'POST',body:JSON.stringify({action:'permissions',id:u.id,permisos:perms})});if(!r?.ok)throw Error(r?.error||'No se pudieron guardar');msg.innerHTML='<div class="success">Permisos actualizados.</div>'}catch(x){msg.innerHTML=`<div class="alert">${esc(x.message)}</div>`}}};
        const seguridad=()=>{tab.innerHTML=`<div class="security-box"><div><b>Estado de contraseña</b><div class="muted">${u.must_change_password?'Debe cambiarla en el próximo inicio':'Sin cambio obligatorio pendiente'}</div></div><div class="field"><label>Nueva contraseña temporal</label><input id="tmpPass" type="password" minlength="6" placeholder="Mínimo 6 caracteres"></div><label style="display:flex;gap:8px;align-items:center"><input id="forcePass" type="checkbox" style="width:auto"> Obligar cambio en el próximo inicio</label><button id="setPass">Asignar contraseña</button><div id="secMsg"></div></div>`;document.querySelector('#setPass').onclick=async()=>{const password=document.querySelector('#tmpPass').value,msg=document.querySelector('#secMsg');if(password.length<6){msg.innerHTML='<div class="alert">La contraseña debe tener al menos 6 caracteres.</div>';return}if(!confirm(`¿Asignar una nueva contraseña temporal a ${u.nombre}?`))return;msg.innerHTML='<div class="card">Actualizando contraseña...</div>';try{const {data:r}=await req('/functions/v1/admin-users',{method:'POST',body:JSON.stringify({action:'set_password',id:u.id,password,must_change_password:document.querySelector('#forcePass').checked})});if(!r?.ok)throw Error(r?.error||'No se pudo actualizar');msg.innerHTML='<div class="success">Contraseña temporal asignada.</div>';setTimeout(load,500)}catch(x){msg.innerHTML=`<div class="alert">${esc(x.message)}</div>`}}};
        document.querySelectorAll('[data-ut]').forEach(x=>x.onclick=()=>({datos,permisos,seguridad}[x.dataset.ut]||datos)());datos();
      }
    }catch(x){root.innerHTML=`<div class="alert">${esc(x.message)}</div>`}
  }
  await load();
}
function tableHtml(rows,cols,extraClass='',panelClass=''){
  const human={
    fecha:'Fecha',status:'Estatus',unidad:'Unidad',placa:'Placa',panapass_numero:'Panapass',empresa:'Empresa',
    neg7:'Neg. 7d',saldo:'Saldo',a_pagar:'A pagar',boleta:'Boleta',pag7:'Pag. 7d',n_op:'N_OP',
    operador:'Operador',cobrador:'Cobrador',tipo:'Tipo',estado_cobra:'Estado Cobra',mes:'Mes',galera:'Galera',
    unidades:'Unidad(es)',supervisoras:'Supervisora',pagos:'Pagos',dias_con_pago:'Días con pago',
    total_pagado:'Total pagado',primera_fecha:'Primera fecha',ultima_fecha:'Última fecha',nivel:'Nivel',tipo_entidad:'Tipo',identificador:'Identificador',nombre:'Nombre',supervisora:'Supervisora',
    n_op_recurrente:'N° Operador',operador_recurrente:'Operador',unidades_recurrente:'Unidad(es)',unidad_recurrente:'Unidad',monto:'Monto',registros:'Registros',administrador:'Administración',estatus_control:'Estatus Control',ultima_lectura:'Última ENA',accion:'Acción',numero_operador:'N_OP',nombre_operador:'Operador'
  };
  const val=(r,c)=>{
    if(c==='neg7'||c==='pag7')return chipNum(r[c]);
    if(c==='estado_cobra')return cobraChip(r[c]);
    if(c==='nivel'){const z=String(r[c]||'');return `<span class="chip ${z==='CRITICO'?'level-critical':z==='RECURRENTE'?'level-recurrent':''}">${esc(z)}</span>`} if(c==='tipo_entidad'){const z=String(r[c]||'');return `<span class="entity-chip ${z==='UNIDAD'?'unit':''}">${esc(z)}</span>`}
    if(['a_pagar','boleta','monto_original','total_pagado'].includes(c))return money(r[c]);
    if(c==='mes' && r[c]) return `<span class="date-badge">${esc(String(r[c]).slice(0,7))}</span>`;
    return esc(r[c]??'');
  };
  return `<div class="panel ${panelClass}"><div class="table-wrap"><table class="${extraClass}"><thead><tr>${cols.map(c=>`<th>${human[c]||c}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${cols.map(c=>`<td data-label="${esc(human[c]||c)}" class="${c==='saldo'?'saldo':(['a_pagar','boleta','monto_original','total_pagado'].includes(c)?'money':'')}">${val(r,c)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${cols.length}" class="empty">Sin datos.</td></tr>`}</tbody></table></div></div>`;
}
loginView();


/* ===== V10 OVERRIDES ===== */
function goModule(m){state.active=m;shell();render()}
function openDataWindow(title,subtitle,body){
  const w=window.open('','_blank'); if(!w){alert('Permite ventanas emergentes para abrir el reporte.');return null}
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#eef2f7;color:#0b2a64;font-family:Arial,sans-serif}.wrap{max-width:1180px;margin:26px auto;padding:0 18px}.head{background:linear-gradient(110deg,#102c68,#2855aa);color:#fff;border-radius:18px;padding:22px 26px;margin-bottom:16px}.head h1{margin:0 0 5px;font-size:25px}.head p{margin:0;opacity:.88}.mail{background:#fff;border:1px solid #d5deea;border-radius:16px;padding:18px;box-shadow:0 10px 30px rgba(20,45,85,.08)}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#2450aa;color:#fff;padding:10px;text-align:left}td{padding:9px 10px;border-bottom:1px solid #e3e8ef}tr:nth-child(even) td{background:#f5f8fc}.kpis{display:flex;gap:10px;margin:0 0 14px}.k{flex:1;background:#fff;border:1px solid #d5deea;border-radius:14px;padding:13px}.k b{display:block;font-size:22px;margin-top:4px}.toolbar{margin:0 0 14px;display:flex;gap:8px}.toolbar button{border:0;border-radius:10px;padding:10px 14px;background:#234fa8;color:white;font-weight:700}.muted{color:#66748b}.outlook{border-left:5px solid #1769aa;padding-left:14px;margin-bottom:16px}.outlook b{font-size:15px}</style>
<style id="v14-style">
:root{--v14-navy:#082b67;--v14-blue:#2454ad;--v14-line:#d7e1ef;--v14-bg:#e7edf5;--v14-card:#fff;--v14-orange:#ff7a1a}
body{background:linear-gradient(135deg,#e8eef6 0%,#dce6f2 100%)!important}
.sidebar-v14{background:rgba(255,255,255,.84)!important;backdrop-filter:blur(16px);box-shadow:12px 0 35px rgba(16,45,82,.08);border-right:1px solid rgba(160,180,205,.32)}
.sidebar-v14 .brand{background:linear-gradient(145deg,#fff,#f6f9fd);box-shadow:0 10px 28px rgba(20,53,94,.08)}
.nav-section-v14{font-size:10px;font-weight:900;letter-spacing:1.7px;color:#8b9ab0;padding:8px 16px 4px}
.sidebar-v14 nav button{border:1px solid transparent;transition:.18s ease;position:relative}
.sidebar-v14 nav button:hover{transform:translateX(4px);background:#edf4ff;border-color:#d7e5f7}
.sidebar-v14 nav button.active{background:linear-gradient(90deg,#e9f2ff,#f5f8fd)!important;box-shadow:0 8px 22px rgba(36,84,173,.09);border-color:#d3e1f4}
.sidebar-v14 nav button.active:before{content:"";position:absolute;left:-1px;top:22%;height:56%;width:4px;border-radius:5px;background:linear-gradient(#ff9b32,#ff6713)}
.card,.panel,.kpi,.section-tools,.modal-card{box-shadow:0 12px 32px rgba(16,45,82,.07)!important;border-color:rgba(173,191,215,.5)!important}
.kpi{transition:.18s ease}.kpi:hover{transform:translateY(-3px);box-shadow:0 16px 34px rgba(16,45,82,.12)!important}
.pretty{table-layout:auto!important;width:100%!important}
.pretty th{white-space:nowrap}.pretty td{vertical-align:middle}
.pretty th,.pretty td{padding-left:12px!important;padding-right:12px!important}
.pretty th:nth-child(6),.pretty td:nth-child(6){text-align:center}
.pay-table-v14{overflow-x:auto!important;padding-bottom:5px}
.pay-table-v14 table{min-width:1320px!important;table-layout:auto!important}
.pay-table-v14 th,.pay-table-v14 td{white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;max-width:none!important}
.pay-table-v14 th:nth-child(6),.pay-table-v14 td:nth-child(6){min-width:170px;text-align:center!important}
.pay-table-v14 th:nth-child(11),.pay-table-v14 td:nth-child(11){min-width:150px}
.pay-table-v14 th:last-child,.pay-table-v14 td:last-child{min-width:175px}
.status-v11,.unit-v11{box-shadow:inset 0 0 0 1px rgba(0,0,0,.05)}
.v11-tabs button{box-shadow:0 7px 16px rgba(36,84,173,.10)}
@media(max-width:900px){.pay-table-v14 table{min-width:1180px!important}}
</style>

<style id="v17-style">
/* ===== V17 PREMIUM UI + FIXES ===== */
.side{background:linear-gradient(180deg,#f8fbff 0%,#f1f5fb 100%)!important;color:#17233d!important;border-right:1px solid #dbe5f1!important;box-shadow:10px 0 34px rgba(23,59,115,.08)!important;padding:20px 18px!important}
.brand-logo-app{background:#fff!important;border:1px solid #dbe5f1!important;box-shadow:0 10px 26px rgba(23,59,115,.08)!important}
.portal-name-side{color:#173b73!important;font-size:15px!important;letter-spacing:.035em!important;margin-bottom:6px!important}
.nav{gap:7px!important}.nav button{background:transparent!important;color:#465775!important;border:1px solid transparent!important;border-radius:13px!important;padding:12px 13px 12px 40px!important;position:relative!important;font-weight:850!important;transition:.18s ease!important}
.nav button:hover{background:#edf4ff!important;color:#173b73!important;transform:translateX(3px)}
.nav button.active{background:linear-gradient(90deg,#e4efff,#f6f9fd)!important;color:#174a8b!important;border-color:#cddff6!important;box-shadow:0 8px 18px rgba(36,74,165,.08)!important}
.nav button.active:after{left:0!important;right:auto!important;top:10px!important;bottom:10px!important;width:4px!important;height:auto!important;background:linear-gradient(#ff9d36,#f47c20)!important}
.nav button:before{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:15px;opacity:.85}
.nav button[data-m="dashboard"]:before{content:"▦"}.nav button[data-m="negativos_hoy"]:before{content:"!"}.nav button[data-m="pagos_hoy"]:before{content:"$"}.nav button[data-m="historial"]:before{content:"▣"}.nav button[data-m="recurrentes"]:before{content:"↻"}.nav button[data-m="ranking"]:before{content:"★"}.nav button[data-m="reportes"]:before{content:"▤"}.nav button[data-m="operaciones"]:before{content:"⚙"}.nav button[data-m="usuarios"]:before{content:"♙"}
.user{background:#fff!important;border:1px solid #dbe5f1!important;border-radius:14px!important;padding:12px!important;box-shadow:0 8px 18px rgba(23,59,115,.05)!important}.side .logout{background:#fff5f5!important;color:#b42318!important;border:1px solid #fecdd3!important}
.main{background:linear-gradient(135deg,#e9eff7 0%,#dde7f3 100%)!important}.card,.panel,.kpi,.section-tools,.source-card{box-shadow:0 12px 30px rgba(15,45,85,.075)!important}
.unit-color-badge{display:inline-flex;align-items:center;justify-content:center;min-width:54px;padding:5px 9px;border-radius:10px;font-weight:1000;border:1px solid rgba(10,27,77,.13);box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
.pay-table-v17{overflow-x:auto!important;padding-bottom:6px!important}.pay-table-v17 table{min-width:1450px!important;table-layout:auto!important}.pay-table-v17 th,.pay-table-v17 td{white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;max-width:none!important}.pay-table-v17 th:nth-child(6),.pay-table-v17 td:nth-child(6){min-width:190px!important;text-align:center!important}.pay-table-v17 th:nth-child(11),.pay-table-v17 td:nth-child(11){min-width:180px!important}.pay-table-v17 th:nth-child(12),.pay-table-v17 td:nth-child(12){min-width:140px!important}.pay-table-v17 th:nth-child(13),.pay-table-v17 td:nth-child(13){min-width:190px!important}
.pending-kpis-v17{grid-template-columns:repeat(3,minmax(0,1fr))!important}@media(max-width:900px){.pending-kpis-v17{grid-template-columns:1fr 1fr!important}.side{padding:10px!important}}
</style>

<style id="v55-premium-rym">
body.v38-revisados-only{background:linear-gradient(135deg,#f7f9fc,#edf2f7)!important}
body.v38-revisados-only .v38-rev{--rym:#f28c18!important;--rym2:#ffb52e!important;--gold:#ffd24a!important;--orange:#f28c18!important;--line:#e6e9ef!important;--muted:#667085!important}
body.v38-revisados-only .v38-shell{width:100%!important;max-width:none!important;min-height:100vh!important;grid-template-columns:230px minmax(0,1fr)!important;background:transparent!important}
body.v38-revisados-only .v38-top{background:linear-gradient(120deg,#f28c18 0%,#ffad22 62%,#ffd24a 100%)!important;border:0!important;box-shadow:0 14px 36px rgba(242,140,24,.20)!important;color:#fff!important}
body.v38-revisados-only .v38-logo{background:#fff!important;color:#b85d00!important;box-shadow:0 8px 24px rgba(126,72,0,.13)!important}
body.v38-revisados-only .v38-top h1,body.v38-revisados-only .v38-top .v38-sub{color:#fff!important}
body.v38-revisados-only .v38-tabs{background:#fff!important;border-right:1px solid #e6e9ef!important;box-shadow:8px 0 28px rgba(16,24,40,.05)!important}
body.v38-revisados-only .v38-tabs button{background:transparent!important;color:#596579!important;border-radius:12px!important;margin:3px 8px!important}
body.v38-revisados-only .v38-tabs button:hover{background:#fff6e8!important;color:#b85d00!important}
body.v38-revisados-only .v38-tabs button.active{background:linear-gradient(135deg,#fff0d6,#fff8eb)!important;color:#b85d00!important;box-shadow:inset 4px 0 0 #f28c18!important}
body.v38-revisados-only .v38-body{padding:22px 24px 34px!important}
body.v38-revisados-only .v38-card,body.v38-revisados-only .v49-kpi{border:1px solid #e6e9ef!important;border-radius:18px!important;box-shadow:0 12px 30px rgba(16,24,40,.065)!important}
body.v38-revisados-only .v38-kpi{border-top:3px solid #f5a623!important}
body.v38-revisados-only .v49-primary,body.v38-revisados-only #v39Go,body.v38-revisados-only .v38-top-actions button:not(.soft-btn){background:linear-gradient(135deg,#ef7d00,#f5a623)!important;border-color:#ef7d00!important;color:#fff!important;box-shadow:0 8px 18px rgba(239,125,0,.18)!important}
body.v38-revisados-only .v49-table th{background:#fff7ea!important;color:#8a4a00!important;border-bottom:1px solid #f4d7ad!important}
body.v38-revisados-only .v49-table tbody tr:hover{background:#fffaf2!important}
body.v38-revisados-only .v49-badge.v49-ok{background:#ecfdf3!important;color:#067647!important}
body.v38-revisados-only .v49-badge.v49-bad{background:#fff1f1!important;color:#b42318!important}
body.v38-revisados-only .v49-badge.v49-warn{background:#fff7e6!important;color:#a15c00!important}
@media(max-width:900px){body.v38-revisados-only .v38-shell{grid-template-columns:1fr!important}body.v38-revisados-only .v38-body{padding:12px!important}}
</style>
</head><body><div class="wrap"><div class="head"><h1>${esc(title)}</h1><p>${esc(subtitle||'Portal RYM')}</p></div>${body}</div>


<style id="rym-v62-orange-light-theme">
body.v60-revisados{background:#fff7ed!important}
.v60-app{background:linear-gradient(135deg,#fff7ed 0%,#fffdf7 58%,#fff4d6 100%)!important}
.v60-side{background:linear-gradient(180deg,#f28c00 0%,#ff9f1a 56%,#f7b733 100%)!important;color:#241500!important;border-right:1px solid #df7900!important;box-shadow:8px 0 30px rgba(210,115,0,.10)}
.v60-brand strong{color:#241500!important}.v60-brand small{color:#704200!important}.v60-logo{background:#fff7c7!important;border:1px solid rgba(36,21,0,.12)}
.v60-profile{background:rgba(255,255,255,.40)!important;border:1px solid rgba(78,43,0,.18)!important}.v60-profile b{color:#241500!important}.v60-profile span{color:#704200!important}
.v60-nav button{color:#4a2a00!important}.v60-nav button:hover{background:rgba(255,255,255,.42)!important;color:#17100a!important}.v60-nav button.active{background:#ffd54a!important;color:#17100a!important;box-shadow:0 8px 18px rgba(117,66,0,.12)!important}
.v60-side-foot button{background:#171717!important;color:#ffd54a!important;border-color:#171717!important}.v60-side-foot button:hover{background:#252525!important;color:#fff!important}
.v60-refresh{background:#f28c00!important;border-color:#f28c00!important;color:#241500!important}.v60-refresh:hover{background:#ffd54a!important;border-color:#ffd54a!important}
.v60-hero{background:linear-gradient(125deg,#f28c00 0%,#ff9f1a 58%,#ffd54a 125%)!important;color:#241500!important;box-shadow:0 16px 38px rgba(242,140,0,.17)!important}.v60-hero .eyebrow,.v60-hero b{color:#241500!important}.v60-hero p{color:#6b3c00!important}.v60-hero:after{background:rgba(255,255,255,.24)!important}
.v60-kpi.black:before{background:#f28c00!important}.v60-kpi strong,.v60-card h3,.v61-section-title h3{color:#241500!important}
.v60-table th,.v60-month th{background:#f28c00!important;color:#241500!important;border-bottom-color:#ffd54a!important}.v60-badge.rezagado,.v61-pri.URGENTE{background:#171717!important;color:#ffd54a!important}
.v61-syncbar{background:linear-gradient(135deg,#f28c00,#ffb000)!important;color:#241500!important}.v61-syncbar p{color:#754400!important}.v61-pill{background:rgba(255,255,255,.36)!important;border-color:rgba(78,43,0,.14)!important;color:#241500!important}.v61-syncbtn{background:#ffd54a!important;color:#241500!important}.v61-pcard.black:before{background:#f28c00!important}
.ca-audit-kpi{border-top:3px solid #f28c00!important}.ca-audit-section h3{color:#241500!important}
</style>



</body></html>`);w.document.close();return w
}
function rowsTable(rows,cols){return `<div class="mail"><table><thead><tr>${cols.map(c=>`<th>${esc(c.replaceAll('_',' '))}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c]??'')}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${cols.length}">Sin datos.</td></tr>`}</tbody></table></div>`}

const _dashboardV9=dashboard;
dashboard=async function(v){await _dashboardV9(v);document.querySelectorAll('#view .kpi.hero').forEach((el,i)=>{el.classList.add('clickable');el.title='Abrir detalle';el.onclick=()=>goModule(['historial','negativos_hoy','pagos_hoy','recurrentes'][i])});const q=document.querySelector('#view .quick-card');if(q){q.classList.add('clickable');q.style.cursor='pointer';q.onclick=()=>goModule('historial')}};

const _negativosV9=negativos;
negativos=async function(v){await _negativosV9(v);const f=document.querySelector('#negFecha');if(f){f.removeAttribute('min');f.title='Puedes seleccionar cualquier fecha histórica disponible'}};

recurrentes=async function(v){
 const minf=state.meta?.min_pago||'2025-01-02',maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10),now=new Date(maxf+'T12:00:00'),monthStart=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`,gals=Array.isArray(state.meta?.galeras)?state.meta.galeras.filter(Boolean):[];
 v.innerHTML=`<div class="source-card"><span class="entity-chip">RECURRENTES</span><div class="source-text"><strong>Frecuencia separada por operador o por unidad</strong><p>Selecciona qué análisis quieres ver. No se mezclan ambas métricas.</p></div></div><div class="section-tools"><div class="recurrent-mode"><button id="rOp" class="active">Frecuencia por operador</button><button id="rUn" class="soft-btn">Frecuencia por unidad</button></div><div class="field"><label>Galera</label><select id="rg"><option value="">Todas las visibles</option>${gals.map(g=>`<option>${esc(g)}</option>`).join('')}</select></div><div class="field"><label>Desde</label><input id="rd" type="date" value="${monthStart}" min="${minf}" max="${maxf}"></div><div class="field"><label>Hasta</label><input id="rh" type="date" value="${maxf}" min="${minf}" max="${maxf}"></div><div class="field"><label>Mínimo pagos</label><input id="rmin" type="number" min="2" max="20" value="5"></div><button id="rb">Analizar</button></div><div id="rout"></div>`;
 let mode='OPERADOR';const setMode=m=>{mode=m;document.querySelector('#rOp').className=m==='OPERADOR'?'active':'soft-btn';document.querySelector('#rUn').className=m==='UNIDAD'?'active':'soft-btn';run()};
 async function run(){const o=document.querySelector('#rout');o.innerHTML='<div class="card">Analizando...</div>';try{const all=await rpc('panapass_recurrentes_entidad',{p_desde:document.querySelector('#rd').value,p_hasta:document.querySelector('#rh').value,p_galera:document.querySelector('#rg').value||null,p_min_pagos:Number(document.querySelector('#rmin').value||5),p_limit:1500});const rows=all.filter(x=>x.tipo_entidad===mode);const cols=mode==='OPERADOR'?['mes','identificador','nombre','galera','unidad','supervisora','pagos','dias_con_pago','total_pagado','nivel']:['mes','identificador','galera','supervisora','pagos','dias_con_pago','total_pagado','nivel'];o.innerHTML=`<div class="kpis"><div class="kpi"><span>${mode==='OPERADOR'?'Operadores':'Unidades'} recurrentes</span><strong>${rows.length}</strong></div><div class="kpi"><span>Críticos 8+</span><strong>${rows.filter(x=>x.nivel==='CRITICO').length}</strong></div></div>${tableHtml(rows,cols,'pretty compact-table','mobile-cards')}`}catch(x){o.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
 document.querySelector('#rOp').onclick=()=>setMode('OPERADOR');document.querySelector('#rUn').onclick=()=>setMode('UNIDAD');document.querySelector('#rb').onclick=run;await run();
};

const _operacionesV9=operaciones;
operaciones=async function(v){await _operacionesV9(v);const root=document.querySelector('#opRoot');if(!root)return;const box=document.createElement('div');box.className='cobra-box';box.style.marginTop='14px';box.innerHTML=`<h3 style="margin-top:0">Carga Cobra</h3><p class="muted">Prepara PRE DIARIO en el formato exacto de Cobra: Unidad, Operador, Monto (Con_boleta) y Fecha de carga. Luego valida el resultado contra Cobra y lo guarda en Supabase.</p><div class="section-tools"><div class="field"><label>Fecha</label><input id="cobraCargaFecha" type="date" value="${state.meta?.max_pago||state.today||new Date().toISOString().slice(0,10)}"></div><button id="cobraPreparar">Preparar carga</button><button id="cobraValidarOp" class="soft-btn">Validar Cobra</button></div><div id="cobraCargaOut"></div>`;root.appendChild(box);
 document.querySelector('#cobraPreparar').onclick=async()=>{const o=document.querySelector('#cobraCargaOut'),f=document.querySelector('#cobraCargaFecha').value;o.innerHTML='<div class="card">Preparando PRE DIARIO...</div>';try{const rows=(await rpc('panapass_pagos_fecha',{p_fecha:f})).filter(x=>String(x.tipo||'').toUpperCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim()==='PRE DIARIO'&&Number(x.boleta||0)>0);const hoyCobra=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Panama',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());const txt=rows.map(r=>[r.unidad||'',r.n_op||'',Number(r.boleta||0).toFixed(2),hoyCobra].join('\t')).join('\n');o.innerHTML=`<div class="success"><b>${rows.length} registros preparados.</b> Formato Cobra: Unidad · Operador · Monto · Fecha.</div><div class="muted" style="margin-top:6px">El monto corresponde a Con_boleta y la fecha enviada a Cobra es la fecha de carga de hoy (${esc(hoyCobra)}). No se copia encabezado.</div><textarea id="cobraTexto" style="width:100%;height:180px;margin-top:10px">${esc(txt)}</textarea><button id="cobraCopy" style="margin-top:8px">Copiar carga Cobra</button>`;document.querySelector('#cobraCopy').onclick=async()=>{await navigator.clipboard.writeText(txt);document.querySelector('#cobraCopy').textContent='Copiado ✓'}}catch(x){o.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
 document.querySelector('#cobraValidarOp').onclick=async()=>{const o=document.querySelector('#cobraCargaOut'),f=document.querySelector('#cobraCargaFecha').value;o.innerHTML='<div class="card">Validando Cobra...</div>';try{const d=await cobraValidate(f,f,{soloNoValidados:true});o.innerHTML=`<div class="success">${esc(d.mensaje||'Validación completada')} · guardados ${d.guardados||0}</div>`}catch(x){o.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
};

reportes=async function(v){
 if(!state.modules.includes('reportes')){v.innerHTML='<div class="alert">Sin permiso para Reportes.</div>';return}
 const hoy=state.today||new Date().toISOString().slice(0,10),ini=hoy.slice(0,8)+'01';
 let mail={};try{mail=(await rpc('correo_estado'))?.[0]||{}}catch(_){};
 v.innerHTML=`<div class="source-card"><span class="entity-chip">CENTRO DE REPORTES</span><div class="source-text"><strong>Reportes digitales independientes</strong><p>Cada reporte abre en su propia pantalla, con diseño limpio para revisión, captura y correo.</p></div></div><div class="${mail.enabled?'success':'source-card'}" style="margin-top:10px"><b>Correo: ${mail.enabled?'ACTIVO':'PREPARADO · PENDIENTE RESEND/DNS'}</b><div class="muted">${mail.enabled?('Remitente: '+esc(mail.from_email||'-')):'La biblioteca, cola, plantillas e historial ya están preparados. No se enviará ningún correo hasta habilitar Resend.'}</div></div><div class="section-tools"><div class="field"><label>Desde</label><input id="repDesde" type="date" value="${ini}"></div><div class="field"><label>Hasta</label><input id="repHasta" type="date" value="${hoy}"></div></div><div class="report-grid">
 <div class="report-card"><h3>Negativos AM por Galera</h3><p>Reporte real del corte AM agrupado por galera/supervisora.</p><button id="rNeg">Abrir reporte</button></div>
 <div class="report-card"><h3>Pagos por Galera</h3><p>Pagos reales por rango, galera y supervisora.</p><button id="rPag">Abrir reporte</button></div>
 <div class="report-card"><h3>Pagos · 4 Galeras</h3><p>Consolidado general de VCARS, VCOMP, VIPCO y VINDU.</p><button id="r4">Abrir consolidado</button></div>
 <div class="report-card"><h3>Fondeo Administración</h3><p>Empresa + monto realmente pagado; sin boleta.</p><button id="rFon">Abrir fondeo</button></div>
 <div class="report-card"><h3>PRE NO DIARIO</h3><p>Consulta digital por rango para la ruta especial de Cobra.</p><button id="rNoPre">Abrir PRE NO DIARIO</button></div>
 <div class="report-card"><h3>Bajas Panapass</h3><p>Control de Auto vs último corte ENA para gestionar bajas.</p><button id="rBajas">Abrir bajas</button></div></div>`;
 const range=()=>({p_desde:document.querySelector('#repDesde').value,p_hasta:document.querySelector('#repHasta').value});
 document.querySelector('#rNeg').onclick=async()=>{const f=document.querySelector('#repHasta').value,rows=await rpc('panapass_negativos_fecha',{p_fecha:f});const total=rows.reduce((a,x)=>a+Number(x.saldo||0),0);openDataWindow('Negativos AM por Galera',`Fecha ${f}`,`<div class="outlook"><b>Reporte de Negativos AM</b><div class="muted">Preparado para compartir por galera y supervisora.</div></div><div class="kpis"><div class="k">Unidades<b>${rows.length}</b></div><div class="k">Saldo total<b>${money(total)}</b></div></div>${rowsTable(rows,['supervisora','unidad','placa','panapass_numero','empresa','neg7','saldo'])}`)};
 document.querySelector('#rPag').onclick=async()=>{const r=range(),rows=await rpc('panapass_reporte_pagos_rango',{...r,p_galera:null});openDataWindow('Pagos por Galera',`${r.p_desde} → ${r.p_hasta}`,`<div class="outlook"><b>Reporte de Pagos</b><div class="muted">Detalle por galera, supervisora y unidad.</div></div>${rowsTable(rows,['fecha','galera','supervisora','unidad','empresa','a_pagar','operador','cobrador','tipo'])}`)};
 document.querySelector('#r4').onclick=async()=>{const r=range(),rows=await rpc('panapass_reporte_pagos_rango',{...r,p_galera:null}),sum={};rows.forEach(x=>sum[x.galera]=(sum[x.galera]||0)+Number(x.a_pagar||0));const a=Object.entries(sum).map(([galera,monto])=>({galera,monto:monto.toFixed(2),registros:rows.filter(x=>x.galera===galera).length}));openDataWindow('Pagos · 4 Galeras',`${r.p_desde} → ${r.p_hasta}`,rowsTable(a,['galera','registros','monto']))};
 document.querySelector('#rFon').onclick=async()=>{const r=range(),rows=await rpc('panapass_reporte_fondeo',r),total=rows.reduce((a,x)=>a+Number(x.monto||0),0);openDataWindow('Fondeo Administración',`${r.p_desde} → ${r.p_hasta}`,`<div class="outlook"><b>Resumen para fondeo</b><div class="muted">Importe realmente pagado. No incluye recargo interno de boleta.</div></div><div class="kpis"><div class="k">Total fondeo<b>${money(total)}</b></div><div class="k">Empresas<b>${rows.length}</b></div></div>${rowsTable(rows,['empresa','registros','monto'])}`)};
 document.querySelector('#rNoPre').onclick=async()=>{const r=range(),rows=await rpc('panapass_reporte_no_pre_diario',r);openDataWindow('PRE NO DIARIO',`${r.p_desde} → ${r.p_hasta}`,rowsTable(rows,['fecha','galera','empresa','unidad','placa','panapass_numero','a_pagar','numero_operador','nombre_operador','cobrador','tipo','estado_cobra']))};
 document.querySelector('#rBajas').onclick=async()=>{const rows=await rpc('panapass_reporte_bajas_v2');openDataWindow('Bajas Panapass','Control de Auto vs ENA',`<div class="outlook"><b>Gestión de bajas</b><div class="muted">Unidades no activas en Control de Auto que todavía aparecen en ENA.</div></div>${rowsTable(rows,['galera','administrador','empresa','unidad','placa','panapass_numero','estatus_control','ultima_lectura','saldo','cantidad_tags','tags_ena','accion'])}`)};
};


/* V11 functional refinements */
function v11Status(x){const n=norm(x),ok=['ACTIVO','ACTIVA','ACTIVE'].includes(n);return `<span class="status-v11 ${ok?'ok':'bad'}">${esc(x||'SIN ESTATUS')}</span>`}
function v11Unit(u,c){let bg=c||'#edf2f8';return `<span class="unit-v11" style="background:${esc(bg)}">${esc(u||'')}</span>`}

async function v11UnitList(){
 state.active='dashboard';shell();const v=document.querySelector('#view');v.innerHTML='<div class="card">Cargando unidades...</div>';
 try{const rows=await rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:3000});
 v.innerHTML=`<div class="source-card"><span class="entity-chip">UNIDADES</span><div class="source-text"><strong>Control de Auto</strong><p>Detalle de las unidades bajo tu alcance.</p></div></div><div class="section-tools"><div class="field"><label>Buscar</label><input id="v11q" placeholder="Unidad, placa, Panapass o empresa"></div><button id="v11b">Buscar</button></div><div id="v11o"></div>`;
 const draw=a=>document.querySelector('#v11o').innerHTML=`<div class="table-wrap"><table><thead><tr><th>Estatus</th><th>Unidad</th><th>Placa</th><th>Panapass</th><th>Empresa</th><th>Supervisora</th><th>Galera</th><th>Marca</th><th>Modelo</th><th>Año</th></tr></thead><tbody>${a.map(r=>`<tr><td>${v11Status(r.estatus)}</td><td>${v11Unit(r.unidad,r.color)}</td><td>${esc(r.placa)}</td><td>${esc(r.panapass_numero)}</td><td style="text-align:left">${esc(r.empresa)}</td><td>${esc(r.supervisora)}</td><td>${esc(r.galera)}</td><td>${esc(r.marca)}</td><td>${esc(r.modelo)}</td><td>${esc(r.anio)}</td></tr>`).join('')}</tbody></table></div>`;
 draw(rows);document.querySelector('#v11b').onclick=()=>{let q=norm(document.querySelector('#v11q').value);draw(rows.filter(r=>!q||norm(Object.values(r).join(' ')).includes(q)))};
 }catch(e){v.innerHTML=`<div class="alert">${esc(e.message)}</div>`}
}

const _v11dash=dashboard;
dashboard=async function(v){await _v11dash(v);let k=[...v.querySelectorAll('.kpi')];if(k[0])k[0].onclick=v11UnitList;if(k[1])k[1].onclick=()=>goModule('negativos_hoy');if(k[2])k[2].onclick=()=>goModule('pagos_hoy');if(k[3])k[3].onclick=()=>goModule('recurrentes')}

const _v11neg=negativos;
negativos=async function(v){await _v11neg(v);try{const f=document.querySelector('#negFecha')?.value;if(!f)return;const [rows,units]=await Promise.all([rpc('panapass_negativos_fecha',{p_fecha:f}),rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:3000})]);const mm=new Map(units.map(x=>[norm(x.unidad),x]));let tb=document.querySelector('#negOut tbody');if(tb)tb.innerHTML=rows.map(r=>{let m=mm.get(norm(r.unidad))||{};return `<tr><td>${esc(r.fecha)}</td><td>${v11Status(r.status)}</td><td>${v11Unit(r.unidad,m.color)}</td><td>${esc(r.placa)}</td><td>${esc(r.panapass_numero)}</td><td style="text-align:left">${esc(r.empresa)}</td><td>${chipNum(r.neg7)}</td><td class="neg">${money(r.saldo)}</td></tr>`}).join('')}catch{}}

pendientesExterno=historial;

async function recurrentes(v){
 const dt=new Date(),mes=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
 v.innerHTML=`<div class="source-card"><span class="entity-chip">RECURRENTES</span><div class="source-text"><strong>Frecuencia mensual</strong><p>Selecciona operador o unidad.</p></div></div><div class="v11-right"><button id="v11rop">Por operador</button><button id="v11run" class="soft-btn">Por unidad</button><div class="field"><label>Mes</label><input id="v11mes" type="month" value="${mes}"></div><div class="field"><label>Mínimo</label><input id="v11min" type="number" value="5" min="2"></div><button id="v11rb">Consultar</button></div><div id="v11rout"></div>`;
 let mode='OPERADOR';const run=async()=>{let [y,m]=document.querySelector('#v11mes').value.split('-').map(Number),desde=`${y}-${String(m).padStart(2,'0')}-01`,hasta=new Date(y,m,0).toISOString().slice(0,10),o=document.querySelector('#v11rout');try{let rows=await rpc('panapass_recurrentes_entidad',{p_desde:desde,p_hasta:hasta,p_galera:null,p_min_pagos:Number(document.querySelector('#v11min').value||5),p_limit:2000});rows=rows.filter(x=>x.tipo_entidad===mode);o.innerHTML=tableHtml(rows,mode==='OPERADOR'?['mes','identificador','nombre','unidad','supervisora','pagos','dias_con_pago','total_pagado','nivel']:['mes','identificador','supervisora','pagos','dias_con_pago','total_pagado','nivel'],'pretty compact-table','mobile-cards')}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};
 document.querySelector('#v11rop').onclick=()=>{mode='OPERADOR';run()};document.querySelector('#v11run').onclick=()=>{mode='UNIDAD';run()};document.querySelector('#v11rb').onclick=run;run()
}

const _v11rank=ranking;
ranking=async function(v){await _v11rank(v);v.querySelectorAll('.source-card').forEach(x=>x.remove());let t=v.querySelector('.section-tools');if(t){t.style.justifyContent='flex-end';t.style.marginBottom='8px'}}


/* ===== V12 CORRECCIONES CONSOLIDADAS ===== */
const _v12Shell=shell;
shell=function(){
  _v12Shell();
  document.querySelectorAll('[data-m="pendientes_externo"]').forEach(x=>x.remove());
  const h=document.querySelector('[data-m="historial"]'); if(h)h.textContent='Historial / Pendiente a Cobra';
  const title=document.querySelector('.top h1'); if(title&&(state.active==='historial'||state.active==='pendientes_externo'))title.textContent='Historial / Pendiente a Cobra';
};
const _v12Render=render;
render=async function(){if(state.active==='pendientes_externo'){state.active='historial';shell();return historial(document.querySelector('#view'))}return _v12Render()};

async function v12UnitMap(){try{const a=await rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:5000});return new Map(a.map(x=>[norm(x.unidad),x]))}catch{return new Map()}}
function v12Status(x){const n=norm(x),ok=['ACTIVO','ACTIVA','ACTIVE'].includes(n),closed=['CERRADO','CERRADA','INACTIVO','INACTIVA','CLOSED'].includes(n);return `<span class="status-v11 ${ok?'ok':closed?'bad':''}">${esc(x||'SIN ESTATUS')}</span>`}
function v12TextColor(bg){let h=String(bg||'').replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');if(!/^[0-9a-f]{6}$/i.test(h))return '#0b2a64';let r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return (r*299+g*587+b*114)/1000>150?'#0b2a64':'#fff'}
function v12Unit(u,c){const bg=c||'#edf2f8';return `<span class="unit-v11" style="background:${esc(bg)};color:${v12TextColor(bg)}">${esc(u||'')}</span>`}
function v12Rows(rows,map,cols){const human={fecha:'Fecha',status:'Estatus',unidad:'Unidad',placa:'Placa',panapass_numero:'Panapass',empresa:'Empresa',neg7:'Neg. 7d',saldo:'Saldo',a_pagar:'A pagar',boleta:'Boleta',pag7:'Pag. 7d',n_op:'N_OP',operador:'Operador',cobrador:'Cobrador',tipo:'Tipo',estado_cobra:'Estado Cobra'};const cell=(r,c)=>{let m=map.get(norm(r.unidad))||{};if(c==='status')return v12Status(r[c]||m.estatus);if(c==='unidad')return v12Unit(r[c],m.color);if(c==='neg7'||c==='pag7')return chipNum(r[c]);if(c==='estado_cobra')return cobraChip(r[c]);if(['a_pagar','boleta'].includes(c))return money(r[c]);return esc(r[c]??'')};return `<div class="panel mobile-cards"><div class="table-wrap"><table class="pretty compact-table"><thead><tr>${cols.map(c=>`<th>${human[c]||c}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${cols.map(c=>`<td data-label="${human[c]||c}" style="${c==='empresa'?'text-align:left':''}">${cell(r,c)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${cols.length}" class="empty">Sin datos.</td></tr>`}</tbody></table></div></div>`}

negativos=async function(v){
 const maxf=state.today||state.meta?.max_snapshot||new Date().toISOString().slice(0,10),minf=state.meta?.min_snapshot||'2025-01-01';
 v.innerHTML=`<div class="section-tools"><div class="field"><label>Fecha</label><input id="negFecha" type="date" min="${minf}" max="${maxf}" value="${maxf}"></div><div class="field"><label>Buscar</label><input id="negQ" placeholder="Unidad, placa o empresa"></div><button id="negBuscar">Consultar</button><button id="negCompact" class="soft-btn">Vista captura</button></div><div id="negOut"></div>`;
 const um=await v12UnitMap(); let all=[];
 const draw=async()=>{const f=document.querySelector('#negFecha').value,o=document.querySelector('#negOut');o.innerHTML='<div class="card">Consultando...</div>';try{all=await rpc('panapass_negativos_fecha',{p_fecha:f});let q=norm(document.querySelector('#negQ').value),rows=q?all.filter(r=>norm([r.unidad,r.placa,r.empresa,r.panapass_numero].join(' ')).includes(q)):all,total=rows.reduce((a,x)=>a+Number(x.saldo||0),0),mx=rows.reduce((a,x)=>Math.max(a,Number(x.neg7||0)),0);o.innerHTML=`<div class="capture-title"><h2>Negativos Panapass · ${esc(f)}</h2><small>Detalle de unidades en negativo</small></div><div class="kpis"><div class="kpi"><span>Unidades</span><strong>${rows.length}</strong></div><div class="kpi"><span>Saldo total</span><strong style="color:var(--red)">${money(total)}</strong></div><div class="kpi"><span>Máx neg 7d</span><strong>${mx}</strong></div><div class="kpi"><span>Riesgo</span><strong>${mx>=3?'ALERTA':mx===2?'CUIDADO':'OK'}</strong></div></div>${v12Rows(rows,um,['fecha','status','unidad','placa','panapass_numero','empresa','neg7','saldo'])}`}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};
 document.querySelector('#negBuscar').onclick=draw;document.querySelector('#negQ').oninput=draw;document.querySelector('#negCompact').onclick=e=>toggleCapture(e.currentTarget,'#negOut');await draw();
};

pagosConsultaHoy=async function(v){
 const hoy=state.today||new Date().toISOString().slice(0,10),minf=state.meta?.min_pago||'2025-01-01';
 v.innerHTML=`<div class="section-tools"><div class="field"><label>Fecha</label><input id="supPayFecha" type="date" min="${minf}" max="${hoy}" value="${hoy}"></div><div class="field"><label>Buscar</label><input id="supPayQ" placeholder="Unidad, operador o empresa"></div><button id="supPayLoad">Consultar</button><button id="supPayCapture" class="soft-btn">Vista captura</button></div><div id="supPayOut"></div>`;
 const um=await v12UnitMap();let all=[];const paint=()=>{let q=norm(document.querySelector('#supPayQ').value),d=q?all.filter(x=>norm([x.unidad,x.operador,x.n_op,x.empresa,x.cobrador].join(' ')).includes(q)):all,total=d.reduce((a,x)=>a+Number(x.a_pagar||0),0);document.querySelector('#supPayOut').innerHTML=`<div class="capture-title"><h2>Pagos Panapass · ${esc(document.querySelector('#supPayFecha').value)}</h2><small>Pagos registrados</small></div><div class="kpis"><div class="kpi"><span>Pagos</span><strong>${d.length}</strong></div><div class="kpi"><span>Total pagado</span><strong style="color:var(--green)">${money(total)}</strong></div></div>${v12Rows(d,um,['fecha','status','unidad','placa','panapass_numero','empresa','a_pagar','boleta','pag7','n_op','operador','tipo','estado_cobra'])}`};const load=async()=>{try{all=await rpc('panapass_pagos_fecha',{p_fecha:document.querySelector('#supPayFecha').value});paint()}catch(e){document.querySelector('#supPayOut').innerHTML=`<div class="alert">${esc(e.message)}</div>`}};document.querySelector('#supPayLoad').onclick=load;document.querySelector('#supPayQ').oninput=paint;document.querySelector('#supPayCapture').onclick=e=>toggleCapture(e.currentTarget,'#supPayOut');await load();
};

const _v12PagosTrabajo=pagosTrabajo;
pagosTrabajo=async function(v){await _v12PagosTrabajo(v);const tools=v.querySelector('.section-tools');if(tools&&!v.querySelector('#adminPayCapture')){const b=document.createElement('button');b.id='adminPayCapture';b.className='soft-btn';b.textContent='Vista captura';b.onclick=e=>toggleCapture(e.currentTarget,'#pmOut');tools.appendChild(b)}};

historial=async function(v){
 const minf=state.meta?.min_pago||'2025-01-01',maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10);v.innerHTML=`<div class="v11-tabs"><button id="histAll">Historial</button><button id="histCobra" class="soft-btn">Pendiente a Cobra</button></div><div class="section-tools"><div class="field"><label>Unidad</label><input id="hu" placeholder="Unidad"></div><div class="field"><label>Operador / N_OP</label><input id="ho" placeholder="Operador o número"></div><div class="field"><label>Desde</label><input id="hd" type="date" value="${minf}"></div><div class="field"><label>Hasta</label><input id="hh" type="date" value="${maxf}"></div><button id="hb">Buscar</button></div><div id="histOut"></div>`;let mode='ALL';const run=async()=>{let o=document.querySelector('#histOut');o.innerHTML='<div class="card">Consultando...</div>';try{let rows=await rpc('panapass_historial',{p_unidad:document.querySelector('#hu').value||null,p_operador:document.querySelector('#ho').value||null,p_desde:document.querySelector('#hd').value||null,p_hasta:document.querySelector('#hh').value||null,p_limit:1500});if(mode==='COBRA')rows=rows.filter(x=>['','PENDIENTE','NO VALIDADO','ERROR'].includes(norm(x.estado_cobra)));o.innerHTML=tableHtml(rows,['fecha','unidad','panapass_numero','a_pagar','boleta','n_op','operador','cobrador','tipo','estado_cobra'],'pretty compact-table','mobile-cards')}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};document.querySelector('#histAll').onclick=()=>{mode='ALL';document.querySelector('#histAll').className='';document.querySelector('#histCobra').className='soft-btn';run()};document.querySelector('#histCobra').onclick=()=>{mode='COBRA';document.querySelector('#histCobra').className='';document.querySelector('#histAll').className='soft-btn';run()};document.querySelector('#hb').onclick=run;await run();
};

recurrentes=async function(v){const base=state.meta?.max_pago||new Date().toISOString().slice(0,10),d=new Date(base+'T12:00:00'),mes=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;v.innerHTML=`<div class="v11-right"><button id="rOp">Por operador</button><button id="rUn" class="soft-btn">Por unidad</button><div class="field"><label>Mes</label><input id="rMes" type="month" value="${mes}"></div><div class="field"><label>Mínimo pagos</label><input id="rMin" type="number" min="2" max="20" value="5"></div><button id="rGo">Consultar</button></div><div id="rout"></div>`;let mode='OPERADOR';const run=async()=>{let [y,m]=document.querySelector('#rMes').value.split('-').map(Number),desde=`${y}-${String(m).padStart(2,'0')}-01`,hasta=new Date(y,m,0).toISOString().slice(0,10),o=document.querySelector('#rout');try{let rows=await rpc('panapass_recurrentes_entidad',{p_desde:desde,p_hasta:hasta,p_galera:null,p_min_pagos:Number(document.querySelector('#rMin').value||5),p_limit:2000});rows=rows.filter(x=>x.tipo_entidad===mode);o.innerHTML=tableHtml(rows,mode==='OPERADOR'?['mes','identificador','nombre','unidad','supervisora','pagos','dias_con_pago','total_pagado','nivel']:['mes','identificador','supervisora','pagos','dias_con_pago','total_pagado','nivel'],'pretty compact-table','mobile-cards')}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};document.querySelector('#rOp').onclick=()=>{mode='OPERADOR';run()};document.querySelector('#rUn').onclick=()=>{mode='UNIDAD';run()};document.querySelector('#rGo').onclick=run;await run()};

const _v12Ranking=ranking;
ranking=async function(v){await _v12Ranking(v);const first=v.querySelector('.source-card');if(first)first.remove();const tools=v.querySelector('.section-tools');if(tools){tools.style.justifyContent='flex-end';tools.style.margin='0 0 8px auto'}};


/* ===== V13 FINAL: perfiles y Pagos Hoy con colores ===== */

const _v13PagosTrabajo=pagosTrabajo;
pagosTrabajo=async function(v){
  const units=await rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:5000}).catch(()=>[]);
  const um=new Map(units.map(x=>[norm(x.unidad),x]));
  await _v13PagosTrabajo(v);
  const paint=()=>{
    v.querySelectorAll('#pmOut tbody tr').forEach(tr=>{
      if(tr.dataset.metaApplied==='1')return;
      const raw=String(tr.dataset.payRowUnit||tr.querySelector('[data-pay-unit]')?.textContent||'').trim();
      if(!raw)return;
      const meta=um.get(norm(raw));
      if(!meta)return;
      const empresa=String(tr.querySelector('[data-pay-company]')?.textContent||'').trim()||meta.empresa_duena||meta.empresa||meta.empresa_operadora||'';
      const placa=meta.placa||meta.placa_unica||meta.placa_comercial||'';
      const panapass=meta.panapass_numero||meta.panapass||'';
      const unitCell=tr.querySelector('[data-pay-unit-cell]');
      if(unitCell)unitCell.innerHTML=`${v17UnitBadge(raw,meta.color)}<small data-pay-company>${esc(empresa)}</small>`;
      const panCell=tr.querySelector('[data-pay-panapass]');if(panCell)panCell.textContent=panapass||'';
      const plateCell=tr.querySelector('[data-pay-plate]');if(plateCell)plateCell.textContent=placa||'';
      tr.dataset.metaApplied='1';
    });
  };
  paint();
  if(window.__v36PagosObserver){try{window.__v36PagosObserver.disconnect()}catch(_){}} const obs=new MutationObserver(paint); window.__v36PagosObserver=obs; const target=v.querySelector('#pmOut'); if(target)obs.observe(target,{childList:true,subtree:true});
}


/* ===== V14 UI + COBRA + SEMANTICA EMPRESA/GALERA ===== */
const _v14Shell=shell;
shell=function(){
  _v14Shell();
  const side=document.querySelector('.sidebar');
  if(side){
    side.classList.add('sidebar-v14');
    const nav=side.querySelector('nav');
    if(nav && !nav.querySelector('.nav-section-v14')){
      const t=document.createElement('div'); t.className='nav-section-v14'; t.textContent='OPERACIÓN';
      nav.prepend(t);
    }
  }
};

const _v14V12Rows=v12Rows;
v12Rows=function(rows,map,cols){
  let html=_v14V12Rows(rows,map,cols);
  html=html.replace(/<th>Empresa<\/th>/g,'<th style="text-align:center">Empresa</th>')
           .replace(/data-label="Empresa" style="text-align:left"/g,'data-label="Empresa" style="text-align:center"');
  return html;
};

historial=async function(v){
 const minf=state.meta?.min_pago||'2025-01-01',maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10);
 v.innerHTML=`<div class="v11-tabs"><button id="histAll">Historial</button><button id="histCobra" class="soft-btn">Pendiente a Cobra</button></div>
 <div class="section-tools"><div class="field"><label>Unidad</label><input id="hu" placeholder="Unidad"></div><div class="field"><label>Operador / N_OP</label><input id="ho" placeholder="Operador o número"></div><div class="field"><label>Desde</label><input id="hd" type="date" value="${minf}"></div><div class="field"><label>Hasta</label><input id="hh" type="date" value="${maxf}"></div><button id="hb">Buscar</button></div><div id="histOut"></div>`;
 let mode='ALL';
 const isPending=x=>{
   const e=norm(x.estado_cobra);
   return !e || e==='NO CARGADO' || e==='NO CARGADO A COBRA' || e.includes('REVISAR COBRA') || e.includes('PENDIENTE') || e.includes('ERROR');
 };
 const run=async()=>{
   let o=document.querySelector('#histOut');o.innerHTML='<div class="card">Consultando...</div>';
   try{
     let rows=await rpc('panapass_historial',{p_unidad:document.querySelector('#hu').value||null,p_operador:document.querySelector('#ho').value||null,p_desde:document.querySelector('#hd').value||null,p_hasta:document.querySelector('#hh').value||null,p_limit:2500});
     if(mode==='COBRA') rows=rows.filter(isPending);
     o.innerHTML=tableHtml(rows,['fecha','unidad','panapass_numero','a_pagar','boleta','n_op','operador','cobrador','tipo','estado_cobra'],'pretty compact-table','mobile-cards');
   }catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}
 };
 const setMode=m=>{
   mode=m;
   document.querySelector('#histAll').className=m==='ALL'?'':'soft-btn';
   document.querySelector('#histCobra').className=m==='COBRA'?'':'soft-btn';
   run();
 };
 document.querySelector('#histAll').onclick=()=>setMode('ALL');
 document.querySelector('#histCobra').onclick=()=>setMode('COBRA');
 document.querySelector('#hb').onclick=run;
 await run();
};

const _v14PagosConsultaHoy=pagosConsultaHoy;
pagosConsultaHoy=async function(v){
 await _v14PagosConsultaHoy(v);
 const wrap=v.querySelector('#supPayOut .table-wrap');
 if(wrap) wrap.classList.add('pay-table-v14');
};

const _v14PagosTrabajo=pagosTrabajo;
pagosTrabajo=async function(v){
 await _v14PagosTrabajo(v);
 const wrap=v.querySelector('#pmOut .table-wrap');
 if(wrap) wrap.classList.add('pay-table-v14');
};


/* ===== V17 FUNCTIONAL FIXES ===== */
function v17ColorPair(c){
 const n=norm(c);const map={AMARILLO:['#FDE047','#3F3500'],ROJO:['#EF4444','#FFFFFF'],BLANCO:['#FFFFFF','#17233D'],NEGRO:['#111827','#FFFFFF'],GRIS:['#9CA3AF','#111827'],PLATA:['#D1D5DB','#111827'],BEIGE:['#E7D3A7','#3F321D'],AZUL:['#3B82F6','#FFFFFF'],VERDE:['#22C55E','#052E16'],'TITAN GREY':['#6B7280','#FFFFFF'],'TITAN GRAY':['#6B7280','#FFFFFF'],'TITANIUM GREY':['#6B7280','#FFFFFF'],NARANJA:['#FB923C','#3F1D0A'],MARRON:['#92400E','#FFFFFF'],'CAFÉ':['#92400E','#FFFFFF'],CAFE:['#92400E','#FFFFFF']};
 if(map[n])return map[n];if(/^#[0-9A-F]{6}$/i.test(String(c||'')))return [String(c),'#17233D'];return ['#E9EEF5','#17233D'];
}
function v17UnitBadge(u,c){const [bg,fg]=v17ColorPair(c);return `<span class="unit-color-badge" title="Color: ${esc(c||'Sin color')}" style="background:${bg};color:${fg}">${esc(u||'')}</span>`}

v11UnitList=async function(){
 state.active='dashboard';shell();const v=document.querySelector('#view');v.innerHTML='<div class="card">Cargando unidades...</div>';
 try{const rows=await rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:5000});v.innerHTML=`<div class="source-card"><span class="entity-chip">UNIDADES</span><div class="source-text"><strong>Control de Auto</strong><p>Detalle operativo de las unidades bajo tu alcance.</p></div></div><div class="section-tools"><div class="field"><label>Buscar</label><input id="v17q" placeholder="Unidad, placa, Panapass, empresa, color o modelo"></div><button id="v17b">Buscar</button></div><div id="v17o"></div>`;const draw=a=>document.querySelector('#v17o').innerHTML=`<div class="panel"><div class="table-wrap"><table class="pretty"><thead><tr><th>Estatus</th><th>Unidad</th><th>Placa</th><th>Panapass</th><th>Empresa</th><th>Supervisora</th><th>Galera</th><th>Color</th><th>Marca</th><th>Modelo</th><th>Año</th></tr></thead><tbody>${a.map(r=>`<tr><td>${v12Status(r.estatus)}</td><td>${v17UnitBadge(r.unidad,r.color)}</td><td>${esc(r.placa)}</td><td>${esc(r.panapass_numero)}</td><td style="text-align:center">${esc(r.empresa)}</td><td>${esc(r.supervisora)}</td><td>${esc(r.galera)}</td><td>${esc(r.color||'')}</td><td>${esc(r.marca)}</td><td>${esc(r.modelo)}</td><td>${esc(r.anio)}</td></tr>`).join('')}</tbody></table></div></div>`;draw(rows);const filter=()=>{const q=norm(document.querySelector('#v17q').value);draw(rows.filter(r=>!q||norm(Object.values(r).join(' ')).includes(q)))};document.querySelector('#v17b').onclick=filter;document.querySelector('#v17q').oninput=filter}catch(e){v.innerHTML=`<div class="alert">${esc(e.message)}</div>`}
};

negativos=async function(v){
 const maxf=state.today||state.meta?.max_snapshot||new Date().toISOString().slice(0,10),minf=state.meta?.min_snapshot||'2025-01-01';v.innerHTML=`<div class="section-tools"><div class="field"><label>Fecha</label><input id="negFecha" type="date" min="${minf}" max="${maxf}" value="${maxf}"></div><div class="field"><label>Buscar</label><input id="negQ" placeholder="Unidad, placa o empresa"></div><button id="negBuscar">Consultar</button><button id="negCompact" class="soft-btn">Vista captura</button></div><div id="negOut"></div>`;const units=await rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:5000}).catch(()=>[]);const um=new Map(units.map(x=>[norm(x.unidad),x]));const draw=async()=>{const f=document.querySelector('#negFecha').value,o=document.querySelector('#negOut');o.innerHTML='<div class="card">Consultando...</div>';try{const all=await rpc('panapass_negativos_fecha',{p_fecha:f});let q=norm(document.querySelector('#negQ').value),rows=q?all.filter(r=>norm([r.unidad,r.placa,r.empresa,r.panapass_numero].join(' ')).includes(q)):all,total=rows.reduce((a,x)=>a+Number(x.saldo||0),0),mx=rows.reduce((a,x)=>Math.max(a,Number(x.neg7||0)),0);o.innerHTML=`<div class="capture-title"><h2>Negativos Panapass · ${esc(f)}</h2><small>Detalle de unidades en negativo</small></div><div class="kpis"><div class="kpi"><span>Unidades</span><strong>${rows.length}</strong></div><div class="kpi"><span>Saldo total</span><strong style="color:var(--red)">${money(total)}</strong></div><div class="kpi"><span>Máx neg 7d</span><strong>${mx}</strong></div><div class="kpi"><span>Riesgo</span><strong>${mx>=3?'ALERTA':mx===2?'CUIDADO':'OK'}</strong></div></div><div class="panel"><div class="table-wrap"><table class="pretty"><thead><tr><th>Fecha</th><th>Estatus</th><th>Unidad</th><th>Placa</th><th>Panapass</th><th>Empresa</th><th>Neg. 7d</th><th>Saldo</th></tr></thead><tbody>${rows.map(r=>{const m=um.get(norm(r.unidad))||{};return `<tr><td>${esc(r.fecha)}</td><td>${v12Status(r.status||m.estatus)}</td><td>${v17UnitBadge(r.unidad,m.color)}</td><td>${esc(r.placa)}</td><td>${esc(r.panapass_numero)}</td><td style="text-align:center">${esc(r.empresa)}</td><td>${chipNum(r.neg7)}</td><td class="saldo">${money(r.saldo)}</td></tr>`}).join('')}</tbody></table></div></div>`}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};document.querySelector('#negBuscar').onclick=draw;document.querySelector('#negQ').oninput=draw;document.querySelector('#negCompact').onclick=e=>toggleCapture(e.currentTarget,'#negOut');await draw();
};

pagosConsultaHoy=async function(v){
 const hoy=state.today||new Date().toISOString().slice(0,10),minf=state.meta?.min_pago||'2025-01-01';v.innerHTML=`<div class="section-tools"><div class="field"><label>Fecha</label><input id="supPayFecha" type="date" min="${minf}" max="${hoy}" value="${hoy}"></div><div class="field"><label>Buscar</label><input id="supPayQ" placeholder="Unidad, operador o empresa"></div><button id="supPayLoad">Consultar</button><button id="supPayCapture" class="soft-btn">Vista captura</button></div><div id="supPayOut"></div>`;const units=await rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:5000}).catch(()=>[]);const um=new Map(units.map(x=>[norm(x.unidad),x]));let all=[];const paint=()=>{let q=norm(document.querySelector('#supPayQ').value),d=q?all.filter(x=>norm([x.unidad,x.operador,x.n_op,x.empresa,x.cobrador].join(' ')).includes(q)):all,total=d.reduce((a,x)=>a+Number(x.a_pagar||0),0);document.querySelector('#supPayOut').innerHTML=`<div class="capture-title"><h2>Pagos Panapass · ${esc(document.querySelector('#supPayFecha').value)}</h2><small>Pagos registrados</small></div><div class="kpis"><div class="kpi"><span>Pagos</span><strong>${d.length}</strong></div><div class="kpi"><span>Total pagado</span><strong style="color:var(--green)">${money(total)}</strong></div></div><div class="panel"><div class="table-wrap pay-table-v17"><table class="pretty"><thead><tr><th>Fecha</th><th>Estatus</th><th>Unidad</th><th>Placa</th><th>Panapass</th><th>Empresa</th><th>A pagar</th><th>Boleta</th><th>Pag. 7d</th><th>N_OP</th><th>Operador</th><th>Tipo</th><th>Estado Cobra</th></tr></thead><tbody>${d.map(r=>{const m=um.get(norm(r.unidad))||{};return `<tr><td>${esc(r.fecha)}</td><td>${v12Status(r.status||m.estatus)}</td><td>${v17UnitBadge(r.unidad,m.color)}</td><td>${esc(r.placa)}</td><td>${esc(r.panapass_numero)}</td><td style="text-align:center">${esc(r.empresa)}</td><td class="money">${money(r.a_pagar)}</td><td class="money">${money(r.boleta)}</td><td>${chipNum(r.pag7)}</td><td>${esc(r.n_op)}</td><td>${esc(r.operador)}</td><td>${esc(r.tipo)}</td><td>${cobraChip(r.estado_cobra)}</td></tr>`}).join('')}</tbody></table></div></div>`};const load=async()=>{const o=document.querySelector('#supPayOut');o.innerHTML='<div class="card">Consultando...</div>';try{all=await rpc('panapass_pagos_fecha',{p_fecha:document.querySelector('#supPayFecha').value});paint()}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};document.querySelector('#supPayLoad').onclick=load;document.querySelector('#supPayQ').oninput=paint;document.querySelector('#supPayFecha').onchange=load;document.querySelector('#supPayCapture').onclick=e=>toggleCapture(e.currentTarget,'#supPayOut');await load();
};

historial=async function(v){
 const minf=state.meta?.min_pago||'2025-01-01',maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10);v.innerHTML=`<div class="v11-tabs"><button id="histAll">Historial</button><button id="histCobra" class="soft-btn">Pendiente a Cobra</button></div><div class="section-tools"><div class="field"><label>Unidad</label><input id="hu" placeholder="Unidad"></div><div class="field"><label>Operador / N_OP</label><input id="ho" placeholder="Operador o número"></div><div class="field"><label>Desde</label><input id="hd" type="date" value="${minf}"></div><div class="field"><label>Hasta</label><input id="hh" type="date" value="${maxf}"></div><button id="hb">Buscar</button></div><div id="histOut"></div>`;let mode='ALL';const isPending=x=>{const e=norm(x.estado_cobra);return !e||e==='NO CARGADO'||e==='NO CARGADO A COBRA'||e.includes('REVISAR COBRA')||e.includes('PENDIENTE')||e.includes('ERROR')};const run=async()=>{const o=document.querySelector('#histOut');o.innerHTML='<div class="card">Consultando...</div>';try{let rows=await rpc('panapass_historial',{p_unidad:document.querySelector('#hu').value||null,p_operador:document.querySelector('#ho').value||null,p_desde:document.querySelector('#hd').value||null,p_hasta:document.querySelector('#hh').value||null,p_limit:2500});if(mode==='COBRA')rows=rows.filter(isPending);const total=rows.reduce((a,x)=>a+Number(x.a_pagar||0),0),boleta=rows.reduce((a,x)=>a+Number(x.boleta||0),0);o.innerHTML=`${mode==='COBRA'?`<div class="kpis pending-kpis-v17"><div class="kpi"><span>Pendientes</span><strong>${rows.length}</strong></div><div class="kpi"><span>Saldo total / A pagar</span><strong style="color:var(--red)">${money(total)}</strong></div><div class="kpi"><span>Total con boleta</span><strong>${money(boleta)}</strong></div></div>`:''}${tableHtml(rows,['fecha','unidad','panapass_numero','a_pagar','boleta','n_op','operador','cobrador','tipo','estado_cobra'],'pretty compact-table','mobile-cards')}`}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};const setMode=m=>{mode=m;document.querySelector('#histAll').className=m==='ALL'?'':'soft-btn';document.querySelector('#histCobra').className=m==='COBRA'?'':'soft-btn';run()};document.querySelector('#histAll').onclick=()=>setMode('ALL');document.querySelector('#histCobra').onclick=()=>setMode('COBRA');document.querySelector('#hb').onclick=run;await run();
};
