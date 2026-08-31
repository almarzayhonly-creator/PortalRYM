
(function(){
  const esc122=v=>typeof e113==='function'?e113(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date122=v=>typeof dt113==='function'?dt113(v):String(v||'');
  window.draw113=function(d){
    const k=d?.kpis||{},rows=d?.rows||[],out=document.querySelector('#v113GpsOut'),count=document.querySelector('#v113GpsCount'),kpis=document.querySelector('#v113GpsKpis');
    if(count)count.textContent=`${rows.length} unidades · actualizado ${date122(d?.generated_at)}`;
    if(kpis)kpis.innerHTML=`<article class="v113-gps-kpi"><span>Unidades analizadas</span><b>${k.total||0}</b></article><article class="v113-gps-kpi bad"><span>Críticos</span><b>${k.criticos||0}</b></article><article class="v113-gps-kpi warn"><span>Alertas</span><b>${k.alertas||0}</b></article><article class="v113-gps-kpi good"><span>OK</span><b>${k.ok||0}</b></article><article class="v113-gps-kpi bad"><span>Sin GPS instalado</span><b>${k.sin_gps||0}</b></article><article class="v113-gps-kpi historic"><span>Fuera de operación / historial</span><b>${k.cerradas||0}</b></article>`;
    if(!out)return;
    out.innerHTML=rows.length?`<table><thead><tr><th>Unidad</th><th>Galera</th><th>Supervisora</th><th>Operación / Control</th><th>GPS1</th><th>GPS2</th><th>Diagnóstico</th><th>Velocidad</th><th>Última ubicación</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.historico?'v122-closed-row':''}"><td data-label="Unidad"><b>${esc122(r.unidad)}</b><small style="display:block;color:#748197">${esc122(r.empresa||'')}</small></td><td data-label="Galera">${esc122(r.galera||'—')}</td><td data-label="Supervisora">${esc122(r.supervisora||'—')}</td><td data-label="Operación / Control"><span class="v113-state ${r.historico?'historic':r.estado_operativo==='ACTIVO'?'ok':r.estado_operativo==='ABONO ADICIONAL'?'warn':'bad'}">${esc122(r.estado_operativo)}</span><small style="display:block;margin-top:3px;color:#748197">Control: ${esc122(r.estatus_control||'—')}</small></td><td data-label="GPS1">${gpsBadge113(r.gps1)}</td><td data-label="GPS2">${gpsBadge113(r.gps2)}</td><td data-label="Diagnóstico"><span class="v113-level ${esc122(r.nivel)}">${esc122(r.nivel)}</span><small style="display:block;margin-top:3px;color:#748197">${esc122(r.razon)}</small></td><td data-label="Velocidad">${r.velocidad===''||r.velocidad==null?'—':`${esc122(r.velocidad)} km/h`}</td><td data-label="Última ubicación">${r.ultima_fecha?`<small class="v122-last-date">${esc122(date122(r.ultima_fecha))}</small>`:''}${r.mapa?`<a class="v113-map" href="${esc122(r.mapa)}" target="_blank" rel="noopener">Ver mapa · ${esc122(r.ultima_fuente)}</a>`:'—'}</td></tr>`).join('')}</tbody></table>`:'<div class="v113-empty">No hay unidades para estos filtros.</div>';
  };
  try{draw113=window.draw113}catch(_){}
  const priorOpen=window.v113OpenGps;
  if(typeof priorOpen==='function'&&!priorOpen.__v122){
    const enhanced=async function(){
      const result=await priorOpen.apply(this,arguments);
      const state=document.querySelector('#v113Est');
      if(state){if(![...state.options].some(o=>o.value==='CERRADO'))state.add(new Option('CERRADO','CERRADO'));if(![...state.options].some(o=>o.value==='CANIBALIZADO'))state.add(new Option('CANIBALIZADO','CANIBALIZADO'))}
      const note=document.querySelector('.v113-gps-panel-head small');
      if(note)note.textContent='Fuente GPS consultada en vivo · se muestra la hora de la última transmisión de GPS1 y GPS2 · cerradas y canibalizadas quedan como histórico.';
      const subtitle=document.querySelector('.v113-gps-top p');
      if(subtitle)subtitle.textContent='GPS1 / GPS2 · estado operativo · alertas y última ubicación · exclusivo ADMIN_TOTAL';
      const levels=document.querySelector('#v119GpsLevel');
      if(levels&&![...levels.options].some(o=>o.value==='HISTORICO'))levels.add(new Option('Histórico / cerradas','HISTORICO'));
      return result;
    };
    enhanced.__v122=true;window.v113OpenGps=enhanced;try{v113OpenGps=enhanced}catch(_){}
  }
  let timer=0;
  const addOverflowTitles=()=>{clearTimeout(timer);timer=setTimeout(()=>document.querySelectorAll('.v117-card-value,.v117-card-detail b,.v66-card td,.v113-gps td,.v93-rank-card b').forEach(el=>{if(!el.title&&el.scrollWidth>el.clientWidth)el.title=(el.textContent||'').trim()}),100)};
  new MutationObserver(addOverflowTitles).observe(document.documentElement,{subtree:true,childList:true});addOverflowTitles();
})();
