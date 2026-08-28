/* Portal RYM V172 clean - Panapass dashboard */
async function dashboard(v){
  let d,dia=[],mes=[],diaError=null,mesError=null;try{
    const all=await Promise.allSettled([
      rpc('dashboard_resumen'),
      rpc('panapass_ranking_pagos',{p_periodo:'DIA'}),
      rpc('panapass_ranking_pagos',{p_periodo:'MES'})
    ]);
    if(all[0].status!=='fulfilled')throw all[0].reason||Error('Dashboard sin respuesta');
    d=all[0].value?.[0];
    if(all[1].status==='fulfilled')dia=all[1].value||[];else diaError=all[1].reason||Error('Ranking diario no disponible');
    if(all[2].status==='fulfilled')mes=all[2].value||[];else mesError=all[2].reason||Error('Ranking mensual no disponible');
    if(!d)throw Error('Dashboard sin respuesta');
  }catch(x){v.innerHTML=`<div class="alert">No se pudo cargar el Dashboard: ${esc(x.message)}</div>`;return}
  state.today=d.fecha;
  const meId=state.profile?.supervisora_id;
  const meD=dia.find(x=>x.supervisora_id===meId),meM=mes.find(x=>x.supervisora_id===meId);
  const medal=p=>Number(p)===1?'🥇':Number(p)===2?'🥈':Number(p)===3?'🥉':'🏅';
  const rankBlock=meId?`<div class="medal-grid">
    <div class="medal-card"><div class="medal-icon">${medal(meD?.posicion_galera)}</div><span>${dia?.[0]?.fecha_desde===d.fecha?'Hoy':('Último cierre · '+(dia?.[0]?.fecha_desde||'-'))} · tu galera</span><strong>#${meD?.posicion_galera||'-'} / ${meD?.total_galera||'-'}</strong><small>${diaError?'Ranking diario no disponible':(meD?`${meD.unidades_pagadas} unidades pagadas · ${money(meD.monto_pagado)}`:'Sin pagos registrados hoy')}</small></div>
    <div class="medal-card"><div class="medal-icon">${medal(meM?.posicion_galera)}</div><span>Mes · tu galera</span><strong>#${meM?.posicion_galera||'-'} / ${meM?.total_galera||'-'}</strong><small>${mesError?'Ranking mensual no disponible':(meM?`${meM.unidades_pagadas} unidades pagadas · ${money(meM.monto_pagado)}`:'Sin pagos registrados este mes')}</small></div>
    <div class="medal-card global"><div class="medal-icon">${medal(meM?.posicion_global)}</div><span>Mes · 4 galeras</span><strong>#${meM?.posicion_global||'-'} / ${meM?.total_global||'-'}</strong><small>El ranking premia menos unidades que requirieron pago.</small></div>
  </div>`:'';
  v.innerHTML=`<div class="kpis">
    <div class="kpi hero clickable" data-kpi-go="unidades"><span class="kpi-icon">🚗</span><span>Unidades visibles</span><strong>${d.unidades_visibles}</strong><small class="kpi-note">Flota bajo tu alcance</small></div>
    <div class="kpi hero red clickable" data-kpi-go="negativos_hoy"><span class="kpi-icon">!</span><span>Negativos AM</span><strong>${d.negativos_hoy}</strong><small class="kpi-note">Punto de partida de cobranza</small></div>
    <div class="kpi hero green clickable" data-kpi-go="pagos_hoy"><span class="kpi-icon">$</span><span>Pagos hoy</span><strong>${d.pagos_hoy}</strong><small class="kpi-note">Resultado real del trabajo</small></div>
    <div class="kpi hero orange clickable" data-kpi-go="recurrentes"><span class="kpi-icon">↻</span><span>Recurrentes mes</span><strong>${Number(d.recurrentes_mes||0)}</strong><small class="kpi-note">5+ pagos en el mes</small></div>
  </div>
  <div class="dashboard-welcome"><div class="welcome-card"><small>Portal RYM</small><h2>Hola, ${esc(state.profile.nombre||'')}</h2><p>Negativos muestra cómo inicia la deuda. El desempeño se mide por lo que realmente termina pagándose.</p></div><div class="quick-card"><small>PAGADO ESTE MES</small><strong>${money(d.monto_pagos_mes||0)}</strong><span class="muted">Monto visible según tu alcance.</span></div></div>
  ${rankBlock}
  <div style="margin:12px 0;text-align:right"><button class="soft-btn" onclick="state.active='ranking';shell();render()">Ver ranking de pagos</button></div><div id="rotationFeed"></div>`;
  document.querySelectorAll('[data-kpi-go]').forEach(el=>el.onclick=()=>{const m=el.dataset.kpiGo;if(m==='unidades'){v11UnitList();return}if(state.modules.includes(m)||m==='dashboard'){state.active=m;shell();render()}});
  if(['ADMIN_TOTAL','ADMIN','SISTEMA','PAGADOR','GERENTE_GALERA'].includes(role())){try{const ch=await rpc('panapass_cambios_supervisoras_hoy');if(ch.length)document.querySelector('#rotationFeed').innerHTML=`<div class="card"><span class="card-title">Cambios de supervisoras hoy</span><div class="rotation-feed">${ch.slice(0,12).map(x=>`<div class="rotation-item"><b>${esc(x.supervisora_nueva||'')}</b>${x.unidad?' · '+esc(x.unidad):''}<br><small>${esc(x.galera_anterior||'-')} → ${esc(x.galera_nueva||'-')} · ${fmtDT(x.cambio_en)}</small></div>`).join('')}</div></div>`}catch(_){}}
}
