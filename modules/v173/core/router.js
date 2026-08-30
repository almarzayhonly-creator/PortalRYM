(() => {
  'use strict';
  if (!window.RYM173) throw new Error('V173 bootstrap missing');

  const routes = new Map();
  let current = null;

  function define(name, config = {}) {
    if (!name) throw new Error('Route name required');
    routes.set(name, Object.freeze({
      module: config.module || name,
      permission: config.permission || null,
      title: config.title || name,
      fallback: config.fallback || 'portal'
    }));
  }

  async function go(name, context = {}) {
    const route = routes.get(name);
    if (!route) throw new Error(`Unknown V173 route: ${name}`);
    const core = window.RYM173.registry.get('core');
    if (route.permission && core && !core.can(route.permission)) {
      if (name !== route.fallback && routes.has(route.fallback)) return go(route.fallback, { denied: name });
      throw new Error(`Permission denied: ${route.permission}`);
    }
    await window.RYM173.activate(route.module, { ...context, route: name });
    current = name;
    history.replaceState({ rym173: true, route: name }, '', `#/${name}`);
    document.title = `${route.title} · Portal RYM`;
    return name;
  }

  function resolveHash() {
    const name = location.hash.replace(/^#\//, '').trim();
    return routes.has(name) ? name : 'portal';
  }

  function getCurrent() { return current; }
  function list() { return [...routes.entries()].map(([name, cfg]) => ({ name, ...cfg })); }

  window.RYM173.register('router', { define, go, resolveHash, getCurrent, list });
})();
