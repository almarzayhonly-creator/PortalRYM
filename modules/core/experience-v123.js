/* V172 clean externalized legacy layer: rym-v123-experience-js */
(function(){
  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const N=v=>typeof norm==='function'?norm(v):String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const panamaHour=()=>Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Panama',hour:'2-digit',hourCycle:'h23'}).format(new Date()));
  const greeting=()=>{const h=panamaHour();return h<12?'Buenos días':h<18?'Buenas tardes':'Buenas noches'};

  function decorateHome(){
    if(!document.body.classList.contains('v99-home'))return;
    const name=String(state?.profile?.nombre||state?.profile?.email||'').trim().split(/\s+/)[0]||'Usuario',title=document.querySelector('.v101-greeting h2');
    const hello=`¡${greeting()}, ${name}! 👋`;if(title&&title.textContent!==hello)title.textContent=hello;
    const section=document.querySelector('.v101-validator');if(section){
      const h=section.querySelector('h3'),p=section.querySelector('.v101-validator-head p'),input=section.querySelector('#v101ValidatorQ'),go=section.querySelector('#v101ValidatorGo'),note=section.querySelector('.v101-validator-note');
      if(h&&h.textContent!=='Búsqueda rápida de unidad')h.textContent='Búsqueda rápida de unidad';
      if(p)p.textContent='Escribe el código de la unidad. También reconoce placa, empresa dueña o Panapass.';
      if(input)input.placeholder='Unidad (ejemplo: V500)';if(go)go.textContent='Buscar unidad';
      if(note)note.textContent='Cada resultado muestra primero la empresa dueña de la unidad.';
      section.querySelectorAll('.v101-validator-item small').forEach(s=>{if(!s.dataset.v123Owner){s.dataset.v123Owner='1';s.innerHTML=`<span class="v123-owner-label">Dueña:</span> ${s.innerHTML}`}});
    }
  }

  function ensureMobileLogout(){
    const nav=document.querySelector('#v115MobileNav');if(!nav||nav.querySelector('[data-a="logout"]'))return;
    const b=document.createElement('button');b.type='button';b.dataset.a='logout';b.innerHTML='<i>↪</i><span>Salir</span>';b.onclick=e=>{e.preventDefault();e.stopPropagation();if(confirm('¿Cerrar sesión en Portal RYM?')){clearSession();loginView()}};nav.appendChild(b);
  }


  const oldHome=window.v36PortalHome;if(typeof oldHome==='function'&&!oldHome.__v123){const home=async function(){if(document.body.classList.contains('v99-home'))return oldHome.apply(this,arguments);if(window.__v117HomeSummary?.data)window.__v117HomeSummary.at=Date.now();let layer=document.querySelector('#v123PortalTransition');if(!layer){layer=document.createElement('div');layer.id='v123PortalTransition';layer.innerHTML='<div>Volviendo al Centro de Control…</div>';document.body.appendChild(layer)}try{return await oldHome.apply(this,arguments)}finally{setTimeout(()=>layer?.remove(),100)}};home.__v123=true;window.v36PortalHome=home;try{v36PortalHome=home}catch(_){}}

  let timer=0;const enhance=()=>{clearTimeout(timer);timer=setTimeout(()=>{decorateHome();ensureMobileLogout()},70)};new MutationObserver(enhance).observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('resize',enhance);enhance();
})();
