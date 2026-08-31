
(function(){
  let timer=0;
  function compactRanking(){
    const grid=document.querySelector('#v93ROut .v93-rank-grid');if(!grid||grid.dataset.v121Rank)return;
    grid.dataset.v121Rank='1';
    const original=[...grid.querySelectorAll('.v93-rank-card')];if(original.length<=3)return;
    original.slice(0,3).forEach(card=>card.remove());
    const cards=[...grid.querySelectorAll('.v93-rank-card')],limit=12,extra=cards.slice(limit);
    extra.forEach(card=>card.classList.add('v121-rank-extra'));
    const bar=document.createElement('div');bar.className='v121-rank-more';
    const lastVisible=Math.min(3+limit,original.length);
    bar.innerHTML=`<span>Posiciones 4–${lastVisible} · el podio no se repite</span>${extra.length?`<button type="button">Ver ${extra.length} restantes</button>`:''}`;
    grid.before(bar);
    const button=bar.querySelector('button');if(button)button.onclick=()=>{const show=grid.classList.toggle('v121-show-all');button.textContent=show?'Mostrar menos':`Ver ${extra.length} restantes`;bar.querySelector('span').textContent=show?`Posiciones 4–${original.length}`:`Posiciones 4–${lastVisible} · el podio no se repite`};
  }
  function enhance(){clearTimeout(timer);timer=setTimeout(compactRanking,60)}
  new MutationObserver(enhance).observe(document.documentElement,{subtree:true,childList:true});enhance();
})();
