(() => {
  'use strict';
  if (!window.RYM173) throw new Error('V173 bootstrap missing');

  const listeners = new Set();
  const session = { user: null, role: null, galera: null, permissions: new Set() };

  function setSession(next = {}) {
    session.user = next.user ?? null;
    session.role = next.role ?? null;
    session.galera = next.galera ?? null;
    session.permissions = new Set(next.permissions || []);
    listeners.forEach(fn => fn(getSession()));
  }

  function getSession() {
    return Object.freeze({ user: session.user, role: session.role, galera: session.galera, permissions: [...session.permissions] });
  }

  function can(permission) {
    return session.role === 'ADMIN_TOTAL' || session.permissions.has(permission);
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  window.RYM173.register('core', { setSession, getSession, can, subscribe });
})();
