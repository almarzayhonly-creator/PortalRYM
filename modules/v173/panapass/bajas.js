(() => {
  'use strict';
  const app = window.RYM173;
  if (!app) throw new Error('V173 bootstrap missing');
  const contracts = () => app.registry.get('panapass-contracts');
  const rpc = () => app.registry.get('rpc');
  const norm = v => String(v ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

  async function load() {
    const rows = await rpc().call(contracts().sources.bajas);
    return Object.freeze((rows || []).map(contracts().bajaRow));
  }

  function filter(rows, opts = {}) {
    const c=contracts(), g=norm(opts.galera), e=norm(opts.empresa), q=norm(opts.search), st=norm(opts.status), saldo=norm(opts.saldo);
    return Object.freeze((rows || []).map(c.bajaRow).filter(r =>
      (!g || norm(r.galera)===g) && (!e || norm(r.empresa)===e) &&
      (!q || norm([r.unidad,r.placa,r.panapass,r.tags.join(' '),r.empresa,r.galera].join(' ')).includes(q)) &&
      (!st || c.bajaStatus(r)===st) &&
      (!saldo || (saldo==='POSITIVO'?r.saldo>0:saldo==='NEGATIVO'?r.saldo<0:r.saldo===0))));
  }

  function summary(rows) {
    const c=contracts(), list=(rows || []).map(c.bajaRow), actionable=list.filter(r=>r.cantidadTags>0);
    return Object.freeze({ unidades:list.length, pendientes:actionable.length, tags:actionable.reduce((a,r)=>a+r.cantidadTags,0), saldo:actionable.reduce((a,r)=>a+r.saldo,0), revisionAdmin:list.filter(r=>r.alertaAdmin).length, devolucion:actionable.filter(r=>r.saldo>0).length });
  }

  function status(row) { return contracts().bajaStatus(row); }

  function enaContext(row, extra = {}) {
    const r=contracts().bajaRow(row);
    if (!r.unidad || !r.placa || !r.panapass) throw new Error('ENA: faltan datos obligatorios');
    return Object.freeze({ unidad:r.unidad, placa:r.placa, empresa:r.empresa, cuentaOrigen:r.panapass, saldo:r.saldo, motivo:`Transferencia de saldo por baja de Panapass - placa ${r.placa}`, telefono:'', firmante:null, ...extra });
  }

  app.register('panapass-bajas', { load, filter, summary, status, enaContext });
})();
