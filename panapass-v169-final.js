/* Portal RYM V169 - Panapass final: ranking oficial + recurrentes por galera */
(function(){
  'use strict';

  const E=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const N=v=>typeof norm==='function'?norm(v):String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  const M=n=>Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const role=()=>N(typeof state!=='undefined'?state?.profile?.rol:'');
  const globalScope=()=>typeof isAdminRole==='function'?isAdminRole():['ADMIN_TOTAL','PAGADOR'].includes(role());

  if(!document.querySelector('#rym-v169-panapass-final-css')){
    const s=document.createElement('style');
    s.id='rym-v169-panapass-final-css';
    s.textContent=`
      .v169-rank-rule{margin:8px 0 12px;padding:9px 12px;border:1px solid #d7e4f2;border-radius:12px;background:#f7fbff;color:#526b88;font-size:9px;line-height:1.45}.v169-rank-rule b{color:#174a8b}
      .v169-rank-streak{display:inline-flex;margin-top:4px;padding:3px 6px;border-radius:999px;background:#edf7f2;color:#087553;font-size:8px;font-weight:900}
      .v169-rec-toolbar{display:grid;grid-template-columns:minmax(210px,1.25fr) repeat(3,minmax(135px,.58fr)) auto;gap:8px;align-items:end;margin-bottom:8px}.v169-rec-toolbar .field{margin:0}.v169-rec-toolbar button{min-height:37px!important;padding:7px 12px!important}.v169-rec-toolbar .v123-rec-mode{display:flex;gap:5px;align-items:center}.v169-rec-toolbar .v123-rec-mode button{flex:1;white-space:nowrap}
      .v169-rec-search{margin:0 0 8px!important}.v169-rec-context{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px;padding:7px 10px;border:1px solid #dbe5f0;border-radius:10px;background:#fbfdff;color:#66788f;font-size:8.5px}.v169-rec-context b{color:#174a8b}
      .v169-rec .v123-rec-summary{gap:7px;margin-bottom:8px}.v169-rec .v123-rec-summary article{padding:9px 11px!important;min-height:auto!important}.v169-rec .v123-rec-summary article span{font-size:8px!important}.v169-rec .v123-rec-summary article b{font-size:20px!important;margin-top:2px!important}.v169-rec .v123-rec-table th,.v169-rec .v123-rec-table td{padding:7px 8px!important}.v169-rec .v123-rec-name small,.v169-rec .v123-rec-metric small{margin-top:1px!important}.v169-rec .v123-rec-pager{padding:8px 10px!important}.v169-rec .v123-rec-pager button{min-height:30px!important;padding:5px 9px!important}
      @media(max-width:1000px){.v169-rec-toolbar{grid-template-columns:1fr 1fr 1fr}.v169-rec-toolbar .v123-rec-mode{grid-column:1/-1}.v169-rec-toolbar>button{width:100%}}
      @media(max-width:640px){.v169-rec-toolbar{grid-template-columns:1fr 1fr;gap:6px}.v169-rec-toolbar .v123-rec-mode,.v169-rec-toolbar>button{grid-column:1/-1}.v169-rec-context{align-items:flex-start;flex-direction:column}.v169-rec .v123-rec-summary{grid-template-columns:1fr 1fr!important}.v169-rec .v123-rec-summary article:last-child{grid-column:1/-1}}
    `;
    document.head.appendChild(s);
  }

  function rankCard169(x,rank,metric){
    const units=Number(x.unidades_pagadas||0),amount=Number(x.monto_pagado||0),streak=Number(x.racha_cero||0);
    return `<article class="v93-rank-card"><span class="v93-rank-num">#${rank}</span><div class="v93-rank-main"><b class="profile-link" data-sup-id="${E(x.supervisora_id||'')}">${E(x.supervisora_nombre||'')}</b><small>${E(x.galera||'')}</small></div><div class="v93-rank-stats"><span class="${metric==='UNIDADES'?'v93-rank-focus':''}"><strong>${units}</strong> unid.</span><span class="${metric==='MONTO'?'v93-rank-focus':''}"><strong>B/. ${M(amount)}</strong></span></div>${metric==='UNIDADES'?`<span class="v169-rank-streak">Racha 0 · ${streak} día${streak===1?'':'s'}</span>`:''}</article>`;
  }

  function rankingJourney169(rows,metric,positionKey){
    const rest=rows.slice(3);if(!rest.length)return '';
    const tiers=[['Élite','elite',3],['Impulso','impulso',5],['Competencia','competencia',7],['Remontada','remontada',99]];
    let cursor=0;
    const html=tiers.map(([name,tone,size])=>{
      const slice=rest.slice(cursor,cursor+size);if(!slice.length)return '';
      const startIndex=cursor+3;
      const ranks=slice.map((x,j)=>metric==='UNIDADES'?(Number(x[positionKey])||startIndex+j+1):(startIndex+j+1));
      const start=ranks[0],end=ranks[ranks.length-1];cursor+=slice.length;
      return `<section class="v124-rank-tier" data-tone="${tone}"><div class="v124-tier-head"><b>${name}</b><span>Posiciones ${start}–${end}</span></div><div class="v124-tier-grid" style="--tier-cols:${Math.min(slice.length,size===99?7:size)}">${slice.map((x,j)=>rankCard169(x,ranks[j],metric)).join('')}</div></section>`;
    }).join('');
    return `<section class="v124-rank-journey v126-ranking-ready"><div class="v124-rank-intro"><div><h3>Ruta al podio</h3><p>Las posiciones respetan el ranking oficial calculado en backend.</p></div><span>${rows.length} supervisoras · clasificación completa</span></div><div class="v124-pyramid">${html}</div></section>`;
  }

  async function ranking169(v){
    v.innerHTML='<div class="card">Cargando ranking...</div>';
    let dia=[],mes=[];
    try{
      [dia,mes]=await Promise.all([
        rpc('panapass_ranking_pagos',{p_periodo:'DIA'}),
        rpc('panapass_ranking_pagos',{p_periodo:'MES'})
      ]);
    }catch(e){v.innerHTML=`<div class="alert">${E(e.message||e)}</div>`;return}

    const all=[...(dia||[]),...(mes||[])],gals=[...new Set(all.map(x=>String(x.galera||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
    const mine=(dia||[]).find(x=>String(x.supervisora_id||'')===String(state?.profile?.supervisora_id||''));
    const initial=globalScope()?'TODAS':(mine?.galera||gals[0]||'TODAS');
    v.innerHTML=`<div class="section-tools"><div class="field"><label>Galera</label><select id="v93RGal">${globalScope()?'<option value="TODAS">Todas las 4 galeras</option>':'<option value="TODAS">Todo mi alcance</option>'}${gals.map(g=>`<option value="${E(g)}">${E(g)}</option>`).join('')}</select></div><div class="field"><label>Periodo</label><select id="v93RPer"><option value="DIA">Día / último cierre</option><option value="MES">Mes</option></select></div><div class="field" style="flex:2"><label>Estadística</label><div class="v92-rank-toggle"><button type="button" class="active" data-v93metric="UNIDADES">Menos unidades pagadas</button><button type="button" data-v93metric="MONTO">Menor monto pagado</button></div></div></div><div class="v169-rank-rule"><b>Orden oficial de cobranza:</b> menos unidades pagadas → mayor racha en 0 → menor acumulado de unidades del mes → menor monto acumulado. La pantalla ya no vuelve a ordenar alfabéticamente los empates.</div><div id="v93ROut"></div>`;

    let metric='UNIDADES';
    const gal=v.querySelector('#v93RGal'),per=v.querySelector('#v93RPer'),out=v.querySelector('#v93ROut');
    if([...gal.options].some(o=>o.value===initial))gal.value=initial;

    const draw=()=>{
      let rows=(per.value==='DIA'?(dia||[]):(mes||[])).slice();
      if(gal.value!=='TODAS')rows=rows.filter(x=>N(x.galera)===N(gal.value));
      const positionKey=gal.value==='TODAS'?'posicion_global':'posicion_galera';
      if(metric==='UNIDADES'){
        rows.sort((a,b)=>{
          const pa=Number(a[positionKey]||0),pb=Number(b[positionKey]||0);
          if(pa&&pb&&pa!==pb)return pa-pb;if(pa&&!pb)return -1;if(!pa&&pb)return 1;
          return Number(a.unidades_pagadas||0)-Number(b.unidades_pagadas||0)
            ||Number(b.racha_cero||0)-Number(a.racha_cero||0)
            ||Number(a.monto_pagado||0)-Number(b.monto_pagado||0)
            ||String(a.supervisora_nombre||'').localeCompare(String(b.supervisora_nombre||''),'es');
        });
      }else{
        rows.sort((a,b)=>Number(a.monto_pagado||0)-Number(b.monto_pagado||0)
          ||Number(a.unidades_pagadas||0)-Number(b.unidades_pagadas||0)
          ||String(a.supervisora_nombre||'').localeCompare(String(b.supervisora_nombre||''),'es'));
      }
      const med=['🥇','🥈','🥉'];
      const label=metric==='UNIDADES'?'Menos unidades pagadas':'Menor monto pagado';
      const periodLabel=per.value==='DIA'?'último cierre':'mes';
      const podium=rows.slice(0,3).map((x,i)=>{
        const rank=metric==='UNIDADES'?(Number(x[positionKey])||i+1):(i+1),units=Number(x.unidades_pagadas||0),amount=Number(x.monto_pagado||0),streak=Number(x.racha_cero||0);
        const value=metric==='UNIDADES'?`${units} unid.`:`B/. ${M(amount)}`,aux=metric==='UNIDADES'?`B/. ${M(amount)}`:`${units} unid.`;
        return `<div class="v93-pod p${i+1}"><div class="v93-medal">${med[i]}</div><div><div class="v93-pod-name profile-link" data-sup-id="${E(x.supervisora_id||'')}">${E(x.supervisora_nombre||'')}</div><div class="v93-pod-meta">#${rank} · ${E(x.galera||'')}${metric==='UNIDADES'?` · racha 0: ${streak}d`:''}</div></div><div class="v93-pod-value"><b>${value}</b><small>${aux}</small></div></div>`;
      }).join('');
      out.innerHTML=`<div class="v93-rank-head"><h3>Ranking · ${label}</h3><span>${rows.length} cobradoras · ${periodLabel}</span></div><div class="v93-podium">${podium}</div>${rankingJourney169(rows,metric,positionKey)}`;
      out.onclick=e=>{const el=e.target.closest('[data-sup-id]');if(el?.dataset.supId&&typeof openSupervisoraProfile==='function')openSupervisoraProfile(el.dataset.supId)};
    };

    gal.onchange=draw;per.onchange=draw;
    v.querySelectorAll('[data-v93metric]').forEach(b=>b.onclick=()=>{metric=b.dataset.v93metric;v.querySelectorAll('[data-v93metric]').forEach(x=>x.classList.toggle('active',x===b));draw()});
    draw();
  }

  function recurrentGaleraOptions169(){
    const all=['VCARS','VCOMP','VIPCO','VINDU'];
    if(globalScope())return ['TODAS',...all];
    const p=typeof state!=='undefined'?state?.profile||{}:{};
    const found=[];
    const push=v=>{String(v||'').split(/[,;|]/).map(x=>x.trim().toUpperCase()).filter(x=>all.includes(x)).forEach(x=>{if(!found.includes(x))found.push(x)})};
    push(p.galera);push(p.galera_scope);push(p.galeras_scope);if(Array.isArray(p.galeras))p.galeras.forEach(push);if(Array.isArray(p.galeras_scope))p.galeras_scope.forEach(push);
    return ['TODAS',...(found.length?found:all)];
  }

  async function recurrentes169(v){
    const base=state?.meta?.max_pago||new Date().toISOString().slice(0,10),d=new Date(base+'T12:00:00'),month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const gals=recurrentGaleraOptions169();
    v.innerHTML=`<section class="v123-rec v169-rec"><div class="v123-rec-toolbar v169-rec-toolbar"><div class="v123-rec-mode"><button id="v123RecOp" class="active">Por operador</button><button id="v123RecUnit">Por unidad</button></div><div class="field"><label>Mes</label><input id="v123RecMonth" type="month" value="${month}"></div><div class="field"><label>Galera</label><select id="v169RecGal">${gals.map(g=>`<option value="${g}">${g==='TODAS'?(globalScope()?'Todas las galeras':'Todo mi alcance'):g}</option>`).join('')}</select></div><div class="field"><label>Mínimo de pagos</label><input id="v123RecMin" type="number" min="2" max="20" value="5"></div><button id="v123RecGo">Consultar</button></div><div class="field v169-rec-search"><label>Filtrar resultados</label><input id="v123RecSearch" placeholder="Unidad, operador o supervisora"></div><div class="v169-rec-context" id="v169RecContext"><span>Analiza pagos repetidos por operador o por unidad.</span><b>Galera: Todo el alcance</b></div><div id="v123RecOut"><div class="card">Cargando recurrentes…</div></div></section>`;

    let mode='OPERADOR',all=[],page=1;const size=25,out=v.querySelector('#v123RecOut'),search=v.querySelector('#v123RecSearch'),gal=v.querySelector('#v169RecGal'),ctx=v.querySelector('#v169RecContext');
    const setMode=next=>{mode=next;page=1;v.querySelector('#v123RecOp').classList.toggle('active',mode==='OPERADOR');v.querySelector('#v123RecUnit').classList.toggle('active',mode==='UNIDAD');paint()};
    const paint=()=>{
      const q=N(search.value),rows=all.filter(x=>N(x.tipo_entidad)===mode&&(!q||N([x.identificador,x.nombre,x.unidad,x.supervisora,x.galera].join(' ')).includes(q))),pages=Math.max(1,Math.ceil(rows.length/size));page=Math.max(1,Math.min(page,pages));
      const slice=rows.slice((page-1)*size,page*size),critical=rows.filter(x=>N(x.nivel)==='CRITICO').length,total=rows.reduce((a,x)=>a+Number(x.total_pagado||0),0);
      const body=slice.map(r=>{const main=mode==='OPERADOR'?(r.nombre||'Sin nombre'):(r.identificador||r.unidad||'—'),sub=mode==='OPERADOR'?`ID ${r.identificador||'—'}`:(r.galera||'');return `<tr><td class="v123-rec-name" data-label="${mode==='OPERADOR'?'Operador':'Unidad'}"><b>${E(main)}</b><small>${E(sub)}</small></td>${mode==='OPERADOR'?`<td data-label="Unidad">${E(r.unidad||'—')}</td>`:''}<td data-label="Supervisora">${E(r.supervisora||'—')}<small style="display:block;color:#76859a">${E(r.galera||'')}</small></td><td class="v123-rec-metric" data-label="Frecuencia"><b>${Number(r.pagos||0)} pagos</b><small>${Number(r.dias_con_pago||0)} días con pago</small></td><td data-label="Total"><b>B/. ${M(r.total_pagado)}</b></td><td data-label="Nivel"><span class="v123-rec-level ${N(r.nivel)==='CRITICO'?'critical':''}">${E(r.nivel||'RECURRENTE')}</span></td></tr>`}).join('');
      out.innerHTML=`<div class="v123-rec-summary"><article><span>${mode==='OPERADOR'?'Operadores':'Unidades'} recurrentes</span><b>${rows.length}</b></article><article class="bad"><span>Críticos · 8+ pagos</span><b>${critical}</b></article><article><span>Total pagado</span><b>B/. ${M(total)}</b></article></div><section class="v123-rec-table"><div class="table-wrap"><table><thead><tr><th>${mode==='OPERADOR'?'Operador':'Unidad'}</th>${mode==='OPERADOR'?'<th>Unidad</th>':''}<th>Supervisora</th><th>Pagos / días</th><th>Total</th><th>Nivel</th></tr></thead><tbody>${body||`<tr><td colspan="${mode==='OPERADOR'?6:5}" class="empty">Sin resultados para estos filtros.</td></tr>`}</tbody></table></div><div class="v123-rec-pager"><span>${rows.length?`${(page-1)*size+1}–${Math.min(page*size,rows.length)} de ${rows.length}`:'0 resultados'}</span><div><button id="v123RecPrev" ${page===1?'disabled':''}>← Anterior</button><button id="v123RecNext" ${page===pages?'disabled':''}>Siguiente →</button></div></div></section>`;
      out.querySelector('#v123RecPrev').onclick=()=>{page--;paint()};out.querySelector('#v123RecNext').onclick=()=>{page++;paint()};
    };
    const load=async()=>{
      out.innerHTML='<div class="card">Analizando frecuencia…</div>';
      const [y,m]=v.querySelector('#v123RecMonth').value.split('-').map(Number),desde=`${y}-${String(m).padStart(2,'0')}-01`,hasta=new Date(y,m,0).toISOString().slice(0,10),g=gal.value;
      ctx.innerHTML=`<span>Analiza pagos repetidos por operador o por unidad.</span><b>Galera: ${E(g==='TODAS'?(globalScope()?'Todas las galeras':'Todo mi alcance'):g)}</b>`;
      try{
        all=await rpc('panapass_recurrentes_entidad',{p_desde:desde,p_hasta:hasta,p_galera:g==='TODAS'?null:g,p_min_pagos:Number(v.querySelector('#v123RecMin').value||5),p_limit:2000});
        page=1;paint();
      }catch(e){out.innerHTML=`<div class="alert">${E(e.message||e)}</div>`}
    };
    v.querySelector('#v123RecOp').onclick=()=>setMode('OPERADOR');v.querySelector('#v123RecUnit').onclick=()=>setMode('UNIDAD');v.querySelector('#v123RecGo').onclick=load;search.oninput=()=>{page=1;paint()};gal.onchange=load;await load();
  }

  try{ranking=ranking169}catch(_){ }
  try{recurrentes=recurrentes169}catch(_){ }
  window.ranking=ranking169;
  window.recurrentes=recurrentes169;
  window.__RYM_PANAPASS_V169_FINAL=true;
})();
