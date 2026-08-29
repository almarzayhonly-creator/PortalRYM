/* V36: selector de módulos + caches cortos + deduplicación de llamadas repetidas. */
(function(){
  const PERF=window.__v36Perf=window.__v36Perf||{cache:new Map(),inflight:new Map(),metaPromise:null};
  const ttlFor=(fn,body)=>{
    if(fn==='panapass_saldo_disponibilidad')return 20000;
    if(fn==='panapass_unidades_detalle'&&!String(body?.p_buscar||'').trim())return 300000;
    if(fn==='panapass_control_auto_resumen')return 30000;
    return 0;
  };
  const normalizeBody=(fn,body)=>{
    if(fn==='panapass_saldo_disponibilidad'){
      const nums=[...new Set((body?.p_panapass||[]).map(Number).filter(Boolean))].sort((a,b)=>a-b);
      return {...(body||{}),p_panapass:nums};
    }
    return body||{};
  };
  const cacheScope=()=>String(state.profile?.id||state.profile?.email||'sin-perfil');
  const cacheKey=(fn,body)=>cacheScope()+'|'+fn+'|'+JSON.stringify(normalizeBody(fn,body));
  function invalidate(fn){
    for(const k of [...PERF.cache.keys()])if(k.includes('|'+fn+'|'))PERF.cache.delete(k);
    for(const k of [...PERF.inflight.keys()])if(k.includes('|'+fn+'|'))PERF.inflight.delete(k);
  }
  window.v36InvalidateCache=invalidate;

  const baseClearSession=clearSession;
  clearSession=function(){PERF.cache.clear();PERF.inflight.clear();PERF.metaPromise=null;return baseClearSession()};

  const baseRpc=rpc;
  rpc=async function(fn,body={}){
    const ttl=ttlFor(fn,body);
    if(!ttl)return baseRpc(fn,body);
    const normalized=normalizeBody(fn,body),key=cacheKey(fn,normalized),now=Date.now();
    const hit=PERF.cache.get(key);
    if(hit&&now-hit.at<ttl)return hit.data;
    if(PERF.inflight.has(key))return PERF.inflight.get(key);
    const p=(async()=>{
      try{
        const data=await baseRpc(fn,normalized);
        PERF.cache.set(key,{at:Date.now(),data});
        return data;
      }finally{PERF.inflight.delete(key)}
    })();
    PERF.inflight.set(key,p);
    return p;
  };

  const baseReq=req;
  req=async function(path,opt={}){
    const out=await baseReq(path,opt);
    if(String(path).includes('/functions/v1/ena-consulta-saldo'))invalidate('panapass_saldo_disponibilidad');
    if(String(path).includes('/functions/v1/admin-unidad-status')){
      invalidate('panapass_unidades_detalle');
      invalidate('panapass_control_auto_resumen');
    }
    return out;
  };

  async function ensureMeta(){
    if(state.meta)return state.meta;
    if(PERF.metaPromise)return PERF.metaPromise;
    PERF.metaPromise=(async()=>{try{state.meta=(await rpc('panapass_meta'))?.[0]||null;return state.meta}catch(_){return null}finally{PERF.metaPromise=null}})();
    return PERF.metaPromise;
  }

  window.v36PortalHome=function(){
    document.body.classList.remove('capture-mode','v36-admin-total');
    if(window.__v36PagosObserver){try{window.__v36PagosObserver.disconnect()}catch(_){}}
    if(window.__v36PayFilterObserver){try{window.__v36PayFilterObserver.disconnect()}catch(_){}}
    if(window.__v36NegObserver){try{window.__v36NegObserver.disconnect()}catch(_){}}
    if(typeof phase2NormalizeModules==='function')phase2NormalizeModules();
    const name=state.profile?.nombre||state.profile?.email||'Usuario';
    const r=String(state.profile?.rol||'');
    const canControl=(state.modules||[]).includes('dashboard');
    app.innerHTML=`<main class="v36-home"><section class="v36-home-shell"><header class="v36-home-head"><div class="v36-home-brand"><img src="https://drive.google.com/thumbnail?id=1f65vwdwsAraUrK2h7cb5l_eVOQKuHsL8&sz=w1000" alt="Portal RYM" onerror="this.style.display='none'"><div class="v36-home-title"><h1>Portal RYM</h1><p>Selecciona el módulo que deseas utilizar.</p></div></div><div class="v36-home-user"><b>${esc(name)}</b><span>${esc(r)}</span><button id="v36HomeLogout">Salir</button></div></header><div class="v36-module-grid"><article class="v36-module-card panapass"><div class="v36-module-icon">P</div><h2>Panapass</h2><p>Negativos, pagos, rankings, historial, reportes y operación diaria.</p><div class="v36-module-action"><span class="v36-module-status">Disponible</span><button id="v36OpenPanapass">Entrar</button></div></article><article class="v36-module-card control"><div class="v36-module-icon">C</div><h2>Control de Auto</h2><p>Consulta centralizada de unidades, estatus, placas, Panapass, TAG, supervisoras y datos ENA.</p><div class="v36-module-action"><span class="v36-module-status">Disponible</span><button id="v36OpenControl" ${canControl?'':'disabled'}>${canControl?'Abrir':'Sin acceso'}</button></div></article><article class="v36-module-card soon"><div class="v36-module-icon">R</div><h2>Revisado</h2><p>Consulta y gestión de revisado vehicular integrada al mismo portal.</p><div class="v36-module-action"><span class="v36-module-status">Próximamente</span><button disabled>Pronto estará habilitado</button></div></article></div></section></main>`;
    document.querySelector('#v36HomeLogout').onclick=()=>{clearSession();loginView()};
    document.querySelector('#v36OpenPanapass').onclick=async()=>{
      state.active=(state.modules||[]).includes('dashboard')?'dashboard':((state.modules||[])[0]||'dashboard');
      shell();
      render().catch(e=>{const v=document.querySelector('#view');if(v)v.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`});
      ensureMeta();
    };
    const ca=document.querySelector('#v36OpenControl');
    if(ca&&!ca.disabled)ca.onclick=async()=>{ensureMeta();await v11UnitList()};
    ensureMeta();
  };

  const baseShell=shell;
  shell=function(){
    if(window.__v36PagosObserver&&state.active!=='cargar_pagos'){try{window.__v36PagosObserver.disconnect()}catch(_){}}
    if(window.__v36PayFilterObserver&&state.active!=='cargar_pagos'){try{window.__v36PayFilterObserver.disconnect()}catch(_){}}
    if(window.__v36NegObserver&&state.active!=='negativos_hoy'){try{window.__v36NegObserver.disconnect()}catch(_){}}
    baseShell();
    document.body.classList.toggle('v36-admin-total',String(role?.()||'').toUpperCase()==='ADMIN_TOTAL');
    const side=document.querySelector('.side'),nav=side?.querySelector('.nav');
    if(side&&nav&&!side.querySelector('#v36PortalHomeBtn')){
      const b=document.createElement('button');b.id='v36PortalHomeBtn';b.type='button';b.className='v36-portal-home-btn';b.textContent='Inicio Portal';b.onclick=()=>window.v36PortalHome();side.insertBefore(b,nav);
    }
  };

  /* Login directo al selector. La carga de meta queda en segundo plano para que el acceso se sienta inmediato. */
  login=async function(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget),b=document.querySelector('#loginBtn');
    b.disabled=true;b.textContent='Ingresando...';
    try{
      const {data}=await req('/functions/v1/auth-username',{method:'POST',body:JSON.stringify({usuario:f.get('usuario'),password:f.get('password')})});
      if(!data?.ok||!data.access_token)throw Error(data?.error||'No se pudo iniciar sesión.');
      PERF.cache.clear();PERF.inflight.clear();PERF.metaPromise=null;
      state.token=data.access_token;state.refreshToken=String(data.refresh_token||'');state.expiresAt=Number(data.expires_at||0)||0;
      if(data.profile&&data.modules){
        state.profile=data.profile;state.modules=data.modules;
        if(data.profile.must_change_password){passwordChangeView();return}
        if(typeof phase2NormalizeModules==='function')phase2NormalizeModules();
        window.v36PortalHome();return;
      }
      await loadApp();
    }catch(x){clearSession();loginView(x.message)}
  };

  loadApp=async function(){
    try{
      const me=(await req('/auth/v1/user')).data;
      const p=(await rest('perfiles_usuario','select=id,nombre,email,usuario,rol,activo,supervisora_id,must_change_password&id=eq.'+me.id))[0];
      if(!p?.activo)throw Error('Tu usuario no está habilitado.');
      state.profile=p;
      if(p.must_change_password){passwordChangeView();return}
      const [mods,ovs]=await Promise.all([
        rest('rol_modulo_permisos','select=modulo_codigo,puede_ver&rol=eq.'+encodeURIComponent(String(p.rol).toUpperCase())+'&puede_ver=eq.true'),
        rest('usuario_permisos','select=modulo_codigo,puede_ver&user_id=eq.'+me.id)
      ]);
      const map=new Map((mods||[]).map(x=>[x.modulo_codigo,true]));
      for(const o of ovs||[]){if(o.puede_ver===true)map.set(o.modulo_codigo,true);if(o.puede_ver===false)map.delete(o.modulo_codigo)}
      state.modules=[...map.keys()];
      if(typeof phase2NormalizeModules==='function')phase2NormalizeModules();
      window.v36PortalHome();
    }catch(x){clearSession();loginView(x.message)}
  };

  const baseV36UnitList=v11UnitList;
  v11UnitList=async function(){
    await baseV36UnitList();
    const title=document.querySelector('.top h1');if(title)title.textContent='Control de Auto';
  };

  /* Observer de Negativos: solo reacciona cuando se insertan nuevos botones de saldo, no a cada mutación del bloque. */
  negativos=async function(v){
    if(window.__v36NegObserver){try{window.__v36NegObserver.disconnect()}catch(_){}}
    await _phase31Negativos(v);
    await phase31EnhanceSaldoButtons(v);
    const out=v?.querySelector?.('#p3NegOut');if(!out)return;
    let timer=0,busy=false;
    const relevantNode=n=>n?.nodeType===1&&(n.matches?.('[data-ena-saldo]')||n.querySelector?.('[data-ena-saldo]'));
    const obs=new MutationObserver(muts=>{
      if(busy)return;
      if(!muts.some(m=>[...m.addedNodes].some(relevantNode)))return;
      clearTimeout(timer);
      timer=setTimeout(async()=>{
        busy=true;obs.disconnect();
        try{await phase31EnhanceSaldoButtons(v)}finally{busy=false;if(out.isConnected)obs.observe(out,{childList:true,subtree:true})}
      },120);
    });
    window.__v36NegObserver=obs;
    obs.observe(out,{childList:true,subtree:true});
  };

  /* Reenlaza el formulario inicial al login V36 una vez cargado todo el archivo. */
  if(!state.token)loginView();
})();
