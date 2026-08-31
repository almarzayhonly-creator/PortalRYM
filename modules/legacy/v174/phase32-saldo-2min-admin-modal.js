
/* V32: saldo máximo 2 min, modal limpio y consulta desde ficha ADMIN_TOTAL. */
function phase32ReadDetail(host,label){
  const items=[...(host?.querySelectorAll?.('.ca6-detail-item')||[])];
  const it=items.find(x=>norm(x.querySelector('span')?.textContent||'')===norm(label));
  return it?.querySelector('b')?.textContent?.trim()||'';
}
function phase32SaldoContext(btn,panapass){
  const base=phase10SaldoContext(btn,panapass)||{};
  const host=btn?.closest?.('#ca6UnitModal');
  return {
    panapass:String(panapass||base.panapass||''),
    unidad:btn?.dataset?.saldoUnidad||base.unidad||phase32ReadDetail(host,'Unidad'),
    placa:btn?.dataset?.saldoPlaca||phase32ReadDetail(host,'Placa única')||phase32ReadDetail(host,'Placa comercial'),
    tag:btn?.dataset?.saldoTag||phase32ReadDetail(host,'TAG principal'),
    saldoInicial:base.saldoInicial||'',
    supervisora:base.supervisora||'',galera:base.galera||''
  };
}
function phase31SaldoModal(ctx){
  const modal=phase10SaldoModal(ctx);
  const card=modal.body?.closest?.('.ena10-card');
  const h=card?.querySelector?.('.ena10-head h2');
  const small=card?.querySelector?.('.ena10-head small');
  if(h)h.textContent=`Consulta de saldo${ctx.unidad?' · '+ctx.unidad:''}`;
  if(small)small.textContent=`Panapass ${ctx.panapass||''}`;
  const loading=modal.body?.querySelector?.('.ena10-loading');if(loading)loading.innerHTML='<div><div class="ena10-spinner"></div>Consultando saldo...</div>';
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
  const freshness=stale?`⚠ Última consulta hace ${mins} min. Ya corresponde actualizar el saldo.`:(r?.cached?`Última consulta hace ${mins?mins+' min':secs+' s'}`:'Actualizado ahora');
  body.innerHTML=`<div class="ena10-balance ${balanceClass}"><span>Saldo actual</span><strong>${esc(display)}</strong></div><div class="ena10-status ${statusClass}">${esc(status)}</div><div class="ena10-meta"><div><span>Unidad</span><b>${esc(ctx.unidad||'—')}</b></div><div><span>Placa</span><b>${esc(ctx.placa||'—')}</b></div><div style="grid-column:1/-1"><span>TAG</span><b class="ena32-tag-main">${esc(tagText)}</b></div></div><div class="${stale?'ena32-stale':'ena32-fresh'}">${esc(freshness)}</div>`;
  if(typeof ca30AppendNoTag==='function')ca30AppendNoTag(body,ctx,r);
}
phase6ConsultarSaldoENA=async function(panapass,btn){
  if(!panapass||btn.disabled)return;
  const ctx=phase32SaldoContext(btn,panapass),modal=phase31SaldoModal(ctx),old=btn.textContent;
  btn.disabled=true;btn.textContent='Consultando...';
  try{
    const {data}=await req('/functions/v1/ena-consulta-saldo',{method:'POST',body:JSON.stringify({panapass:Number(panapass)})});
    const r=data?.results?.[0];if(!data?.ok||!r)throw Error(data?.error||'No se pudo consultar el saldo.');
    if(!r.ok){const prev=r?.previous;modal.body.innerHTML=`<div class="ena10-error">No se pudo actualizar el saldo.${prev?.consultado_at?`<br><br>Último saldo válido: <b>${money(prev.balance)}</b> · ${esc(phase31Ago(prev.consultado_at))}`:''}</div>`;return}
    phase31RenderSaldo(modal.body,ctx,r);btn.dataset.saldoLast=r.consultado_at||r.ultima_consulta||'';
  }catch(e){modal.body.innerHTML=`<div class="ena10-error">${esc(e.message||e)}</div>`}
  finally{btn.disabled=false;btn.textContent=old}
};
async function phase31EnhanceSaldoButtons(v){
  const buttons=[...v.querySelectorAll('[data-ena-saldo]')],nums=[...new Set(buttons.map(b=>Number(b.dataset.enaSaldo)).filter(Boolean))];if(!nums.length)return;
  let rows=[];try{rows=await rpc('panapass_saldo_disponibilidad',{p_panapass:nums})}catch(e){console.warn('Saldo disponibilidad',e);return}
  const map=new Map((rows||[]).map(x=>[String(x.panapass_numero),x]));
  buttons.forEach(b=>{const d=map.get(String(b.dataset.enaSaldo)),cell=b.parentElement;b.classList.remove('ca6-disabled');b.disabled=false;b.textContent='Consultar saldo';b.title='Consultar saldo actual';b.onclick=()=>phase6ConsultarSaldoENA(b.dataset.enaSaldo,b);const oldAge=cell?.querySelector('.ena-age');if(oldAge)oldAge.remove();let info=cell?.querySelector('[data-saldo-express-info]');if(!info&&cell){info=document.createElement('span');info.setAttribute('data-saldo-express-info','');cell.appendChild(info)}if(!info)return;if(d?.saldo_ultima_consulta){const age=Number(d.edad_segundos||0),mins=Math.floor(age/60);info.className=age>=120?'saldo-express-age':'saldo-express-fresh';info.textContent=age>=120?`⚠ Última consulta hace ${mins} min`:`Última: ${phase31Ago(d.saldo_ultima_consulta)}`}else{info.className='muted';info.textContent='Sin consulta reciente'}});
  v.querySelectorAll('th').forEach(th=>{if(norm(th.textContent)==='ENA'||norm(th.textContent)==='SALDO EXPRESS')th.textContent='Saldo'});
}
const _phase32OpenUnit=phase6OpenUnit;
phase6OpenUnit=function(r){
  _phase32OpenUnit(r);
  if(String(typeof role==='function'?role():'').toUpperCase()!=='ADMIN_TOTAL'||!r?.panapass_numero)return;
  const m=document.querySelector('#ca6UnitModal'),card=m?.querySelector('.ca6-ena-card'),sum=card?.querySelector('.table-summary');if(!sum||sum.querySelector('[data-ca32-saldo]'))return;
  const b=document.createElement('button');b.className='soft-btn ca32-saldo-action';b.textContent='Consultar saldo';b.setAttribute('data-ca32-saldo','');b.dataset.enaSaldo=String(r.panapass_numero);b.dataset.saldoUnidad=String(r.unidad||'');b.dataset.saldoPlaca=String(r.placa_unica||r.placa_comercial||'');b.dataset.saldoTag=String(r.tag||'');b.onclick=()=>phase6ConsultarSaldoENA(r.panapass_numero,b);sum.appendChild(b);
};
