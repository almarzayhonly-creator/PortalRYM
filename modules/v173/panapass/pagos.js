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
    const rows=await rpc().call(c.sources.pagos,{p_fecha:opts.fecha||today(),p_galera:opts.galera||null,p_supervisora_id:opts.supervisoraId||null});
    return Object.freeze((rows||[]).map(c.pagoRow));
  }

  function model(rows,opts={}){
    const q=norm(opts.search);
    const visible=(rows||[]).map(contracts().pagoRow).filter(r=>!q||norm([r.unidad,r.panapass,r.galera,r.supervisora,r.empresa,r.operador,r.nOp,r.tipo,r.estadoCobra].join(' ')).includes(q));
    return Object.freeze({rows:Object.freeze(visible),count:visible.length,total:visible.reduce((a,r)=>a+r.aPagar,0),boleta:visible.reduce((a,r)=>a+r.boleta,0),maxPag7:visible.reduce((a,r)=>Math.max(a,r.pag7),0)});
  }

  async function render(root){
    root.innerHTML=`<section class="v173-panel"><header><div><h2>Pagos Panapass</h2><p>Pagos registrados según tu alcance.</p></div></header><div class="v173-toolbar"><label>Fecha<input data-pay-fecha type="date" value="${today()}"></label><label>Buscar<input data-pay-search placeholder="Unidad, operador, N_OP o supervisora"></label><button type="button" data-pay-go>Consultar</button></div><div data-pay-out class="v173-loading">Cargando…</div></section>`;
    const out=root.querySelector('[data-pay-out]');let rows=[];
    const paint=()=>{const m=model(rows,{search:root.querySelector('[data-pay-search]').value});out.innerHTML=`<div class="v173-kpis"><article><span>Pagos</span><b>${m.count}</b></article><article><span>Total pagado</span><b>${money(m.total)}</b></article><article><span>Total boleta</span><b>${money(m.boleta)}</b></article><article><span>Máx. pag. 7d</span><b>${m.maxPag7}</b></article></div><div class="v173-table-wrap"><table><thead><tr><th>Unidad</th><th>Panapass</th><th>Galera</th><th>Supervisora</th><th>Empresa</th><th>A pagar</th><th>Boleta</th><th>Pag. 7d</th><th>N_OP</th><th>Operador</th><th>Tipo</th><th>Cobra</th></tr></thead><tbody>${m.rows.map(r=>`<tr><td data-label="Unidad"><b>${esc(r.unidad)}</b></td><td data-label="Panapass">${esc(r.panapass)}</td><td data-label="Galera">${esc(r.galera)}</td><td data-label="Supervisora">${esc(r.supervisora||'SIN SUPERVISORA')}</td><td data-label="Empresa">${esc(r.empresa)}</td><td data-label="A pagar" class="v173-money-positive">${money(r.aPagar)}</td><td data-label="Boleta">${money(r.boleta)}</td><td data-label="Pag. 7d">${r.pag7}</td><td data-label="N_OP">${esc(r.nOp)}</td><td data-label="Operador">${esc(r.operador)}</td><td data-label="Tipo">${esc(r.tipo)}</td><td data-label="Cobra">${esc(r.estadoCobra||'PENDIENTE')}</td></tr>`).join('')||'<tr><td colspan="12">Sin datos.</td></tr>'}</tbody></table></div>`;};
    const reload=async()=>{out.className='v173-loading';out.textContent='Consultando…';try{rows=await load({fecha:root.querySelector('[data-pay-fecha]').value});out.className='';paint();}catch(e){out.className='v173-error';out.textContent=e.message||e;}};
    root.querySelector('[data-pay-go]').onclick=reload;
    root.querySelector('[data-pay-fecha]').onchange=reload;
    root.querySelector('[data-pay-search]').oninput=paint;
    await reload();
  }

  app.register('panapass-pagos',{load,model,render});
})();
