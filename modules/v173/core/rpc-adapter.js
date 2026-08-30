(() => {
  'use strict';
  if (!window.RYM173) throw new Error('V173 bootstrap missing');

  let provider = null;

  function setProvider(fn) {
    if (typeof fn !== 'function') throw new Error('V173 RPC provider must be a function');
    provider = fn;
  }

  function resolveProvider() {
    if (provider) return provider;
    if (typeof window.rpc === 'function') return window.rpc;
    return null;
  }

  async function call(name, params) {
    const fn = resolveProvider();
    if (!fn) throw new Error(`V173 RPC unavailable for ${name}`);
    return fn(name, params);
  }

  function status() {
    return Object.freeze({ available: !!resolveProvider(), source: provider ? 'v173' : (typeof window.rpc === 'function' ? 'legacy-adapter' : 'none') });
  }

  window.RYM173.register('rpc', { call, setProvider, status });
})();
