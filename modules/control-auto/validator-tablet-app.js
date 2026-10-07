/* Portal RYM · Tablet-only shell for the existing eCarCheck validator.
   No business rule is duplicated here: it delegates to main's v80 validator. */
(function(w,d){
  'use strict';
  if(w.__RYM_VALIDATOR_TABLET_APP__)return;
  const params=new URLSearchParams(w.location.search);
  const appMode=['validador','validator','validator-tablet'].includes(String(params.get('app')||'').toLowerCase());
  if(!appMode)return;
  w.__RYM_VALIDATOR_TABLET_APP__=true;

  const PERMISSION='control_auto.validar_ecarcheck';
  let opening=false,lastUser='',observer=null;

  function getState(){
    try{return typeof state!=='undefined'?state:null}catch(_){return null}
  }
  function hasAccess(){
    const s=getState(),role=String(s?.profile?.rol||'').trim().toUpperCase();
    if(role==='ADMIN_TOTAL')return true;
    try{
      if(typeof w.rymHasModule==='function')return !!w.rymHasModule(PERMISSION);
    }catch(_){}
    return Array.isArray(s?.allModules)&&s.allModules.includes(PERMISSION);
  }
  function ensurePwa(){
    if(!d.querySelector('link[data-rym-validator-manifest]')){
      const l=d.createElement('link');l.rel='manifest';l.href='/validator-tablet.webmanifest';l.dataset.rymValidatorManifest='1';d.head.appendChild(l);
    }
    let theme=d.querySelector('meta[name="theme-color"]');
    if(!theme){theme=d.createElement('meta');theme.name='theme-color';d.head.appendChild(theme)}
    theme.content='#0A1B4D';
    if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
      navigator.serviceWorker.register('/validator-tablet-sw.js',{scope:'/'}).catch(()=>{});
    }
  }
  function logout(){
    try{if(typeof clearSession==='function')clearSession()}catch(_){}
    try{if(typeof loginView==='function')loginView();else location.reload()}catch(_){location.reload()}
  }
  function onlineText(){
    const el=d.querySelector('#rymValidatorOnline');if(!el)return;
    const on=navigator.onLine;el.classList.toggle('offline',!on);el.textContent=on?'Conectado':'Sin conexión';
  }
  function appbar(){
    const s=getState(),p=s?.profile||{};
    let bar=d.querySelector('#rymValidatorAppbar');
    if(!bar){
      bar=d.createElement('header');bar.id='rymValidatorAppbar';bar.className='rym-validator-appbar';
      bar.innerHTML='<div class="rym-validator-brand"><div class="rym-validator-mark">R</div><div class="rym-validator-title"><b>Validador de Unidad</b><span id="rymValidatorUser"></span></div></div><div class="rym-validator-app-actions"><span class="rym-validator-online" id="rymValidatorOnline">Conectado</span><button type="button" class="rym-validator-exit" id="rymValidatorExit">Salir</button></div>';
      d.body.appendChild(bar);
      bar.querySelector('#rymValidatorExit').addEventListener('click',logout);
    }
    const u=bar.querySelector('#rymValidatorUser');
    if(u)u.textContent=[p.nombre||p.email||'Usuario','Portal RYM'].filter(Boolean).join(' · ');
    onlineText();
  }
  function removeAppShell(){
    d.body.classList.remove('rym-validator-tablet-app');
    d.querySelector('#rymValidatorAppbar')?.remove();
    d.querySelector('#rymValidatorAccess')?.remove();
  }
  function accessDenied(){
    d.body.classList.add('rym-validator-tablet-app');
    appbar();
    let el=d.querySelector('#rymValidatorAccess');
    if(!el){
      el=d.createElement('section');el.id='rymValidatorAccess';el.className='rym-validator-access';
      el.innerHTML='<div class="rym-validator-access-card"><div class="lock">🔒</div><h1>Acceso restringido</h1><p>Esta app está reservada al personal con permiso de Validador eCarCheck. No se habilitan otros módulos del Portal RYM desde esta vista.</p><button type="button" id="rymValidatorAccessExit">Cerrar sesión</button></div>';
      d.body.appendChild(el);
      el.querySelector('#rymValidatorAccessExit').addEventListener('click',logout);
    }
  }
  function polish(){
    d.body.classList.add('rym-validator-tablet-app');
    d.querySelector('#rymValidatorAccess')?.remove();
    appbar();
    const out=d.querySelector('#out');
    if(out){out.textContent='Salir';out.onclick=logout}
    const q=d.querySelector('#v80Search');
    if(q){
      q.setAttribute('inputmode','search');
      q.setAttribute('autocomplete','off');
      q.setAttribute('enterkeyhint','search');
      q.setAttribute('aria-label','Buscar unidad, placa, empresa o supervisora');
    }
    d.querySelector('#v80RunSel')?.setAttribute('aria-label','Validar unidades seleccionadas contra eCarCheck');
  }
  async function openValidator(){
    if(opening||!hasAccess()||typeof w.v80OpenEcarValidator!=='function')return;
    opening=true;
    try{
      await w.v80OpenEcarValidator();
      polish();
    }catch(e){
      console.error('Validator tablet app:',e);
    }finally{opening=false}
  }
  function tick(){
    const s=getState(),p=s?.profile;
    if(!p){lastUser='';removeAppShell();return}
    const user=String(p.id||p.email||p.nombre||'user');
    if(!hasAccess()){accessDenied();lastUser=user;return}
    polish();
    const validator=d.querySelector('.v80-validator');
    if(!validator && !opening)openValidator();
    if(user!==lastUser){lastUser=user;openValidator()}
  }

  ensurePwa();
  addEventListener('online',onlineText);
  addEventListener('offline',onlineText);
  observer=new MutationObserver(()=>tick());
  observer.observe(d.documentElement,{childList:true,subtree:true});
  setInterval(tick,900);
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',tick,{once:true});else tick();
})(window,document);
