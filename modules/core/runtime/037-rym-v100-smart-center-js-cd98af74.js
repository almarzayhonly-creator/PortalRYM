(function(){
  const role=()=>String(window.state?.profile?.rol||state?.profile?.rol||'').trim().toUpperCase();
  function applyMailPolicy(){document.body.classList.toggle('rym-mail-admin',role()==='ADMIN_TOTAL')}
  applyMailPolicy();
  new MutationObserver(applyMailPolicy).observe(document.documentElement,{subtree:true,childList:true});
  const oldShell=typeof shellHome99==='function'?shellHome99:null;
  if(oldShell){
    shellHome99=function(summary){
      oldShell(summary);applyMailPolicy();
      const hero=document.querySelector('.v99-hero'); if(!hero)return;
      const pan=summary?.panapass,rev=summary?.revisados,ctl=summary?.control,alerts=summary?.alerts||[];
      const items=[];
      if(pan?.negativos_hoy>0)items.push({k:'warn',t:`${pan.negativos_hoy} negativos Panapass`,d:`${pan.pagos_hoy||0} pagos registrados hoy`});
      if(rev?.criticos>0)items.push({k:'bad',t:`${rev.criticos} revisados críticos`,d:`${rev.pendientes||0} pendientes dentro de tu alcance`});
      else if(rev?.pendientes>0)items.push({k:'warn',t:`${rev.pendientes} revisados pendientes`,d:`${rev.emitidos_hoy||0}/${rev.limite_hoy||33} emitidos hoy`});
      if(pan?.bajas?.pendientes>0)items.push({k:pan?.bajas?.alertas?'bad':'warn',t:`${pan.bajas.pendientes} bajas ENA pendientes`,d:`${pan.bajas.procesadas||0} procesadas · ${pan.bajas.devoluciones||0} devolución(es)`});
      if(!items.length&&ctl)items.push({k:'good',t:'Operación sin prioridades críticas',d:`${ctl.activas||0} unidades activas dentro de tu alcance`});
      if(alerts.length&&!items.some(x=>x.k==='bad')){const a=alerts[0];items.unshift({k:a.level==='bad'?'bad':'warn',t:a.title||'Atención requerida',d:a.text||a.module||'Revisar alerta'})}
      const anchor=document.querySelector('.v99-section-title');
      if(anchor&&items.length){const sec=document.createElement('section');sec.className='v100-priority';sec.innerHTML=`<div class="v100-priority-head"><div><h3>Prioridad de hoy</h3><p>El sistema resume primero lo que requiere atención.</p></div></div><div class="v100-priority-grid">${items.slice(0,3).map(x=>`<article class="v100-priority-card ${x.k}"><i class="v100-dot"></i><div><b>${typeof E99==='function'?E99(x.t):x.t}</b><span>${typeof E99==='function'?E99(x.d):x.d}</span></div></article>`).join('')}</div>`;anchor.parentNode.insertBefore(sec,anchor)}
    };
  }
})();
