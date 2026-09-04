/* Portal RYM Architecture V2 - Module Context */
(function(w,d){
  'use strict';
  if(w.RYM_CONTEXT) return;

  function legacyRpc(name, params){
    const fn = w.rpc || (typeof rpc === 'function' ? rpc : null);
    if(typeof fn !== 'function') throw new Error('RPC legacy no disponible');
    return fn(name, params || {});
  }

  function session(){
    const state = w.state || null;
    const profile = state && state.profile ? state.profile : null;
    return Object.freeze({
      profile,
      role: profile && profile.rol ? String(profile.rol) : '',
      userId: profile && (profile.id || profile.user_id) ? String(profile.id || profile.user_id) : ''
    });
  }

  const api = Object.freeze({
    call: legacyRpc,
    panapass: Object.freeze({
      ranking: (periodo) => legacyRpc('panapass_ranking_pagos', {p_periodo: periodo}),
      openLegacy: () => {
        if(typeof w.v70OpenPanapass !== 'function') throw new Error('Panapass canonical entrypoint unavailable');
        return w.v70OpenPanapass();
      }
    })
  });

  function create(moduleId, extra){
    const id = String(moduleId || '');
    if(!id) throw new Error('moduleId requerido');
    return Object.freeze({
      moduleId: id,
      root: d.querySelector('#view'),
      session: session(),
      api,
      events: w.RYM_EVENTS,
      router: Object.freeze({
        home: () => typeof w.v36PortalHome === 'function' ? w.v36PortalHome() : null
      }),
      extra: Object.freeze(extra || {})
    });
  }

  w.RYM_CONTEXT = Object.freeze({create, api, session});
})(window,document);
