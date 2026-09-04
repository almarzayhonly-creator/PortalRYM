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

  async function mount(ctx){
    const context = normalizeContext(ctx);
    if(!context) throw new Error('Panapass context unavailable');
    if(!context.api || !context.api.panapass) throw new Error('Panapass API contract unavailable');
    d.body.dataset.rymModule = 'panapass';
    lastContext = context;
    mounted = true;
    context.events && context.events.emit('module:mounted', {moduleId:'panapass'});
    const legacy=w.RYM_LEGACY_ROUTES&&w.RYM_LEGACY_ROUTES.get('panapass');
    if(typeof legacy!=='function')throw new Error('Panapass canonical entrypoint unavailable');
    return legacy.apply(w,context.extra?.legacyArgs||[]);
  }

  async function unmount(){
    if(!mounted) return;
    mounted = false;
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
