/* Portal RYM V172 clean - Revisados owns its tab navigation */
(function(w,d){
  'use strict';
  if(w.RYM_REVISADOS_ROUTER) return;

  const aliases=Object.freeze({dashboard:'dashboard',operations:'operations',operaciones:'operations',monthly:'monthly','avance mensual':'monthly',daily:'daily','reporte diario':'daily',history:'history',historial:'history',stats:'stats',estadisticas:'stats',boletas:'boletas',cupos:'cupos'});
  let current='dashboard',busy=false,queued=null;
  const hooks=new Map();
  const normalize=v=>aliases[String(v||'').trim().toLowerCase()]||String(v||'').trim().toLowerCase();
  const routes=()=>[...new Set(Object.values(aliases))];
  function app(){const a=w.RYM_REVISADOS_APP;if(!a||typeof a.open!=='function'||typeof a.openTab!=='function')throw new Error('Revisados app API unavailable');return a}
  function bind(){
    const nav=d.querySelector('.v66-nav');
    nav&&Array.from(nav.querySelectorAll('[data-v66-tab]')).forEach(btn=>{const route=normalize(btn.dataset.v66Tab);if(!routes().includes(route))return;const clone=btn.cloneNode(true);clone.onclick=null;clone.classList.toggle('active',route===current);clone.addEventListener('click',ev=>{ev.preventDefault();open(route).catch(err=>console.error('[Revisados router]',err))});btn.replaceWith(clone)});
    const back=d.querySelector('#v66Back');if(back){const clone=back.cloneNode(true);clone.onclick=null;clone.addEventListener('click',ev=>{ev.preventDefault();leave().catch(err=>console.error('[Revisados router]',err))});back.replaceWith(clone)}
    d.body.dataset.rymModule='revisados';d.body.dataset.rymRevisadosRoute=current;
  }
  async function invoke(requested){const route=normalize(requested||'dashboard'),a=app();if(!d.body.classList.contains('v66-revisados'))await a.open();current=routes().includes(route)?route:'dashboard';await a.openTab(current);for(const fn of (hooks.get(current)||[]))await fn({route:current});bind();return current}
  async function open(requested='dashboard'){const route=normalize(requested);if(busy){queued=route;return false}busy=true;try{await invoke(route)}finally{busy=false}if(queued){const next=queued;queued=null;if(next!==current)return open(next)}return true}
  async function leave(){queued=null;if(busy)return false;d.body.classList.remove('v66-revisados');d.body.dataset.rymRevisadosRoute='';if(typeof w.v36PortalHome==='function'){await w.v36PortalHome();return true}return w.RYM_ROUTER?.home?.()||false}
  function after(route,fn){const key=normalize(route);if(!routes().includes(key)||typeof fn!=='function')throw new Error('Hook Revisados invalido');const list=hooks.get(key)||[];list.push(fn);hooks.set(key,list);return()=>hooks.set(key,(hooks.get(key)||[]).filter(x=>x!==fn))}
  const active=()=>current,rebind=()=>{bind();return true};
  w.RYM_REVISADOS_ROUTER=Object.freeze({open,leave,active,routes,rebind,after});
})(window,document);
