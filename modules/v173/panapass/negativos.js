(() => {
  'use strict';
  const app=window.RYM173;if(!app)throw new Error('V173 bootstrap missing');
  const contracts=()=>app.registry.get('panapass-contracts');
  const rpc=()=>app.registry.get('rpc');
  const norm=v=>String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>`B/. ${Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const today=()=>new Date().toISOString().slice(0,10);

  async function load(opts={}){
    const c=contracts();
    const rows=await rpc().call(c.sources.negativos,{p_fecha:opts.fecha||today(),p_galera:opts.galera||null,p_supervisora_id:opts.supervisoraId||null});
    return Object.freeze((rows||[]).map(c.negativoRow));
  }

  function model(rows,opts={}){
    const q=norm(opts.search);
    const visible=(rows||[]).map(contracts().negativoRow).filter(r=>!q||norm([r.unidad,r.placa,r.panapass,r.galera,r.supervisora,r.empresa].join(' ')).includes(q));
    const maxNeg7=visible.reduce((a,r)=>Math.max(a,r.neg7),0);
    return Object.freeze({rows:Object.freeze(visible),count:visible.length,saldo:visible.reduce((a,r)=>a+r.saldo,0),maxNeg7,riesgo:maxNeg7>=3?'ALERTA':maxNeg7===2?'CUIDADO':'OK'});
  }

  async function render(root){
    root.innerHTML=`<section class="v173-panel"><header><div><h2>Negativos Panapass</h2><p>Saldo AM y recurrencia negativa.</p></div></header><div class="v173-toolbar"><label>Fecha<input data-neg-fecha type="date" value="${today()}"></label><label>Buscar<input data-neg-search placeholder="Unidad, placa, empresa o supervisora"></label><button type="button" data-neg-go>Consultar</button></div><div data-neg-out class="v173-loading">Cargando…</div></section>`;
    const out=root.querySelector('[data-neg-out]');let rows=[];
    const paint=()=>{const m=model(rows,{search:root.querySelector('[data-neg-search]').value});out.innerHTML=`<div class="v173-kpis"><article><span>Unidades</span><b>${m.count}</b></article><article><span>Saldo total</span><b>${money(m.saldo)}</b></article><article><span>Máx. neg. 7d</span><b>${m.maxNeg7}</b></article><article><span>Riesgo</span><b>${m.riesgo}</b></article></div><div class="v173-table-wrap"><table><thead><tr><th>Estatus</th><th>Unidad</th><th>Placa</th><th>Panapass</th><th>Galera</th><th>Supervisora</th><th>Empresa</th><th>Neg. 7d</th><th>Saldo</th></tr></thead><tbody>${m.rows.map(r=>`<tr><td data-label="Estatus">${esc(r.status||'—')}</td><td data-label="Unidad"><b>${esc(r.unidad)}</b></td><td data-label="Placa">${esc(r.placa)}</td><td data-label="Panapass">${esc(r.panapass)}</td><td data-label="Galera">${esc(r.galera)}</td><td data-label="Supervisora">${esc(r.supervisora||'SIN SUPERVISORA')}</td><td data-label="Empresa">${esc(r.empresa)}</td><td data-label="Neg. 7d">${r.neg7}</td><td data-label="Saldo" class="v173-money-negative">${money(r.saldo)}</td></tr>`).join('')||'<tr><td colspan="9">Sin datos.</td></tr>'}</tbody></table></div>`;};
    const reload=async()=>{out.className='v173-loading';out.textContent='Consultando…';try{rows=await load({fecha:root.querySelector('[data-neg-fecha]').value});out.className='';paint();}catch(e){out.className='v173-error';out.textContent=e.message||e;}};
    root.querySelector('[data-neg-go]').onclick=reload;
    root.querySelector('[data-neg-fecha]').onchange=reload;
    root.querySelector('[data-neg-search]').oninput=paint;
    await reload();
  }

  app.register('panapass-negativos',{load,model,render});
})();
