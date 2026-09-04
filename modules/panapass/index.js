/* Portal RYM Architecture V2 - Panapass module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES) return;

  let mounted = false;
  let lastContext = null;

  async function mount(ctx){
    const context = ctx || (w.RYM_CONTEXT && w.RYM_CONTEXT.create('panapass'));
    if(!context) throw new Error('Panapass context unavailable');
    if(!context.api.panapass) throw new Error('Panapass API contract unavailable');
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
      if(ctx) lastContext = ctx;
    },
    open:function(ctx){
      return mount(ctx || lastContext || (w.RYM_CONTEXT && w.RYM_CONTEXT.create('panapass')));
    },
    mount,
    unmount
  });
})(window,document);
