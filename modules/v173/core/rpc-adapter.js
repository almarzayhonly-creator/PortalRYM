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
    const api = window.RYM173?.registry?.get('api');
    if (typeof api?.rpc === 'function') return (name, params) => api.rpc(name, params);
    return null;
  }

  async function call(name, params) {
    const fn = resolveProvider();
    if (!fn) throw new Error(`V173 RPC unavailable for ${name}`);
    return fn(name, params);
  }

  function status() {
    const apiAvailable = typeof window.RYM173?.registry?.get('api')?.rpc === 'function';
    return Object.freeze({ available: !!resolveProvider(), source: provider ? 'v173' : (typeof window.rpc === 'function' ? 'legacy-adapter' : (apiAvailable ? 'api-client' : 'none')) });
  }

  window.RYM173.register('rpc', { call, setProvider, status });
})();
