/* Portal RYM Architecture V2 - Panapass module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES) return;

  let mounted = false;
  let lastContext = null;

  function normalizeContext(ctx){
    if(ctx && ctx.api && ctx.api.panapass) return ctx;
    const extra = ctx && ctx.extra ? ctx.extra : (ctx || {});
    if(w.RYM_CONTEXT && typeof w.RYM_CONTEXT.create === 'function'){
      return w.RYM_CONTEXT.create('panapass', extra);
    }
    return null;
  }

  function wait(ms){ return new Promise(resolve=>w.setTimeout(resolve,ms)); }

  function ensureBootGuard(){
    if(d.getElementById('rym-panapass-native-boot-guard')) return;
    const style=d.createElement('style');
    style.id='rym-panapass-native-boot-guard';
    style.textContent='body[data-rym-module="panapass"].rym-panapass-booting #view>*{visibility:hidden!important}body[data-rym-module="panapass"].rym-panapass-booting #view:before{content:"Cargando Dashboard Panapass…";display:grid;place-items:center;min-height:240px;color:#0d2e5f;font:800 15px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}';
    d.head.appendChild(style);
  }

  async function ensureNativeDashboard(){
    const deadline=Date.now()+5000;
    while(Date.now()<deadline){
      if(w.__RYM_PANAPASS_DASHBOARD_NATIVE_INSTALLED__ &&
         w.RYM_PANAPASS_DASHBOARD_V2?.native===true &&
         typeof w.RYM_PANAPASS_DASHBOARD_V2?.dashboard==='function') return true;
      await wait(25);
    }
    throw new Error('Panapass native dashboard did not become ready');
  }

  async function mount(ctx){
    const context = normalizeContext(ctx);
    if(!context) throw new Error('Panapass context unavailable');
    if(!context.api || !context.api.panapass) throw new Error('Panapass API contract unavailable');
    ensureBootGuard();
    d.body.dataset.rymModule = 'panapass';
    d.body.classList.add('rym-panapass-booting');
    lastContext = context;
    mounted = true;
    context.events && context.events.emit('module:mounted', {moduleId:'panapass'});
    const legacy=w.RYM_LEGACY_ROUTES&&w.RYM_LEGACY_ROUTES.get('panapass');
    if(typeof legacy!=='function')throw new Error('Panapass canonical entrypoint unavailable');
    try{
      await ensureNativeDashboard();
      /* Legacy only prepares the authenticated Panapass shell/navigation.
         Its view stays hidden while native V2 takes ownership explicitly. */
      await legacy.apply(w,context.extra?.legacyArgs||[]);
      if(!mounted) return null;
      return await w.RYM_PANAPASS_DASHBOARD_V2.dashboard(false);
    }catch(e){
      d.body.classList.remove('rym-panapass-booting');
      throw e;
    }
  }

  async function unmount(){
    if(!mounted) return;
    mounted = false;
    d.body.classList.remove('rym-panapass-booting','rym-panapass-proposal2','rym-panapass-dashboard-native');
    if(d.body.dataset.rymModule === 'panapass') delete d.body.dataset.rymModule;
    if(lastContext && lastContext.events) lastContext.events.emit('module:unmounted', {moduleId:'panapass'});
    lastContext = null;
  }

  w.RYM_MODULES.register('panapass', {
    init:function(ctx){
      const context=normalizeContext(ctx);
      if(context) lastContext = context;
    },
    open:function(ctx){
      return mount(ctx || lastContext);
    },
    mount,
    unmount
  });
})(window,document);
