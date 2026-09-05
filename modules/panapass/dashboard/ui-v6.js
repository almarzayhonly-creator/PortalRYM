/* Portal RYM · Panapass Dashboard UI V6
   Final presentation integration: hides internal AM/PM terminology,
   releases the boot shield only after Proposal 2 is ready, and keeps copy consistent. */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_UI_V6__) return;
  w.__RYM_PANAPASS_UI_V6__=true;
  let raf=0;

  function isPan(){return d.body?.dataset?.rymModule==='panapass'}

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

  function navMeta(button){
    const id=String(button?.dataset?.m||'');
    if(NAV_META[id])return NAV_META[id];
    const label=String(button?.textContent||'').trim();
    if(/operaci[oó]n\s+am\s*\/\s*pm/i.test(label))return {group:'ANÁLISIS',icon:'⚙',label:'Operación diaria',order:110};
    if(/recorrido/i.test(label))return {group:'ANÁLISIS',icon:'⌁',label:'Recorrido',order:100};
    if(/bajas/i.test(label))return {group:'GESTIÓN',icon:'↓',label,order:70};
    return {group:'MÁS',icon:'•',label,order:900};
  }

  function enhanceSidebar(){
    const side=d.querySelector('.side'),nav=side?.querySelector('.nav');
    if(!side||!nav)return;
    side.classList.add('rym-p6-side');nav.classList.add('rym-p6-nav');
    const buttons=[...nav.querySelectorAll('button[data-m]')];
    if(!buttons.length)return;
    const signature=buttons.map(b=>`${b.dataset.m}:${String(b.textContent||'').trim()}`).join('|');
    if(nav.dataset.p6Signature===signature&&nav.querySelector('.rym-p6-nav-group'))return;
    const entries=buttons.map((button,index)=>({button,index,meta:navMeta(button)})).sort((a,b)=>a.meta.order-b.meta.order||a.index-b.index);
    const frag=d.createDocumentFragment();let group='';
    for(const entry of entries){
      const {button,meta}=entry;
      if(meta.group!==group){group=meta.group;const label=d.createElement('span');label.className='rym-p6-nav-group';label.textContent=group;frag.appendChild(label)}
      button.textContent=meta.label;
      button.dataset.rymIcon=meta.icon;
      button.dataset.rymGroup=meta.group;
      frag.appendChild(button);
    }
    nav.replaceChildren(frag);
    nav.dataset.p6Signature=[...nav.querySelectorAll('button[data-m]')].map(b=>`${b.dataset.m}:${String(b.textContent||'').trim()}`).join('|');
  }

  function cleanHeader(){
    const header=d.querySelector('#view .rym-p2-header');if(!header)return;
    header.querySelector('.rym-p3-phase-badge')?.remove();
    const subtitle=header.querySelector('p');
    const copy='Control de cobranza y rendimiento operativo en tiempo real';
    if(subtitle&&subtitle.textContent!==copy)subtitle.textContent=copy;
    header.querySelectorAll('.rym-p5-result-badge').forEach(x=>{if(!x.closest('.rym-rank-hero'))x.remove()});
  }

  function cleanPerformanceCopy(){
    d.querySelectorAll('#view .rym-p3-phase-lead>span').forEach(x=>{if(x.textContent!=='RENDIMIENTO OPERATIVO')x.textContent='RENDIMIENTO OPERATIVO'});
    d.querySelectorAll('#view .rym-p3-performance-strip').forEach(strip=>{
      const strong=strip.querySelector('.rym-p3-phase-lead>strong');
      const small=strip.querySelector('.rym-p3-phase-lead>small');
      if(strong&&/cobranza en curso/i.test(strong.textContent||''))strong.textContent='Gestión de cobranza';
      if(strong&&/rendimiento de cobranza|resultado de cobranza|excelente gestión/i.test(strong.textContent||''))strong.textContent='Resultado de gestión';
      const copy='Menos unidades que terminan requiriendo pago representa mejor gestión para la empresa.';
      if(small&&small.textContent!==copy)small.textContent=copy;
    });
  }

  function releaseBoot(){
    if(d.querySelector('#view .rym-p2-shell')&&d.querySelector('#view #phase4GaleraKpis.rym-p2-galeras')){
      d.body.classList.remove('rym-panapass-booting');
    }
  }

  function run(){if(!isPan())return;enhanceSidebar();cleanHeader();cleanPerformanceCopy();releaseBoot()}
  function schedule(){if(raf)return;raf=w.requestAnimationFrame(()=>{raf=0;run()})}
  const observer=new MutationObserver(schedule);
  observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-rym-module','data-p2-enhanced','data-rym-ready']});
  d.addEventListener('click',schedule,true);w.addEventListener('load',schedule,{once:true});schedule();
})(window,document);
