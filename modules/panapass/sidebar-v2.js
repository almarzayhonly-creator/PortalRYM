/* Portal RYM · Panapass Sidebar V2
   Single sidebar controller for all Panapass roles. It preserves existing
   permission-filtered buttons and handlers while normalizing structure and labels. */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_SIDEBAR_V2__) return;
  w.__RYM_PANAPASS_SIDEBAR_V2__=true;
  let raf=0;

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

  function isPan(){return d.body?.dataset?.rymModule==='panapass'}
  function meta(button,index){
    const text=String(button.dataset.rymOriginalLabel||button.textContent||'').trim();
    if(!button.dataset.rymOriginalLabel)button.dataset.rymOriginalLabel=text;
    const found=META.find(x=>x.test.test(text));
    return found||{group:'MÁS',icon:'•',label:text,order:900+index};
  }
  function normalize(){
    if(!isPan())return;
    const nav=d.querySelector('.side .nav');if(!nav)return;
    const buttons=[...nav.querySelectorAll('button')].filter(b=>!b.classList.contains('rym-d2-nav-group'));
    if(!buttons.length)return;
    const signature=buttons.map(b=>`${b.dataset.m||''}:${String(b.dataset.rymOriginalLabel||b.textContent||'').trim()}`).join('|');
    if(nav.dataset.rymSidebarV2===signature&&nav.querySelector('.rym-d2-nav-group'))return;
    const entries=buttons.map((button,index)=>({button,index,meta:meta(button,index)})).sort((a,b)=>a.meta.order-b.meta.order||a.index-b.index);
    const frag=d.createDocumentFragment();let group='';
    for(const item of entries){
      if(item.meta.group!==group){
        group=item.meta.group;
        const label=d.createElement('span');label.className='rym-d2-nav-group';label.textContent=group;frag.appendChild(label);
      }
      item.button.textContent=item.meta.label;
      item.button.dataset.rymIcon=item.meta.icon;
      frag.appendChild(item.button);
    }
    nav.replaceChildren(frag);
    nav.dataset.rymSidebarV2=signature;
  }
  function schedule(){if(raf)return;raf=w.requestAnimationFrame(()=>{raf=0;normalize()})}
  const observer=new MutationObserver(schedule);
  observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-rym-module','class']});
  d.addEventListener('click',schedule,true);
  w.addEventListener('load',schedule,{once:true});
  schedule();
})(window,document);
