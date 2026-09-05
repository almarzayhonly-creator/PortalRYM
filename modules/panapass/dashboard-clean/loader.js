/* Portal RYM - Panapass Dashboard V2 Clean preview loader. */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_CLEAN_LOADER__) return;
  w.__RYM_PANAPASS_CLEAN_LOADER__=true;

  const current=d.currentScript?.src||'';
  let build='clean';
  try{build=new URL(current||w.location.href).searchParams.get('v')||build}catch(_){}
  const q='?v='+encodeURIComponent(build);

  function enabled(){
    try{
      const u=new URL(w.location.href),raw=u.searchParams.get('panapassClean');
      if(raw!==null){
        const on=['1','true','yes'].includes(String(raw).toLowerCase());
        if(on) w.sessionStorage?.setItem('rym.panapassClean','1');
        else w.sessionStorage?.removeItem('rym.panapassClean');
        return on;
      }
      return w.sessionStorage?.getItem('rym.panapassClean')==='1';
    }catch(_){return false}
  }

  w.RYM_PANAPASS_CLEAN_ENABLED=enabled();
  if(!w.RYM_PANAPASS_CLEAN_ENABLED){
    w.RYM_PANAPASS_CLEAN_READY=Promise.resolve(Object.freeze({enabled:false,build}));
    return;
  }

  const styles=[
    '/css/panapass/dashboard-clean/base.css',
    '/css/panapass/dashboard-clean/components.css',
    '/css/panapass/dashboard-clean/views.css',
    '/css/panapass/dashboard-clean/responsive.css'
  ];
  const files=[
    '/modules/panapass/dashboard-clean/runtime.js',
    '/modules/panapass/dashboard-clean/role-policy.js',
    '/modules/panapass/dashboard-clean/data.js',
    '/modules/panapass/dashboard-clean/view-model.js',
    '/modules/panapass/dashboard-clean/components.js',
    '/modules/panapass/dashboard-clean/views/admin-total.js',
    '/modules/panapass/dashboard-clean/views/galera.js',
    '/modules/panapass/dashboard-clean/views/supervisora.js',
    '/modules/panapass/dashboard-clean/index.js'
  ];

  function style(href){return new Promise((resolve,reject)=>{const l=d.createElement('link');l.rel='stylesheet';l.href=href+q;l.dataset.rymPanapassCleanStyle=href;l.onload=()=>resolve(l);l.onerror=()=>reject(new Error('No se pudo cargar '+href));d.head.appendChild(l)})}
  function script(src){return new Promise((resolve,reject)=>{const s=d.createElement('script');s.src=src+q;s.async=false;s.dataset.rymPanapassCleanScript=src;s.onload=()=>resolve(s);s.onerror=()=>reject(new Error('No se pudo cargar '+src));d.head.appendChild(s)})}

  w.RYM_PANAPASS_CLEAN_READY=(async()=>{
    for(const href of styles) await style(href);
    for(const src of files) await script(src);
    if(!w.RYM_PANAPASS_DASHBOARD_CLEAN?.autoMount) throw new Error('Dashboard Panapass Clean no disponible');
    const result=await w.RYM_PANAPASS_DASHBOARD_CLEAN.autoMount();
    return Object.freeze({enabled:true,build,result});
  })();
})(window,document);
