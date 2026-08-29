/* V31: saldo rapido por LogisticTodo. ENA queda reservado para TAG/datos completos. */
function phase31Ago(iso){
  if(!iso)return 'sin consulta previa';
  const t=new Date(iso).getTime();
  if(!Number.isFinite(t))return 'sin consulta previa';
  const s=Math.max(0,Math.floor((Date.now()-t)/1000));
  if(s<60)return `hace ${s} s`;
  const m=Math.floor(s/60);if(m<60)return `hace ${m} min`;
  const h=Math.floor(m/60);return `hace ${h} h`;
}
function phase31SaldoModal(ctx){
  const modal=phase10SaldoModal(ctx);
  const h=modal.body?.closest?.('.ena10-card')?.querySelector?.('.ena10-head h2');
  const small=modal.body?.closest?.('.ena10-card')?.querySelector?.('.ena10-head small');
  if(h)h.textContent=`Consulta de saldo${ctx.unidad?' · '+ctx.unidad:''}`;
  if(small)small.textContent=`Panapass ${ctx.panapass||''}`;
  return modal;
}
function phase31RenderSaldo(body,ctx,r){
  const n=Number(r?.balance);
  const valid=Number.isFinite(n);
  const display=valid?money(n):'N/D';
  const initial=phase10SaldoNumber(ctx.saldoInicial);
  const positive=valid&&n>=0,negative=valid&&n<0;
  const balanceClass=positive?'positive':negative?'negative':'';
  const status=positive?'Saldo actual cubierto':negative?'La cuenta continúa con saldo negativo':'Saldo consultado';
  const statusClass=positive?'good':negative?'bad':'';
  const age=Number(r?.edad_segundos||0);
  const ageMin=Math.floor(age/60);
  const freshness=age>=600
    ? `⚠ Consulta con ${ageMin} min de antigüedad. Actualiza el saldo.`
    : `${r?.cached?'Última consulta':'Consulta realizada ahora'} · ${phase31Ago(r?.consultado_at)}`;
  const freshClass=age>=600?'saldo-express-age':'saldo-express-fresh';
  body.innerHTML=`<div class="ena10-balance ${balanceClass}"><span>Saldo actual</span><strong>${esc(display)}</strong></div><div class="ena10-status ${statusClass}">${esc(status)}</div><div class="ena10-meta"><div><span>Unidad</span><b>${esc(ctx.unidad||'—')}</b></div><div><span>Panapass</span><b>${esc(ctx.panapass||'—')}</b></div><div><span>Saldo negativo AM</span><b>${initial==null?esc(ctx.saldoInicial||'—'):money(initial)}</b></div><div><span>Supervisora / Galera</span><b>${esc([ctx.supervisora,ctx.galera].filter(Boolean).join(' · ')||'—')}</b></div></div><span class="${freshClass}">${esc(freshness)}</span>`;
}
phase6ConsultarSaldoENA=async function(panapass,btn){
  if(!panapass||btn.disabled)return;
  const ctx=phase10SaldoContext(btn,panapass),modal=phase31SaldoModal(ctx),old=btn.textContent;
  btn.disabled=true;btn.textContent='Consultando...';
  try{
    const {data}=await req('/functions/v1/ena-consulta-saldo',{method:'POST',body:JSON.stringify({panapass:Number(panapass)})});
    const r=data?.results?.[0];
    if(!data?.ok||!r)throw Error(data?.error||'No se pudo consultar el saldo.');
    if(!r.ok){
      const prev=r?.previous;
      modal.body.innerHTML=`<div class="ena10-error">No se pudo actualizar el saldo: ${esc(r.error||'respuesta no disponible')}${prev?.consultado_at?`<br><br>Último saldo válido: <b>${money(prev.balance)}</b> · ${esc(phase31Ago(prev.consultado_at))}`:''}</div>`;
      return;
    }
    phase31RenderSaldo(modal.body,ctx,r);
    btn.dataset.saldoLast=r.consultado_at||'';
  }catch(e){modal.body.innerHTML=`<div class="ena10-error">${esc(e.message||e)}</div>`}
  finally{btn.disabled=false;btn.textContent=old}
};

async function phase31EnhanceSaldoButtons(v){
  const buttons=[...v.querySelectorAll('[data-ena-saldo]')];
  const nums=[...new Set(buttons.map(b=>Number(b.dataset.enaSaldo)).filter(Boolean))];
  if(!nums.length)return;
  let rows=[];
  try{rows=await rpc('panapass_saldo_disponibilidad',{p_panapass:nums})}catch(e){console.warn('Saldo Express disponibilidad',e);return}
  const map=new Map((rows||[]).map(x=>[String(x.panapass_numero),x]));
  buttons.forEach(b=>{
    const d=map.get(String(b.dataset.enaSaldo));
    const cell=b.parentElement;
    b.classList.remove('ca6-disabled');
    b.disabled=false;
    b.textContent='Consultar saldo';
    b.title='Consultar saldo actual';
    b.onclick=()=>phase6ConsultarSaldoENA(b.dataset.enaSaldo,b);
    const oldAge=cell?.querySelector('.ena-age');if(oldAge)oldAge.remove();
    let info=cell?.querySelector('[data-saldo-express-info]');
    if(!info&&cell){info=document.createElement('span');info.setAttribute('data-saldo-express-info','');cell.appendChild(info)}
    if(!info)return;
    if(d?.saldo_ultima_consulta){
      const age=Number(d.edad_segundos||0),mins=Math.floor(age/60);
      info.className=age>=600?'saldo-express-age':'saldo-express-fresh';
      info.textContent=age>=600?`⚠ Última consulta hace ${mins} min`:`Última: ${phase31Ago(d.saldo_ultima_consulta)}`;
    }else{
      info.className='muted';info.textContent='';info.style.display='none';
    }
  });
  v.querySelectorAll('th').forEach(th=>{if(['ENA','SALDO ENA','SALDO EXPRESS'].includes(norm(th.textContent)))th.textContent='Saldo actual'});
}

const _phase31Negativos=negativos;
negativos=async function(v){
  await _phase31Negativos(v);
  await phase31EnhanceSaldoButtons(v);
  const obs=new MutationObserver(()=>{clearTimeout(obs._t);obs._t=setTimeout(()=>phase31EnhanceSaldoButtons(v),80)});
  obs.observe(v,{childList:true,subtree:true});
};
