/* Portal RYM · Panapass Sidebar V6 Restored
   Restores the grouped navigation behavior from dc9998cb without pulling
   unrelated dashboard generations. Scoped to Panapass only. */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_SIDEBAR_V6_RESTORED__) return;
  w.__RYM_PANAPASS_SIDEBAR_V6_RESTORED__=true;

  let raf=0;

  const NAV_META={
    dashboard:{group:'OPERACIÓN',icon:'▦',label:'Dashboard',order:10},
    negativos_hoy:{group:'OPERACIÓN',icon:'!',label:'Negativos Hoy',order:20},
    pagos_hoy:{group:'OPERACIÓN',icon:'$',label:'Pagos Hoy',order:30},
    cargar_pagos:{group:'GESTIÓN',icon:'↑',label:'Cargar Pagos',order:40},
    historial:{group:'GESTIÓN',icon:'▣',label:'Historial / Pendiente a Cobro',order:50},
    recurrentes:{group:'GESTIÓN',icon:'↻',label:'Recurrentes',order:60},
    bajas_panapass:{group:'GESTIÓN',icon:'↓',label:'Bajas Panapass',order:70},
    ranking:{group:'ANÁLISIS',icon:'★',label:'Ranking',order:80},
    reportes:{group:'ANÁLISIS',icon:'▤',label:'Reportes',order:90},
    recorrido:{group:'ANÁLISIS',icon:'⌁',label:'Recorrido',order:100},
    operaciones:{group:'ANÁLISIS',icon:'⚙',label:'Operación diaria',order:110},
    operacion_am:{group:'ANÁLISIS',icon:'⚙',label:'Operación diaria',order:110},
    operacion_pm:{group:'ANÁLISIS',icon:'⚙',label:'Operación diaria',order:110}
  };

  function isPan(){return d.body?.dataset?.rymModule==='panapass'}

  function navMeta(button){
    const id=String(button?.dataset?.m||'');
    if(NAV_META[id])return NAV_META[id];
    const label=String(button?.dataset?.rymSidebarOriginalLabel||button?.textContent||'').trim();
    if(/operaci[oó]n\s+am\s*\/\s*pm/i.test(label))return {group:'ANÁLISIS',icon:'⚙',label:'Operación diaria',order:110};
    if(/recorrido/i.test(label))return {group:'ANÁLISIS',icon:'⌁',label:'Recorrido',order:100};
    if(/bajas/i.test(label))return {group:'GESTIÓN',icon:'↓',label,order:70};
    return {group:'MÁS',icon:'•',label,order:900};
  }

  function enhanceSidebar(){
    if(!isPan())return false;
    const side=d.querySelector('.side'),nav=side?.querySelector('.nav');
    if(!side||!nav)return false;

    side.classList.add('rym-p6-side');
    nav.classList.add('rym-p6-nav');

    const buttons=[...nav.querySelectorAll('button[data-m]')];
    if(!buttons.length)return false;

    buttons.forEach((button,index)=>{
      if(!button.dataset.rymSidebarOriginalLabel)button.dataset.rymSidebarOriginalLabel=String(button.textContent||'').trim();
      if(!button.dataset.rymSidebarOriginalOrder)button.dataset.rymSidebarOriginalOrder=String(index);
    });

    const signature=buttons.map(b=>`${b.dataset.m}:${b.dataset.rymSidebarOriginalLabel}`).join('|');
    if(nav.dataset.p6Signature===signature&&nav.querySelector('.rym-p6-nav-group'))return true;

    const entries=buttons.map((button,index)=>({button,index,meta:navMeta(button)}))
      .sort((a,b)=>a.meta.order-b.meta.order||a.index-b.index);

    const frag=d.createDocumentFragment();
    let group='';
    for(const entry of entries){
      const {button,meta}=entry;
      if(meta.group!==group){
        group=meta.group;
        const label=d.createElement('span');
        label.className='rym-p6-nav-group';
        label.textContent=group;
        frag.appendChild(label);
      }
      button.textContent=meta.label;
      button.dataset.rymIcon=meta.icon;
      button.dataset.rymGroup=meta.group;
      frag.appendChild(button);
    }

    nav.replaceChildren(frag);
    nav.dataset.p6Signature=signature;
    return true;
  }

  function restoreSidebar(){
    const side=d.querySelector('.side'),nav=side?.querySelector('.nav');
    if(!side||!nav)return;
    const buttons=[...nav.querySelectorAll('button[data-m]')];
    if(!buttons.some(b=>b.dataset.rymSidebarOriginalLabel))return;

    buttons.sort((a,b)=>Number(a.dataset.rymSidebarOriginalOrder||0)-Number(b.dataset.rymSidebarOriginalOrder||0));
    const frag=d.createDocumentFragment();
    for(const button of buttons){
      if(button.dataset.rymSidebarOriginalLabel)button.textContent=button.dataset.rymSidebarOriginalLabel;
      delete button.dataset.rymIcon;
      delete button.dataset.rymGroup;
      frag.appendChild(button);
    }
    nav.replaceChildren(frag);
    nav.classList.remove('rym-p6-nav');
    side.classList.remove('rym-p6-side');
    delete nav.dataset.p6Signature;
  }

  function run(){
    if(isPan())enhanceSidebar();
    else restoreSidebar();
  }

  function schedule(){
    if(raf)return;
    raf=w.requestAnimationFrame(()=>{raf=0;run()});
  }

  const observer=new MutationObserver(schedule);
  observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-rym-module']});
  d.addEventListener('click',schedule,true);
  w.addEventListener('load',schedule,{once:true});
  schedule();
})(window,document);
