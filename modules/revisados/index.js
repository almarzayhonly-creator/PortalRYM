/* Portal RYM V171 - Revisados module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES)return;

  const LEGACY_OPEN=w.v60OpenRevisados;
  let lastData=null;

  function availableTabs(){
    const c=lastData?.profile?.can||{};
    const role=String(lastData?.profile?.rol||w.state?.profile?.rol||'').trim().toUpperCase();
    const daily=(typeof w.rymHasModule==='function'?w.rymHasModule('revisados.reporte_diario'):role==='ADMIN_TOTAL');
    const tabs=[{id:'dashboard',label:'Dashboard',icon:'⌂'}];
    if(c.operations)tabs.push({id:'operations',label:'Operaciones',icon:'⚑'});
    if(c.monthly)tabs.push({id:'monthly',label:'Avance mensual',icon:'▦'});
    if(daily)tabs.push({id:'daily',label:'Reporte diario',icon:'✉'});
    if(c.history)tabs.push({id:'history',label:'Historial',icon:'≡'});
    if(c.stats)tabs.push({id:'stats',label:'Estadísticas',icon:'▥'});
    if(c.boletas)tabs.push({id:'boletas',label:'Boletas',icon:'●'});
    if(c.cupos)tabs.push({id:'cupos',label:'Cupos',icon:'$'});
    return tabs;
  }

  function openLegacyTab(tab){
    d.body.classList.remove('rym-revisados-vue');
    if(typeof LEGACY_OPEN!=='function')throw new Error('Revisados canonical entrypoint unavailable');
    LEGACY_OPEN();
    let tries=0;
    const clickTab=()=>{
      const b=d.querySelector('[data-v66-tab="'+String(tab||'dashboard')+'"]');
      if(b){b.click();setTimeout(injectLauncher,250);return}
      if(++tries<20)setTimeout(clickTab,100);
    };
    setTimeout(clickTab,80);
  }

  w.RYM_REVISADOS_BRIDGE={
    async load(){
      if(typeof w.v66PrefetchRevisados!=='function'){
        throw new Error('Revisados canonical data loader unavailable');
      }
      const data=await w.v66PrefetchRevisados();
      if(!data?.ok)throw new Error(data?.error||'No se pudo cargar Revisados');
      lastData=data;
      return data;
    },
    profile(){
      return lastData?.profile || ((typeof w.state!=='undefined'&&w.state?.profile)?w.state.profile:null);
    },
    tabs(){return availableTabs()},
    navigate(tab){openLegacyTab(tab)}
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
      '<main style="min-height:100vh;background:#f6f7fb">'+
        '<iframe title="Revisados RYM Vue" src="/vue/dist/index.html?embedded=1" style="display:block;width:100%;height:100vh;border:0;background:#f6f7fb"></iframe>'+
      '</main>';
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
    b.textContent='Probar nuevo Revisados';
    b.style.cssText='position:fixed;right:18px;bottom:18px;z-index:99999;height:38px;padding:0 14px;border:1px solid #0062ff;border-radius:10px;background:#0062ff;color:#fff;font:800 12px Inter,system-ui;box-shadow:0 10px 24px rgba(0,98,255,.22);cursor:pointer';
    b.onclick=openVueMission;
    d.body.appendChild(b);
  }

  w.RYM_REVISADOS_VUE={open:openVueMission,navigate:openLegacyTab};

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
