(() => {
  'use strict';
  if (!window.RYM173) throw new Error('V173 bootstrap missing');

  const modules = [
    ['panapass','Panapass','Control de saldos, pagos y bajas','PANAPASS','blue'],
    ['revisados','Revisados','ATTT, eCarCheck y revisados','REVISADOS','orange'],
    ['control-auto','Control de Auto','Maestra de flota y auditorias','CONTROL_AUTO','green'],
    ['gps','GPS','Estado y seguimiento GPS','GPS','purple'],
    ['usuarios','Usuarios','Usuarios, roles y permisos','USUARIOS','navy'],
    ['validador','Validador','Validacion integral de unidad','VALIDADOR','teal']
  ];

  function escapeHtml(v='') { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  async function mount(context = {}) {
    const root = document.getElementById('rym-app');
    const core = window.RYM173.registry.get('core');
    const router = window.RYM173.registry.get('router');
    const session = core?.getSession?.() || {};
    const visible = modules.filter(([, , , permission]) => core?.can?.(permission));
    root.innerHTML = `<main class="v173-portal"><header class="v173-portal__head"><div><span class="v173-eyebrow">PORTAL RYM · V173</span><h1>Centro de operaciones</h1><p>${session.user ? `Sesion: ${escapeHtml(session.user)}` : 'Arquitectura modular en migracion controlada'}</p></div></header>${context.denied ? '<div class="v173-notice">Tu perfil no tiene acceso al modulo solicitado.</div>' : ''}<section class="v173-module-grid">${visible.map(([route,title,desc,,tone]) => `<button class="v173-module-card tone-${tone}" data-route="${route}" type="button"><span class="v173-module-card__mark"></span><strong>${title}</strong><small>${desc}</small><span class="v173-module-card__action">Abrir modulo →</span></button>`).join('')}</section>${visible.length ? '' : '<div class="v173-empty">No hay modulos habilitados para este perfil.</div>'}</main>`;
    root.querySelectorAll('[data-route]').forEach(btn => btn.addEventListener('click', () => router.go(btn.dataset.route).catch(console.error)));
  }

  function unmount() {
    const root = document.getElementById('rym-app');
    if (root) root.innerHTML = '';
  }

  window.RYM173.register('portal', { mount, unmount });
})();
