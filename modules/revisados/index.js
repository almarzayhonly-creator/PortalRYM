/* Portal RYM V171 - Revisados module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES)return;

  const LEGACY_OPEN=w.v60OpenRevisados;
  const FLAG_KEY='rym.revisadosVuePilot';

  function enabled(){
    try{
      const u=new URL(w.location.href);
      const raw=u.searchParams.get('revisadosVue');
      if(raw!==null){
        const on=['1','true','yes'].includes(String(raw).toLowerCase());
        if(on)w.sessionStorage?.setItem(FLAG_KEY,'1');
        else w.sessionStorage?.removeItem(FLAG_KEY);
        return on;
      }
      return w.sessionStorage?.getItem(FLAG_KEY)==='1';
    }catch(_){return false}
  }

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

  async function openVue(){
    const app=d.querySelector('#app');
    if(!app)throw new Error('Portal app root unavailable');

    d.body.dataset.rymModule='revisados';
    d.body.classList.remove('v60-revisados','v63-revisados','v66-revisados');
    d.body.classList.add('v117-revisados');

    app.innerHTML=
      '<main id="rymRevisadosVueHost" style="min-height:100vh;background:#f6f8fb">'+
      '<div style="height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;border-bottom:1px solid #e2e7ee;background:#fff;font-family:Inter,system-ui">'+
      '<strong style="color:#172033">Revisados · Vista Vue piloto</strong>'+
      '<div style="display:flex;gap:8px">'+
      '<button id="rymRevisadosLegacy" style="border:1px solid #cfd6df;background:#fff;border-radius:8px;padding:8px 12px;cursor:pointer">Vista anterior</button>'+
      '<button id="rymRevisadosBack" style="border:1px solid #172033;background:#172033;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer">Volver al Portal</button>'+
      '</div></div>'+
      '<iframe id="rymRevisadosVueFrame" title="Revisados Vue" src="/vue/dist/index.html?v='+encodeURIComponent(w.RYM_BUILD_VERSION||'sandbox')+'" style="display:block;width:100%;height:calc(100vh - 52px);border:0;background:#f6f8fb"></iframe>'+
      '</main>';

    d.querySelector('#rymRevisadosLegacy')?.addEventListener('click',()=>{
      try{w.sessionStorage?.removeItem(FLAG_KEY)}catch(_){}
      if(typeof LEGACY_OPEN==='function')LEGACY_OPEN();
    });
    d.querySelector('#rymRevisadosBack')?.addEventListener('click',()=>{
      d.body.classList.remove('v117-revisados');
      if(typeof w.v36PortalHome==='function')w.v36PortalHome();
    });

    const frame=d.querySelector('#rymRevisadosVueFrame');
    if(frame){
      let loaded=false;
      frame.addEventListener('load',()=>{loaded=true},{once:true});
      frame.addEventListener('error',()=>{
        if(typeof LEGACY_OPEN==='function')LEGACY_OPEN();
      },{once:true});
      setTimeout(()=>{
        if(!loaded&&typeof LEGACY_OPEN==='function')LEGACY_OPEN();
      },5000);
    }
  }

  w.RYM_MODULES.register('revisados',{
    open:function(){
      d.body.dataset.rymModule='revisados';
      if(enabled()){
        return openVue().catch(()=>{
          if(typeof LEGACY_OPEN!=='function')throw new Error('Revisados canonical entrypoint unavailable');
          return LEGACY_OPEN();
        });
      }
      if(typeof LEGACY_OPEN!=='function')throw new Error('Revisados canonical entrypoint unavailable');
      return LEGACY_OPEN();
    }
  });
})(window,document);
