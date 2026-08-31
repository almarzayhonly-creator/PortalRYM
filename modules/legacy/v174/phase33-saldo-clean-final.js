
/* V33 final: UI de saldo limpia. Sin mostrar proveedor/fuente. Ventana de frescura: 2 minutos. */
function phase33SaldoContext(btn,panapass){
  const base=typeof phase32SaldoContext==='function'
    ? (phase32SaldoContext(btn,panapass)||{})
    : (typeof phase10SaldoContext==='function'?phase10SaldoContext(btn,panapass):{});
  const tr=btn?.closest?.('tr');
  const rowVal=label=>tr?.querySelector?.(`[data-label="${label}"]`)?.textContent?.trim()||'';
  return {
    ...base,
    panapass:String(panapass||base.panapass||''),
    unidad:base.unidad||rowVal('Unidad'),
    placa:base.placa||rowVal('Placa'),
    tag:base.tag||rowVal('TAG')
  };
}
function phase31SaldoModal(ctx){
  const modal=phase10SaldoModal(ctx);
  const card=modal.body?.closest?.('.ena10-card');
  const h=card?.querySelector?.('.ena10-head h2');
  const small=card?.querySelector?.('.ena10-head small');
  if(h)h.textContent=`Consulta de saldo${ctx.unidad?' · '+ctx.unidad:''}`;
  if(small)small.textContent=`Panapass ${ctx.panapass||''}`;
  const loading=modal.body?.querySelector?.('.ena10-loading');
  if(loading)loading.innerHTML='<div><div class="ena10-spinner"></div>Consultando saldo...</div>';
  return modal;
}
function phase31RenderSaldo(body,ctx,r){
  const n=Number(r?.balance),valid=Number.isFinite(n),display=valid?money(n):'N/D';
  const positive=valid&&n>=0,negative=valid&&n<0;
  const balanceClass=positive?'positive':negative?'negative':'';
  const status=positive?'Saldo disponible':negative?'Saldo negativo':'Saldo consultado';
  const statusClass=positive?'good':negative?'bad':'';
  const tags=Array.isArray(r?.tags)?r.tags.filter(t=>String(t?.tag||'').trim()):[];
  const tagText=tags.length?tags.map(t=>String(t.tag||'')).join(' · '):(ctx.tag||'Sin TAG registrado');
  const age=Number(r?.edad_segundos||0),mins=Math.floor(age/60),secs=Math.max(0,Math.floor(age%60));
  const stale=age>=120;
  const freshness=stale
    ? `⚠ Última consulta hace ${mins} min. Actualiza el saldo.`
    : (r?.cached?`Última consulta hace ${mins?mins+' min':secs+' s'}`:'Actualizado ahora');
  body.innerHTML=`<div class="ena10-balance ${balanceClass}"><span>Saldo actual</span><strong>${esc(display)}</strong></div><div class="ena10-status ${statusClass}">${esc(status)}</div><div class="ena10-meta"><div><span>Unidad</span><b>${esc(ctx.unidad||'—')}</b></div><div><span>Placa</span><b>${esc(ctx.placa||'—')}</b></div><div style="grid-column:1/-1"><span>TAG</span><b class="ena33-tag">${esc(tagText)}</b></div></div><div class="${stale?'ena33-stale':'ena33-fresh'}">${esc(freshness)}</div>`;
}
phase6ConsultarSaldoENA=async function(panapass,btn){
  if(!panapass||btn.disabled)return;
  const ctx=phase33SaldoContext(btn,panapass),modal=phase31SaldoModal(ctx),old=btn.textContent;
  btn.disabled=true;btn.textContent='Consultando...';
  try{
    const {data}=await req('/functions/v1/ena-consulta-saldo',{method:'POST',body:JSON.stringify({panapass:Number(panapass)})});
    const r=data?.results?.[0];
    if(!data?.ok||!r)throw Error(data?.error||'No se pudo consultar el saldo.');
    if(!r.ok){
      const prev=r?.previous;
      modal.body.innerHTML=`<div class="ena10-error">No se pudo actualizar el saldo.${prev?.consultado_at?`<br><br>Último saldo válido: <b>${money(prev.balance)}</b> · ${esc(phase31Ago(prev.consultado_at))}`:''}</div>`;
      return;
    }
    phase31RenderSaldo(modal.body,ctx,r);
    btn.dataset.saldoLast=r.consultado_at||r.ultima_consulta||'';
  }catch(e){modal.body.innerHTML=`<div class="ena10-error">${esc(e.message||e)}</div>`}
  finally{btn.disabled=false;btn.textContent=old}
};
async function phase31EnhanceSaldoButtons(v){
  const buttons=[...v.querySelectorAll('[data-ena-saldo]')];
  const nums=[...new Set(buttons.map(b=>Number(b.dataset.enaSaldo)).filter(Boolean))];
  if(!nums.length)return;
  let rows=[];
  try{rows=await rpc('panapass_saldo_disponibilidad',{p_panapass:nums})}catch(e){console.warn('Saldo disponibilidad',e);return}
  const map=new Map((rows||[]).map(x=>[String(x.panapass_numero),x]));
  buttons.forEach(b=>{
    const d=map.get(String(b.dataset.enaSaldo)),cell=b.parentElement;
    b.classList.remove('ca6-disabled');b.disabled=false;b.textContent='Consultar saldo';b.title='Consultar saldo actual';
    b.onclick=()=>phase6ConsultarSaldoENA(b.dataset.enaSaldo,b);
    const oldAge=cell?.querySelector('.ena-age');if(oldAge)oldAge.remove();
    let info=cell?.querySelector('[data-saldo-express-info]');
    if(!info&&cell){info=document.createElement('span');info.setAttribute('data-saldo-express-info','');cell.appendChild(info)}
    if(!info)return;
    if(d?.saldo_ultima_consulta){
      info.style.display='block';
      const age=Number(d.edad_segundos||0),mins=Math.floor(age/60);
      info.className=age>=120?'saldo-express-age':'saldo-express-fresh';
      info.textContent=age>=120?`⚠ Última consulta hace ${mins} min`:`Última: ${phase31Ago(d.saldo_ultima_consulta)}`;
    }else{
      info.textContent='';info.style.display='none';
    }
  });
  const negTable=v.querySelector('.phase3-neg-table');
  if(negTable){
    negTable.querySelectorAll('th').forEach(th=>{
      const t=norm(th.textContent);
      if(t==='SALDO')th.textContent='Saldo AM';
      if(['SALDO ENA','SALDO EXPRESS','ENA'].includes(t))th.textContent='Saldo actual';
    });
  }else{
    v.querySelectorAll('th').forEach(th=>{if(['SALDO ENA','SALDO EXPRESS','ENA'].includes(norm(th.textContent)))th.textContent='Saldo actual'});
  }
}
