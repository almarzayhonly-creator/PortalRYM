(()=>{
  if(window.__RYM_V156__)return;window.__RYM_V156__=true;

  /*
    El loader/logo animado V145 queda intacto.
    Durante la carga principal del Centro de Control, pospone solo warmups secundarios
    que antes competian con portal-home-resumen (GPS, Control resumen y Revisados).
  */
  const reqBase=req;
  let homeGate=null,releaseHomeGate=null,homeInFlight=null;
  const secondaryPath=p=>[
    '/functions/v1/gps-rym-admin',
    '/functions/v1/control-auto-resumen-supervisoras',
    '/functions/v1/revisados-final'
  ].includes(String(p||''));

  req=async function(path,opt={}){
    if(window.__RYM_HOME_PRIMARY_LOADING&&homeGate&&secondaryPath(path)){
      try{await Promise.race([homeGate,new Promise(r=>setTimeout(r,6000))])}catch(_){}
    }
    return reqBase(path,opt);
  };

  const homeBase=window.v36PortalHome;
  if(typeof homeBase==='function'&&!homeBase.__v156){
    const home=function(){
      if(homeInFlight)return homeInFlight;
      window.__RYM_HOME_PRIMARY_LOADING=true;
      homeGate=new Promise(r=>{releaseHomeGate=r});
      homeInFlight=Promise.resolve().then(()=>homeBase.apply(this,arguments)).finally(()=>{
        window.__RYM_HOME_PRIMARY_LOADING=false;
        try{releaseHomeGate?.()}catch(_){}
        releaseHomeGate=null;homeGate=null;homeInFlight=null;
      });
      return homeInFlight;
    };
    home.__v156=true;
    window.v36PortalHome=home;
    try{v36PortalHome=home}catch(_){}
  }
})();
