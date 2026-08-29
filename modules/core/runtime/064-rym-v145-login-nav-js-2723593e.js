(function(){
  const PROJECTS=['v70OpenPanapass','v60OpenRevisados','v70OpenControl','v113OpenGps','v70OpenUsers'];
  let projectActive=false;

  function removePortalLayers(){
    document.querySelectorAll('#v139HomeTransition,#v123PortalTransition,#v125PortalTransition,#v145LoginTransition').forEach(x=>x.remove());
    document.body.classList.remove('v125-returning');
  }
  function showLoginTransition(){
    removePortalLayers();
    const layer=document.createElement('div');
    layer.id='v145LoginTransition';
    layer.innerHTML=`<div class="v101-loader"><div class="v101-loader-card"><img class="v101-loader-logo" src="https://drive.google.com/thumbnail?id=1f65vwdwsAraUrK2h7cb5l_eVOQKuHsL8&sz=w1000" alt="Portal RYM"><h2>Cargando Portal RYM</h2><p>Preparando tu Centro de Control…</p><div class="v101-progress"><i></i></div><div class="v101-load-state">Sincronizando módulos y resumen operativo</div></div></div>`;
    document.body.appendChild(layer);
    return layer;
  }
  async function hideLoginTransition(layer,started){
    const wait=Math.max(0,750-(Date.now()-started));
    if(wait)await new Promise(r=>setTimeout(r,wait));
    layer?.remove();
  }

  // El renderer del home puede terminar despues de que el usuario ya entro a un proyecto.
  // En ese caso se conserva el cache actualizado, pero NO se vuelve a pintar el portal encima del proyecto.
  const originalHomeRenderer=typeof window.__rymShellHome99==='function'?window.__rymShellHome99:(typeof window.shellHome99==='function'?window.shellHome99:null);
  if(originalHomeRenderer&&!originalHomeRenderer.__v145){
    const guarded=function(summary){
      if(projectActive)return;
      return originalHomeRenderer(summary);
    };
    guarded.__v145=true;
    window.__rymShellHome99=guarded;
    window.shellHome99=guarded;
  }

  // Al volver al Centro de Control se habilita otra vez el renderer del home.
  const homeBase=window.v36PortalHome;
  if(typeof homeBase==='function'&&!homeBase.__v145){
    const home=async function(){
      projectActive=false;
      return await homeBase.apply(this,arguments);
    };
    home.__v145=true;
    window.v36PortalHome=home;
    try{v36PortalHome=home}catch(_){}
  }

  // Todos los proyectos invalidan cualquier repintado tardio del home pendiente.
  PROJECTS.forEach(name=>{
    const old=window[name];
    if(typeof old!=='function'||old.__v145)return;
    const fn=async function(){
      projectActive=true;
      removePortalLayers();
      document.body.classList.remove('v99-home','v117-home','v120-home-loading');
      return await old.apply(this,arguments);
    };
    fn.__v145=true;
    window[name]=fn;
    try{
      if(name==='v70OpenPanapass')v70OpenPanapass=fn;
      if(name==='v60OpenRevisados')v60OpenRevisados=fn;
      if(name==='v70OpenControl')v70OpenControl=fn;
      if(name==='v113OpenGps')v113OpenGps=fn;
      if(name==='v70OpenUsers')v70OpenUsers=fn;
    }catch(_){}
  });

  // Restaura el flujo visual que existia: autentica -> logo RYM animado -> Centro de Control.
  login=async function(e){
    e.preventDefault();
    const f=new FormData(e.currentTarget),b=document.querySelector('#loginBtn');
    b.disabled=true;b.textContent='Ingresando...';
    try{
      const {data}=await req('/functions/v1/auth-username',{method:'POST',body:JSON.stringify({usuario:f.get('usuario'),password:f.get('password')})});
      if(!data?.ok||!data.access_token)throw Error(data?.error||'No se pudo iniciar sesión.');

      clearSession();
      state.token=data.access_token;
      state.refreshToken=String(data.refresh_token||'');
      state.expiresAt=Number(data.expires_at||0)||0;

      if(data.profile&&data.modules){
        state.profile=data.profile;
        state.modules=[...data.modules];
        state.allModules=[...new Set(data.modules.map(String))];
        if(data.profile.must_change_password){passwordChangeView();return}
        if(typeof phase2NormalizeModules==='function')phase2NormalizeModules();

        const started=Date.now(),layer=showLoginTransition();
        try{
          projectActive=false;
          await window.v36PortalHome();
        }finally{
          await hideLoginTransition(layer,started);
        }
        return;
      }

      await loadApp();
    }catch(x){
      removePortalLayers();
      clearSession();
      loginView(x.message);
    }
  };

  // El formulario visible fue enlazado antes de este parche; se vuelve a enlazar al login V145.
  if(!state.token)loginView();
})();
