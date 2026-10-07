/* Portal RYM · Dedicated tablet shell for main's quick Unit Validator.
   IMPORTANT: search/result logic stays in main (bindValidator99/openValidator99). */
(function(w,d){
  'use strict';
  if(w.__RYM_UNIT_VALIDATOR_TABLET_APP__)return;

  const params=new URLSearchParams(w.location.search);
  const appMode=['validador','validator','validador-unidad','unit-validator'].includes(String(params.get('app')||'').toLowerCase());
  if(!appMode)return;
  w.__RYM_UNIT_VALIDATOR_TABLET_APP__=true;

  let wrapped=false;

  function getState(){
    try{return typeof state!=='undefined'?state:null}catch(_){return null}
  }

  function ensurePwa(){
    if(!d.querySelector('link[data-rym-unit-validator-manifest]')){
      const l=d.createElement('link');
      l.rel='manifest';
      l.href='/validator-tablet.webmanifest';
      l.dataset.rymUnitValidatorManifest='1';
      d.head.appendChild(l);
    }
    let theme=d.querySelector('meta[name="theme-color"]');
    if(!theme){
      theme=d.createElement('meta');
      theme.name='theme-color';
      d.head.appendChild(theme);
    }
    theme.content='#0A1B4D';
    if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
      navigator.serviceWorker.register('/validator-tablet-sw.js',{scope:'/'}).catch(()=>{});
    }
  }

  function removeShell(){
    d.body.classList.remove('rym-unit-validator-app');
    d.querySelector('#rymUnitValidatorAppbar')?.remove();
  }

  function logout(){
    removeShell();
    try{if(typeof clearSession==='function')clearSession()}catch(_){}
    try{
      if(typeof loginView==='function')loginView();
      else location.reload();
    }catch(_){location.reload()}
  }

  function updateOnline(){
    const el=d.querySelector('#rymUnitValidatorOnline');
    if(!el)return;
    const on=navigator.onLine;
    el.classList.toggle('offline',!on);
    el.textContent=on?'Conectado':'Sin conexión';
  }

  function appbar(){
    const p=getState()?.profile||{};
    let bar=d.querySelector('#rymUnitValidatorAppbar');
    if(!bar){
      bar=d.createElement('header');
      bar.id='rymUnitValidatorAppbar';
      bar.className='rym-unit-validator-appbar';
      bar.innerHTML='<div class="rym-unit-validator-brand"><div class="rym-unit-validator-mark">R</div><div class="rym-unit-validator-heading"><b>Validador de Unidad</b><span id="rymUnitValidatorUser">Portal RYM</span></div></div><div class="rym-unit-validator-actions"><span class="rym-unit-validator-online" id="rymUnitValidatorOnline">Conectado</span><button type="button" class="rym-unit-validator-exit" id="rymUnitValidatorExit">Salir</button></div>';
      d.body.appendChild(bar);
      bar.querySelector('#rymUnitValidatorExit')?.addEventListener('click',logout);
    }
    const label=bar.querySelector('#rymUnitValidatorUser');
    if(label)label.textContent=[p.nombre||p.email||'Usuario','Portal RYM'].filter(Boolean).join(' · ');
    updateOnline();
  }

  function activate(){
    const s=getState();
    if(!s?.profile)return false;

    const validator=d.querySelector('.v101-validator');
    const input=d.querySelector('#v101ValidatorQ');
    const go=d.querySelector('#v101ValidatorGo');
    if(!validator||!input||!go)return false;

    d.body.classList.add('rym-unit-validator-app');
    appbar();

    input.setAttribute('inputmode','search');
    input.setAttribute('autocomplete','off');
    input.setAttribute('enterkeyhint','search');
    input.setAttribute('aria-label','Buscar unidad, empresa, placa o Panapass');
    go.setAttribute('aria-label','Validar unidad');

    /* The dedicated app must never expose a route into the full Control de Auto module. */
    const blockFullPortalAction=()=>{
      const b=d.querySelector('#v101OpenModule');
      if(b){
        b.style.display='none';
        b.disabled=true;
        b.onclick=null;
      }
    };
    blockFullPortalAction();

    if(!w.__RYM_UNIT_VALIDATOR_MODAL_WATCH__){
      w.__RYM_UNIT_VALIDATOR_MODAL_WATCH__=new MutationObserver(muts=>{
        if(muts.some(m=>[...m.addedNodes].some(n=>n?.nodeType===1&&(n.id==='v101CheckModal'||n.querySelector?.('#v101CheckModal'))))){
          blockFullPortalAction();
        }
      });
      w.__RYM_UNIT_VALIDATOR_MODAL_WATCH__.observe(d.body,{childList:true,subtree:false});
    }

    requestAnimationFrame(()=>input.focus({preventScroll:true}));
    return true;
  }

  async function renderDedicatedFromMain(base,args,ctx){
    const result=await base.apply(ctx,args);
    let tries=0;
    while(tries<30 && !activate()){
      await new Promise(resolve=>setTimeout(resolve,100));
      tries++;
    }
    if(!d.querySelector('.v101-validator')){
      const root=d.querySelector('#app');
      if(root){
        root.innerHTML='<main class="rym-unit-validator-state"><section class="rym-unit-validator-state-card"><h1>Validador de Unidad no disponible</h1><p>El Centro de Control cargó, pero no encontró el Validador rápido de unidad de main.</p><button type="button" id="rymUnitValidatorReload">Reintentar</button></section></main>';
        root.querySelector('#rymUnitValidatorReload')?.addEventListener('click',()=>location.reload());
      }
    }
    return result;
  }

  function installRoute(){
    if(wrapped)return true;
    const base=w.v36PortalHome;
    if(typeof base!=='function')return false;

    async function dedicatedPortalHome(){
      if(!appMode)return base.apply(this,arguments);
      return renderDedicatedFromMain(base,arguments,this);
    }
    dedicatedPortalHome.__rymUnitValidatorTablet=true;
    dedicatedPortalHome.__rymUnitValidatorBase=base;
    w.v36PortalHome=dedicatedPortalHome;
    try{v36PortalHome=dedicatedPortalHome}catch(_){}
    wrapped=true;

    /* Already authenticated when the route script arrives: render through main immediately. */
    if(getState()?.profile){
      setTimeout(()=>void w.v36PortalHome(),0);
    }
    return true;
  }

  function installWithRetry(attempt=0){
    if(installRoute())return;
    if(attempt<30)setTimeout(()=>installWithRetry(attempt+1),120);
  }

  ensurePwa();
  addEventListener('online',updateOnline);
  addEventListener('offline',updateOnline);

  if(d.readyState==='loading'){
    d.addEventListener('DOMContentLoaded',()=>installWithRetry(),{once:true});
  }else{
    installWithRetry();
  }
})(window,document);
