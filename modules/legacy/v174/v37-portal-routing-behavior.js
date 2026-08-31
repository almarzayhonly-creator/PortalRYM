
/* V37: Panapass conserva su shell completo. Control de Auto usa un shell aislado. Salir del módulo vuelve al Portal RYM. */
(function(){
  let portalMode='home';
  window.__v37PortalMode=()=>portalMode;

  const basePortalHome=window.v36PortalHome;
  window.v36PortalHome=function(){
    portalMode='home';
    document.body.classList.remove('v37-control-only');
    basePortalHome();

    const pan=document.querySelector('#v36OpenPanapass');
    if(pan)pan.onclick=async()=>{
      portalMode='panapass';
      document.body.classList.remove('v37-control-only');
      state.active=(state.modules||[]).includes('dashboard')?'dashboard':((state.modules||[])[0]||'dashboard');
      shell();
      try{await render()}catch(e){const v=document.querySelector('#view');if(v)v.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`}
    };

    const ca=document.querySelector('#v36OpenControl');
    if(ca&&!ca.disabled)ca.onclick=async()=>{
      portalMode='control';
      document.body.classList.add('v37-control-only');
      try{await v11UnitList()}catch(e){
        const v=document.querySelector('#view');
        if(v)v.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`;
      }
    };
  };

  const baseShellV37=shell;
  shell=function(){
    baseShellV37();

    /* Dentro de cualquier módulo, Salir significa volver al selector; el logout real queda en el Portal RYM. */
    const out=document.querySelector('#out');
    if(out){
      out.textContent='Volver al Portal';
      out.title='Volver al Portal RYM';
      out.onclick=()=>window.v36PortalHome();
    }

    if(portalMode!=='control'){
      document.body.classList.remove('v37-control-only');
      return;
    }

    document.body.classList.add('v37-control-only');
    const side=document.querySelector('.side');
    const nav=side?.querySelector('.nav');
    const sideName=side?.querySelector('.portal-name-side');
    const topTitle=document.querySelector('.top h1');
    const kicker=document.querySelector('.top .portal-kicker');
    const homeBtn=document.querySelector('#v36PortalHomeBtn');

    if(sideName)sideName.textContent='Control de Auto';
    if(topTitle)topTitle.textContent='Control de Auto';
    if(kicker)kicker.textContent='Portal RYM';
    if(homeBtn)homeBtn.textContent='Portal RYM';
    if(nav){
      nav.innerHTML='<button type="button" class="active" aria-current="page">Control de Auto</button>';
    }
  };
})();
