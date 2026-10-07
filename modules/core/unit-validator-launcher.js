/* Portal RYM · launcher for dedicated Unit Validator PWA */
(function(w,d){
  'use strict';
  if(w.__RYM_UNIT_VALIDATOR_LAUNCHER__)return;
  w.__RYM_UNIT_VALIDATOR_LAUNCHER__=true;
  const params=new URLSearchParams(location.search);
  if(params.get('validator-host')==='1'||params.get('app'))return;
  const PERM='control_auto.validador_unidad_app';

  function allowed(){
    try{return typeof w.rymHasModule==='function'&&w.rymHasModule(PERM)}catch(_){return false}
  }
  function open(){location.href='/?app=validador-unidad'}
  function ensure(){
    if(!allowed()){d.querySelector('#rymUnitValidatorLauncher')?.remove();return}
    const nav=d.querySelector('.v101-nav');
    if(!nav)return;
    let b=d.querySelector('#rymUnitValidatorLauncher');
    if(b)return;
    b=d.createElement('button');
    b.id='rymUnitValidatorLauncher';
    b.type='button';
    b.className='rym-unit-validator-launcher';
    b.innerHTML='<span class="rym-unit-validator-launcher-icon">✓</span><span>Validador</span>';
    b.title='Abrir Validador de Unidad';
    b.addEventListener('click',open);
    nav.appendChild(b);
  }
  const style=d.createElement('style');
  style.textContent=`
    .rym-unit-validator-launcher{position:relative!important}
    .rym-unit-validator-launcher-icon{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:rgba(255,255,255,.12);color:#fff;font-size:15px;font-weight:1000}
    .rym-unit-validator-launcher:hover .rym-unit-validator-launcher-icon{background:rgba(7,31,72,.10);color:#10213f}
    @media(max-width:820px){.rym-unit-validator-launcher{display:none!important}}
  `;
  d.head.appendChild(style);
  const mo=new MutationObserver(()=>{clearTimeout(w.__rymUnitLauncherTimer);w.__rymUnitLauncherTimer=setTimeout(ensure,60)});
  mo.observe(d.documentElement,{childList:true,subtree:true});
  setTimeout(ensure,100);
  setTimeout(ensure,800);
})(window,document);
