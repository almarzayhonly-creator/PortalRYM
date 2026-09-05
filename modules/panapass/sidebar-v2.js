/* Portal RYM · Panapass Sidebar V2
   Canonical sidebar renderer for all Panapass roles.
   Uses the permission-filtered buttons already produced by the authenticated shell,
   but renders one Panapass navigation structure exactly once per shell render. */
(function(w,d){
  'use strict';
  if(w.RYM_PANAPASS_SIDEBAR_V2) return;

  const META=[
    {test:/^dashboard$/i,group:'OPERACIÓN',icon:'▦',label:'Dashboard',order:10},
    {test:/negativos/i,group:'OPERACIÓN',icon:'!',label:'Negativos Hoy',order:20},
    {test:/pagos hoy/i,group:'OPERACIÓN',icon:'$',label:'Pagos Hoy',order:30},
    {test:/cargar pagos/i,group:'GESTIÓN',icon:'↑',label:'Cargar Pagos',order:40},
    {test:/historial|pendiente a cobra/i,group:'GESTIÓN',icon:'▣',label:'Historial / Pendiente a Cobro',order:50},
    {test:/recurrent/i,group:'GESTIÓN',icon:'↻',label:'Recurrentes',order:60},
    {test:/bajas panapass/i,group:'GESTIÓN',icon:'↓',label:'Bajas Panapass',order:70},
    {test:/ranking/i,group:'ANÁLISIS',icon:'★',label:'Ranking',order:80},
    {test:/reportes/i,group:'ANÁLISIS',icon:'▤',label:'Reportes',order:90},
    {test:/recorrido/i,group:'ANÁLISIS',icon:'⌁',label:'Recorrido',order:100},
    {test:/operaci[oó]n/i,group:'ANÁLISIS',icon:'⚙',label:'Operación diaria',order:110}
  ];

  function descriptor(button,index){
    const original=String(button.dataset.rymOriginalLabel||button.textContent||'').trim();
    if(!button.dataset.rymOriginalLabel)button.dataset.rymOriginalLabel=original;
    return META.find(x=>x.test.test(original))||{group:'MÁS',icon:'•',label:original,order:900+index};
  }

  function render(){
    if(d.body?.dataset?.rymModule!=='panapass')return false;
    const side=d.querySelector('.side'),nav=side?.querySelector('.nav');
    if(!side||!nav)return false;
    const buttons=[...nav.querySelectorAll('button')];
    if(!buttons.length)return false;
    const entries=buttons.map((button,index)=>({button,index,meta:descriptor(button,index)})).sort((a,b)=>a.meta.order-b.meta.order||a.index-b.index);
    const frag=d.createDocumentFragment();let current='';
    for(const item of entries){
      if(item.meta.group!==current){
        current=item.meta.group;
        const group=d.createElement('span');
        group.className='rym-d2-nav-group';
        group.textContent=current;
        frag.appendChild(group);
      }
      item.button.textContent=item.meta.label;
      item.button.dataset.rymIcon=item.meta.icon;
      frag.appendChild(item.button);
    }
    nav.replaceChildren(frag);
    nav.dataset.rymSidebar='v2';
    side.dataset.rymSidebar='v2';
    return true;
  }

  function clear(){
    const side=d.querySelector('.side');
    if(side)delete side.dataset.rymSidebar;
  }

  w.RYM_PANAPASS_SIDEBAR_V2=Object.freeze({render,clear});
})(window,document);
