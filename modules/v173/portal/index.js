(() => {
  'use strict';
  if (!window.RYM173) throw new Error('V173 bootstrap missing');
  const modules=[['panapass','Panapass','Control de saldos, pagos y bajas','PANAPASS','blue'],['revisados','Revisados','ATTT, eCarCheck y revisados','REVISADOS','orange'],['control-auto','Control de Auto','Maestra de flota y auditorias','CONTROL_AUTO','green'],['gps','GPS','Estado y seguimiento GPS','GPS','purple'],['usuarios','Usuarios','Usuarios, roles y permisos','USUARIOS','navy'],['validador','Validador','Validacion integral de unidad','VALIDADOR','teal']];
  const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function userLabel(user){if(!user)return '';if(typeof user==='string')return user;return user.nombre||user.usuario||user.email||'';}
  async function mount(context={}){
    const root=document.getElementById('rym-app'),core=window.RYM173.registry.get('core'),router=window.RYM173.registry.get('router'),session=core?.getSession?.()||{};
    if(!root)throw new Error('V173 portal mount missing');
    const visible=modules.filter(([, , ,permission])=>core?.can?.(permission)),label=userLabel(session.user),role=escapeHtml(session.role||'');
    document.body.dataset.rymModule='portal';
    root.innerHTML=`<div class="v173-portal-shell"><aside class="v173-portal-side"><div class="v173-brand-logo"><img src="https://drive.google.com/thumbnail?id=1f65vwdwsAraUrK2h7cb5l_eVOQKuHsL8&sz=w1000" alt="Portal RYM" onerror="this.parentElement.innerHTML='<b>Portal RYM</b>'"></div><div class="v173-portal-name">Portal RYM</div><nav class="v173-portal-nav" aria-label="Módulos">${visible.map(([route,title,,,tone])=>`<button class="tone-${tone}" data-route="${route}" type="button">${title}</button>`).join('')}</nav><div class="v173-portal-user"><strong>${escapeHtml(label||'Usuario')}</strong><span>${role}</span><button class="v173-logout" data-logout type="button">Salir</button></div></aside><main class="v173-portal-main"><header class="v173-portal-top"><div><h1>Portal RYM</h1><span>Centro de operaciones</span></div><span class="v173-role-pill">${role}</span></header>${context.denied?'<div class="v173-notice">Tu perfil no tiene acceso al módulo solicitado.</div>':''}<section class="v173-welcome"><small>PORTAL RYM</small><h2>Hola, ${escapeHtml(label||'')}</h2><p>Selecciona el módulo que deseas consultar.</p></section><section class="v173-module-grid">${visible.map(([route,title,desc,,tone])=>`<button class="v173-module-card tone-${tone}" data-route="${route}" type="button"><span class="v173-module-card__mark"></span><strong>${title}</strong><small>${desc}</small><span class="v173-module-card__action">Abrir módulo →</span></button>`).join('')}</section>${visible.length?'':'<div class="v173-empty">No hay módulos habilitados para este perfil.</div>'}</main></div>`;
    root.querySelectorAll('[data-route]').forEach(btn=>btn.addEventListener('click',()=>router.go(btn.dataset.route).catch(console.error)));
    root.querySelector('[data-logout]')?.addEventListener('click',()=>{window.RYM173.registry.get('auth')?.logout();window.RYM173.activate('login');});
  }
  function unmount(){const root=document.getElementById('rym-app');if(root)root.innerHTML='';if(document.body.dataset.rymModule==='portal')delete document.body.dataset.rymModule;}
  window.RYM173.register('portal',{mount,unmount});
})();
