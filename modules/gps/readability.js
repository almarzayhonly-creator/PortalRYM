/* Portal RYM V172 clean - overflow titles for dense operational tables */
(function(){
  'use strict';
  let timer=0;
  const addOverflowTitles=()=>{
    clearTimeout(timer);
    timer=setTimeout(()=>document.querySelectorAll('.v117-card-value,.v117-card-detail b,.v66-card td,.v157-main td,.v93-rank-card b').forEach(el=>{
      if(!el.title&&el.scrollWidth>el.clientWidth)el.title=(el.textContent||'').trim();
    }),100);
  };
  new MutationObserver(addOverflowTitles).observe(document.documentElement,{subtree:true,childList:true});
  addOverflowTitles();
})();
