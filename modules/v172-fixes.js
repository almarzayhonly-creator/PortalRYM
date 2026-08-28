/* Portal RYM V172 - focused fixes only */
(function(w,d){'use strict';if(w.__RYM_V172_FIXES__)return;w.__RYM_V172_FIXES__=true;
let homeData=null,hookedReq=false;
const warn='<span class="v103-state-icon">!</span>';
function patchPanapassHome(){
  const p=homeData?.panapass;if(!p||!d.body.classList.contains('v99-home'))return;
  const card=d.querySelector('.v99-module.pan,.v99-module.panapass,[data-module="panapass"]');if(!card)return;
  const badge=card.querySelector('.v99-badge,.v103-state-badge');if(!badge)return;
  const negativos=Math.max(0,Number(p.negativos_hoy)||0),pagos=Math.max(0,Number(p.pagos_hoy)||0),pending=Math.max(0,negativos-pagos);
  badge.classList.remove('good','medal','warn');badge.classList.add('v103-state-badge',pending>0?'warn':'good');badge.dataset.v172Pm='1';
  badge.innerHTML=pending>0?warn+'<span class="v103-state-copy"><b>'+pending+' por revisar</b><small>'+negativos+' negativos · '+pagos+' pagos detectados PM</small></span>':'<span class="v103-state-copy"><b>Al día</b><small>Pagos PM conciliados</small></span>';
}
function hookReq(){if(hookedReq||typeof w.req!=='function')return false;const base=w.req;if(base.__v172){hookedReq=true;return true}const wrapped=async function(path,opt={}){const r=await base(path,opt);if(String(path)==='/functions/v1/portal-home-resumen'&&r?.data?.ok!==false){homeData=r.data;setTimeout(patchPanapassHome,0)}return r};Object.assign(wrapped,base);wrapped.__v172=true;w.req=wrapped;try{req=wrapped}catch(_){}hookedReq=true;return true}
function install(){hookReq();patchPanapassHome()}
let tries=0;const timer=setInterval(()=>{install();if(++tries>120)clearInterval(timer)},250);d.addEventListener('click',()=>setTimeout(patchPanapassHome,60),true);if(d.readyState!=='loading')install();else d.addEventListener('DOMContentLoaded',install,{once:true});
w.RYM_V172_READY=Promise.resolve(w.RYM_V171_READY).then(()=>({version:'172',recovered:['approved-panapass-final','panapass-pm','control-router']}));
})(window,document);
