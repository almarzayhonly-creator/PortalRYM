/* Presentation adapter for main's validator. No queries, state calculations or endpoint changes. */
(function(w,d){
  'use strict';
  if(new URLSearchParams(location.search).get('validator-host')!=='1'||w.RYM_UNIT_VALIDATOR)return;
  const PERMISSION='control_auto.validador_unidad_app';
  d.documentElement.classList.add('rym-unit-validator-app');
  function profile(){try{return state.profile}catch(_){return null}}
  function allowed(){try{return !!profile()&&typeof w.rymHasModule==='function'&&w.rymHasModule(PERMISSION)}catch(_){return false}}
  function session(){const p=profile();return {authenticated:!!p,denied:!!p&&!allowed(),user:p?.nombre||p?.email||''}}
  function notify(){w.parent.postMessage({type:'rym-validator-state'},location.origin)}
  function normalizeIdentity(modal){
    if(!modal)return;
    const metaOwner=modal.querySelector('.v130-mobile-owner');
    const ownerValue=metaOwner?.querySelector('b')?.textContent?.trim()||'';
    const identity=[...modal.querySelectorAll('.v117-identity-line>span')];
    const company=identity[0],owner=identity[1];
    if(company&&ownerValue){
      const label=company.querySelector('b');
      if(label)label.textContent='Empresa:';
      [...company.childNodes].filter(n=>n.nodeType===3).forEach(n=>n.remove());
      company.append(' '+ownerValue);
    }
    if(owner)owner.style.display='none';
    if(metaOwner)metaOwner.style.display='none';
  }
  function logout(){
    d.getElementById('v101CheckModal')?.remove();
    if(typeof clearSession==='function')clearSession();
    if(typeof loginView==='function')loginView();
    refresh();
  }
  w.RYM_UNIT_VALIDATOR=Object.freeze({session,logout});
  function refresh(){
    const p=profile(),ok=allowed();
    d.documentElement.classList.toggle('uva-authorized',ok);
    d.documentElement.classList.toggle('uva-authenticated',!!p);
    if(p&&!ok){
      d.getElementById('v101CheckModal')?.remove();
      const root=d.getElementById('app');
      if(root&&!root.querySelector('.uva-denied'))root.innerHTML='<section class="uva-denied"><span aria-hidden="true">⌑</span><h1>Acceso restringido</h1><p>Tu usuario no tiene habilitado el permiso de App Validador de Unidad.</p></section>';
      notify();return;
    }
    const input=d.getElementById('v101ValidatorQ');
    if(ok&&input){
      input.setAttribute('inputmode','search');input.setAttribute('enterkeyhint','search');
      input.setAttribute('autocomplete','off');input.setAttribute('aria-label','Buscar unidad, placa o Panapass');
      input.placeholder='Buscar unidad, placa o Panapass';
      const title=d.querySelector('.v101-validator-head h3'),copy=d.querySelector('.v101-validator-head p');
      if(title&&title.textContent!=='Validador de Unidad')title.textContent='Validador de Unidad';
      if(copy&&copy.textContent!=='Busca una unidad, placa o Panapass')copy.textContent='Busca una unidad, placa o Panapass';
    }
    const modal=d.getElementById('v101CheckModal');
    if(ok&&modal){
      modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
      modal.setAttribute('aria-label','Resultado de validación de unidad');
      const close=modal.querySelector('#v101CloseCheck');if(close)close.setAttribute('aria-label','Cerrar resultado');
      const overall=modal.querySelector('#v117Overall');if(overall)overall.setAttribute('aria-live','polite');
      normalizeIdentity(modal);
      const full=modal.querySelector('#v101OpenModule');if(full){full.hidden=true;full.disabled=true;full.onclick=null}
      modal.querySelectorAll('.v117-status-card').forEach(card=>{
        if(card.querySelector('.uva-details'))return;
        const details=d.createElement('details'),summary=d.createElement('summary');
        details.className='uva-details';summary.textContent='Detalles';details.appendChild(summary);
        details.open=w.matchMedia('(min-width:651px)').matches;
        card.querySelectorAll('.v117-card-sub,.v117-card-details').forEach(el=>details.appendChild(el));
        card.appendChild(details);
      });
    }
    notify();
  }
  /* Deny the dedicated home before invoking main; main remains untouched. */
  const base=w.v36PortalHome;
  if(typeof base==='function'){
    const home=async function(){
      if(profile()&&!allowed()){refresh();return}
      const result=await base.apply(this,arguments);refresh();return result;
    };
    w.v36PortalHome=home;try{v36PortalHome=home}catch(_){}
  }
  const observer=new MutationObserver(()=>{
    observer.disconnect();refresh();observer.observe(d.body,{childList:true,subtree:true});
  });
  refresh();observer.observe(d.body,{childList:true,subtree:true});
})(window,document);
