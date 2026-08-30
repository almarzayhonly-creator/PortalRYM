(() => {
  'use strict';
  if (!window.RYM173) throw new Error('V173 bootstrap missing');

  const listeners = new Set();
  const session = { user: null, role: null, galera: null, permissions: new Set() };
  const ALL_MODULES = ['PANAPASS','REVISADOS','CONTROL_AUTO','GPS','USUARIOS','VALIDADOR'];
  let routesReady=false;

  function normalizeRole(value) { return String(value || '').trim().toUpperCase().replace(/[ -]+/g, '_'); }
  function defaultPermissions(role) { const r=normalizeRole(role); if(r==='ADMIN_TOTAL')return ALL_MODULES; if(r==='PAGADOR')return ['PANAPASS']; return []; }
  function setSession(next = {}) {
    session.user = next.user ?? null;
    session.role = normalizeRole(next.role);
    session.galera = next.galera ?? null;
    const supplied = Array.isArray(next.permissions) ? next.permissions : defaultPermissions(session.role);
    session.permissions = new Set(supplied.map(v => String(v).trim().toUpperCase()));
    listeners.forEach(fn => fn(getSession()));
  }
  function getSession() { return Object.freeze({ user: session.user, role: session.role, galera: session.galera, permissions: [...session.permissions] }); }
  function can(permission) { const key=String(permission||'').trim().toUpperCase(); return session.role==='ADMIN_TOTAL'||session.permissions.has(key); }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function ensureRoutes(){
    if(routesReady)return;
    const router=window.RYM173.registry.get('router');if(!router)throw new Error('V173 router missing');
    router.define('portal',{module:'portal',title:'Portal'});
    router.define('panapass',{permission:'PANAPASS',title:'Panapass'});
    router.define('revisados',{permission:'REVISADOS',title:'Revisados'});
    router.define('control-auto',{permission:'CONTROL_AUTO',title:'Control de Auto'});
    router.define('gps',{permission:'GPS',title:'GPS'});
    router.define('usuarios',{permission:'USUARIOS',title:'Usuarios'});
    router.define('validador',{permission:'VALIDADOR',title:'Validador'});
    routesReady=true;
  }
  async function bootPortal(){ensureRoutes();await window.RYM173.registry.get('router').go('portal');}
  async function start(){
    ensureRoutes();
    const api=window.RYM173.registry.get('api'),auth=window.RYM173.registry.get('auth'),login=window.RYM173.registry.get('login');
    if(!api||!auth||!login)throw new Error('V173 auth stack missing');
    if(api.session().authenticated){try{await auth.load();return bootPortal();}catch(_){auth.logout();}}
    await window.RYM173.activate('login');
  }

  window.RYM173.register('core',{setSession,getSession,can,subscribe,defaultPermissions,bootPortal,start});
  document.addEventListener('rym:v173:ready',()=>start().catch(console.error),{once:true});
})();
