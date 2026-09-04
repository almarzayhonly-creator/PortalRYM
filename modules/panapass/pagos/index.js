/* Portal RYM Architecture V2 - Panapass Pagos data module */
(function(w){
  'use strict';
  if(w.RYM_PANAPASS_PAGOS) return;

  const SOURCE='panapass_dashboard_pagos_7d';
  const text=v=>String(v??'').trim();
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const norm=v=>text(v).toUpperCase();

  function isModuleContext(value){
    return !!(value&&typeof value==='object'&&value.api&&value.session);
  }

  function contextFrom(input){
    if(isModuleContext(input)) return input;
    if(input&&isModuleContext(input.context)) return input.context;
    if(w.RYM_CONTEXT&&typeof w.RYM_CONTEXT.create==='function') return w.RYM_CONTEXT.create('panapass-pagos');
    return null;
  }

  function requireContext(input){
    const context=contextFrom(input);
    if(!context) throw new Error('Pagos Panapass: RYM_CONTEXT no disponible');
    if(typeof context.api?.panapass?.pagos7d!=='function') throw new Error('Pagos Panapass: API pagos7d no disponible');
    return context;
  }

  function canonicalRow(row){
    if(!row||typeof row!=='object') throw new Error('Pagos Panapass: fila invalida');
    return Object.freeze({
      fecha:text(row.fecha??row.fecha_pago).slice(0,10),
      galera:norm(row.galera),
      unidad:norm(row.unidad),
      monto:num(row.a_pagar??row.monto??row.total_pagado??row.total),
      raw:row
    });
  }

  async function load(ctx){
    const context=requireContext(ctx);
    const rows=await context.api.panapass.pagos7d();
    return Object.freeze((Array.isArray(rows)?rows:[]).map(canonicalRow));
  }

  function model(rows){
    const list=(rows||[]).map(canonicalRow);
    const galeras=[...new Set(list.map(r=>r.galera).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    const fechas=[...new Set(list.map(r=>r.fecha).filter(Boolean))].sort();
    const unidades=[...new Set(list.map(r=>r.unidad).filter(Boolean))];
    const byGalera={};
    for(const galera of galeras){
      const items=list.filter(r=>r.galera===galera);
      byGalera[galera]=Object.freeze({
        rows:Object.freeze(items),
        monto:items.reduce((a,r)=>a+r.monto,0),
        unidades:new Set(items.map(r=>r.unidad).filter(Boolean)).size
      });
    }
    return Object.freeze({
      rows:Object.freeze(list),
      galeras:Object.freeze(galeras),
      fechas:Object.freeze(fechas),
      monto:list.reduce((a,r)=>a+r.monto,0),
      unidades:unidades.length,
      byGalera:Object.freeze(byGalera)
    });
  }

  async function open(ctx={}){
    const context=requireContext(ctx);
    const rows=ctx.rows?Object.freeze(ctx.rows.map(canonicalRow)):await load(context);
    return model(rows);
  }

  const api=Object.freeze({SOURCE,canonicalRow,load,model,open});
  w.RYM_PANAPASS_PAGOS=api;
  if(w.RYM_MODULES&&!w.RYM_MODULES.has('panapass-pagos'))w.RYM_MODULES.register('panapass-pagos',{open});
})(window);
