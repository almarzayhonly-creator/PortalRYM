/* Dedicated validator session: no Portal home, fleet KPIs or project loaders. */
(function(w,d){
  'use strict';
  if(!w.RYM_VALIDATOR_HOST)return;
  let sessionLoad=null,loadVersion=-1;
  w.rymHasModule=code=>(state.allModules||state.modules||[]).includes(code);
  w.v36PortalHome=async function(){
    d.body.className='';
    d.getElementById('app').innerHTML='';
    // The adapter renders the dedicated surface or the denied state on this mutation.
  };
  try{v36PortalHome=w.v36PortalHome}catch(_){}
  loadApp=async function(){
    if(sessionLoad&&loadVersion===state.sessionVersion)return sessionLoad;
    const version=state.sessionVersion;
    loadVersion=version;
    const pending=(async()=>{
      try{
        const {data}=await req('/functions/v1/portal-session-modules',{method:'POST',body:'{}'});
        if(version!==state.sessionVersion)return;
        if(!data?.ok||!data.profile?.activo||!Array.isArray(data.modules))throw Error(data?.error||'No se pudo verificar tu acceso.');
        state.profile=data.profile;state.modules=data.modules;state.allModules=data.modules;
        w.RYM_VALIDATOR_ACCESS_OWNER=String(data.profile.id||'');
        if(state.profile.must_change_password){passwordChangeView();return}
        await w.v36PortalHome();
      }catch(error){if(version===state.sessionVersion){clearSession();loginView(error.message)}}
    })().finally(()=>{if(sessionLoad===pending)sessionLoad=null});
    sessionLoad=pending;return pending;
  };
  login=async function(event){
    event.preventDefault();const form=new FormData(event.currentTarget),button=d.getElementById('loginBtn');
    button.disabled=true;button.textContent='Ingresando…';
    try{
      const {data}=await req('/functions/v1/auth-username',{method:'POST',body:JSON.stringify({usuario:form.get('usuario'),password:form.get('password')})});
      if(!data?.ok||!data.access_token)throw Error(data?.error||'No se pudo iniciar sesión.');
      clearSession();w.RYM_VALIDATOR_ACCESS_OWNER='';state.token=data.access_token;state.refreshToken=String(data.refresh_token||'');state.expiresAt=Number(data.expires_at||0);
      await loadApp();
    }catch(error){clearSession();loginView(error.message)}
  };
  // No Portal persistence is reused. Permissions are always obtained for this session.
  loginView();
})(window,document);
