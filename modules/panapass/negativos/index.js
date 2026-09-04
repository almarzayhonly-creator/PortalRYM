/* Portal RYM Architecture V2 - Panapass Negativos data module */
(function(w){
  'use strict';
  if(w.RYM_PANAPASS_NEGATIVOS) return;

  const SOURCE='panapass_portal_negativos_actual';
  const text=v=>String(v??'').trim();
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const norm=v=>text(v).toUpperCase();

  function isModuleContext(value){
    return !!(value&&typeof value==='object'&&value.api&&value.session);
  }

  function contextFrom(input){
    if(isModuleContext(input)) return input;
    if(input&&isModuleContext(input.context)) return input.context;
    if(w.RYM_CONTEXT&&typeof w.RYM_CONTEXT.create==='function') return w.RYM_CONTEXT.create('panapass-negativos');
    return null;
  }

  function requireContext(input){
    const context=contextFrom(input);
    if(!context) throw new Error('Negativos Panapass: RYM_CONTEXT no disponible');
    if(typeof context.api?.panapass?.negativosActual!=='function') throw new Error('Negativos Panapass: API negativosActual no disponible');
    return context;
  }

  function todayPanama(now){
    const date=now instanceof Date?now:new Date();
    const p=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Panama',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).reduce((a,x)=>(a[x.type]=x.value,a),{});
    return `${p.year}-${p.month}-${p.day}`;
  }

  function canonicalRow(row){
    if(!row||typeof row!=='object') throw new Error('Negativos Panapass: fila invalida');
    return Object.freeze({
      fecha:text(row.fecha??row.fecha_pago??row.fecha_negativo).slice(0,10),
      galera:norm(row.galera),
      supervisora:text(row.supervisora??row.supervisora_nombre),
      unidad:norm(row.unidad),
      monto:num(row.monto??row.negativo??row.saldo??row.valor),
      raw:row
    });
  }

  function buildParams(opts={}){
    const fecha=text(opts.fecha)||todayPanama(opts.now);
    const params={fecha};
    if(text(opts.galera))params.galera=norm(opts.galera);
    if(text(opts.supervisora))params.supervisora=text(opts.supervisora);
    return Object.freeze(params);
  }

  async function load(ctx,opts={}){
    const context=requireContext(ctx);
    const params=buildParams(opts);
    const rows=await context.api.panapass.negativosActual(params);
    return Object.freeze((Array.isArray(rows)?rows:[]).map(canonicalRow));
  }

  function model(rows,opts={}){
    const q=norm(opts.search),galera=norm(opts.galera),sup=norm(opts.supervisora);
    const visible=(rows||[]).map(canonicalRow).filter(r=>(!galera||r.galera===galera)&&(!sup||norm(r.supervisora)===sup)&&(!q||norm([r.unidad,r.galera,r.supervisora].join(' ')).includes(q)));
    return Object.freeze({
      rows:Object.freeze(visible),
      count:visible.length,
      monto:visible.reduce((a,r)=>a+r.monto,0),
      unidades:new Set(visible.map(r=>r.unidad).filter(Boolean)).size
    });
  }

  async function open(ctx={}){
    const context=requireContext(ctx);
    const rows=ctx.rows?Object.freeze(ctx.rows.map(canonicalRow)):await load(context,ctx);
    return model(rows,ctx);
  }

  const api=Object.freeze({SOURCE,todayPanama,canonicalRow,buildParams,load,model,open});
  w.RYM_PANAPASS_NEGATIVOS=api;
  if(w.RYM_MODULES&&!w.RYM_MODULES.has('panapass-negativos'))w.RYM_MODULES.register('panapass-negativos',{open});
})(window);
