/* Panapass sandbox V2: preview-only bootstrap. */
(function(w,d){'use strict';
  if(w.__PANAPASS_SANDBOX_V2__)return;
  w.__PANAPASS_SANDBOX_V2__=true;
  /* Sandbox follows the approved pilot visual by default. The prepared V2
     experiment stays opt-in and does not replace the operational dashboard. */
  w.RYM_PANAPASS_DASHBOARD_V2_ENABLED=false;
  w.__RYM_PILOT_VISUAL__=true;
  w.PANAPASS_SANDBOX_V2=Object.freeze({version:'v2',modules:['dashboard','galeras','ranking']});
  /* In sandbox, Revisados Vue is authoritative. If a legacy Revisados renderer
     wins a race during startup/navigation, replace it as soon as V2 is ready. */
  let revGuardBusy=false;
  async function enforceRevisadosVue(){
    if(revGuardBusy)return;
    const legacy=d.body.classList.contains('v60-revisados')||d.body.classList.contains('v63-revisados')||d.body.classList.contains('v66-revisados');
    if(!legacy)return;
    revGuardBusy=true;
    try{
      if(w.RYM_V171_READY)await w.RYM_V171_READY;
      if(w.RYM_REVISADOS_VUE?.open)await w.RYM_REVISADOS_VUE.open();
      else if(w.RYM_MODULES?.has?.('revisados'))await w.RYM_MODULES.open('revisados',{source:'sandbox-guard'});
    }catch(e){console.warn('sandbox revisados vue guard',e)}
    finally{revGuardBusy=false}
  }
  const revObserver=new MutationObserver(()=>{void enforceRevisadosVue()});
  const startRevGuard=()=>{
    revObserver.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    setTimeout(()=>void enforceRevisadosVue(),0);
  };

  const mark=()=>{if(d.querySelector('.pps-sandbox-badge'))return;d.body.dataset.panapassSandbox='v2';const badge=d.createElement('div');badge.className='pps-sandbox-badge';badge.textContent='PANAPASS · SANDBOX V2';d.body.appendChild(badge)};
  d.readyState==='loading'?d.addEventListener('DOMContentLoaded',()=>{mark();startRevGuard()},{once:true}):(mark(),startRevGuard());
})(window,document);
