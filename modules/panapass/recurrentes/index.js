/* Portal RYM V171 - Panapass Recurrentes (parallel module, no legacy takeover) */
(function(w){
  'use strict';
  if(w.RYM_PANAPASS_RECURRENTES)return;

  const SOURCE='panapass_recurrentes_entidad';
  const MODES=Object.freeze(['OPERADOR','UNIDAD']);
  const PAGE_SIZE=25;
  const DEFAULT_MIN=5;
  const MAX_LIMIT=2000;
  const text=v=>String(v??'').trim();
  const num=v=>Number.isFinite(Number(v))?Number(v):0;
  const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

  function portalState(){try{return w.state||(typeof state!=='undefined'?state:null)}catch(_){return w.state||null}}
  function rpcFn(){
    try{
      const fn=w.rpc||(typeof rpc==='function'?rpc:null);
      if(typeof fn!=='function')throw new Error('Recurrentes Panapass: RPC no disponible');
      return fn;
    }catch(e){throw e instanceof Error?e:new Error('Recurrentes Panapass: RPC no disponible')}
  }

  function canonicalRow(row){
    if(!row||typeof row!=='object')throw new Error('Recurrentes Panapass: fila invalida');
    const tipo=norm(row.tipo_entidad||row.tipo);
    return Object.freeze({
      tipo:MODES.includes(tipo)?tipo:'UNIDAD',
      identificador:text(row.identificador),
      nombre:text(row.nombre),
      unidad:text(row.unidad),
      supervisora:text(row.supervisora),
      galera:text(row.galera),
      pagos:Math.max(0,num(row.pagos)),
      dias:Math.max(0,num(row.dias_con_pago??row.dias)),
      total:Math.max(0,num(row.total_pagado??row.total)),
      nivel:text(row.nivel)||'RECURRENTE',
      raw:row
    });
  }

  function defaultMonth(){
    const base=text(portalState()?.meta?.max_pago)||new Date().toISOString().slice(0,10);
    const m=base.match(/^(\d{4})-(\d{2})/);
    return m?`${m[1]}-${m[2]}`:new Date().toISOString().slice(0,7);
  }

  function monthRange(month){
    const m=text(month).match(/^(\d{4})-(\d{2})$/);
    if(!m)throw new Error('Recurrentes Panapass: mes invalido');
    const year=Number(m[1]),mon=Number(m[2]);
    if(mon<1||mon>12)throw new Error('Recurrentes Panapass: mes invalido');
    const desde=`${year}-${String(mon).padStart(2,'0')}-01`;
    const last=new Date(Date.UTC(year,mon,0)).getUTCDate();
    const hasta=`${year}-${String(mon).padStart(2,'0')}-${String(last).padStart(2,'0')}`;
    return Object.freeze({desde,hasta});
  }

  function buildParams(opts={}){
    const range=monthRange(opts.month||defaultMonth());
    const min=Math.min(20,Math.max(2,Math.floor(num(opts.minPagos)||DEFAULT_MIN)));
    return Object.freeze({p_desde:range.desde,p_hasta:range.hasta,p_galera:null,p_min_pagos:min,p_limit:MAX_LIMIT});
  }

  async function load(opts={}){
    const call=rpcFn(),params=buildParams(opts);
    const rows=await call(SOURCE,params);
    return Object.freeze((rows||[]).map(canonicalRow));
  }

  function filterRows(rows,opts={}){
    const mode=MODES.includes(norm(opts.mode))?norm(opts.mode):'OPERADOR';
    const q=norm(opts.search);
    return (rows||[]).map(canonicalRow).filter(r=>r.tipo===mode&&(!q||norm([r.identificador,r.nombre,r.unidad,r.supervisora,r.galera].join(' ')).includes(q)));
  }

  function model(rows,opts={}){
    const mode=MODES.includes(norm(opts.mode))?norm(opts.mode):'OPERADOR';
    const filtered=filterRows(rows,{...opts,mode});
    const size=Math.max(1,Math.floor(num(opts.pageSize)||PAGE_SIZE));
    const pages=Math.max(1,Math.ceil(filtered.length/size));
    const page=Math.min(pages,Math.max(1,Math.floor(num(opts.page)||1)));
    const pageRows=filtered.slice((page-1)*size,page*size);
    const critical=filtered.filter(x=>norm(x.nivel)==='CRITICO').length;
    const total=filtered.reduce((a,x)=>a+x.total,0);
    return Object.freeze({mode,rows:Object.freeze(filtered),pageRows:Object.freeze(pageRows),page,pages,pageSize:size,critical,total,count:filtered.length});
  }

  function rowHtml(r,mode){
    const main=mode==='OPERADOR'?(r.nombre||'Sin nombre'):(r.identificador||r.unidad||'—');
    const sub=mode==='OPERADOR'?`ID ${r.identificador||'—'}`:(r.galera||'');
    return `<tr><td class="v171-rec-name" data-label="${mode==='OPERADOR'?'Operador':'Unidad'}"><b>${esc(main)}</b><small>${esc(sub)}</small></td>${mode==='OPERADOR'?`<td data-label="Unidad">${esc(r.unidad||'—')}</td>`:''}<td data-label="Supervisora">${esc(r.supervisora||'—')}<small>${esc(r.galera||'')}</small></td><td class="v171-rec-metric" data-label="Frecuencia"><b>${r.pagos} pagos</b><small>${r.dias} días con pago</small></td><td data-label="Total"><b>B/. ${r.total.toFixed(2)}</b></td><td data-label="Nivel"><span class="v171-rec-level ${norm(r.nivel)==='CRITICO'?'critical':''}">${esc(r.nivel)}</span></td></tr>`;
  }

  function paint(host,rows,state){
    const m=model(rows,state),body=m.pageRows.map(r=>rowHtml(r,m.mode)).join('');
    host.innerHTML=`<div class="v171-rec-summary"><article><span>${m.mode==='OPERADOR'?'Operadores':'Unidades'} recurrentes</span><b>${m.count}</b></article><article class="bad"><span>Críticos · 8+ pagos</span><b>${m.critical}</b></article><article><span>Total pagado</span><b>B/. ${m.total.toFixed(2)}</b></article></div><section class="v171-rec-table"><div class="table-wrap"><table><thead><tr><th>${m.mode==='OPERADOR'?'Operador':'Unidad'}</th>${m.mode==='OPERADOR'?'<th>Unidad</th>':''}<th>Supervisora</th><th>Pagos / días</th><th>Total</th><th>Nivel</th></tr></thead><tbody>${body||`<tr><td colspan="${m.mode==='OPERADOR'?6:5}" class="empty">Sin resultados para estos filtros.</td></tr>`}</tbody></table></div><div class="v171-rec-pager"><span>${m.count?`${(m.page-1)*m.pageSize+1}–${Math.min(m.page*m.pageSize,m.count)} de ${m.count}`:'0 resultados'}</span><div><button type="button" data-rec-prev ${m.page===1?'disabled':''}>← Anterior</button><button type="button" data-rec-next ${m.page===m.pages?'disabled':''}>Siguiente →</button></div></div></section>`;
    host.querySelector('[data-rec-prev]')?.addEventListener('click',()=>{state.page=m.page-1;paint(host,rows,state)});
    host.querySelector('[data-rec-next]')?.addEventListener('click',()=>{state.page=m.page+1;paint(host,rows,state)});
    return m;
  }

  async function render(target,opts={}){
    const root=typeof target==='string'?document.querySelector(target):target;
    if(!root)throw new Error('Recurrentes Panapass: contenedor no encontrado');
    const initialMonth=opts.month||defaultMonth();
    root.innerHTML=`<section class="v171-rec"><div class="v171-rec-toolbar"><div class="v171-rec-mode"><button type="button" data-rec-mode="OPERADOR" class="active">Por operador</button><button type="button" data-rec-mode="UNIDAD">Por unidad</button></div><div class="field"><label>Mes</label><input data-rec-month type="month" value="${esc(initialMonth)}"></div><div class="field"><label>Mínimo de pagos</label><input data-rec-min type="number" min="2" max="20" value="${Math.min(20,Math.max(2,num(opts.minPagos)||DEFAULT_MIN))}"></div><button type="button" data-rec-go>Consultar</button></div><div class="field v171-rec-search"><label>Filtrar resultados</label><input data-rec-search placeholder="Unidad, operador o supervisora"></div><div data-rec-out><div class="card">Cargando recurrentes…</div></div></section>`;

    const out=root.querySelector('[data-rec-out]');
    const state={mode:'OPERADOR',search:'',page:1,pageSize:PAGE_SIZE};
    let rows=Object.freeze([]);
    const repaint=()=>paint(out,rows,state);
    const setMode=mode=>{state.mode=mode;state.page=1;root.querySelectorAll('[data-rec-mode]').forEach(b=>b.classList.toggle('active',b.dataset.recMode===mode));repaint()};
    const reload=async()=>{
      out.innerHTML='<div class="card">Analizando frecuencia…</div>';
      try{
        rows=opts.rows?Object.freeze(opts.rows.map(canonicalRow)):await load({month:root.querySelector('[data-rec-month]').value,minPagos:root.querySelector('[data-rec-min]').value});
        state.page=1;repaint();
      }catch(e){out.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`}
    };
    root.querySelectorAll('[data-rec-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.recMode));
    root.querySelector('[data-rec-go]').onclick=reload;
    root.querySelector('[data-rec-search]').oninput=e=>{state.search=e.target.value;state.page=1;repaint()};
    await reload();
    return {root,get rows(){return rows},state,reload};
  }

  const api=Object.freeze({SOURCE,MODES,PAGE_SIZE,DEFAULT_MIN,MAX_LIMIT,canonicalRow,defaultMonth,monthRange,buildParams,load,filterRows,model,paint,render,open:ctx=>render(ctx?.target||'#view',ctx||{})});
  w.RYM_PANAPASS_RECURRENTES=api;
  if(w.RYM_MODULES&&!w.RYM_MODULES.has('panapass-recurrentes'))w.RYM_MODULES.register('panapass-recurrentes',{open:api.open});
})(window);
