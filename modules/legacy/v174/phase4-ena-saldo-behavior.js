
/* FASE 4: consulta ENA desde Negativos */
async function phase4ConsultarSaldoENA(panapass,btn){
  if(!panapass)return;
  const old=btn.textContent;btn.disabled=true;btn.textContent='Consultando ENA...';
  let box=btn.parentElement.querySelector('.ena-saldo-box');
  if(!box){box=document.createElement('div');box.className='ena-saldo-box';btn.parentElement.appendChild(box)}
  box.innerHTML='Consultando saldo y TAG directamente en ENA...';
  try{
    const {data}=await req('/functions/v1/ena-consulta-saldo',{method:'POST',body:JSON.stringify({panapass:Number(panapass)})});
    const r=data?.results?.[0];
    if(!data?.ok||!r?.ok||r?.result!=='OK')throw Error(r?.error||r?.result||data?.error||'ENA no devolvió saldo.');
    const saldo=String(r?.summary?.saldo_texto??'').trim()||'N/D';
    const tags=Array.isArray(r.tags)?r.tags:[];
    box.innerHTML=`<b>Saldo ENA: ${esc(saldo)}</b><br>${tags.length?`TAG ENA (${tags.length}): ${tags.map(t=>esc(t.tag||'')).join(' · ')}`:'Sin TAG reportado por ENA'}<br><span class="muted">Consulta realizada ahora.</span>`;
  }catch(e){box.innerHTML=`<span style="color:var(--red)">${esc(e.message||e)}</span>`}
  finally{btn.disabled=false;btn.textContent=old}
}

negativos=async function(v){
  const [scope,units]=await Promise.all([phase3ScopeData(),rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:5000}).catch(()=>[])]),um=new Map((units||[]).map(x=>[norm(x.unidad),x]));
  const hoy=state.today?.fecha||new Date().toISOString().slice(0,10),minf=new Date(new Date(hoy+'T12:00:00').getTime()-45*86400000).toISOString().slice(0,10),maxf=hoy;
  v.innerHTML=`<div class="section-tools phase3-filterbar"><div class="field"><label>Fecha</label><input id="p3NegFecha" type="date" min="${minf}" max="${maxf}" value="${maxf}"></div>${phase3ScopeMarkup('p3Neg',scope)}<div class="field"><label>Buscar</label><input id="p3NegQ" placeholder="Unidad, Panapass, empresa o supervisora"></div><button id="p3NegGo">Consultar</button><button id="p3NegCapture" class="soft-btn">Vista captura</button></div><div id="p3NegOut"></div>`;
  phase3BindScope('p3Neg',scope);let last=[];
  const paint=()=>{
    const q=norm(document.querySelector('#p3NegQ').value),rows=q?last.filter(r=>norm([r.unidad,r.placa,r.panapass_numero,r.empresa,r.galera,r.supervisora].join(' ')).includes(q)):last;
    const total=rows.reduce((a,x)=>a+Number(x.saldo||0),0),mx=Math.max(0,...rows.map(x=>Number(x.neg7)||0));
    const body=rows.length?rows.map(r=>{const m=um.get(norm(r.unidad))||{};return `<tr><td data-label="Estatus">${v12Status(r.status||m.estatus)}</td><td data-label="Unidad">${v17UnitBadge(r.unidad,m.color)}</td><td data-label="Placa">${esc(r.placa||'')}</td><td data-label="Panapass">${esc(r.panapass_numero||'')}</td><td data-label="Galera">${esc(r.galera||'')}</td><td data-label="Supervisora"><b>${esc(r.supervisora||'SIN SUPERVISORA')}</b></td><td data-label="Empresa">${esc(r.empresa||'')}</td><td data-label="Neg. 7d">${chipNum(r.neg7)}</td><td data-label="Saldo" class="saldo">${money(r.saldo)}</td><td data-label="ENA"><button class="soft-btn ena-saldo-btn" data-ena-saldo="${esc(r.panapass_numero||'')}">Consultar saldo</button></td></tr>`}).join(''):`<tr><td colspan="10" class="empty">Sin datos.</td></tr>`;
    document.querySelector('#p3NegOut').innerHTML=`<div class="capture-title"><h2>Negativos Panapass · ${esc(document.querySelector('#p3NegFecha').value)}</h2><small>Saldo del negativo del día. Usa “Consultar saldo” para verificar ENA antes de cobrar.</small></div><div class="kpis"><div class="kpi"><span>Unidades</span><strong>${rows.length}</strong></div><div class="kpi"><span>Saldo total</span><strong style="color:var(--red)">${money(total)}</strong></div><div class="kpi"><span>Máx neg 7d</span><strong>${mx}</strong></div><div class="kpi"><span>Riesgo</span><strong>${mx>=3?'ALERTA':mx===2?'CUIDADO':'OK'}</strong></div></div><div class="panel phase3-panel mobile-cards"><div class="table-wrap"><table class="pretty phase3-fit-table phase3-neg-table"><thead><tr><th>Estatus</th><th>Unidad</th><th>Placa</th><th>Panapass</th><th>Galera</th><th>Supervisora</th><th>Empresa</th><th>Neg. 7d</th><th>Saldo</th><th>ENA</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
    document.querySelectorAll('[data-ena-saldo]').forEach(b=>b.onclick=()=>phase4ConsultarSaldoENA(b.dataset.enaSaldo,b));
  };
  const load=async()=>{const o=document.querySelector('#p3NegOut');o.innerHTML='<div class="card">Consultando...</div>';try{last=await rpc('panapass_negativos_fecha_v2',{p_fecha:document.querySelector('#p3NegFecha').value||null,...phase3ScopeBody('p3Neg')});paint()}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};
  document.querySelector('#p3NegGo').onclick=load;document.querySelector('#p3NegQ').oninput=paint;document.querySelector('#p3NegCapture').onclick=()=>document.body.classList.toggle('capture-mode');await load();
};
