(() => {
  'use strict';
  const app=window.RYM173;if(!app)throw new Error('V173 bootstrap missing');
  const contracts=()=>app.registry.get('panapass-contracts');
  const rpc=()=>app.registry.get('rpc');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>`B/. ${Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const today=()=>new Date().toISOString().slice(0,10);

  function params(opts={}){
    return Object.freeze({
      p_modo:opts.mode==='COBRA'?'COBRA':'ALL',
      p_unidad:opts.unidad||null,p_operador:opts.operador||null,
      p_desde:opts.desde||null,p_hasta:opts.hasta||null
    });
  }

  async function load(opts={}){
    const c=contracts(),p=params(opts),page=Math.max(1,Math.floor(Number(opts.page)||1)),pageSize=Math.min(200,Math.max(10,Math.floor(Number(opts.pageSize)||100)));
    const [summary,rows]=await Promise.all([
      rpc().call(c.sources.historialResumen,p),
      rpc().call(c.sources.historialLista,{...p,p_page:page,p_page_size:pageSize})
    ]);
    return Object.freeze({summary:c.historialResumen(summary?.[0]||{}),rows:Object.freeze((rows||[]).map(c.pagoRow)),page,pageSize});
  }

  async function render(root){
    const state={mode:'ALL',page:1,pageSize:100};
    root.innerHTML=`<section class="v173-panel"><header><div><h2>Historial Panapass</h2><p>Consulta paginada y pendientes de Cobra.</p></div><div class="v173-segment"><button type="button" data-hist-mode="ALL" class="active">Historial</button><button type="button" data-hist-mode="COBRA">Pendiente Cobra</button></div></header><div class="v173-toolbar v173-toolbar--history"><label>Unidad<input data-hist-unidad placeholder="Unidad"></label><label>Operador / N_OP<input data-hist-operador placeholder="Operador o número"></label><label>Desde<input data-hist-desde type="date" value="2025-01-01"></label><label>Hasta<input data-hist-hasta type="date" value="${today()}"></label><button type="button" data-hist-go>Buscar</button></div><div data-hist-out class="v173-loading">Cargando…</div></section>`;
    const out=root.querySelector('[data-hist-out]');
    const options=()=>({mode:state.mode,page:state.page,pageSize:state.pageSize,unidad:root.querySelector('[data-hist-unidad]').value,operador:root.querySelector('[data-hist-operador]').value,desde:root.querySelector('[data-hist-desde]').value,hasta:root.querySelector('[data-hist-hasta]').value});
    const reload=async(reset=false)=>{if(reset)state.page=1;out.className='v173-loading';out.textContent='Consultando…';try{const d=await load(options()),s=d.summary,pages=Math.max(1,Math.ceil(s.registros/d.pageSize));out.className='';out.innerHTML=`<div class="v173-kpis"><article><span>${state.mode==='COBRA'?'Pendientes':'Registros'}</span><b>${s.registros}</b></article><article><span>Unidades</span><b>${s.unidades}</b></article><article><span>Total</span><b>${money(s.total)}</b></article><article><span>Pendiente Cobra</span><b>${money(s.pendiente)}</b></article></div><div class="v173-pager"><span>Página ${d.page} de ${pages}</span><div><button type="button" data-hist-prev ${d.page<=1?'disabled':''}>← Anterior</button><button type="button" data-hist-next ${d.page>=pages?'disabled':''}>Siguiente →</button></div></div><div class="v173-table-wrap"><table><thead><tr><th>Fecha</th><th>Unidad</th><th>Panapass</th><th>A pagar</th><th>Boleta</th><th>N_OP</th><th>Operador</th><th>Cobrador</th><th>Tipo</th><th>Cobra</th></tr></thead><tbody>${d.rows.map(r=>`<tr><td data-label="Fecha">${esc(r.fecha)}</td><td data-label="Unidad"><b>${esc(r.unidad)}</b></td><td data-label="Panapass">${esc(r.panapass)}</td><td data-label="A pagar">${money(r.aPagar)}</td><td data-label="Boleta">${money(r.boleta)}</td><td data-label="N_OP">${esc(r.nOp)}</td><td data-label="Operador">${esc(r.operador)}</td><td data-label="Cobrador">${esc(r.cobrador)}</td><td data-label="Tipo">${esc(r.tipo)}</td><td data-label="Cobra">${esc(r.estadoCobra||'PENDIENTE')}</td></tr>`).join('')||'<tr><td colspan="10">Sin datos.</td></tr>'}</tbody></table></div>`;out.querySelector('[data-hist-prev]')?.addEventListener('click',()=>{state.page--;reload()});out.querySelector('[data-hist-next]')?.addEventListener('click',()=>{state.page++;reload()});}catch(e){out.className='v173-error';out.textContent=e.message||e;}};
    root.querySelectorAll('[data-hist-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.histMode;root.querySelectorAll('[data-hist-mode]').forEach(x=>x.classList.toggle('active',x===b));reload(true)});
    root.querySelector('[data-hist-go]').onclick=()=>reload(true);
    await reload(true);
  }

  app.register('panapass-historial',{params,load,render});
})();
