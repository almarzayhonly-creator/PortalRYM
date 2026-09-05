/* Portal RYM - Panapass Dashboard V2 Clean canonical renderer. */
(function(w,d){
  'use strict';
  if(w.RYM_PANAPASS_DASHBOARD_CLEAN)return;
  const R=()=>w.RYM_PANAPASS_CLEAN_RUNTIME;
  const P=()=>w.RYM_PANAPASS_CLEAN_POLICY;
  const D=()=>w.RYM_PANAPASS_CLEAN_DATA;
  const VM=()=>w.RYM_PANAPASS_CLEAN_VM;

  function render(vm){const fn=w.RYM_PANAPASS_CLEAN_VIEWS?.[vm.view];if(typeof fn!=='function')throw new Error('Vista no disponible: '+vm.view);return fn(vm)}
  function bind(root,vm){
    root.onclick=async e=>{
      const refresh=e.target.closest('[data-pdc-action="refresh"]');
      if(refresh){refresh.disabled=true;try{D().clear();await mount({force:true})}finally{refresh.disabled=false}return}
      const route=e.target.closest('[data-pdc-route]');if(route){R().openRoute(route.dataset.pdcRoute);return}
      const gal=e.target.closest('[data-pdc-galera]');if(gal&&vm.role==='ADMIN_TOTAL'){root.dispatchEvent(new CustomEvent('rym:panapass:galera',{bubbles:true,detail:{galera:gal.dataset.pdcGalera}}))}
    };
  }
  async function build(options){const session=R().session(),policy=P().forSession(session),raw=await D().load(policy,options);return VM().build(raw,policy)}
  async function mount(options){
    await R().waitReady();
    const target=R().root();if(!target)throw new Error('#view no disponible');
    const vm=await build(options||{});
    target.innerHTML=render(vm);target.dataset.rymPanapassClean='1';d.body.dataset.rymPanapassClean='1';bind(target,vm);
    return Object.freeze({status:'mounted',role:vm.role,view:vm.view,version:vm.version});
  }
  async function autoMount(){if(w.RYM_PANAPASS_CLEAN_ENABLED!==true)return Object.freeze({status:'disabled'});return mount({force:true})}
  function unmount(){const target=R()?.root();if(target?.dataset?.rymPanapassClean==='1'){target.replaceChildren();delete target.dataset.rymPanapassClean;target.onclick=null}delete d.body.dataset.rymPanapassClean}

  w.RYM_PANAPASS_DASHBOARD_CLEAN=Object.freeze({build,mount,autoMount,unmount});
})(window,document);
