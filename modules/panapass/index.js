/* Portal RYM Architecture V2 - Panapass module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES) return;

  let mounted=false;
  let lastContext=null;

  function normalizeContext(ctx){
    if(ctx&&ctx.api&&ctx.api.panapass)return ctx;
    const extra=ctx&&ctx.extra?ctx.extra:(ctx||{});
    if(w.RYM_CONTEXT&&typeof w.RYM_CONTEXT.create==='function')return w.RYM_CONTEXT.create('panapass',extra);
    return null;
  }

  function wait(ms){return new Promise(resolve=>w.setTimeout(resolve,ms))}
  async function ensureNativeDashboard(){
    const deadline=Date.now()+5000;
    while(Date.now()<deadline){
      if(w.RYM_PANAPASS_DASHBOARD_V2?.native===true&&typeof w.RYM_PANAPASS_DASHBOARD_V2.dashboard==='function')return true;
      await wait(20);
    }
    throw new Error('Panapass native dashboard unavailable');
  }

  async function mount(ctx){
    const context=normalizeContext(ctx);
    if(!context)throw new Error('Panapass context unavailable');
    if(!context.api||!context.api.panapass)throw new Error('Panapass API contract unavailable');
    d.body.dataset.rymModule='panapass';
    d.body.classList.add('rym-panapass-dashboard-native');
    lastContext=context;
    mounted=true;
    context.events?.emit('module:mounted',{moduleId:'panapass'});

    await ensureNativeDashboard();
    if(!mounted)return null;

    /* The authenticated shell owns permissions/navigation. Its dashboard callback
       is native V2, so no legacy Panapass dashboard markup is mounted first. */
    const result=context.router.open('dashboard');
    w.RYM_PANAPASS_SIDEBAR_V2?.render?.();
    return await result;
  }

  async function unmount(){
    if(!mounted)return;
    mounted=false;
    w.RYM_PANAPASS_SIDEBAR_V2?.clear?.();
    d.body.classList.remove('rym-panapass-dashboard-native','rym-panapass-booting','rym-panapass-proposal2');
    if(d.body.dataset.rymModule==='panapass')delete d.body.dataset.rymModule;
    lastContext?.events?.emit('module:unmounted',{moduleId:'panapass'});
    lastContext=null;
  }

  w.RYM_MODULES.register('panapass',{
    init:function(ctx){const context=normalizeContext(ctx);if(context)lastContext=context},
    open:function(ctx){return mount(ctx||lastContext)},
    mount,
    unmount
  });
})(window,document);
