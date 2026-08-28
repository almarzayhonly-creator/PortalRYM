/* Portal RYM V172 clean - Revisados owns its tab navigation */
(function(w,d){
  'use strict';
  if(w.RYM_REVISADOS_ROUTER) return;

  const aliases=Object.freeze({
    dashboard:'dashboard',
    operations:'operations',operaciones:'operations',
    monthly:'monthly','avance mensual':'monthly',
    daily:'daily','reporte diario':'daily',
    history:'history',historial:'history',
    stats:'stats',estadisticas:'stats',
    boletas:'boletas',
    cupos:'cupos'
  });

  let current='dashboard';
  let busy=false;
  let queued=null;

  function normalize(v){
    const s=String(v||'').trim().toLowerCase();
    return aliases[s]||s;
  }

  function buttonRoute(btn){
    if(!btn)return null;
    const raw=btn.dataset?.v66Tab||btn.textContent||'';
    const route=normalize(raw);
    return Object.values(aliases).includes(route)?route:null;
  }

  function bind(){
    const nav=d.querySelector('.v66-nav');
    if(nav){
      Array.from(nav.querySelectorAll('[data-v66-tab]')).forEach(btn=>{
        const route=buttonRoute(btn);if(!route)return;
        const clone=btn.cloneNode(true);clone.onclick=null;
        clone.classList.toggle('active',route===current);
        clone.addEventListener('click',ev=>{
          ev.preventDefault();
          open(route).catch(err=>console.error('[Revisados router]',err));
        });
        btn.replaceWith(clone);
      });
    }
    const back=d.querySelector('#v66Back');
    if(back){
      const clone=back.cloneNode(true);clone.onclick=null;
      clone.addEventListener('click',ev=>{ev.preventDefault();leave().catch(err=>console.error('[Revisados router]',err))});
      back.replaceWith(clone);
    }
    d.body.dataset.rymModule='revisados';
    d.body.dataset.rymRevisadosRoute=current;
  }

  async function legacyOpen(){
    if(typeof w.v60OpenRevisados!=='function')throw new Error('Revisados canonical view unavailable');
    await w.v60OpenRevisados();
  }

  async function select(route){
    const nav=d.querySelector('.v66-nav');
    const btn=nav?.querySelector('[data-v66-tab="'+route+'"]');
    if(!btn){
      current='dashboard';
      bind();
      return false;
    }
    current=route;
    d.body.dataset.rymRevisadosRoute=route;
    btn.click();
    bind();
    return true;
  }

  async function invoke(requested){
    const route=normalize(requested||'dashboard');
    if(!d.body.classList.contains('v66-revisados'))await legacyOpen();
    current=route;
    bind();
    if(route!=='dashboard')await select(route);
    else bind();
    return current;
  }

  async function open(requested='dashboard'){
    const route=normalize(requested);
    if(busy){queued=route;return false}
    busy=true;
    try{await invoke(route)}finally{busy=false}
    if(queued){const next=queued;queued=null;if(next!==current)return open(next)}
    return true;
  }

  async function leave(){
    queued=null;
    if(busy)return false;
    d.body.classList.remove('v66-revisados');
    d.body.dataset.rymRevisadosRoute='';
    if(typeof w.v36PortalHome==='function'){await w.v36PortalHome();return true}
    return w.RYM_ROUTER?.home?.()||false;
  }

  function active(){return current}
  function routes(){return [...new Set(Object.values(aliases))]}
  function rebind(){bind();return true}

  w.RYM_REVISADOS_ROUTER=Object.freeze({open,leave,active,routes,rebind});
})(window,document);
