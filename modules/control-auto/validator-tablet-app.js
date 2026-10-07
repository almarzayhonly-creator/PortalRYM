/* Portal RYM · Tablet-only shell for the existing eCarCheck validator.
   Business rules remain in main's v80 validator. This file only owns routing + tablet presentation. */
(function(w,d){
  'use strict';
  if(w.__RYM_VALIDATOR_TABLET_APP__)return;

  const params=new URLSearchParams(w.location.search);
  const appMode=['validador','validator','validator-tablet'].includes(String(params.get('app')||'').toLowerCase());
  if(!appMode)return;
  w.__RYM_VALIDATOR_TABLET_APP__=true;

  const PERMISSION='control_auto.validar_ecarcheck';
  let opening=false;
  let openedFor='';

  function getState(){
    try{return typeof state!=='undefined'?state:null}catch(_){return null}
  }

  function hasAccess(){
    const s=getState();
    const role=String(s?.profile?.rol||'').trim().toUpperCase();
    if(role==='ADMIN_TOTAL')return true;
    try{
      if(typeof w.rymHasModule==='function')return !!w.rymHasModule(PERMISSION);
    }catch(_){}
    return Array.isArray(s?.allModules)&&s.allModules.includes(PERMISSION);
  }

  function ensurePwa(){
    if(!d.querySelector('link[data-rym-validator-manifest]')){
      const l=d.createElement('link');
      l.rel='manifest';
      l.href='/validator-tablet.webmanifest';
      l.dataset.rymValidatorManifest='1';
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

  function removeAppShell(){
    d.body.classList.remove('rym-validator-tablet-app');
    d.querySelector('#rymValidatorAppbar')?.remove();
    d.querySelector('#rymValidatorAccess')?.remove();
  }

  function logout(){
    removeAppShell();
    openedFor='';
    try{if(typeof clearSession==='function')clearSession()}catch(_){}
    try{
      if(typeof loginView==='function')loginView();
      else location.reload();
    }catch(_){location.reload()}
  }

  function onlineText(){
    const el=d.querySelector('#rymValidatorOnline');
    if(!el)return;
    const on=navigator.onLine;
    el.classList.toggle('offline',!on);
    el.textContent=on?'Conectado':'Sin conexión';
  }

  function appbar(){
    const s=getState(),p=s?.profile||{};
    let bar=d.querySelector('#rymValidatorAppbar');
    if(!bar){
      bar=d.createElement('header');
      bar.id='rymValidatorAppbar';
      bar.className='rym-validator-appbar';
      bar.innerHTML='<div class="rym-validator-brand"><div class="rym-validator-mark">R</div><div class="rym-validator-title"><b>Validador de Unidad</b><span id="rymValidatorUser"></span></div></div><div class="rym-validator-app-actions"><span class="rym-validator-online" id="rymValidatorOnline">Conectado</span><button type="button" class="rym-validator-exit" id="rymValidatorExit">Salir</button></div>';
      d.body.appendChild(bar);
      bar.querySelector('#rymValidatorExit')?.addEventListener('click',logout);
    }
    const u=bar.querySelector('#rymValidatorUser');
    if(u)u.textContent=[p.nombre||p.email||'Usuario','Portal RYM'].filter(Boolean).join(' · ');
    onlineText();
  }

  function accessDenied(){
    d.body.classList.add('rym-validator-tablet-app');
    appbar();
    let el=d.querySelector('#rymValidatorAccess');
    if(!el){
      el=d.createElement('section');
      el.id='rymValidatorAccess';
      el.className='rym-validator-access';
      el.innerHTML='<div class="rym-validator-access-card"><div class="lock">🔒</div><h1>Acceso restringido</h1><p>Esta app está reservada al personal con permiso de Validador eCarCheck. No se habilitan otros módulos del Portal RYM desde esta vista.</p><button type="button" id="rymValidatorAccessExit">Cerrar sesión</button></div>';
      d.body.appendChild(el);
      el.querySelector('#rymValidatorAccessExit')?.addEventListener('click',logout);
    }
  }

  function showOpening(){
    d.body.classList.add('rym-validator-tablet-app');
    appbar();
    const root=d.querySelector('#app');
    if(root && !d.querySelector('.v80-validator')){
      root.innerHTML='<main class="rym-validator-access"><section class="rym-validator-access-card"><div class="rym-validator-mark" style="margin:0 auto 14px">R</div><h1>Abriendo Validador</h1><p>Preparando tu acceso a eCarCheck…</p></section></main>';
    }
  }

  function polish(){
    d.body.classList.add('rym-validator-tablet-app');
    d.querySelector('#rymValidatorAccess')?.remove();
    appbar();

    const out=d.querySelector('#out');
    if(out){
      out.textContent='Salir';
      out.onclick=logout;
    }

    const q=d.querySelector('#v80Search');
    if(q){
      q.setAttribute('inputmode','search');
      q.setAttribute('autocomplete','off');
      q.setAttribute('enterkeyhint','search');
      q.setAttribute('aria-label','Buscar unidad, placa, empresa o supervisora');
    }
    d.querySelector('#v80RunSel')?.setAttribute('aria-label','Validar unidades seleccionadas contra eCarCheck');
  }

  function userKey(){
    const p=getState()?.profile||{};
    return String(p.id||p.email||p.usuario||p.nombre||'usuario');
  }

  async function openValidator(){
    const s=getState();
    if(opening||!s?.profile)return;
    if(s.profile.must_change_password)return;

    if(!hasAccess()){
      accessDenied();
      return;
    }

    if(typeof w.v80OpenEcarValidator!=='function'){
      return;
    }

    const key=userKey();
    if(openedFor===key && d.querySelector('.v80-validator')){
      polish();
      return;
    }

    opening=true;
    showOpening();
    try{
      await w.v80OpenEcarValidator();
      openedFor=key;
      polish();
    }catch(e){
      console.error('Validator tablet app:',e);
      const root=d.querySelector('#app');
      if(root){
        root.innerHTML='<main class="rym-validator-access"><section class="rym-validator-access-card"><div class="lock">!</div><h1>No se pudo abrir el Validador</h1><p>La sesión inició correctamente, pero el Validador no pudo cargarse. Actualiza la página para volver a intentar.</p><button type="button" id="rymValidatorRetry">Reintentar</button></section></main>';
        root.querySelector('#rymValidatorRetry')?.addEventListener('click',()=>{openedFor='';openValidator()});
      }
    }finally{
      opening=false;
    }
  }

  function installPortalRoute(){
    const base=w.v36PortalHome;
    if(typeof base!=='function')return false;
    if(base.__rymValidatorTabletWrapped)return true;

    function validatorPortalHome(){
      if(!appMode)return base.apply(this,arguments);
      void openValidator();
    }
    validatorPortalHome.__rymValidatorTabletWrapped=true;
    validatorPortalHome.__rymValidatorTabletBase=base;
    w.v36PortalHome=validatorPortalHome;
    return true;
  }

  function installRouteWithBoundedRetry(attempt=0){
    if(installPortalRoute()){
      const s=getState();
      if(s?.profile && !s.profile.must_change_password){
        setTimeout(()=>void openValidator(),0);
      }
      return;
    }
    if(attempt<20)setTimeout(()=>installRouteWithBoundedRetry(attempt+1),150);
  }

  ensurePwa();
  addEventListener('online',onlineText);
  addEventListener('offline',onlineText);

  /* Critical stability rule:
     do NOT observe the whole DOM and do NOT poll state during login.
     The normal Portal login finishes first and calls v36PortalHome;
     only then this route hands off to the dedicated validator. */
  if(d.readyState==='loading'){
    d.addEventListener('DOMContentLoaded',()=>installRouteWithBoundedRetry(),{once:true});
  }else{
    installRouteWithBoundedRetry();
  }
})(window,document);
