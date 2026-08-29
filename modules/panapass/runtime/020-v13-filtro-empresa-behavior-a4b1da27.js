/* V13: filtra Cargar Pagos por la empresa dueña ya mostrada en cada fila. */
const _v13EmpresaPagosTrabajo=pagosTrabajo;
pagosTrabajo=async function(v){
  await _v13EmpresaPagosTrabajo(v);

  const tools=v.querySelector('.section-tools');
  const out=v.querySelector('#pmOut');
  if(!tools||!out||v.querySelector('#pmEmpresaFiltro'))return;

  const field=document.createElement('div');
  field.className='field pm-company-filter';
  field.innerHTML='<label>Empresa dueña</label><select id="pmEmpresaFiltro"><option value="">Todas las empresas</option></select>';

  const capture=tools.querySelector('#adminPayCapture');
  if(capture)tools.insertBefore(field,capture);
  else tools.appendChild(field);

  const sel=field.querySelector('#pmEmpresaFiltro');

  const companies=()=>[...new Set(
    [...out.querySelectorAll('tbody tr [data-pay-company]')]
      .map(x=>String(x.textContent||'').trim())
      .filter(Boolean)
  )].sort((a,b)=>a.localeCompare(b,'es',{sensitivity:'base'}));

  const fillOptions=()=>{
    const current=sel.value;
    const items=companies();
    sel.innerHTML='<option value="">Todas las empresas</option>'+
      items.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
    if(items.includes(current))sel.value=current;
  };

  const numberText=x=>{
    const n=Number(String(x??'').replace(/[^0-9.-]/g,''));
    return Number.isFinite(n)?n:0;
  };

  const refreshKpis=rows=>{
    const paid=rows.filter(tr=>Number(tr.querySelector('[data-pay]')?.value||0)>0);
    const total=paid.reduce((a,tr)=>a+Number(tr.querySelector('[data-pay]')?.value||0),0);
    const boleta=paid.reduce((a,tr)=>a+numberText(tr.children?.[5]?.textContent),0);

    [...out.querySelectorAll('.kpi')].forEach(k=>{
      const label=norm(k.querySelector('span')?.textContent||'');
      const strong=k.querySelector('strong');
      if(!strong)return;
      if(label==='PENDIENTES CARGADOS')strong.textContent=String(rows.length);
      else if(label==='MARCADOS PAGADOS')strong.textContent=String(paid.length);
      else if(label==='TOTAL PAGADO')strong.textContent=money(total);
      else if(label==='BOLETA')strong.textContent=money(boleta);
    });
  };

  const apply=()=>{
    const selected=norm(sel.value);
    const all=[...out.querySelectorAll('tbody tr[data-pay-row-unit]')];
    const visible=[];
    all.forEach(tr=>{
      const company=norm(tr.querySelector('[data-pay-company]')?.textContent||'');
      const show=!selected||company===selected;
      tr.style.display=show?'':'none';
      if(show)visible.push(tr);
    });
    refreshKpis(visible);
  };

  sel.onchange=apply;

  const refreshFilter=()=>{
    observer.disconnect();
    try{
      fillOptions();
      apply();
    }finally{
      observer.observe(out,{childList:true});
    }
  };
  if(window.__v36PayFilterObserver){try{window.__v36PayFilterObserver.disconnect()}catch(_){}}
  const observer=new MutationObserver(refreshFilter);
  window.__v36PayFilterObserver=observer;
  observer.observe(out,{childList:true});

  fillOptions();
  apply();
};
