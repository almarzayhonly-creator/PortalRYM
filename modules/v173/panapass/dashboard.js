(() => {
  'use strict';
  const app=window.RYM173;if(!app)throw new Error('V173 bootstrap missing');
  const contracts=()=>app.registry.get('panapass-contracts');
  const rpc=()=>app.registry.get('rpc');
  const money=v=>`B/. ${Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  async function load(){
    const c=contracts();
    const [summary,galeras]=await Promise.all([
      rpc().call(c.sources.dashboard),
      rpc().call(c.sources.galeras).catch(()=>[])
    ]);
    if(!summary?.[0])throw new Error('Dashboard Panapass sin respuesta.');
    return Object.freeze({
      summary:c.dashboardRow(summary[0]),
      galeras:Object.freeze((galeras||[]).map(c.galeraRow))
    });
  }

  async function render(root,context={}){
    const data=await load(),d=data.summary;
    root.innerHTML=`<section class="v173-panel">
      <header><div><h2>Dashboard Panapass</h2><p>Corte ${esc(d.fecha||'actual')} · datos según tu alcance.</p></div></header>
      <div class="v173-kpis v173-kpis--wide">
        <button type="button" data-open-tab="negativos"><span>Negativos AM</span><b>${d.negativos}</b><small>Punto de partida</small></button>
        <button type="button" data-open-tab="pagos"><span>Pagos hoy</span><b>${d.pagos}</b><small>Trabajo procesado</small></button>
        <article><span>Unidades visibles</span><b>${d.unidades}</b><small>Flota bajo alcance</small></article>
        <button type="button" data-open-tab="recurrentes"><span>Recurrentes mes</span><b>${d.recurrentes}</b><small>5+ pagos</small></button>
      </div>
      <div class="v173-panapass-money"><span>Pagado este mes</span><strong>${money(d.montoMes)}</strong></div>
      ${data.galeras.length?`<div class="v173-galera-grid">${data.galeras.map(g=>`<article><header><b>${esc(g.galera)}</b><span>${g.unidades} unidades</span></header><dl><div><dt>Negativos</dt><dd>${g.negativos}</dd></div><div><dt>Pagadas</dt><dd>${g.pagadas}</dd></div><div><dt>Saldo negativo</dt><dd>${money(g.saldoNegativo)}</dd></div><div><dt>Monto pagado</dt><dd>${money(g.montoPagado)}</dd></div></dl></article>`).join('')}</div>`:''}
    </section>`;
    root.querySelectorAll('[data-open-tab]').forEach(b=>b.onclick=()=>context.openTab?.(b.dataset.openTab));
  }

  app.register('panapass-dashboard',{load,render});
})();
