/* Portal RYM V171 modular loader + Architecture V2 pilot */
(function(w,d){
  'use strict';
  if(w.__RYM_V171_LOADER__)return;
  w.__RYM_V171_LOADER__=true;

  const current=d.currentScript&&d.currentScript.src?d.currentScript.src:'';
  let build='172-pilot';
  try{build=new URL(current||w.location.href).searchParams.get('v')||build}catch(_){}
  w.RYM_BUILD_VERSION=build;

  function dashboardV2Enabled(){
    if(typeof w.RYM_PANAPASS_DASHBOARD_V2_ENABLED==='boolean')return w.RYM_PANAPASS_DASHBOARD_V2_ENABLED;
    try{
      const url=new URL(w.location.href);
      const rawParam=url.searchParams.get('panapassDashboardV2');
      if(rawParam!==null){
        const raw=String(rawParam||'').toLowerCase();
        const on=raw==='1'||raw==='true'||raw==='yes';
        if(on) w.sessionStorage?.setItem('rym.panapassDashboardV2','1');
        else w.sessionStorage?.removeItem('rym.panapassDashboardV2');
        return on;
      }
      return w.sessionStorage?.getItem('rym.panapassDashboardV2')==='1';
    }catch(_){return false}
  }
  w.RYM_PANAPASS_DASHBOARD_V2_ENABLED=dashboardV2Enabled();

  const q='?v='+encodeURIComponent(build);
  const css=['/css/core.css'];

  const legacyDashboard=[
    '/modules/panapass/dashboard/index.js',
    '/modules/panapass/dashboard/experience-v2.js',
    '/modules/panapass/dashboard/ops-v3.js',
    '/modules/panapass/dashboard/date-window-v4.js'
  ];
  const dashboardV2=[
    '/modules/panapass/dashboard-v2/role-policy.js',
    '/modules/panapass/dashboard-v2/data.js',
    '/modules/panapass/dashboard-v2/view-model.js',
    '/modules/panapass/dashboard-v2/components/common.js',
    '/modules/panapass/dashboard-v2/views/admin-total.js',
    '/modules/panapass/dashboard-v2/views/galera.js',
    '/modules/panapass/dashboard-v2/views/supervisora.js',
    '/modules/panapass/dashboard-v2/index.js'
  ];

  const files=[
    '/modules/core/module-registry.js',
    '/modules/core/style-manager.js',
    '/modules/core/event-bus.js',
    '/modules/core/context.js',
    '/modules/core/aracelys-messages.js',
    '/modules/panapass/ena/transferencia.js',
    '/modules/panapass/ena/pdf-engine.js',
    '/modules/panapass/ranking/index.js',
    '/modules/panapass/recurrentes/index.js',
    '/modules/panapass/bajas/index.js',
    '/modules/panapass/pagos/index.js',
    '/modules/panapass/negativos/index.js',
    '/modules/panapass/negativos/panama-date.js',
    ...(w.RYM_PANAPASS_DASHBOARD_V2_ENABLED?dashboardV2:legacyDashboard),
    '/modules/panapass/sidebar-v6-restored.js',
    '/modules/panapass/ranking/final-tabs.js',
    '/modules/panapass/ranking/criteria-final.js',
    '/modules/panapass/ranking/criteria-clickfix.js',
    '/modules/panapass/ranking/owner-lock.js',
    '/modules/panapass/index.js',
    '/modules/revisados/index.js',
    '/modules/control-auto/index.js',
    '/modules/gps/index.js',
    '/modules/usuarios/index.js',
    '/modules/core/legacy-route-bridge.js',
    '/modules/core/bootstrap.js'
  ];

  function style(href){
    return new Promise((resolve,reject)=>{
      const existing=d.querySelector(`link[data-rym-core-style][data-href="${href}"]`);
      if(existing)return resolve(existing);
      const l=d.createElement('link');
      l.rel='stylesheet';l.href=href+q;l.dataset.rymCoreStyle='1';l.dataset.href=href;
      l.onload=()=>resolve(l);l.onerror=()=>reject(new Error('No se pudo cargar '+href));
      d.head.appendChild(l);
    });
  }

  function load(src){
    return new Promise((resolve,reject)=>{
      const s=d.createElement('script');
      s.src=src+q;s.async=false;s.onload=resolve;s.onerror=()=>reject(new Error('No se pudo cargar '+src));
      d.head.appendChild(s);
    });
  }

  w.RYM_V171_READY=(async()=>{
    for(const href of css)await style(href);
    for(const f of files)await load(f);
    const expected=['panapass','panapass-ranking','panapass-recurrentes','panapass-bajas','panapass-pagos','panapass-negativos','revisados','control-auto','gps','usuarios'];
    const missing=expected.filter(x=>!w.RYM_MODULES?.has(x));
    if(missing.length)throw new Error('Modulos V171 faltantes: '+missing.join(','));
    if(!w.RYM_CONTEXT||!w.RYM_EVENTS||!w.RYM_STYLES||!w.RYM_LEGACY_ROUTES)throw new Error('Architecture V2 core no disponible');
    await w.RYM_BOOTSTRAP?.start?.();
    if(w.RYM_PANAPASS_DASHBOARD_V2_ENABLED&&!w.RYM_PANAPASS_DASHBOARD_V2?.ready?.())throw new Error('Panapass Dashboard V2 preview incompleto');
    return Object.freeze({version:build,modules:w.RYM_MODULES.list(),css:css.slice(),architecture:'v2-pilot',styles:'lazy-by-domain',routes:'registry-bridge',panapassDashboard:w.RYM_PANAPASS_DASHBOARD_V2_ENABLED?'v2-preview':'legacy'});
  })();
})(window,document);
