/* Portal RYM V172 clean loader: no legacy recovery, no monkey patches */
(function(w,d){
  'use strict';
  if(w.__RYM_V172_CLEAN_LOADER__) return;
  w.__RYM_V172_CLEAN_LOADER__=true;

  const css=[
    '/css/core.css',
    '/css/panapass.css',
    '/css/panapass-bajas.css',
    '/css/revisados.css',
    '/css/control-auto.css',
    '/css/gps.css',
    '/css/usuarios.css'
  ];

  const files=[
    '/modules/core/module-registry.js',
    '/modules/core/session.js',
    '/modules/core/router.js',
    '/modules/panapass/ena/transferencia.js',
    '/modules/panapass/ena/pdf-engine.js',
    '/modules/panapass/ranking/index.js',
    '/modules/panapass/recurrentes/index.js',
    '/modules/panapass/bajas/index.js',
    '/modules/panapass/index.js',
    '/modules/revisados/index.js',
    '/modules/control-auto/router.js',
    '/modules/control-auto/index.js',
    '/modules/gps/index.js',
    '/modules/usuarios/index.js'
  ];

  function loadStyle(href){
    return new Promise((resolve,reject)=>{
      const id='rym-css-'+href.replace(/[^a-z0-9]+/gi,'-');
      if(d.getElementById(id)) return resolve();
      const l=d.createElement('link');
      l.id=id;l.rel='stylesheet';l.href=href+'?v=172-clean';
      l.onload=resolve;l.onerror=()=>reject(new Error('No se pudo cargar '+href));
      d.head.appendChild(l);
    });
  }

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const id='rym-js-'+src.replace(/[^a-z0-9]+/gi,'-');
      if(d.getElementById(id)) return resolve();
      const s=d.createElement('script');
      s.id=id;s.src=src+'?v=172-clean';s.async=false;
      s.onload=resolve;s.onerror=()=>reject(new Error('No se pudo cargar '+src));
      d.head.appendChild(s);
    });
  }

  w.RYM_V172_CLEAN_READY=(async()=>{
    for(const href of css) await loadStyle(href);
    for(const src of files) await loadScript(src);
    const expected=['panapass','panapass-ranking','panapass-recurrentes','panapass-bajas','revisados','control-auto','gps','usuarios'];
    const missing=expected.filter(name=>!w.RYM_MODULES?.has(name));
    if(missing.length) throw new Error('Modulos faltantes: '+missing.join(','));
    if(!w.RYM_CONTROL_ROUTER) throw new Error('Control de Auto router faltante');
    return Object.freeze({version:'172-clean',modules:w.RYM_MODULES.list(),css:css.slice()});
  })();
})(window,document);
