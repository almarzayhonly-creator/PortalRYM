(() => {
  'use strict';
  const app = window.RYM173;
  if (!app) throw new Error('V173 bootstrap missing');
  const contracts = () => app.registry.get('panapass-contracts');
  const rpc = () => app.registry.get('rpc');
  const norm = v => String(v ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

  function monthRange(month) {
    const m = String(month || '').match(/^(\d{4})-(\d{2})$/);
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) throw new Error('Recurrentes Panapass: mes invalido');
    const year=Number(m[1]), mon=Number(m[2]), last=new Date(Date.UTC(year,mon,0)).getUTCDate();
    return Object.freeze({ desde:`${m[1]}-${m[2]}-01`, hasta:`${m[1]}-${m[2]}-${String(last).padStart(2,'0')}` });
  }

  async function load(opts = {}) {
    const range = monthRange(opts.month);
    const min = Math.min(20, Math.max(2, Math.floor(Number(opts.minPagos) || 5)));
    const rows = await rpc().call(contracts().sources.recurrentes, { p_desde:range.desde, p_hasta:range.hasta, p_galera:null, p_min_pagos:min, p_limit:2000 });
    return Object.freeze((rows || []).map(contracts().recurrenteRow));
  }

  function model(rows, opts = {}) {
    const mode = norm(opts.mode) === 'UNIDAD' ? 'UNIDAD' : 'OPERADOR';
    const q = norm(opts.search);
    const pageSize = Math.max(1, Math.floor(Number(opts.pageSize) || 25));
    const filtered = (rows || []).map(contracts().recurrenteRow).filter(r => r.tipo === mode && (!q || norm([r.identificador,r.nombre,r.unidad,r.supervisora,r.galera].join(' ')).includes(q)));
    const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
    const page=Math.min(pages,Math.max(1,Math.floor(Number(opts.page)||1)));
    return Object.freeze({ mode, count:filtered.length, critical:filtered.filter(r=>norm(r.nivel)==='CRITICO').length, total:filtered.reduce((a,r)=>a+r.total,0), page, pages, pageSize, rows:Object.freeze(filtered.slice((page-1)*pageSize,page*pageSize)) });
  }

  app.register('panapass-recurrentes-v173', { monthRange, load, model });
})();
