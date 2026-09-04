/* Portal RYM Architecture V2 - lazy module styles */
(function(w,d){
  'use strict';
  if(w.RYM_STYLES) return;

  const manifests = Object.freeze({
    panapass: Object.freeze(['/css/panapass.css','/css/panapass-dashboard.css','/css/panapass-bajas.css']),
    revisados: Object.freeze(['/css/revisados.css']),
    'control-auto': Object.freeze(['/css/control-auto.css']),
    gps: Object.freeze(['/css/gps.css']),
    usuarios: Object.freeze(['/css/usuarios.css'])
  });

  const aliases = Object.freeze({
    'panapass-ranking':'panapass',
    'panapass-recurrentes':'panapass',
    'panapass-bajas':'panapass',
    'panapass-pagos':'panapass',
    'panapass-negativos':'panapass'
  });

  const build=String(w.RYM_BUILD_VERSION||'172-pilot');
  const q='?v='+encodeURIComponent(build);
  let activeDomain = '';
  const loaded = new Map();

  function domainOf(moduleId){
    const id = String(moduleId || '');
    return aliases[id] || (Object.prototype.hasOwnProperty.call(manifests,id) ? id : '');
  }

  function linkFor(href){
    if(loaded.has(href)) return loaded.get(href);
    const existing = d.querySelector(`link[data-rym-module-style][data-href="${href}"]`);
    if(existing){loaded.set(href,existing);return existing;}
    return null;
  }

  function ensure(href,domain){
    return new Promise((resolve,reject)=>{
      let link = linkFor(href);
      if(link){
        link.disabled = false;
        link.dataset.rymStyleDomain = domain;
        resolve(link);
        return;
      }
      link=d.createElement('link');
      link.rel='stylesheet';
      link.href=href+q;
      link.dataset.rymModuleStyle='1';
      link.dataset.rymStyleDomain=domain;
      link.dataset.href=href;
      link.onload=()=>resolve(link);
      link.onerror=()=>reject(new Error('No se pudo cargar '+href));
      (d.head||d.documentElement).appendChild(link);
      loaded.set(href,link);
    });
  }

  function disableOthers(domain){
    for(const link of loaded.values()){
      link.disabled = link.dataset.rymStyleDomain !== domain;
    }
  }

  async function activate(moduleId){
    const domain=domainOf(moduleId);
    if(!domain){
      disableOthers('');
      activeDomain='';
      return '';
    }
    const files=manifests[domain]||[];
    for(const href of files) await ensure(href,domain);
    disableOthers(domain);
    activeDomain=domain;
    return domain;
  }

  function deactivate(moduleId){
    const domain=domainOf(moduleId);
    if(!domain || domain!==activeDomain) return;
    disableOthers('');
    activeDomain='';
  }

  function current(){return activeDomain}
  function manifest(){return manifests}

  w.RYM_STYLES=Object.freeze({activate,deactivate,current,domainOf,manifest});
})(window,document);
