/* Portal RYM V171 - Revisados module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES)return;

  const LEGACY_OPEN=w.v60OpenRevisados;

  w.RYM_REVISADOS_BRIDGE={
    async load(){
      if(typeof w.v66PrefetchRevisados!=='function'){
        throw new Error('Revisados canonical data loader unavailable');
      }
      const data=await w.v66PrefetchRevisados();
      if(!data?.ok)throw new Error(data?.error||'No se pudo cargar Revisados');
      return data;
    },
    profile(){
      return (typeof w.state!=='undefined'&&w.state?.profile)?w.state.profile:null;
    }
  };

  function removeLauncher(){d.querySelector('#rymVueMissionLauncher')?.remove()}

  function openVueMission(){
    const app=d.querySelector('#app');
    if(!app)throw new Error('Portal app root unavailable');
    removeLauncher();
    d.body.dataset.rymModule='revisados-vue';
    d.body.classList.remove('v60-revisados','v63-revisados','v66-revisados');
    d.body.classList.add('rym-revisados-vue');

    app.innerHTML=
      '<main style="min-height:100vh;background:#f4f6fa">'+
        '<div style="height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid #dfe6ef;background:#fff;font-family:Inter,system-ui">'+
          '<div style="display:flex;align-items:center;gap:9px"><b style="color:#0f172a">Mission Control Vue</b><span style="font-size:11px;color:#64748b">Datos reales · sesión actual</span></div>'+
          '<button id="rymVueBackLegacy" type="button" style="height:32px;padding:0 11px;border:1px solid #d7dee8;border-radius:8px;background:#fff;color:#334155;font-weight:700;cursor:pointer">Volver a Revisados actual</button>'+
        '</div>'+
        '<iframe title="Mission Control Vue" src="/vue/dist/index.html?embedded=1" style="display:block;width:100%;height:calc(100vh - 48px);border:0;background:#f4f6fa"></iframe>'+
      '</main>';

    d.querySelector('#rymVueBackLegacy')?.addEventListener('click',()=>{
      d.body.classList.remove('rym-revisados-vue');
      if(typeof LEGACY_OPEN==='function'){
        LEGACY_OPEN();
        setTimeout(injectLauncher,250);
      }
    });
  }

  function injectLauncher(){
    if(d.querySelector('#rymVueMissionLauncher'))return;
    if(d.body.classList.contains('rym-revisados-vue'))return;
    const legacyVisible=
      d.body.classList.contains('v60-revisados')||
      d.body.classList.contains('v63-revisados')||
      d.body.classList.contains('v66-revisados')||
      !!d.querySelector('.v66-app');
    if(!legacyVisible)return;

    const b=d.createElement('button');
    b.id='rymVueMissionLauncher';
    b.type='button';
    b.textContent='Probar Mission Control Vue';
    b.style.cssText='position:fixed;right:18px;bottom:18px;z-index:99999;height:38px;padding:0 14px;border:1px solid #0062ff;border-radius:10px;background:#0062ff;color:#fff;font:800 12px Inter,system-ui;box-shadow:0 10px 24px rgba(0,98,255,.22);cursor:pointer';
    b.onclick=openVueMission;
    d.body.appendChild(b);
  }

  w.RYM_REVISADOS_VUE={open:openVueMission};

  w.RYM_MODULES.register('revisados',{
    open:function(){
      d.body.dataset.rymModule='revisados';
      if(typeof LEGACY_OPEN!=='function')throw new Error('Revisados canonical entrypoint unavailable');
      const result=LEGACY_OPEN();
      setTimeout(injectLauncher,250);
      return result;
    }
  });

  new MutationObserver(()=>injectLauncher()).observe(d.documentElement,{childList:true,subtree:true});
  setTimeout(injectLauncher,500);
})(window,document);
