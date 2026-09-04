/* Portal RYM Architecture V2 - Panapass Ranking */
(function(w){
  'use strict';
  if(w.RYM_PANAPASS_RANKING) return;

  const SOURCE='panapass_ranking_pagos';
  const PERIODS=Object.freeze(['DIA','MES']);
  const ADMIN_ROLES=Object.freeze(['ADMIN_TOTAL','ADMIN','SISTEMA','PAGADOR']);
  const money=n=>Number.isFinite(Number(n))?Number(n):0;
  const text=v=>String(v??'').trim();
  const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function isModuleContext(value){
    return !!(value&&typeof value==='object'&&value.api&&value.session);
  }

  function contextFrom(input){
    if(isModuleContext(input)) return input;
    if(input&&isModuleContext(input.context)) return input.context;
    if(input&&isModuleContext(input.rymContext)) return input.rymContext;
    if(w.RYM_CONTEXT&&typeof w.RYM_CONTEXT.create==='function') return w.RYM_CONTEXT.create('panapass-ranking');
    return null;
  }

  function requireContext(input){
    const context=contextFrom(input);
    if(!context) throw new Error('Ranking Panapass: RYM_CONTEXT no disponible');
    if(!context.api?.panapass?.ranking) throw new Error('Ranking Panapass: API de ranking no disponible');
    return context;
  }

  function sessionProfile(input){
    const context=contextFrom(input);
    return input?.profile||context?.session?.profile||{};
  }

  function sessionRole(input){
    const context=contextFrom(input);
    const profile=sessionProfile(input);
    return text(input?.role||context?.session?.role||profile?.rol).toUpperCase();
  }

  function canonicalRow(row){
    if(!row||typeof row!=='object') throw new Error('Ranking Panapass: fila invalida');
    return Object.freeze({
      id:text(row.supervisora_id??row.id),
      supervisora:text(row.supervisora_nombre??row.supervisora)||'SIN SUPERVISORA',
      galera:text(row.galera),
      unidades:Math.max(0,Number(row.unidades_pagadas??row.unidades)||0),
      monto:money(row.monto_pagado??row.monto),
      posicionGalera:Math.max(0,Number(row.posicion_galera??row.posicionGalera)||0),
      totalGalera:Math.max(0,Number(row.total_galera??row.totalGalera)||0),
      posicionGlobal:Math.max(0,Number(row.posicion_global??row.posicionGlobal)||0),
      totalGlobal:Math.max(0,Number(row.total_global??row.totalGlobal)||0),
      fechaDesde:text(row.fecha_desde??row.fechaDesde),
      racha:Math.max(0,Number(row.racha)||0),
      raw:row
    });
  }

  function sortRows(rows,metric='unidades'){
    const list=(rows||[]).map(canonicalRow);
    const byMonto=String(metric).toLowerCase()==='monto';
    list.sort((a,b)=>byMonto
      ? a.monto-b.monto || a.unidades-b.unidades || a.supervisora.localeCompare(b.supervisora,'es')
      : a.unidades-b.unidades || a.monto-b.monto || a.supervisora.localeCompare(b.supervisora,'es'));
    return list.map((r,i)=>Object.freeze({...r,posicion:i+1}));
  }

  function normalizeDataset(input={}){
    return Object.freeze({
      DIA:Object.freeze((input.DIA||input.dia||[]).map(canonicalRow)),
      MES:Object.freeze((input.MES||input.mes||[]).map(canonicalRow))
    });
  }

  async function load(ctx){
    const context=requireContext(ctx);
    const [dia,mes]=await Promise.all([
      context.api.panapass.ranking('DIA'),
      context.api.panapass.ranking('MES')
    ]);
    return normalizeDataset({DIA:dia||[],MES:mes||[]});
  }

  function galeras(dataset){
    const d=normalizeDataset(dataset);
    return [...new Set([...d.DIA,...d.MES].map(x=>x.galera).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  }

  function initialGalera(dataset,ctx={}){
    const d=normalizeDataset(dataset),gals=galeras(d);
    const profile=sessionProfile(ctx);
    const currentRole=sessionRole(ctx);
    if(ADMIN_ROLES.includes(currentRole))return 'TODAS';
    const me=d.DIA.find(x=>text(x.id)===text(profile?.supervisora_id));
    return me?.galera||gals[0]||'TODAS';
  }

  function selectRows(dataset,opts={}){
    const d=normalizeDataset(dataset);
    const period=String(opts.period||'DIA').toUpperCase()==='MES'?'MES':'DIA';
    const metric=String(opts.metric||'unidades').toLowerCase()==='monto'?'monto':'unidades';
    const galera=text(opts.galera||'TODAS');
    let rows=d[period].slice();
    if(galera&&galera!=='TODAS')rows=rows.filter(x=>x.galera===galera);
    return sortRows(rows,metric);
  }

  function model(dataset,opts={}){
    const period=String(opts.period||'DIA').toUpperCase()==='MES'?'MES':'DIA';
    const metric=String(opts.metric||'unidades').toLowerCase()==='monto'?'monto':'unidades';
    const galera=text(opts.galera||'TODAS');
    const sorted=selectRows(dataset,{period,metric,galera});
    return Object.freeze({period,metric,galera,rows:sorted,podio:sorted.slice(0,3),resto:sorted.slice(3)});
  }

  function valueLabel(row,metric){
    return metric==='monto' ? `B/. ${row.monto.toFixed(2)}` : `${row.unidades} unid.`;
  }
  function auxLabel(row,metric){return metric==='monto'?`${row.unidades} unid.`:`B/. ${row.monto.toFixed(2)}`}

  function podiumCard(row,metric,place){
    const medals=['🥇','🥈','🥉'];
    return `<article class="v171-rank-pod place-${place}" data-sup-id="${esc(row.id)}"><span class="v171-rank-medal">${medals[place-1]||''}</span><div><b>${esc(row.supervisora)}</b><small>${esc(row.galera||'')}</small></div><strong>${esc(valueLabel(row,metric))}<small>${esc(auxLabel(row,metric))}</small></strong></article>`;
  }
  function rankCard(row,metric){
    return `<article class="v171-rank-card" data-sup-id="${esc(row.id)}"><span class="v171-rank-num">#${row.posicion}</span><div class="v171-rank-name"><b>${esc(row.supervisora)}</b><small>${esc(row.galera||'')}</small></div><div class="v171-rank-stats"><strong>${esc(valueLabel(row,metric))}</strong><span>${esc(auxLabel(row,metric))}</span></div></article>`;
  }
  function pyramid(rows,metric){
    if(!rows.length)return '<div class="v171-rank-empty">Sin más posiciones.</div>';
    const tiers=[['Élite','elite',3],['Impulso','impulso',5],['Competencia','competencia',7],['Remontada','remontada',999]];
    let cursor=0;
    return `<section class="v171-rank-route"><header><div><h3>Ruta al podio</h3><p>Las posiciones avanzan por niveles hasta llegar al podio.</p></div><span>${rows.length+3} supervisoras · clasificación completa</span></header><div class="v171-rank-tiers">${tiers.map(([name,tone,size])=>{const slice=rows.slice(cursor,cursor+size);if(!slice.length)return'';const start=slice[0].posicion,end=slice[slice.length-1].posicion;cursor+=slice.length;return `<section class="v171-rank-tier ${tone}"><div class="v171-rank-tier-head"><b>${name}</b><span>Posiciones ${start}–${end}</span></div><div class="v171-rank-tier-grid">${slice.map(r=>rankCard(r,metric)).join('')}</div></section>`}).join('')}</div></section>`;
  }

  function render(target,dataset,opts={}){
    const host=typeof target==='string'?document.querySelector(target):target;
    if(!host) throw new Error('Ranking Panapass: contenedor no encontrado');
    const context=contextFrom(opts);
    const data=normalizeDataset(dataset),available=galeras(data);
    const selectedGalera=opts.galera||initialGalera(data,{...opts,context});
    const m=model(data,{...opts,galera:selectedGalera});
    const canAll=ADMIN_ROLES.includes(sessionRole({...opts,context}));
    const dayDate=data.DIA[0]?.fechaDesde||'';
    host.innerHTML=`<section class="v171-ranking" data-v171-ranking="1"><header class="v171-rank-head"><div><h2>Ranking Panapass</h2><p>Resultado de cobranza · menor resultado = mejor posición.</p></div><span class="v171-rank-source">${esc(SOURCE)}</span></header><div class="v171-rank-toolbar"><label>Galera<select data-rank-galera>${canAll?'<option value="TODAS">Todas las 4 galeras</option>':''}${available.map(g=>`<option value="${esc(g)}" ${g===m.galera?'selected':''}>${esc(g)}</option>`).join('')}</select></label><label>Periodo<select data-rank-period><option value="DIA" ${m.period==='DIA'?'selected':''}>Día / último cierre${dayDate?' · '+esc(dayDate):''}</option><option value="MES" ${m.period==='MES'?'selected':''}>Mes</option></select></label><div><span>Estadística</span><div class="v171-rank-switch"><button type="button" data-rank-metric="unidades" class="${m.metric==='unidades'?'active':''}">Menos unidades pagadas</button><button type="button" data-rank-metric="monto" class="${m.metric==='monto'?'active':''}">Menor monto pagado</button></div></div></div><div class="v171-rank-summary"><h3>Ranking · ${m.metric==='unidades'?'Menos unidades pagadas':'Menor monto pagado'}</h3><span>${m.rows.length} cobradoras · ${m.period==='DIA'?'último cierre':'mes'}</span></div><div class="v171-rank-podium">${m.podio.map((r,i)=>podiumCard(r,m.metric,i+1)).join('')||'<div class="v171-rank-empty">Sin datos para estos filtros.</div>'}</div>${pyramid(m.resto,m.metric)}</section>`;

    const rerender=next=>render(host,data,{...opts,context,galera:m.galera,period:m.period,metric:m.metric,...next});
    const g=host.querySelector('[data-rank-galera]');if(g){g.value=m.galera;g.onchange=()=>rerender({galera:g.value})}
    const p=host.querySelector('[data-rank-period]');if(p)p.onchange=()=>rerender({period:p.value});
    host.querySelectorAll('[data-rank-metric]').forEach(b=>b.onclick=()=>rerender({metric:b.dataset.rankMetric}));
    host.querySelectorAll('[data-sup-id]').forEach(el=>el.onclick=()=>{
      if(!el.dataset.supId)return;
      const open=context?.api?.panapass?.openSupervisoraProfile;
      if(typeof open==='function')open(el.dataset.supId);
    });
    return m;
  }

  async function open(ctx={}){
    const context=requireContext(ctx);
    const options=isModuleContext(ctx)?{}:ctx;
    const target=options.target||context.root||'#view';
    const host=typeof target==='string'?document.querySelector(target):target;
    if(!host)throw new Error('Ranking Panapass: contenedor no encontrado');
    if(!options.dataset&&!options.rows)host.innerHTML='<div class="card">Cargando ranking de pagos...</div>';
    const data=options.dataset
      ? normalizeDataset(options.dataset)
      : options.rows
        ? normalizeDataset({[String(options.period||'MES').toUpperCase()]:options.rows})
        : await load(context);
    return render(host,data,{...options,context});
  }

  const api=Object.freeze({SOURCE,PERIODS,ADMIN_ROLES,canonicalRow,sortRows,normalizeDataset,load,galeras,initialGalera,selectRows,model,render,open});
  w.RYM_PANAPASS_RANKING=api;
  if(w.RYM_MODULES&&!w.RYM_MODULES.has('panapass-ranking'))w.RYM_MODULES.register('panapass-ranking',{open});
})(window);
