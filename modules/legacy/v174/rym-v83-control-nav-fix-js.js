
(function(){
  const role83=()=>String((typeof state!=='undefined'&&state?.profile?.rol)||'').trim().toUpperCase();
  const canValidate83=()=>role83()==='ADMIN_TOTAL'||(typeof window.rymHasModule==='function'&&window.rymHasModule('control_auto.validar_ecarcheck'));
  function ensureValidator83(active){
    const nav=document.querySelector('.side .nav');
    if(!nav||!canValidate83())return;
    let b=nav.querySelector('[data-v80-control="validator"]');
    if(!b){
      b=document.createElement('button');
      b.type='button';
      b.dataset.v80Control='validator';
      b.textContent='Validador eCarCheck';
      b.onclick=()=>window.v80OpenEcarValidator?.();
      nav.appendChild(b);
    }
    if(active==='validator'){
      nav.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
      const top=document.querySelector('.top h1');if(top)top.textContent='Validador eCarCheck';
      const kick=document.querySelector('.portal-kicker');if(kick)kick.textContent='Portal RYM · Control de Auto';
    }
  }
  const wrap=(name,active)=>{
    const fn=window[name];if(typeof fn!=='function'||fn.__v83wrapped)return;
    const w=async function(){const r=await fn.apply(this,arguments);ensureValidator83(active);return r};
    w.__v83wrapped=true;window[name]=w;
    try{if(name==='v75ControlDashboard')v75ControlDashboard=w;if(name==='v75ControlUnits')v75ControlUnits=w;if(name==='v75ControlAudit')v75ControlAudit=w}catch(_){}
  };
  wrap('v75ControlDashboard','dashboard');
  wrap('v75ControlUnits','unidades');
  wrap('v75ControlAudit','auditoria');
  const oldValidator=window.v80OpenEcarValidator;
  if(typeof oldValidator==='function'&&!oldValidator.__v83wrapped){
    const w=async function(){const r=await oldValidator.apply(this,arguments);ensureValidator83('validator');return r};
    w.__v83wrapped=true;window.v80OpenEcarValidator=w;
  }
  document.addEventListener('click',()=>{if(document.body.classList.contains('v70-control'))setTimeout(()=>ensureValidator83(),0)},true);
  setTimeout(()=>{if(document.body.classList.contains('v70-control'))ensureValidator83()},0);
})();
