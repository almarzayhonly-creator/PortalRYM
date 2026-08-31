
/* FASE 10: resultado de Consulta Saldo ENA en modal centrado */
function phase10SaldoContext(btn,panapass){
  const tr=btn?.closest?.('tr');
  const get=label=>tr?.querySelector?.(`[data-label="${label}"]`)?.textContent?.trim()||'';
  return {unidad:get('Unidad'),supervisora:get('Supervisora'),galera:get('Galera'),saldoInicial:get('Saldo'),panapass:String(panapass||'')};
}
function phase10SaldoNumber(text){
  const s=String(text??'').replace(/,/g,'');
  const ms=s.match(/-?\d+(?:\.\d+)?/g);
  if(!ms?.length)return null;
  const n=Number(ms[ms.length-1]);return Number.isFinite(n)?n:null;
}
function phase10SaldoModal(ctx){
  let m=document.querySelector('#ena10Modal');
  if(!m){m=document.createElement('div');m.id='ena10Modal';m.className='ena10-overlay';document.body.appendChild(m)}
  const close=()=>{m.style.display='none';m.innerHTML=''};
  m.style.display='flex';
  m.innerHTML=`<div class="ena10-card" role="dialog" aria-modal="true" aria-label="Consulta saldo ENA"><div class="ena10-head"><div><h2>Saldo ENA${ctx.unidad?` · ${esc(ctx.unidad)}`:''}</h2><small>Panapass ${esc(ctx.panapass||'')}</small></div><button class="ena10-x" type="button" aria-label="Cerrar">×</button></div><div class="ena10-body" data-ena10-body><div class="ena10-loading"><div><div class="ena10-spinner"></div>Consultando ENA...</div></div></div><div class="ena10-actions"><button class="soft-btn" type="button" data-ena10-close>Cerrar</button></div></div>`;
  m.querySelector('.ena10-x').onclick=close;m.querySelector('[data-ena10-close]').onclick=close;m.onclick=e=>{if(e.target===m)close()};
  const onKey=e=>{if(e.key==='Escape'){close();document.removeEventListener('keydown',onKey)}};document.addEventListener('keydown',onKey);
  return {body:m.querySelector('[data-ena10-body]'),close};
}
function phase10RenderSaldo(body,ctx,r){
  const raw=String(r?.summary?.saldo_texto??'').trim();
  const n=phase10SaldoNumber(raw);
  const display=n==null?(raw||'N/D'):money(n);
  const initial=phase10SaldoNumber(ctx.saldoInicial);
  const positive=n!=null&&n>=0,negative=n!=null&&n<0;
  const balanceClass=positive?'positive':negative?'negative':'';
  const status=positive?'Saldo actual cubierto en ENA':negative?'La cuenta continúa con saldo negativo':'Saldo consultado en ENA';
  const statusClass=positive?'good':negative?'bad':'';
  const next=r?.next_available_at?new Date(r.next_available_at):null;
  const mins=next&&Number.isFinite(next.getTime())?Math.max(0,Math.ceil((next.getTime()-Date.now())/60000)):0;
  const note=r.cached?`Última consulta ENA${r.ultima_consulta?` · ${phase6Ago(r.ultima_consulta)}`:''}${mins>0?` · Nueva consulta disponible en ${mins} min`:''}`:`Consulta realizada ahora${r.ultima_consulta?` · ${phase6Ago(r.ultima_consulta)}`:''} · Próxima consulta en 30 min`;
  const tags=Array.isArray(r?.tags)?r.tags.filter(t=>String(t?.tag||'').trim()):[];
  const tagBlock=tags.length
    ? `<div class="ena10-tags"><div class="ena10-tags-title">TAG ENA (${tags.length})</div><div class="ena10-tag-list">${tags.map(t=>`<span class="ena10-tag" title="${esc([t.estado,t.matricula].filter(Boolean).join(' · '))}">${esc(t.tag||'')}</span>`).join('')}</div></div>`
    : `<div class="ena10-tags"><div class="ena10-tags-title">TAG ENA</div><div class="muted">ENA no reportó TAG para esta cuenta.</div></div>`;
  body.innerHTML=`<div class="ena10-balance ${balanceClass}"><span>Saldo actual ENA</span><strong>${esc(display)}</strong></div><div class="ena10-status ${statusClass}">${esc(status)}</div><div class="ena10-meta"><div><span>Unidad</span><b>${esc(ctx.unidad||'—')}</b></div><div><span>Panapass</span><b>${esc(ctx.panapass||'—')}</b></div><div><span>Saldo negativo AM</span><b>${initial==null?esc(ctx.saldoInicial||'—'):money(initial)}</b></div><div><span>Supervisora / Galera</span><b>${esc([ctx.supervisora,ctx.galera].filter(Boolean).join(' · ')||'—')}</b></div></div>${tagBlock}<div class="ena10-note">${esc(note)}</div>`;
}
phase6ConsultarSaldoENA=async function(panapass,btn){
  if(!panapass||btn.disabled)return;
  const ctx=phase10SaldoContext(btn,panapass),modal=phase10SaldoModal(ctx),old=btn.textContent;
  btn.disabled=true;btn.textContent='Consultando...';
  try{
    const {data}=await req('/functions/v1/ena-consulta-saldo',{method:'POST',body:JSON.stringify({panapass:Number(panapass)})});
    const r=data?.results?.[0];
    if(!data?.ok||!r)throw Error(data?.error||'No se pudo consultar ENA.');
    if(r.error==='credential_not_configured'){
      btn.disabled=true;btn.textContent='Sin credencial';btn.classList.add('ca6-disabled');
      modal.body.innerHTML='<div class="ena10-error">Todavía no tenemos una credencial ENA activa para esta cuenta. No se realizó ninguna conexión a ENA.</div>';
      return;
    }
    if(!r.ok)throw Error(r.error||r.result||'ENA no devolvió saldo.');
    if(r.result==='BUSY'){
      modal.body.innerHTML='<div class="ena10-error" style="background:#fff8eb;border-color:#f6d79d;color:#8a5200">Ya existe una consulta de esta cuenta en proceso. Espera unos segundos y vuelve a intentar.</div>';
      return;
    }
    if(r.result!=='OK')throw Error(r.result||'ENA no devolvió saldo.');
    phase10RenderSaldo(modal.body,ctx,r);
  }catch(e){modal.body.innerHTML=`<div class="ena10-error">${esc(e.message||e)}</div>`}
  finally{
    if(!btn.classList.contains('ca6-disabled')){
      const last=btn.dataset.enaLast||'';
      const t=last?new Date(last).getTime():0;
      const remain=t?Math.max(0,1800000-(Date.now()-t)):0;
      if(remain>0){btn.disabled=true;btn.textContent=`Disponible en ${Math.ceil(remain/60000)} min`;}
      else{btn.disabled=false;btn.textContent=old}
    }
  }
};
