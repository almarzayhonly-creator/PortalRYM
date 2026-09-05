/* Portal RYM · Panapass Dashboard UI V6
   Final presentation integration: hides internal AM/PM terminology,
   releases the boot shield only after Proposal 2 is ready, and keeps copy consistent. */
(function(w,d){
  'use strict';
  if(w.__RYM_PANAPASS_UI_V6__) return;
  w.__RYM_PANAPASS_UI_V6__=true;
  let raf=0;

  function isPan(){return d.body?.dataset?.rymModule==='panapass'}

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

  function run(){if(!isPan())return;cleanHeader();cleanPerformanceCopy();releaseBoot()}
  function schedule(){if(raf)return;raf=w.requestAnimationFrame(()=>{raf=0;run()})}
  const observer=new MutationObserver(schedule);
  observer.observe(d.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-rym-module','data-p2-enhanced','data-rym-ready']});
  d.addEventListener('click',schedule,true);w.addEventListener('load',schedule,{once:true});schedule();
})(window,document);
