/* Portal RYM - Panapass Dashboard V2 orchestrator. Prepared and OFF by default. */
(function(w,d){
  'use strict';
  if(w.RYM_PANAPASS_DASHBOARD_V2) return;

  function ready(){
    return Boolean(w.RYM_PANAPASS_DASHBOARD_V2_POLICY&&w.RYM_PANAPASS_DASHBOARD_V2_DATA&&w.RYM_PANAPASS_DASHBOARD_V2_VM&&w.RYM_PANAPASS_DASHBOARD_V2_COMPONENTS&&w.RYM_PANAPASS_DASHBOARD_V2_VIEWS);
  }

  function enabled(options){return options?.force===true||w.RYM_PANAPASS_DASHBOARD_V2_ENABLED===true}

  async function build(context,options){
    if(!ready())throw new Error('Panapass Dashboard V2 scaffold incompleto');
    const policy=w.RYM_PANAPASS_DASHBOARD_V2_POLICY.forSession(context?.session);
    const includeCompanyCompare=policy.companyComparison==='aggregate-only'&&options?.includeCompanyCompare===true;
    const raw=await w.RYM_PANAPASS_DASHBOARD_V2_DATA.load(context,{force:Boolean(options?.forceData),includeCompanyCompare});
    return w.RYM_PANAPASS_DASHBOARD_V2_VM.build(raw);
  }

  function html(vm){
    const renderer=w.RYM_PANAPASS_DASHBOARD_V2_VIEWS?.[vm.view];
    if(typeof renderer!=='function')throw new Error('Vista Panapass V2 no disponible: '+vm.view);
    return renderer(vm);
  }

  function bind(target,context,vm,options){
    target.onclick=e=>{
      const refresh=e.target.closest('[data-pd2-action="refresh"]');
      if(refresh){mount(context,{...options,target,force:true,forceData:true});return}
      const route=e.target.closest('[data-pd2-route]');
      if(route&&context?.router?.open){context.router.open(route.dataset.pd2Route);return}
      const gal=e.target.closest('[data-pd2-open-galera]');
      if(gal&&vm.policy.canOpenOtherGaleras&&typeof options?.openGalera==='function')options.openGalera(gal.dataset.pd2OpenGalera);
    };
  }

  async function mount(context,options){
    const opts=options||{};
    if(!enabled(opts))return Object.freeze({status:'disabled'});
    const target=typeof opts.target==='string'?d.querySelector(opts.target):opts.target;
    if(!target)throw new Error('Panapass Dashboard V2 requiere target explicito');
    const vm=await build(context,opts);
    target.innerHTML=html(vm);target.dataset.rymPanapassDashboardV2='1';bind(target,context,vm,opts);
    return Object.freeze({status:'mounted',view:vm.view,role:vm.role,vm});
  }

  function unmount(target){
    const node=typeof target==='string'?d.querySelector(target):target;
    if(node?.dataset?.rymPanapassDashboardV2==='1'){node.replaceChildren();delete node.dataset.rymPanapassDashboardV2;node.onclick=null}
  }

  w.RYM_PANAPASS_DASHBOARD_V2=Object.freeze({ready,build,html,mount,unmount});
})(window,document);
