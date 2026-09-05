/* Portal RYM Architecture V2 - Panapass module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES) return;

  let mounted = false;
  let lastContext = null;

  function normalizeContext(ctx){
    if(ctx && ctx.api && ctx.api.panapass) return ctx;
    const extra = ctx && ctx.extra ? ctx.extra : (ctx || {});
    if(w.RYM_CONTEXT && typeof w.RYM_CONTEXT.create === 'function') return w.RYM_CONTEXT.create('panapass', extra);
    return null;
  }

  async function mountDashboardV2(context){
    if(w.RYM_PANAPASS_DASHBOARD_V2_ENABLED!==true) return null;
    const dashboard=w.RYM_PANAPASS_DASHBOARD_V2;
    if(!dashboard || typeof dashboard.mount!=='function') throw new Error('Panapass Dashboard V2 preview unavailable');
    const role=String(context.session?.role||'').trim().toUpperCase();
    const target=context.root||d.querySelector('#view');
    return dashboard.mount(context,{
      target,
      includeCompanyCompare:role==='ADMIN'||role==='GERENTE_GALERA',
      openGalera:galera=>context.events?.emit('panapass:dashboard:open-galera',{galera,source:'dashboard-v2'})
    });
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
    const result=await legacy.apply(w,context.extra?.legacyArgs||[]);

    if(w.RYM_PANAPASS_DASHBOARD_V2_ENABLED===true){
      try{
        await mountDashboardV2(context);
        context.events?.emit('panapass:dashboard-v2:mounted',{role:String(context.session?.role||'')});
      }catch(error){
        console.error('Panapass Dashboard V2 preview failed; legacy view preserved.',error);
        context.events?.emit('panapass:dashboard-v2:error',{message:String(error?.message||error)});
      }
    }
    return result;
  }

  async function unmount(){
    if(!mounted) return;
    if(w.RYM_PANAPASS_DASHBOARD_V2_ENABLED===true&&w.RYM_PANAPASS_DASHBOARD_V2&&lastContext?.root){
      w.RYM_PANAPASS_DASHBOARD_V2.unmount(lastContext.root);
    }
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
    open:function(ctx){return mount(ctx || lastContext);},
    mount,
    unmount
  });
})(window,document);
