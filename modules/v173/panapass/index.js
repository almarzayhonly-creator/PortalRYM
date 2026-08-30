(() => {
  'use strict';
  if (!window.RYM173) throw new Error('V173 bootstrap missing');

  const LEGACY_ENTRYPOINT = 'v70OpenPanapass';
  const contracts = Object.freeze({
    ranking: 'panapass-ranking',
    recurrentes: 'panapass-recurrentes',
    bajas: 'panapass-bajas'
  });

  function getLegacyEntrypoint() {
    const fn = window[LEGACY_ENTRYPOINT];
    return typeof fn === 'function' ? fn : null;
  }

  function migrationStatus() {
    return Object.freeze({
      module: 'panapass',
      legacyEntrypoint: LEGACY_ENTRYPOINT,
      legacyAvailable: !!getLegacyEntrypoint(),
      contracts: { ...contracts },
      mode: getLegacyEntrypoint() ? 'compatibility' : 'native-pending'
    });
  }

  async function mount(context = {}) {
    document.body.dataset.rymModule = 'panapass';
    const legacy = getLegacyEntrypoint();
    if (!legacy) {
      const root = document.querySelector('#app') || document.body;
      root.innerHTML = '<main class="v173-module-pending"><h1>Panapass</h1><p>Migracion V173 en progreso. No se ejecutara logica simulada.</p></main>';
      return migrationStatus();
    }
    return legacy(context);
  }

  async function unmount() {
    if (document.body.dataset.rymModule === 'panapass') delete document.body.dataset.rymModule;
  }

  window.RYM173.register('panapass', { mount, unmount, migrationStatus, contracts });
})();
