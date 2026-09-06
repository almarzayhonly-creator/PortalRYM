/* Portal RYM - Panapass Dashboard V2 Clean canonical renderer. */
(function(w,d){
  'use strict';
  if(w.RYM_PANAPASS_DASHBOARD_CLEAN)return;
  const R=()=>w.RYM_PANAPASS_CLEAN_RUNTIME;
  const P=()=>w.RYM_PANAPASS_CLEAN_POLICY;
  const D=()=>w.RYM_PANAPASS_CLEAN_DATA;
  const VM=()=>w.RYM_PANAPASS_CLEAN_VM;
  let mounting=null;
  let ownershipInstalled=false;

  function viewHtml(vm){const fn=w.RYM_PANAPASS_CLEAN_VIEWS?.[vm.view];if(typeof fn!=='function')throw new Error('Vista no disponible: '+vm.view);return fn(vm)}
  function bind(root,vm){
    root.onclick=async e=>{
      const refresh=e.target.closest('[data-pdc-action="refresh"]');
      if(refresh){refresh.disabled=true;try{D().clear();await mount({force:true,source:'refresh'})}finally{refresh.disabled=false}return}
      const route=e.target.closest('[data-pdc-route]');if(route){R().openRoute(route.dataset.pdcRoute);return}
      const gal=e.target.closest('[data-pdc-galera]');if(gal&&vm.role==='ADMIN_TOTAL'){root.dispatchEvent(new CustomEvent('rym:panapass:galera',{bubbles:true,detail:{galera:gal.dataset.pdcGalera}}))}
    };
  }
  async function build(options){const session=R().session(),policy=P().forSession(session),raw=await D().load(policy,options);return VM().build(raw,policy)}
  function loading(target){target.innerHTML='<main class="rym-pdc rym-pdc-loading" data-pdc-state="loading"><div class="rym-pdc-loading-card"><b>Panapass</b><strong>Cargando dashboard...</strong><span>Preparando la vista segun tu alcance.</span></div></main>'}
  function errorView(target,error){const msg=String(error?.message||error||'No se pudo cargar el dashboard.').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));target.innerHTML=`<main class="rym-pdc rym-pdc-loading" data-pdc-state="error"><div class="rym-pdc-loading-card error"><b>Panapass</b><strong>No se pudo cargar el dashboard</strong><span>${msg}</span><button type="button" data-pdc-action="refresh">Reintentar</button></div></main>`}

  async function mount(options){
    const opts=options||{};
    if(mounting&&!opts.force)return mounting;
    mounting=(async()=>{
      await R().waitReady();
      if(!R().isDashboardRoute())return Object.freeze({status:'not-dashboard'});
      const target=R().root();if(!target)throw new Error('#view no disponible');
      target.dataset.rymPanapassClean='1';d.body.dataset.rymPanapassClean='1';loading(target);
      try{
        const vm=await build(opts);
        if(!R().isDashboardRoute())return Object.freeze({status:'route-changed'});
        target.innerHTML=viewHtml(vm);target.dataset.rymPanapassClean='1';d.body.dataset.rymPanapassClean='1';bind(target,vm);
        return Object.freeze({status:'mounted',role:vm.role,view:vm.view,version:vm.version,source:opts.source||'direct'});
      }catch(error){
        errorView(target,error);bind(target,{role:'',policy:{}});
        return Object.freeze({status:'error',message:String(error?.message||error)});
      }
    })().finally(()=>{mounting=null});
    return mounting;
  }
  function unmount(){
    const target=R()?.root();
    if(target?.dataset?.rymPanapassClean==='1'){delete target.dataset.rymPanapassClean;target.onclick=null}
    delete d.body.dataset.rymPanapassClean;
  }
  function installOwnership(){
    if(ownershipInstalled)return R().ownership();
    const result=R().installDashboardOwner({renderDashboard:mount,leaveDashboard:unmount});
    ownershipInstalled=true;
    return result;
  }
  async function mountIfCurrent(){
    if(w.RYM_PANAPASS_CLEAN_ENABLED!==true)return Object.freeze({status:'disabled'});
    installOwnership();
    if(!R().ready()||!R().isDashboardRoute())return Object.freeze({status:'armed'});
    return mount({force:true,source:'startup'});
  }

  w.RYM_PANAPASS_DASHBOARD_CLEAN=Object.freeze({build,mount,mountIfCurrent,installOwnership,unmount});
})(window,document);
