(function(){
  const norm138=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  function apply138(){
    const sel=document.querySelector('#pmEmpresaFiltro'),out=document.querySelector('#pmOut');
    if(!sel||!out)return;
    const selected=norm138(sel.value),rows=[...out.querySelectorAll('tbody tr[data-pay-row-unit]')];
    rows.forEach(tr=>{
      if(!selected){delete tr.dataset.v138CompanyMatch;return}
      const company=norm138(tr.querySelector('[data-pay-company]')?.textContent||'');
      tr.dataset.v138CompanyMatch=company===selected?'1':'0';
    });
    const table=out.querySelector('table[data-v119-table],table');
    if(table?.dataset?.v119Table){
      const pager=document.querySelector(`.v119-pager[data-for="${table.dataset.v119Table}"]`);
      pager?.classList.toggle('v138-filter-active',!!selected);
    }
  }
  document.addEventListener('change',e=>{
    if(e.target?.id==='pmEmpresaFiltro')setTimeout(apply138,0);
  });
  const mo=new MutationObserver(()=>{
    if(document.querySelector('#pmEmpresaFiltro')&&document.querySelector('#pmOut tbody tr[data-pay-row-unit]'))setTimeout(apply138,120);
  });
  mo.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(apply138,250);
})();
