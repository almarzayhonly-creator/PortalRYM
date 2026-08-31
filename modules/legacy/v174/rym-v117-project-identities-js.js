
(function(){
  const clearProjectClasses=()=>document.body.classList.remove('v117-panapass','v117-revisados','v117-control','v117-gps');
  const wrap=(name,cls)=>{
    const old=window[name];if(typeof old!=='function'||old.__v117)return;
    const fn=async function(){clearProjectClasses();document.body.classList.add(cls);const r=await old.apply(this,arguments);clearProjectClasses();document.body.classList.add(cls);return r};fn.__v117=true;window[name]=fn;
    try{if(name==='v70OpenPanapass')v70OpenPanapass=fn;if(name==='v60OpenRevisados')v60OpenRevisados=fn;if(name==='v70OpenControl')v70OpenControl=fn;if(name==='v113OpenGps')v113OpenGps=fn}catch(_){ }
  };
  wrap('v70OpenPanapass','v117-panapass');wrap('v60OpenRevisados','v117-revisados');wrap('v70OpenControl','v117-control');wrap('v113OpenGps','v117-gps');

  function decorateHome(){
    if(!document.body.classList.contains('v99-home'))return;
    const nav=document.querySelector('.v101-nav');
    if(nav){
      const defs=[['#v101NavPan','P','Panapass'],['#v101NavRev','R','Revisados'],['#v101NavCtl','▣','Auto'],['#v113NavGps','⌖','GPS'],['#v118NavUsers','U','Usuarios']];
      defs.forEach(([sel,ico,label])=>{const b=nav.querySelector(sel);if(b&&!b.dataset.v117){b.dataset.v117='1';b.title=label;b.innerHTML=`<span class="v117-nav-icon">${ico}</span><span>${label}</span>`}});
    }
    const priorityTitle=[...document.querySelectorAll('.v99-section-title')].find(x=>/Qué requiere|Prioridad de hoy/i.test(x.querySelector('h3')?.textContent||''));
    if(priorityTitle){priorityTitle.querySelector('h3').textContent='Prioridad de hoy';const p=priorityTitle.querySelector('p');if(p)p.textContent='Lo que requiere atención dentro de tu alcance.'}
    const priorityCopy=document.querySelector('.v100-priority-head p');if(priorityCopy)priorityCopy.textContent='Lo que requiere atención dentro de tu alcance.';
    document.querySelectorAll('.v99-alert').forEach(a=>{if(/bajas procesadas por ENA/i.test(a.textContent||'')){a.classList.remove('bad');a.classList.add('warning')}});
    if(priorityTitle){const count=priorityTitle.querySelector('b'),shown=[...document.querySelectorAll('.v99-alert')].filter(a=>getComputedStyle(a).display!=='none').length,total=Number((count?.textContent||'').match(/\d+/)?.[0]||shown);if(count&&total>shown)count.textContent=`${shown} de ${total} prioridades`}
    [['#v99Pan','Abrir Panapass'],['#v99Rev','Gestionar revisados'],['#v99Control','Ver flota'],['#v113GpsEnter','Monitorear GPS']].forEach(([sel,label])=>{const b=document.querySelector(sel);if(b)b.textContent=label});
    const top=document.querySelector('.v101-top-right');
    if(top&&!top.querySelector('#v117TopLogout')){const b=document.createElement('button');b.id='v117TopLogout';b.className='v117-top-logout';b.title='Cerrar sesión';b.textContent='↪';b.onclick=()=>{clearSession();loginView()};top.appendChild(b)}

    const mobileNav=document.querySelector('#v115MobileNav');
    if(mobileNav&&String(state?.profile?.rol||'').toUpperCase()==='ADMIN_TOTAL'&&!mobileNav.querySelector('[data-a="gps"]')){const b=document.createElement('button');b.dataset.a='gps';b.innerHTML='<i>⌖</i><span>GPS</span>';b.onclick=()=>window.v113OpenGps?.();mobileNav.appendChild(b)}

    if(!window.__v117Prefetching){
      window.__v117Prefetching=true;
      const warm=async()=>{try{const r=await rpc('panapass_control_auto_resumen');window.__v117ControlSummary={data:r?.[0]||{},at:Date.now()}}catch(_){}finally{window.__v117Prefetching=false}};
      if('requestIdleCallback' in window)requestIdleCallback(warm,{timeout:1000});else setTimeout(warm,300);
    }
  }
  const mo=new MutationObserver(()=>{clearTimeout(window.__v117dt);window.__v117dt=setTimeout(decorateHome,50)});mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});setTimeout(decorateHome,120);
})();
