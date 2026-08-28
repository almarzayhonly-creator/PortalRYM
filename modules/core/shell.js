/* Portal RYM V172 clean - core shell and renderer */
function shell(){
  document.body.classList.remove('capture-mode');
  let navModules=[...state.modules];
  const hasOps=navModules.some(m=>['operaciones','operacion_am','operacion_pm'].includes(m));
  navModules=navModules.filter(m=>!['operacion_am','operacion_pm','pendientes_externo'].includes(m));
  if(hasOps&&!navModules.includes('operaciones'))navModules.push('operaciones');
  if(['operacion_am','operacion_pm'].includes(state.active))state.active='operaciones';
  app.innerHTML=`<div class="shell"><aside class="side"><div class="brand-logo-app"><img src="https://drive.google.com/thumbnail?id=1f65vwdwsAraUrK2h7cb5l_eVOQKuHsL8&sz=w1000" alt="Portal RYM" onerror="this.parentElement.innerHTML='<div class=&quot;brand&quot;>Portal RYM</div>'"></div><div class="portal-name-side">Portal RYM</div><nav class="nav">${navModules.map(m=>`<button data-m="${m}" class="${m===state.active?'active':''}">${labels[m]||m}</button>`).join('')}</nav><div class="user"><strong>${esc(state.profile.nombre||state.profile.email)}</strong><span>${esc(state.profile.rol)}</span><button class="logout" id="out" title="Cerrar sesión">Salir</button></div></aside><main class="main"><header class="top"><div><h1>${labels[state.active]||state.active}</h1><div class="portal-kicker">Portal RYM</div></div><span class="pill">${esc(state.profile.rol)}</span></header><section id="view"></section></main></div>`;
  document.querySelectorAll('[data-m]').forEach(b=>b.onclick=async()=>{state.active=b.dataset.m;shell();await render()});
  document.querySelector('#out').onclick=()=>{clearSession();loginView()}
}

async function render(){const v=document.querySelector('#view');v.innerHTML='<div class="card">Cargando...</div>';try{if(state.active==='dashboard')return dashboard(v);if(state.active==='ranking')return RYM_MODULES.open('panapass-ranking',{target:v});if(state.active==='negativos_hoy')return negativos(v);if(state.active==='pagos_hoy')return isAdminRole()?pagosTrabajo(v):pagosConsultaHoy(v);if(state.active==='historial')return historial(v);if(state.active==='pendientes_externo'){state.active='historial';shell();return historial(document.querySelector('#view'));}if(state.active==='recurrentes')return RYM_MODULES.open('panapass-recurrentes',{target:v});if(state.active==='operaciones'||state.active==='operacion_am'||state.active==='operacion_pm')return operaciones(v);if(state.active==='reportes')return reportes(v);if(state.active==='usuarios')return usuarios(v);v.innerHTML=`<div class="card"><h2>${esc(labels[state.active]||state.active)}</h2><p class="muted">Módulo preparado para la siguiente fase operativa.</p></div>`}catch(x){v.innerHTML=`<div class="alert">${esc(x.message||x)}</div>`}}
