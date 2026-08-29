/* FASE 1 ENA - helpers de interfaz. No cambia datos ni procesos. */
(function(){
  /* Mantiene badges por nombre de color sin modificar la fuente de datos. */
  const colorPair = (c)=>{
    const n=norm(c);
    const map={
      AMARILLO:['#FDE047','#3F3500'],ROJO:['#EF4444','#FFFFFF'],BLANCO:['#FFFFFF','#17233D'],
      NEGRO:['#111827','#FFFFFF'],GRIS:['#9CA3AF','#111827'],PLATA:['#D1D5DB','#111827'],
      BEIGE:['#E7D3A7','#3F321D'],AZUL:['#3B82F6','#FFFFFF'],VERDE:['#22C55E','#052E16'],
      'TITAN GREY':['#6B7280','#FFFFFF'],'TITAN GRAY':['#6B7280','#FFFFFF'],'TITANIUM GREY':['#6B7280','#FFFFFF'],
      NARANJA:['#FB923C','#3F1D0A'],MARRON:['#92400E','#FFFFFF'],'CAFÉ':['#92400E','#FFFFFF'],CAFE:['#92400E','#FFFFFF']
    };
    if(map[n])return map[n];
    if(/^#[0-9A-F]{6}$/i.test(String(c||''))){const bg=String(c);return [bg,v12TextColor(bg)]}
    return ['#E9EEF5','#17233D'];
  };
  v12Unit=function(u,c){const [bg,fg]=colorPair(c);return `<span class="unit-v11" title="Color: ${esc(c||'Sin color')}" style="background:${bg};color:${fg}">${esc(u||'')}</span>`};

  /* Contraer/expandir sidebar; se conserva solo en el navegador del usuario. */
  const previousShell=shell;
  shell=function(){
    previousShell();
    const sh=document.querySelector('.shell');
    const side=document.querySelector('.side');
    if(!sh||!side)return;
    const apply=()=>{
      const collapsed=localStorage.getItem('ena_sidebar_collapsed')==='1';
      sh.classList.toggle('side-collapsed',collapsed);
      const b=document.querySelector('#phase1SideToggle');
      if(b){b.textContent=collapsed?'›':'‹';b.title=collapsed?'Expandir menú':'Contraer menú';b.setAttribute('aria-label',b.title)}
    };
    let b=document.querySelector('#phase1SideToggle');
    if(!b){
      b=document.createElement('button');
      b.id='phase1SideToggle';b.className='phase1-side-toggle';b.type='button';
      const nav=side.querySelector('.nav');
      side.insertBefore(b,nav||side.firstChild);
      b.onclick=()=>{localStorage.setItem('ena_sidebar_collapsed',sh.classList.contains('side-collapsed')?'0':'1');apply()};
    }
    apply();
  };
})();
