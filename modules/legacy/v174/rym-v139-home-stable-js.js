
(function(){
  const ROLE=()=>String(state?.profile?.rol||'').trim().toUpperCase();
  const canQuickValidator=()=>['ADMIN_TOTAL','GERENTE_GALERA','ADMIN','SUPERVISORA'].includes(ROLE());
  const cacheKey=()=>`rym_home_summary_v139_${String(state?.profile?.id||'anon')}`;
  const readPersisted=()=>{try{const x=JSON.parse(sessionStorage.getItem(cacheKey())||'null');return x&&x.data&&x.at?x:null}catch(_){return null}};
  const writePersisted=(data)=>{try{if(data?.ok)sessionStorage.setItem(cacheKey(),JSON.stringify({data,at:Date.now()}))}catch(_){}};
  const ensureLayer=()=>{let x=document.querySelector('#v139HomeTransition');if(x)return x;x=document.createElement('div');x.id='v139HomeTransition';x.innerHTML='<div class="v139-card"><b>Volviendo al Centro de Control</b><div class="v139-track"><i></i></div></div>';document.body.appendChild(x);return x};

  // No mostrar el validador a roles fuera del alcance solicitado.
  const oldShell=typeof window.__rymShellHome99==='function'?window.__rymShellHome99:(typeof window.shellHome99==='function'?window.shellHome99:null);
  if(oldShell&&!oldShell.__v139){
    const wrapped=function(summary){
      const r=oldShell(summary);
      const q=document.querySelector('.v101-validator');
      if(q&&!canQuickValidator())q.remove();
      if(summary?.ok)writePersisted(summary);
      return r;
    };
    wrapped.__v139=true;
    window.__rymShellHome99=wrapped;
    window.shellHome99=wrapped;
  }
  const renderHome139=(summary)=>{
    const fn=window.__rymShellHome99||window.shellHome99;
    if(typeof fn!=='function')throw Error('Renderer original del Centro de Control no disponible');
    return fn(summary);
  };

  // Mantener siempre la lista completa de módulos: nunca reducir allModules al entrar a un proyecto.
  const mergeModules=(mods)=>{if(!Array.isArray(mods))return;const current=Array.isArray(state.allModules)?state.allModules:[];state.allModules=[...new Set([...current,...mods.map(String)])]};
  const cached=window.__v117HomeSummary;
  if(cached?.data?.modules)mergeModules(cached.data.modules);

  // Sustituye solo el regreso al portal. Si hay resumen reciente, pinta completo inmediatamente.
  const oldHome=window.v36PortalHome;
  if(typeof oldHome==='function'&&!oldHome.__v139){
    const stableHome=async function(){
      window.__v75ControlMode=false;
      document.body.classList.remove('capture-mode','v36-admin-total','v37-control-only','v38-revisados-only','v60-revisados','v63-revisados','v66-revisados','v70-control','v70-admin','v70-portal','v117-panapass','v117-revisados','v117-control','v117-gps','v113-gps');
      document.body.classList.add('v99-home','v117-home');

      let c=window.__v117HomeSummary;
      if(!c?.data)c=readPersisted();
      if(c?.data){
        mergeModules(c.data.modules);
        if(c.data.profile)state.profile={...(state.profile||{}),...c.data.profile};
        renderHome139(c.data);
        window.__v117HomeSummary={data:c.data,at:Date.now()};
      }else{
        ensureLayer();
      }

      // Refresco en paralelo; no volver a pintar un home parcial.
      try{
        const response=await req('/functions/v1/portal-home-resumen',{method:'POST',body:'{}'});
        const data=response?.data;
        if(!data?.ok)throw Error(data?.error||'No se pudo cargar el Centro de Control');
        mergeModules(data.modules);
        if(data.profile)state.profile={...(state.profile||{}),...data.profile};
        window.__v117HomeSummary={data,at:Date.now()};writePersisted(data);
        renderHome139(data);
      }catch(e){
        console.warn('V139 home refresh',e);
        if(!c?.data)return oldHome.apply(this,arguments);
      }finally{
        document.querySelector('#v139HomeTransition')?.remove();
      }
    };
    stableHome.__v139=true;
    window.v36PortalHome=stableHome;try{v36PortalHome=stableHome}catch(_){}
  }

  // Cada vez que el backend entrega un resumen completo, conservarlo para próximos regresos.
  const watch=()=>{const c=window.__v117HomeSummary;if(c?.data?.ok){mergeModules(c.data.modules);writePersisted(c.data)}};
  setInterval(watch,15000);
})();
