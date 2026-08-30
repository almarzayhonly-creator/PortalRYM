(() => {
  'use strict';

  const VERSION = '173';
  const registry = new Map();
  const state = { started: false, activeModule: null };

  function register(name, module) {
    if (!name || !module) throw new Error('V173 module registration requires name and module');
    registry.set(name, module);
  }

  async function activate(name, context = {}) {
    const next = registry.get(name);
    if (!next) throw new Error(`V173 module not registered: ${name}`);
    if (state.activeModule && registry.get(state.activeModule)?.unmount) {
      await registry.get(state.activeModule).unmount();
    }
    if (next.mount) await next.mount(context);
    state.activeModule = name;
  }

  function reportFatal(error) {
    console.error('[V173]', error);
    const node = document.getElementById('rym-fatal');
    if (node) {
      node.hidden = false;
      node.textContent = 'No se pudo iniciar Portal RYM. Recarga la pagina o informa a soporte.';
    }
  }

  async function start() {
    if (state.started) return;
    state.started = true;
    document.documentElement.dataset.rymVersion = VERSION;
    document.dispatchEvent(new CustomEvent('rym:v173:ready', { detail: { version: VERSION } }));
  }

  window.RYM173 = Object.freeze({ VERSION, register, activate, start, registry, state });
  window.addEventListener('DOMContentLoaded', () => start().catch(reportFatal), { once: true });
})();
