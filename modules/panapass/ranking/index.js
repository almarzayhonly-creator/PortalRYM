/* Portal RYM V171 - Panapass Ranking (parallel module, no legacy takeover) */
(function(w){
  'use strict';
  if(w.RYM_PANAPASS_RANKING) return;

  const money=n=>Number.isFinite(Number(n))?Number(n):0;
  const text=v=>String(v??'').trim();
  const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function canonicalRow(row){
    if(!row||typeof row!=='object') throw new Error('Ranking Panapass: fila invalida');
    return {
      supervisora:text(row.supervisora)||'SIN SUPERVISORA',
      galera:text(row.galera),
      unidades:Math.max(0,Number(row.unidades)||0),
      monto:money(row.monto),
      racha:Math.max(0,Number(row.racha)||0),
      meta:row.meta||null
    };
  }

  function sortRows(rows,metric='unidades'){
    const list=(rows||[]).map(canonicalRow);
    const byMonto=String(metric).toLowerCase()==='monto';
    list.sort((a,b)=>byMonto
      ? a.monto-b.monto || a.unidades-b.unidades || a.supervisora.localeCompare(b.supervisora,'es')
      : a.unidades-b.unidades || a.monto-b.monto || a.supervisora.localeCompare(b.supervisora,'es'));
    return list.map((r,i)=>({...r,posicion:i+1}));
  }

  function model(rows,opts={}){
    const metric=String(opts.metric||'unidades').toLowerCase()==='monto'?'monto':'unidades';
    const sorted=sortRows(rows,metric);
    return Object.freeze({metric,rows:sorted,podio:sorted.slice(0,3),resto:sorted.slice(3)});
  }

  function valueLabel(row,metric){
    return metric==='monto' ? `B/. ${row.monto.toFixed(2)}` : `${row.unidades} unidad${row.unidades===1?'':'es'}`;
  }

  function card(row,metric,place){
    return `<article class="v171-rank-pod place-${place}"><span class="v171-rank-place">#${row.posicion}</span><div><b>${esc(row.supervisora)}</b><small>${esc(row.galera||'')}</small></div><strong>${esc(valueLabel(row,metric))}</strong>${row.racha?`<em>🔥 ${row.racha} días</em>`:''}</article>`;
  }

  function listRow(row,metric){
    return `<div class="v171-rank-row"><span class="v171-rank-num">${row.posicion}</span><div class="v171-rank-name"><b>${esc(row.supervisora)}</b><small>${esc(row.galera||'')}</small></div><strong>${esc(valueLabel(row,metric))}</strong><span>${row.racha?`🔥 ${row.racha}`:'—'}</span></div>`;
  }

  function render(target,rows,opts={}){
    const host=typeof target==='string'?document.querySelector(target):target;
    if(!host) throw new Error('Ranking Panapass: contenedor no encontrado');
    const m=model(rows,opts);
    host.innerHTML=`<section class="v171-ranking" data-v171-ranking="1"><header class="v171-rank-head"><div><h2>Ranking Panapass</h2><p>Clasificación mensual. Menor resultado = mejor posición.</p></div><div class="v171-rank-switch"><button type="button" data-rank-metric="unidades" class="${m.metric==='unidades'?'active':''}">Menos unidades</button><button type="button" data-rank-metric="monto" class="${m.metric==='monto'?'active':''}">Menos monto</button></div></header><div class="v171-rank-podium">${m.podio.map((r,i)=>card(r,m.metric,i+1)).join('')}</div><div class="v171-rank-list">${m.resto.map(r=>listRow(r,m.metric)).join('')||'<div class="v171-rank-empty">Sin más posiciones.</div>'}</div></section>`;
    host.querySelectorAll('[data-rank-metric]').forEach(b=>b.onclick=()=>render(host,rows,{...opts,metric:b.dataset.rankMetric}));
    return m;
  }

  const api=Object.freeze({canonicalRow,sortRows,model,render});
  w.RYM_PANAPASS_RANKING=api;
  if(w.RYM_MODULES&&!w.RYM_MODULES.has('panapass-ranking')){
    w.RYM_MODULES.register('panapass-ranking',{open(ctx={}){return render(ctx.target,ctx.rows||[],ctx)}});
  }
})(window);
