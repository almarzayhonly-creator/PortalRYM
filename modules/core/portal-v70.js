/* Portal RYM V172 clean - externalized V70 portal/admin */
(function(){
  const PANAPASS=['dashboard','negativos_hoy','ranking','pagos_hoy','cargar_pagos','historial','recurrentes','operaciones','reportes'];
  const PANSET=new Set(PANAPASS),GLOBAL_PREFIX=/^(portal\.|revisados\.|control_auto\.|admin\.)/i;
  const oldNormalize=typeof phase2NormalizeModules==='function'?phase2NormalizeModules:null;
  function rememberModules(){const a=Array.isArray(state.modules)?state.modules:[];if(a.some(x=>GLOBAL_PREFIX.test(String(x)))||!Array.isArray(state.allModules)||!state.allModules.length)state.allModules=[...new Set(a)];}
  function allModules(){return Array.isArray(state.allModules)&&state.allModules.length?state.allModules:(Array.isArray(state.modules)?state.modules:[])}
  function panModules(){const src=allModules();return PANAPASS.filter(x=>src.includes(x));}
  window.rymHasModule=function(code){return allModules().includes(String(code))};
  phase2NormalizeModules=function(){rememberModules();state.modules=panModules();if(!state.modules.includes(state.active))state.active=state.modules.includes('dashboard')?'dashboard':(state.modules[0]||'dashboard');};
  if(Array.isArray(state.modules)&&state.modules.length)phase2NormalizeModules();

  function cleanBody(){document.body.classList.remove('capture-mode','v36-admin-total','v37-control-only','v38-revisados-only','v60-revisados','v63-revisados','v66-revisados','v70-control','v70-admin');document.body.classList.add('v70-portal')}
  function role70(){return String(state.profile?.rol||'').trim().toUpperCase()}
  function card(cls,icon,title,desc,id){return `<article class="v70-project ${cls}"><div class="v70-icon">${icon}</div><h2>${esc(title)}</h2><p>${esc(desc)}</p><div class="v70-actions"><span class="v70-status">Disponible</span><button id="${id}">Abrir</button></div></article>`}
  (window.__RYM_PORTAL_HOME_PENDING_AROUND__ ||= []).push(function(next,args,ctx){const impl=function(){
    rememberModules();cleanBody();
    const mods=allModules(),r=role70(),cards=[];
    if(mods.includes('portal.panapass')||panModules().length)cards.push(card('pan','P','Panapass','Negativos, pagos, historial, recurrentes, rankings, reportes y operación diaria.','v70Pan'));
    if(mods.includes('portal.control_auto')||mods.includes('control_auto.unidades'))cards.push(card('control','C','Control de Auto','Consulta centralizada de unidades, estatus, placas, Panapass, TAG, empresa y supervisora.','v70Control'));
    if(mods.includes('portal.revisados'))cards.push(card('rev','R','Revisados','Control legal vehicular, operación, avance, historial, estadísticas, boletas y cupos según permisos.','v70Rev'));
    if(r==='ADMIN_TOTAL'&&mods.includes('admin.usuarios'))cards.push(card('admin','U','Administración RYM','Usuarios, perfiles, galeras y permisos separados por proyecto y módulo.','v70Users'));
    const name=state.profile?.nombre||state.profile?.email||'Usuario';
    app.innerHTML=`<main class="v70-home"><section class="v70-wrap"><header class="v70-head"><div class="v70-brand"><img src="https://drive.google.com/thumbnail?id=1f65vwdwsAraUrK2h7cb5l_eVOQKuHsL8&sz=w1000" alt="Portal RYM" onerror="this.style.display='none'"><div><h1>Portal RYM</h1><p>Selecciona el sistema que deseas utilizar.</p></div></div><div class="v70-user"><b>${esc(name)}</b><span>${esc(r)}</span><button id="v70Logout">Salir</button></div></header><div class="v70-projects">${cards.join('')||'<div class="v70-empty">No tienes módulos habilitados.</div>'}</div></section></main>`;
    document.querySelector('#v70Logout').onclick=()=>{clearSession();loginView()};
    document.querySelector('#v70Pan')?.addEventListener('click',()=>window.RYM_ROUTER?.open('panapass'));
    document.querySelector('#v70Control')?.addEventListener('click',()=>window.RYM_ROUTER?.open('control-auto'));
    document.querySelector('#v70Rev')?.addEventListener('click',()=>window.RYM_ROUTER?.open('revisados'));
    document.querySelector('#v70Users')?.addEventListener('click',()=>window.RYM_ROUTER?.open('usuarios'));
    if(mods.includes('portal.revisados')&&window.v66PrefetchRevisados){const warm=()=>window.v66PrefetchRevisados();if('requestIdleCallback' in window)requestIdleCallback(warm,{timeout:1800});else setTimeout(warm,900)}
  };return impl.apply(ctx.thisArg,args)});
  window.v70OpenPanapass=()=>window.RYM_ROUTER?.open('panapass');
  window.v70OpenControl=()=>window.RYM_ROUTER?.open('control-auto');

  if(state.token&&state.profile){rememberModules();phase2NormalizeModules();v36PortalHome()}
})();
