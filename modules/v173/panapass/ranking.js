(() => {
  'use strict';
  const app = window.RYM173;
  if (!app) throw new Error('V173 bootstrap missing');
  const contracts = () => app.registry.get('panapass-contracts');
  const rpc = () => app.registry.get('rpc');

  function sort(rows, metric = 'unidades') {
    const row = contracts().rankingRow;
    const list = (rows || []).map(row);
    const byMonto = metric === 'monto';
    return list.sort((a,b) => byMonto ? a.monto-b.monto || a.unidades-b.unidades : a.unidades-b.unidades || a.monto-b.monto)
      .map((r,i) => Object.freeze({ ...r, posicion:i+1 }));
  }

  async function load(period = 'DIA') {
    const p = String(period).toUpperCase() === 'MES' ? 'MES' : 'DIA';
    const rows = await rpc().call(contracts().sources.ranking, { p_periodo:p });
    return Object.freeze((rows || []).map(contracts().rankingRow));
  }

  function model(rows, opts = {}) {
    const metric = opts.metric === 'monto' ? 'monto' : 'unidades';
    const galera = String(opts.galera || 'TODAS');
    let selected = (rows || []).map(contracts().rankingRow);
    if (galera !== 'TODAS') selected = selected.filter(r => r.galera === galera);
    const ranked = sort(selected, metric);
    return Object.freeze({ metric, galera, rows:Object.freeze(ranked), podio:Object.freeze(ranked.slice(0,3)), resto:Object.freeze(ranked.slice(3)) });
  }

  app.register('panapass-ranking', { load, sort, model });
})();
