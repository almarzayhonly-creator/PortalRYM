
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
function toggleCapture(btn,selector){
  const on=document.body.classList.toggle('capture-mode');
  document.querySelector(selector+' .table-wrap')?.classList.toggle('capture',on);
  if(btn){btn.textContent=on?'Salir de captura':'Vista captura';btn.setAttribute('aria-pressed',on?'true':'false')}
  if(on)window.scrollTo({top:0,behavior:'smooth'});
}


async function ranking(v){
  v.innerHTML='<div class="card">Cargando ranking de pagos...</div>';
  let dia=[],mes=[];try{[dia,mes]=await Promise.all([rpc('panapass_ranking_pagos',{p_periodo:'DIA'}),rpc('panapass_ranking_pagos',{p_periodo:'MES'})])}catch(x){v.innerHTML=`<div class="alert">${esc(x.message)}</div>`;return}
  const all=[...dia,...mes],galeras=[...new Set(all.map(x=>x.galera).filter(Boolean))];const diaFecha=dia?.[0]?.fecha_desde||state.today||'';const esHoy=diaFecha===state.today;
  const me=dia.find(x=>x.supervisora_id===state.profile?.supervisora_id);const initial=isAdminRole()?'TODAS':(me?.galera||galeras[0]||'TODAS');
  v.innerHTML=`<div class="source-card"><span class="entity-chip">RANKING DE PAGOS</span><div class="source-text"><strong>Una sola métrica: resultado de cobranza</strong><p>Menos unidades que necesitaron pago = mejor posición. Se muestra el cierre del día y el acumulado del mes.</p></div></div>
  <div class="section-tools"><div class="field"><label>Galera</label><select id="rankGalera">${isAdminRole()?'<option value="TODAS">Todas las 4 galeras</option>':''}${galeras.map(g=>`<option ${g===initial?'selected':''}>${esc(g)}</option>`).join('')}</select></div><div class="field"><label>Periodo</label><select id="rankPeriodo"><option value="DIA">Día / último cierre</option><option value="MES">Mes</option></select></div></div>${!esHoy?`<div class="source-card" style="margin-top:12px"><span class="entity-chip">SIN PAGOS HOY</span><div class="source-text"><strong>Mostrando el último cierre con pagos: ${esc(diaFecha)}</strong><p>Hoy todavía no hay pagos registrados. Para no mostrar un ranking vacío, el portal conserva como referencia el último día con actividad.</p></div></div>`:''}<div id="rankOut"></div>`;
  const medals=['🥇','🥈','🥉'];
  function draw(){const g=document.querySelector('#rankGalera').value,per=document.querySelector('#rankPeriodo').value;let rows=(per==='DIA'?dia:mes).slice();if(g!=='TODAS')rows=rows.filter(x=>x.galera===g).sort((a,b)=>a.posicion_galera-b.posicion_galera);else rows.sort((a,b)=>a.posicion_global-b.posicion_global);const pos=x=>g==='TODAS'?x.posicion_global:x.posicion_galera;const total=x=>g==='TODAS'?x.total_global:x.total_galera;document.querySelector('#rankOut').innerHTML=`<div class="rank-podium">${rows.slice(0,3).map((x,i)=>`<div class="rank-pod r${i+1}"><div class="rank-medal">${medals[i]}</div><span class="rank-name profile-link" data-sup-id="${esc(x.supervisora_id||'')}">${esc(x.supervisora_nombre)}</span><div class="rank-stat">${esc(x.galera)} · ${x.unidades_pagadas} unidades pagadas</div><div class="rank-stat">Monto ${money(x.monto_pagado)}</div></div>`).join('')}</div><div class="panel mobile-cards" style="margin-top:14px"><div class="rank-table-title"><h3>${per==='DIA'?(esHoy?'Cierre de hoy':`Último día con pagos · ${esc(diaFecha)}`):'Acumulado del mes'}</h3><span>${g==='TODAS'?'General · 4 galeras':esc(g)}</span></div><div class="table-wrap"><table class="pretty"><thead><tr><th>Pos.</th><th>Galera</th><th>Supervisora</th><th>Unidades pagadas</th><th>Monto pagado</th></tr></thead><tbody>${rows.map(x=>`<tr class="${x.supervisora_id===state.profile?.supervisora_id?'rank-me':''}"><td data-label="Posición"><b>#${pos(x)} / ${total(x)}</b></td><td data-label="Galera">${esc(x.galera)}</td><td data-label="Supervisora"><b class="profile-link" data-sup-id="${esc(x.supervisora_id||'')}">${esc(x.supervisora_nombre)}</b></td><td data-label="Unidades pagadas">${x.unidades_pagadas}</td><td data-label="Monto">${money(x.monto_pagado)}</td></tr>`).join('')}</tbody></table></div></div>`}
  document.querySelector('#rankGalera').value=initial;document.querySelector('#rankGalera').onchange=draw;document.querySelector('#rankPeriodo').onchange=draw;draw();
  document.querySelector('#rankOut').onclick=e=>{const el=e.target.closest('[data-sup-id]');if(el?.dataset.supId)openSupervisoraProfile(el.dataset.supId)};
}
async function openSupervisoraProfile(id){
  let modal=document.querySelector('#supProfileModal');if(!modal){modal=document.createElement('div');modal.id='supProfileModal';modal.className='modal';document.body.appendChild(modal)}
  modal.style.display='flex';modal.innerHTML='<div class="modal-card" style="max-width:1100px;width:94vw"><div class="table-summary"><h2>Perfil operativo</h2><button class="soft-btn" id="supClose">Cerrar</button></div><div class="card">Cargando información...</div></div>';document.querySelector('#supClose').onclick=()=>modal.style.display='none';
  try{const d=await rpc('panapass_supervisora_perfil',{p_supervisora_id:id}),s=d.supervisora||{},k=d.kpis||{},rows=d.unidades||[];modal.innerHTML=`<div class="modal-card" style="max-width:1100px;width:94vw;max-height:90vh;overflow:auto"><div class="table-summary"><div><h2 style="margin:0">${esc(s.nombre||'Supervisora')}</h2><span class="muted">${esc(s.galera||'')} · ${esc(s.email||'')}</span></div><button class="soft-btn" id="supClose">Cerrar</button></div><div class="kpis"><div class="kpi"><span>Unidades</span><strong>${k.unidades||0}</strong></div><div class="kpi"><span>Negativas ahora</span><strong>${k.negativas_ahora||0}</strong></div><div class="kpi"><span>Pagadas mes</span><strong>${k.unidades_pagadas_mes||0}</strong></div><div class="kpi"><span>Monto mes</span><strong>${money(k.monto_mes||0)}</strong></div><div class="kpi"><span>Recurrentes</span><strong>${k.recurrentes_unidad||0}</strong></div></div><div class="panel mobile-cards"><div class="rank-table-title"><h3>Unidades asignadas</h3><span>Panapass, placa, saldo y recurrencia</span></div>${tableHtml(rows,['unidad','placa','panapass_numero','empresa','estatus','saldo','neg7','pagos_mes','dias_mes','total_mes'],'pretty compact-table','mobile-cards')}</div>${(d.rotaciones||[]).length?`<div class="card"><h3>Rotaciones</h3>${tableHtml(d.rotaciones,['galera_anterior','galera_nueva','cambio_en'],'pretty compact-table','mobile-cards')}</div>`:''}</div>`;document.querySelector('#supClose').onclick=()=>modal.style.display='none'}catch(x){modal.innerHTML=`<div class="modal-card"><div class="alert">${esc(x.message)}</div><button id="supClose">Cerrar</button></div>`;document.querySelector('#supClose').onclick=()=>modal.style.display='none'}
}
async function negativos(v){
  const maxf=state.today||state.meta?.max_snapshot||new Date().toISOString().slice(0,10);
  const minf=state.meta?.min_snapshot||maxf;
  v.innerHTML=`
    <div class="section-tools">
      <div class="field"><label>Fecha</label><input id="negFecha" type="date" max="${esc(maxf)}" value="${esc(maxf)}"></div>
      <div class="field"><label>Buscar</label><input id="negQ" placeholder="Unidad, placa o empresa"></div>
      <button id="negBuscar">Consultar</button>
      <button id="negCompact" class="soft-btn">Vista captura</button>
      <div class="share-note">Optimizado para capturas y WhatsApp.</div>
    </div>
    <div id="negOut"><div class="card">Cargando...</div></div>`;
  let lastRows=[];
  async function draw(){
    const fecha=document.querySelector('#negFecha').value;
    const out=document.querySelector('#negOut');
    out.innerHTML='<div class="card">Consultando...</div>';
    try{
      lastRows=await rpc('panapass_negativos_fecha',{p_fecha:fecha||null});
      const q=document.querySelector('#negQ').value.trim().toLowerCase();
      const rows=q?lastRows.filter(r=>[r.unidad,r.placa,r.empresa,r.panapass_numero].join(' ').toLowerCase().includes(q)):lastRows;
      const total=rows.reduce((a,x)=>a+Number(x.saldo||0),0);
      const mx=rows.reduce((a,x)=>Math.max(a,Number(x.neg7||0)),0);
      const riesgo=mx>=3?'ALERTA':mx===2?'CUIDADO':'OK';
      out.innerHTML=`<div class="capture-title"><h2>Negativos Panapass · ${esc(fecha)}</h2><small>Detalle de unidades en negativo</small></div><div class="kpis">
        <div class="kpi"><span>Unidades</span><strong>${rows.length}</strong></div>
        <div class="kpi"><span>Saldo total</span><strong style="color:var(--red)">${money(total)}</strong></div>
        <div class="kpi"><span>Máx neg 7d</span><strong>${mx}</strong></div>
        <div class="kpi"><span>Riesgo</span><strong>${riesgo}</strong></div>
      </div>${tableHtml(rows,['fecha','status','unidad','placa','panapass_numero','empresa','neg7','saldo'],'pretty neg-table','mobile-cards')}`;
    }catch(x){out.innerHTML=`<div class="alert">${esc(x.message)}</div>`}
  }
  document.querySelector('#negBuscar').onclick=draw;
  document.querySelector('#negQ').oninput=draw;
  document.querySelector('#negCompact').onclick=e=>toggleCapture(e.currentTarget,'#negOut');
  await draw();
}
async function pagos(v){
  const minf=state.meta?.min_pago||'2025-01-02',maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10);
  v.innerHTML=`
    <div class="section-tools">
      <div class="field"><label>Fecha</label><input id="pagFecha" type="date" min="${minf}" max="${maxf}" value="${maxf}"></div>
      <div class="field"><label>Buscar</label><input id="pagQ" placeholder="Unidad, operador, N_OP o empresa"></div>
      <button id="pagBuscar">Consultar</button>
      <button id="pagCompact" class="soft-btn">Vista captura</button>
      <div class="share-note">Consulta hoy, ayer o cualquier fecha histórica.</div>
    </div>
    <div id="pagOut"><div class="card">Cargando...</div></div>`;
  let lastRows=[];
  async function draw(){
    const fecha=document.querySelector('#pagFecha').value;
    const out=document.querySelector('#pagOut');
    out.innerHTML='<div class="card">Consultando...</div>';
    try{
      lastRows=await rpc('panapass_pagos_fecha',{p_fecha:fecha||null});
      const q=document.querySelector('#pagQ').value.trim().toLowerCase();
      const rows=q?lastRows.filter(r=>[r.unidad,r.empresa,r.operador,r.n_op,r.cobrador].join(' ').toLowerCase().includes(q)):lastRows;
      const total=rows.reduce((a,x)=>a+Number(x.a_pagar||0),0);
      const boleta=rows.reduce((a,x)=>a+Number(x.boleta||0),0);
      const mx=rows.reduce((a,x)=>Math.max(a,Number(x.pag7||0)),0);
      out.innerHTML=`<div class="kpis">
        <div class="kpi"><span>Pagos</span><strong>${rows.length}</strong></div>
        <div class="kpi"><span>Total A pagar</span><strong style="color:var(--green)">${money(total)}</strong></div>
        <div class="kpi"><span>Total boleta</span><strong>${money(boleta)}</strong></div>
        <div class="kpi"><span>Máx pag 7d</span><strong>${mx}</strong></div>
      </div>${tableHtml(rows,['fecha','unidad','empresa','a_pagar','boleta','pag7','n_op','operador','cobrador','tipo','estado_cobra'],'pretty','mobile-cards')}`;
    }catch(x){out.innerHTML=`<div class="alert">${esc(x.message)}</div>`}
  }
  document.querySelector('#pagBuscar').onclick=draw;
  document.querySelector('#pagQ').oninput=draw;
  document.querySelector('#pagCompact').onclick=e=>toggleCapture(e.currentTarget,'#pagOut');
  await draw();
}
async function pagosConsultaHoy(v){
  const hoy=state.today||new Date().toISOString().slice(0,10);
  v.innerHTML=`<div class="source-card"><span class="entity-chip">PAGOS REGISTRADOS</span><div class="source-text"><strong>Resultado real de cobranza de tus unidades</strong><p>Por defecto ves lo pagado hoy. Puedes consultar una fecha anterior, pero no editar: la hoja online de trabajo es exclusiva de administración/personal autorizado.</p></div></div><div class="section-tools"><div class="field"><label>Fecha</label><input id="supPayFecha" type="date" value="${hoy}" max="${hoy}"></div><div class="field"><label>Buscar</label><input id="supPayQ" placeholder="Unidad, operador o empresa"></div><button id="supPayLoad">Consultar</button></div><div id="supPayOut"><div class="card">Cargando pagos...</div></div>`;
  let rows=[];
  function paint(){const q=document.querySelector('#supPayQ').value.trim().toLowerCase();let d=rows;if(q)d=d.filter(x=>[x.unidad,x.operador,x.n_op,x.empresa,x.cobrador].join(' ').toLowerCase().includes(q));const total=d.reduce((a,x)=>a+Number(x.boleta||x.a_pagar||0),0);document.querySelector('#supPayOut').innerHTML=`<div class="kpis"><div class="kpi"><span>Pagos</span><strong>${d.length}</strong></div><div class="kpi"><span>Total pagado</span><strong style="color:var(--green)">${money(total)}</strong></div></div>${tableHtml(d,['fecha','unidad','empresa','a_pagar','boleta','n_op','operador','tipo'],'pretty','mobile-cards')}`}
  async function load(){const o=document.querySelector('#supPayOut'),f=document.querySelector('#supPayFecha').value||hoy;o.innerHTML='<div class="card">Consultando pagos...</div>';try{rows=await rpc('panapass_pagos_fecha',{p_fecha:f});paint()}catch(x){o.innerHTML=`<div class="alert">${esc(x.message)}</div>`}}
  document.querySelector('#supPayLoad').onclick=load;document.querySelector('#supPayFecha').onchange=load;document.querySelector('#supPayQ').oninput=paint;await load();
}
async function pagosTrabajo(v){
  v.innerHTML=`<div class="source-card"><span class="entity-chip">PAGOS HOY ONLINE</span><div class="source-text"><strong>La hoja de trabajo vive dentro del portal</strong><p>Carga los pendientes PM y registra únicamente lo que realmente se pagó. N_OP y Operador se bloquean cuando vienen asignados; solo se editan si faltan. Cobrador se completa con la supervisora asignada. Edita monto y tipo antes de archivar.</p></div></div>
  <div class="section-tools"><button id="pmFromPM">Preparar desde pendientes PM</button><button id="pmValidate" class="soft-btn" title="Revisa solo los pagos con monto mayor que 0 antes de archivar">Validar pagos</button><button id="pmArchive" class="danger" title="Guarda definitivamente en el historial solo los pagos marcados y limpia la hoja de trabajo">Archivar pagos</button><button id="pmReload" class="soft-btn">Recargar</button><div class="share-note">Ya no necesitas importar el Excel para trabajar Pagos Hoy.</div></div><div id="pmMsg"></div><div id="pmOut"><div class="card">Cargando...</div></div>`;
  let rows=[];
  async function load(){const o=document.querySelector('#pmOut');o.innerHTML='<div class="card">Leyendo hoja online...</div>';try{rows=await rpc('panapass_v10_pagos_hoy');const paid=rows.filter(x=>Number(x.a_pagar)>0),total=paid.reduce((a,x)=>a+Number(x.a_pagar||0),0),boleta=paid.reduce((a,x)=>a+Number(x.con_boleta||0),0);o.innerHTML=`<div class="kpis"><div class="kpi"><span>Pendientes cargados</span><strong>${rows.length}</strong></div><div class="kpi"><span>Marcados pagados</span><strong>${paid.length}</strong></div><div class="kpi"><span>Total pagado</span><strong style="color:var(--green)">${money(total)}</strong></div><div class="kpi"><span>Boleta</span><strong>${money(boleta)}</strong></div></div>${pagosTrabajoTable(rows)}`;bind()}catch(x){o.innerHTML=`<div class="alert">${esc(x.message)}</div>`}}
  function bind(){
    // Estado de guardado compartido: viene de Supabase, no del navegador local.
    const mark=(b,tr,isSaved,dirty=false)=>{
      if(!b||!tr)return;
      const td=b.closest('td');
      let badge=td?.querySelector('[data-save-state]');
      if(!badge&&td){
        badge=document.createElement('div');
        badge.setAttribute('data-save-state','');
        badge.style.marginTop='5px';
        badge.style.fontSize='10px';
        badge.style.fontWeight='900';
        td.appendChild(badge);
      }
      if(isSaved){
        b.disabled=true;
        b.textContent='Guardado ✓';
        b.classList.add('pay-save-done');
        tr.classList.add('pay-row-saved');
        tr.classList.remove('pay-row-dirty');
        if(badge){badge.textContent='GUARDADO ✓';badge.className='pay-save-state ok'}
      }else{
        b.disabled=false;
        b.textContent=dirty?'Guardar cambios':'Guardar';
        b.classList.remove('pay-save-done');
        tr.classList.remove('pay-row-saved');
        tr.classList.toggle('pay-row-dirty',!!dirty);
        if(badge){badge.textContent=dirty?'CAMBIOS SIN GUARDAR':'';badge.className='pay-save-state'+(dirty?' dirty':'')}
      }
    };
    document.querySelectorAll('[data-save-pay]').forEach(b=>{
      const tr=b.closest('tr'),m=document.querySelector('#pmMsg');
      mark(b,tr,tr.dataset.paySaved==='1',false);

      const dirty=()=>{
        mark(b,tr,false,true);
      };
      tr.querySelectorAll('[data-pay],[data-nop],[data-op],[data-tipo]').forEach(el=>{
        el.addEventListener('input',dirty);
        el.addEventListener('change',dirty);
      });

      b.onclick=async()=>{
        if(b.disabled)return;
        b.disabled=true;
        b.textContent='Guardando...';
        try{
          const rr=await rpc('panapass_pagos_hoy_editar',{
            p_id:Number(b.dataset.savePay),
            p_a_pagar:Number(tr.querySelector('[data-pay]').value||0),
            p_numero_operador:tr.querySelector('[data-nop]').value||null,
            p_nombre_operador:tr.querySelector('[data-op]').value||null,
            p_cobrador:tr.querySelector('[data-cobrador]').value||null,
            p_tipo:tr.querySelector('[data-tipo]').value
          });
          const row=Array.isArray(rr)?rr[0]:rr;
          if(row?.updated_at)tr.dataset.payUpdated=String(row.updated_at);
          if(row?.con_boleta!==undefined&&tr.children?.[5]){
            const boletaEl=tr.children[5].querySelector('b');
            if(boletaEl)boletaEl.textContent=money(row.con_boleta);
          }
          tr.dataset.paySaved='1';
          if(row?.guardado_en)tr.dataset.paySavedAt=String(row.guardado_en);
          mark(b,tr,true,false);
          m.innerHTML='<div class="success">Fila guardada ✓</div>';
        }catch(x){
          mark(b,tr,false,true);
          m.innerHTML=`<div class="alert">${esc(x.message)}</div>`;
        }
      };
    })
  }
  document.querySelector('#pmReload').onclick=load;
  document.querySelector('#pmFromPM').onclick=async()=>{const m=document.querySelector('#pmMsg');try{const r=(await rpc('panapass_pagos_hoy_cargar_desde_pm'))[0];m.innerHTML=`<div class="success">${esc(r?.mensaje||'Pagos Hoy preparado.')}</div>`;await load()}catch(x){m.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
  document.querySelector('#pmValidate').onclick=async()=>{const m=document.querySelector('#pmMsg');try{const r=(await rpc('panapass_v10_validar_pagos_hoy'))[0];m.innerHTML=r.ok?`<div class="success">Validación OK · ${r.registros} pagos · ${money(r.total_a_pagar)}</div>`:`<div class="alert">${esc(JSON.stringify(r.errores))}</div>`}catch(x){m.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
  document.querySelector('#pmArchive').onclick=async()=>{if(!confirm('¿Archivar los pagos marcados?'))return;const m=document.querySelector('#pmMsg');try{const r=(await rpc('panapass_v10_archivar_pagos_hoy'))[0];m.innerHTML=`<div class="success">${esc(r.mensaje)} · ${r.registros} registros</div>`;await load()}catch(x){m.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
  await load();
}
function pagosTrabajoTable(rows){
  if(!rows.length)return '<div class="panel"><div class="empty">La hoja online está vacía. Pulsa “Preparar desde pendientes PM”.</div></div>';
  return `<div class="panel pagos-online mobile-cards"><div class="table-wrap"><table class="pretty compact-table pagos-work-fit"><thead><tr><th>Unidad</th><th>Panapass</th><th>Placa</th><th>Saldo PM</th><th>Monto pagado</th><th>Boleta</th><th>N_OP</th><th>Operador</th><th>Tipo</th><th>Cobrador</th><th></th></tr></thead><tbody>${rows.map(r=>{
    const lockNop=String(r.numero_operador||'').trim()!=='';
    const lockOp=String(r.nombre_operador||'').trim()!=='';
    const empresa=r.empresa_operadora||r.empresa_duena||r.empresa||'';
    const placa=r.placa||r.placa_unica||r.placa_comercial||'';
    const panapass=r.panapass_numero||r.panapass||'';
    return `<tr data-pay-row-unit="${esc(r.unidad||'')}" data-pay-updated="${esc(r.updated_at||'')}" data-pay-saved="${r.guardado_en?'1':'0'}" data-pay-saved-at="${esc(r.guardado_en||'')}"><td data-label="Unidad" data-pay-unit-cell><b data-pay-unit>${esc(r.unidad)}</b><small data-pay-company>${esc(empresa)}</small></td><td data-label="Panapass"><b data-pay-panapass>${esc(panapass)}</b></td><td data-label="Placa"><b data-pay-plate>${esc(placa)}</b></td><td data-label="Saldo PM" class="saldo">${money(r.monto_original)}</td><td data-label="Monto pagado"><input data-pay type="number" min="0" step="0.01" value="${Number(r.a_pagar||0)}"></td><td data-label="Boleta"><b>${money(r.con_boleta)}</b></td><td data-label="N_OP"><input data-nop value="${esc(r.numero_operador||'')}" ${lockNop?'readonly class="readonly-user" title="Dato asignado automáticamente"':''}></td><td data-label="Operador"><input data-op value="${esc(r.nombre_operador||'')}" ${lockOp?'readonly class="readonly-user" title="Dato asignado automáticamente"':''}></td><td data-label="Tipo"><select data-tipo><option ${r.tipo==='PRE DIARIO'?'selected':''}>PRE DIARIO</option><option ${r.tipo==='PRE NO DIARIO'?'selected':''}>PRE NO DIARIO</option><option ${r.tipo==='GASTO'?'selected':''}>GASTO</option><option ${r.tipo==='LOGISTICA'?'selected':''}>LOGISTICA</option></select></td><td data-label="Cobrador"><input data-cobrador value="${esc(r.cobrador||'')}" readonly class="readonly-user" title="Supervisora asignada a la unidad"></td><td data-label="Acción"><button class="soft-btn" data-save-pay="${r.id}">Guardar</button></td></tr>`
  }).join('')}</tbody></table></div></div>`
}

async function historial(v){
  const minf=state.meta?.min_pago||'2025-01-02', maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10);
  const admin=isAdminRole();
  v.innerHTML=`<div class="card"><div class="toolbar"><div class="field"><label>Unidad</label><input id="hu"></div><div class="field"><label>Operador / N_OP</label><input id="ho"></div><div class="field"><label>Desde</label><input id="hd" type="date" value="${minf}"></div><div class="field"><label>Hasta</label><input id="hh" type="date" value="${maxf}"></div><button id="hb">Buscar</button>${admin?'<button id="cobraToday" class="soft-btn">Validar Cobra hoy</button>':''}</div>${admin?`<div class="source-card" style="margin-top:12px"><span class="entity-chip">COBRA</span><div class="source-text"><strong>Validación diaria</strong><p>PRE DIARIO y PRE NO DIARIO se revisan únicamente cuando presionas Validar. El resultado queda guardado para que el historial cargue rápido.</p></div></div><div id="cobraHistMsg"></div>`:''}<div id="histOut" class="muted">Cargando historial...</div></div>`;
  async function runHist(){
    const b={p_unidad:document.querySelector('#hu').value||null,p_operador:document.querySelector('#ho').value||null,p_desde:document.querySelector('#hd').value||null,p_hasta:document.querySelector('#hh').value||null,p_limit:500};
    document.querySelector('#histOut').innerHTML='<div class="card">Consultando...</div>';
    try{
      const [rows,sum]=await Promise.all([rpc('panapass_historial',b),rpc('panapass_historial_resumen',{p_unidad:b.p_unidad,p_operador:b.p_operador,p_desde:b.p_desde,p_hasta:b.p_hasta})]);
      const s=sum[0]||{};
      document.querySelector('#histOut').innerHTML=`<div class="kpis"><div class="kpi"><span>Registros</span><strong>${s.registros||0}</strong></div><div class="kpi"><span>Unidades</span><strong>${s.unidades||0}</strong></div><div class="kpi"><span>Total A pagar</span><strong>${money(s.total_a_pagar)}</strong></div><div class="kpi"><span>Pendiente Cobra</span><strong style="color:var(--red)">${money(s.total_pendiente)}</strong></div></div>${tableHtml(rows,['fecha','unidad','panapass_numero','a_pagar','boleta','n_op','operador','cobrador','tipo','estado_cobra'])}`;
    }catch(x){document.querySelector('#histOut').innerHTML=`<div class="alert">${esc(x.message)}</div>`}
  }
  document.querySelector('#hb').onclick=runHist;
  if(admin){
    document.querySelector('#cobraToday').onclick=async()=>{
      const msg=document.querySelector('#cobraHistMsg');const hoy=state.meta?.max_pago||state.today||new Date().toISOString().slice(0,10);
      if(!confirm(`¿Validar en Cobra los pagos PRE DIARIO y PRE NO DIARIO no validados del ${hoy}?`))return;
      msg.innerHTML='<div class="cobra-progress">Validando Cobra del día...</div>';
      try{const d=await cobraValidate(hoy,hoy,{soloNoValidados:true});msg.innerHTML=`<div class="success">${esc(d.mensaje)} · guardados ${d.guardados||0}</div>`;await runHist()}catch(x){msg.innerHTML=`<div class="alert">${esc(x.message)}</div>`}
    };
  }
  await runHist();
}
async function pendientes(v){
  const minf=state.meta?.min_pago||'2025-01-02',maxf=state.meta?.max_pago||state.today||new Date().toISOString().slice(0,10);
  v.innerHTML=`<div class="source-card"><span class="entity-chip">PENDIENTES EXTERNO</span><div class="source-text"><strong>Todo lo pendiente dentro de tu alcance</strong><p>Por defecto muestra el histórico pendiente de la supervisora. Usa fecha solo cuando quieras revisar un día específico.</p></div></div><div class="section-tools"><div class="field"><label>Fecha opcional</label><input id="cobFecha" type="date" min="${minf}" max="${maxf}"></div><div class="field"><label>Buscar</label><input id="cobQ" placeholder="Unidad, operador o N_OP"></div><button id="cobLoad">Consultar</button>${isAdminRole()?'<button id="cobValidar" class="soft-btn">Validar fecha en Cobra</button>':''}</div><div id="cobMsg"></div><div id="cobOut"></div>`;
  let all=[];function paint(){const q=document.querySelector('#cobQ').value.trim().toLowerCase();let rows=all.filter(r=>String(r.estado_cobra||'').toUpperCase()!=='CARGADO A COBRA');if(q)rows=rows.filter(r=>[r.unidad,r.operador,r.n_op,r.cobrador].join(' ').toLowerCase().includes(q));const total=rows.reduce((a,x)=>a+Number(x.boleta||x.a_pagar||0),0);document.querySelector('#cobOut').innerHTML=`<div class="kpis"><div class="kpi"><span>Pendientes</span><strong>${rows.length}</strong></div><div class="kpi"><span>Monto pendiente</span><strong style="color:var(--red)">${money(total)}</strong></div></div>${tableHtml(rows,['fecha','unidad','a_pagar','boleta','n_op','operador','cobrador','tipo','estado_cobra'],'pretty','mobile-cards')}`}
  async function load(){const f=document.querySelector('#cobFecha').value;const o=document.querySelector('#cobOut');o.innerHTML='<div class="card">Consultando pendientes...</div>';try{if(f)all=await rpc('panapass_pagos_fecha',{p_fecha:f});else all=await rpc('panapass_historial',{p_unidad:null,p_operador:null,p_desde:minf,p_hasta:maxf,p_limit:1000});paint()}catch(x){o.innerHTML=`<div class="alert">${esc(x.message)}</div>`}}
  document.querySelector('#cobQ').oninput=paint;document.querySelector('#cobLoad').onclick=load;document.querySelector('#cobFecha').onchange=load;
  if(isAdminRole())document.querySelector('#cobValidar').onclick=async()=>{const f=document.querySelector('#cobFecha').value,m=document.querySelector('#cobMsg');if(!f){m.innerHTML='<div class="alert">Selecciona una fecha para validar Cobra.</div>';return}try{const d=await cobraValidate(f,f,{soloNoValidados:true});m.innerHTML=`<div class="success">${esc(d.mensaje)}</div>`;await load()}catch(x){m.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};await load();
}
async function recurrentes(v){
  const minf=state.meta?.min_pago||'2025-01-02',maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10);
  const now=new Date(maxf+'T12:00:00'),monthStart=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
  const gals=Array.isArray(state.meta?.galeras)?state.meta.galeras.filter(Boolean):[];
  v.innerHTML=`
    <div class="source-card"><span class="entity-chip">RECURRENTES</span><div class="source-text"><strong>Dos análisis independientes</strong><p>Operador y unidad se analizan por separado. 5+ pagos en el mes entra en recurrentes; 8+ se marca crítico.</p></div></div>
    <div class="section-tools">
      <div class="field"><label>Galera</label><select id="rg"><option value="">Todas las visibles</option>${gals.map(g=>`<option>${esc(g)}</option>`).join('')}</select></div>
      <div class="field"><label>Desde</label><input id="rd" type="date" value="${monthStart}" min="${minf}" max="${maxf}"></div>
      <div class="field"><label>Hasta</label><input id="rh" type="date" value="${maxf}" min="${minf}" max="${maxf}"></div>
      <div class="field"><label>Mínimo pagos/mes</label><input id="rmin" type="number" min="2" max="20" value="5"></div>
      <button id="rb">Analizar</button>
    </div>
    <div id="rout"><div class="card">Cargando análisis...</div></div>`;

  function renderSection(title,chip,rows,columns,description){
    return `<div class="source-card recurrent-section-head"><span class="entity-chip ${chip==='UNIDADES'?'unit':''}">${chip}</span><div class="source-text"><strong>${title}</strong><p>${description}</p></div></div>
      ${tableHtml(rows,columns,'pretty compact-table','mobile-cards')}`;
  }

  async function run(){
    const out=document.querySelector('#rout');
    out.innerHTML='<div class="card">Analizando frecuencias...</div>';
    try{
      const all=await rpc('panapass_recurrentes_entidad',{
        p_desde:document.querySelector('#rd').value,
        p_hasta:document.querySelector('#rh').value,
        p_galera:document.querySelector('#rg').value||null,
        p_min_pagos:Number(document.querySelector('#rmin').value||5),
        p_limit:1000
      });

      const opsRows=all.filter(x=>x.tipo_entidad==='OPERADOR').map(x=>({...x,
        n_op_recurrente:x.identificador,
        operador_recurrente:x.nombre,
        unidades_recurrente:x.unidad
      }));
      const unitRows=all.filter(x=>x.tipo_entidad==='UNIDAD').map(x=>({...x,
        unidad_recurrente:x.identificador
      }));

      const critOps=opsRows.filter(x=>x.nivel==='CRITICO').length;
      const critUnits=unitRows.filter(x=>x.nivel==='CRITICO').length;

      out.innerHTML=`<div class="kpis">
        <div class="kpi"><span>Operadores recurrentes</span><strong>${opsRows.length}</strong></div>
        <div class="kpi"><span>Operadores críticos 8+</span><strong style="color:var(--red)">${critOps}</strong></div>
        <div class="kpi"><span>Unidades recurrentes</span><strong>${unitRows.length}</strong></div>
        <div class="kpi"><span>Unidades críticas 8+</span><strong style="color:var(--red)">${critUnits}</strong></div>
      </div>
      <div class="recurrent-two-blocks">
        <section>${renderSection('Frecuencia por operador','OPERADORES',opsRows,['mes','n_op_recurrente','operador_recurrente','galera','unidades_recurrente','supervisora','pagos','dias_con_pago','total_pagado','nivel'],'Mide cuántas veces el mismo operador necesitó pago durante el periodo.')}</section>
        <section>${renderSection('Frecuencia por unidad','UNIDADES',unitRows,['mes','unidad_recurrente','galera','supervisora','pagos','dias_con_pago','total_pagado','nivel'],'Mide cuántas veces la misma unidad necesitó pago, sin depender del operador asignado.')}</section>
      </div>`;
    }catch(x){
      out.innerHTML=`<div class="alert">${esc(x.message)}</div>`;
    }
  }
  document.querySelector('#rb').onclick=run;
  await run();
}

async function operaciones(v){
  if(!isAdminRole()){v.innerHTML='<div class="alert">Este módulo es administrativo.</div>';return}
  v.innerHTML='<div id="opRoot"><div class="card">Cargando operación...</div></div>';

  async function load(){
    const root=document.querySelector('#opRoot');
    let s,runs=[];
    try{
      [s,runs]=await Promise.all([
        (async()=> (await rpc('panapass_v10_estado_operativo'))[0])(),
        rpc('panapass_ena_estado')
      ]);
    }catch(x){
      root.innerHTML=`<div class="alert">${esc(x.message)}</div>`;
      return;
    }

    const c6=runs.find(x=>x.tipo==='6AM');
    const c11=runs.find(x=>x.tipo==='11AM');
    const statusClass=c=>{
      if(c?.estado==='LISTO')return 'done';
      if(['ERROR','EXPIRADO'].includes(c?.estado))return 'warn';
      return '';
    };
    const statusText=c=>{
      if(!c)return 'PENDIENTE';
      if(c.estado==='ESPERANDO'||c.estado==='DISPARADO')return 'ENA PROCESANDO';
      if(c.estado==='LISTO')return 'LISTO';
      return c.estado||'PENDIENTE';
    };
    const line=c=>{
      if(!c)return 'Aún no iniciado';
      const tm=fmtDT(c.finalizado_en||c.iniciado_en);
      const rows=Number(c.filas_validas||0);
      if(c.estado==='LISTO')return `${tm} · ${rows} filas válidas`;
      if(c.estado==='ESPERANDO'||c.estado==='DISPARADO')return `${tm} · esperando que ENA termine`;
      return `${tm}${c.error?' · '+c.error:''}`;
    };

    root.innerHTML=`<div class="source-card"><span class="entity-chip">ENA AUTOMÁTICO</span><div class="source-text"><strong>6:05 AM y 11:05 AM: primero actualiza ENA, después captura el corte</strong><p>El actualizador puede tardar ~40 minutos. El portal revisa cada 5 minutos y valida que el corte sea nuevo y consistente con la flota activa de Control de Auto. No usa una cantidad fija de unidades.</p></div></div>

    <div class="cron-grid">
      <div class="cron-card ${statusClass(c6)}"><span>Proceso AM · 6:05</span><strong>${statusText(c6)}</strong><small>${esc(line(c6))}</small></div>
      <div class="cron-card ${statusClass(c11)}"><span>Proceso PM · 11:05</span><strong>${statusText(c11)}</strong><small>${esc(line(c11))}</small></div>
      <div class="cron-card ${s.fuente_es_hoy?'done':'warn'}"><span>Fuente operativa</span><strong>${s.fuente_es_hoy?'DATA DE HOY':'BLOQUEADA'}</strong><small>${s.fuente_registros||0} registros · ${s.fuente_negativos||0} negativos</small></div>
    </div>

    ${!s.fuente_es_hoy?'<div class="alert"><b>AM/PM BLOQUEADOS:</b> la fuente validada todavía no corresponde a un corte aceptado de hoy. Espera que ENA termine y que el verificador automático registre el corte.</div>':''}

    <div class="ops-grid-v9">
      <div class="ops-card-v9"><h3>Verificar fuente</h3><p>Aprueba la fuente válida de hoy antes de procesar.</p><div class="op-actions"><button id="vfy">Verificar</button><button id="refreshOps" class="soft-btn">Actualizar pantalla</button></div></div>
      <div class="ops-card-v9"><h3>Operación AM</h3><p>Crea el snapshot inicial de deuda usando el corte AM validado.</p><button id="procAM" ${s.puede_am?'':'disabled'}>Procesar AM</button><p>${esc(s.motivo_am||'')}</p></div>
      <div class="ops-card-v9"><h3>Operación PM</h3><p>Compara el corte nuevo de las 11AM contra el snapshot AM.</p><button id="procPM" ${s.puede_pm?'':'disabled'}>Procesar PM</button><p>${esc(s.motivo_pm||'')}</p></div>
      <div class="ops-card-v9"><h3>Resultado</h3><div class="metric-inline"><div><span>AM negativos</span><b>${s.am_negativos||0}</b></div><div><span>PM pendientes</span><b>${s.pm_pendientes||0}</b></div><div><span>Pagados</span><b>${s.pm_pagados||0}</b></div></div></div>
    </div>
    <div id="opMsg"></div>`;

    const run=async(fn,msg)=>{
      if(msg&&!confirm(msg))return;
      const o=document.querySelector('#opMsg');
      o.innerHTML='<div class="card">Ejecutando...</div>';
      try{
        const r=await rpc(fn);
        o.innerHTML=`<div class="success">${esc(r?.[0]?.mensaje||'Proceso completado.')}</div>`;
        await load();
      }catch(x){
        o.innerHTML=`<div class="alert">${esc(x.message)}</div>`;
      }
    };

    document.querySelector('#vfy').onclick=()=>run('panapass_v10_verificar');
    document.querySelector('#procAM').onclick=()=>run('panapass_v10_procesar_am','¿Procesar AM con el corte válido de hoy?');
    document.querySelector('#procPM').onclick=()=>run('panapass_v10_procesar_pm','¿Procesar PM contra el corte nuevo de las 11AM?');
    document.querySelector('#refreshOps').onclick=load;
  }

  await load();
}

async function reportes(v){
  if(!state.modules.includes('reportes')){v.innerHTML='<div class="alert">Sin permiso para Reportes.</div>';return}
  const hoy=state.today||new Date().toISOString().slice(0,10), ini=hoy.slice(0,8)+'01';
  let est=[];try{est=await rpc('panapass_reportes_estado')}catch(_){}
  const last=t=>{const x=est.find(z=>z.tipo===t);return x?.ultimo_envio?`Último envío: ${fmtDT(x.ultimo_envio)}${x.desde?' · '+x.desde+' → '+x.hasta:''}`:'Sin envíos registrados todavía'};
  v.innerHTML=`<div class="source-card"><span class="entity-chip">CENTRO DE REPORTES</span><div class="source-text"><strong>Consulta, vista previa y control de envíos</strong><p>Los reportes digitales se preparan primero en pantalla. El historial registra el último rango enviado para evitar duplicados.</p></div></div>
  <div class="section-tools"><div class="field"><label>Desde</label><input id="repDesde" type="date" value="${ini}"></div><div class="field"><label>Hasta</label><input id="repHasta" type="date" value="${hoy}"></div></div>
  <div class="report-grid">
   <div class="report-card"><h3>Negativos AM por Galera</h3><p>Snapshot AM para compartir por galera y supervisora.</p><div class="report-actions"><button class="soft-btn" data-go="negativos_hoy">Ver negativos</button></div><div class="report-status">${last('NEGATIVOS_GALERA')}</div></div>
   <div class="report-card"><h3>Pagos del día por Galera</h3><p>Resultado real pagado en el día para cada galera.</p><div class="report-actions"><button class="soft-btn" data-go="historial">Ver pagos</button></div><div class="report-status">${last('PAGOS_GALERA')}</div></div>
   <div class="report-card"><h3>Pagos · 4 Galeras</h3><p>Consolidado por rango para revisar y compartir el desempeño de VCARS, VCOMP, VIPCO y VINDU.</p><div class="report-actions"><button class="soft-btn" data-go="historial">Consultar</button></div><div class="report-status">${last('PAGOS_4_GALERAS')}</div></div>
   <div class="report-card"><h3>Fondeo Administración</h3><p>Empresa + monto realmente pagado. Usa A PAGAR; nunca Con_boleta.</p><div class="report-actions"><button id="repFondeo">Vista previa</button></div><div class="report-status">${last('RESUMEN_FONDEO')}</div></div>
   <div class="report-card"><h3>No PRE Diario / Cobra</h3><p>Todo lo que no es PRE DIARIO para gestionar la carga por la ruta especial de Cobra.</p><div class="report-actions"><button id="repNoPre">Vista previa</button></div></div>
   <div class="report-card"><h3>Bajas Panapass</h3><p>Unidades no activas en Control de Auto que todavía aparecen en el último corte ENA.</p><div class="report-actions"><button id="repBajas">Consultar bajas</button></div></div>
  </div><div id="repOut" style="margin-top:14px"></div>`;
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{state.active=b.dataset.go;shell();render()});
  const out=document.querySelector('#repOut'),range=()=>({p_desde:document.querySelector('#repDesde').value,p_hasta:document.querySelector('#repHasta').value});
  document.querySelector('#repFondeo').onclick=async()=>{out.innerHTML='<div class="card">Calculando fondeo...</div>';try{const rows=await rpc('panapass_reporte_fondeo',range());const total=rows.reduce((a,x)=>a+Number(x.monto||0),0);out.innerHTML=`<div class="kpis"><div class="kpi"><span>Empresas</span><strong>${rows.length}</strong></div><div class="kpi"><span>Total pagado</span><strong>${money(total)}</strong></div></div>${tableHtml(rows,['empresa','monto','registros'],'pretty','mobile-cards')}`}catch(x){out.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
  document.querySelector('#repNoPre').onclick=async()=>{out.innerHTML='<div class="card">Consultando...</div>';try{const rows=await rpc('panapass_reporte_no_pre_diario',range());out.innerHTML=`<div class="kpis"><div class="kpi"><span>Registros</span><strong>${rows.length}</strong></div><div class="kpi"><span>Total A pagar</span><strong>${money(rows.reduce((a,x)=>a+Number(x.a_pagar||0),0))}</strong></div></div>${tableHtml(rows,['fecha','galera','empresa','unidad','placa','panapass_numero','a_pagar','numero_operador','nombre_operador','cobrador','tipo','estado_cobra'],'pretty compact-table','mobile-cards')}`}catch(x){out.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
  document.querySelector('#repBajas').onclick=async()=>{out.innerHTML='<div class="card">Cruzando Control de Auto vs ENA...</div>';try{const rows=await rpc('panapass_reporte_bajas_v2');out.innerHTML=`<div class="kpis"><div class="kpi"><span>Bajas pendientes</span><strong>${rows.length}</strong></div></div>${tableHtml(rows,['galera','administrador','empresa','unidad','placa','panapass_numero','estatus_control','ultima_lectura','saldo','cantidad_tags','tags_ena','accion'],'pretty compact-table','mobile-cards')}`}catch(x){out.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
}

async function usuarios(v){
  if(!isFullAdmin()){v.innerHTML='<div class="alert">Sin permiso.</div>';return}
  v.innerHTML='<div id="usersRoot"><div class="card">Cargando usuarios...</div></div>';
  async function load(){
    const root=document.querySelector('#usersRoot');
    try{
      const {data}=await req('/functions/v1/admin-users',{method:'POST',body:JSON.stringify({action:'list'})});
      if(!data?.ok)throw Error(data?.error||'No se pudieron cargar usuarios.');
      const users=data.users||[],sups=data.supervisoras||[],galeras=data.galeras||['VCARS','VCOMP','VIPCO','VINDU'],mods=(data.modulos||[]).filter(m=>!['operacion_am','operacion_pm','pendientes_externo'].includes(m.codigo)),rolePerms=data.rol_permisos||[],userPerms=data.usuario_permisos||[];
      const firstName=n=>String(n||'').trim().split(/\s+/)[0].normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
      root.innerHTML=`<div class="user-admin-grid">
        <div class="card"><h2>Crear usuario</h2><p class="muted">El usuario se genera con el primer nombre. Tú asignas la contraseña inicial.</p><form id="cu" class="grid-form">
          <div class="field"><label>Nombre completo</label><input name="nombre" id="newName" placeholder="Ej. Dayana Prieto" required></div>
          <div class="field"><label>Usuario</label><input id="newUserPreview" class="readonly-user" value="" placeholder="Se genera automáticamente" readonly></div>
          <div class="field"><label>Correo</label><input name="email" type="email" placeholder="correo@empresa.com" required></div>
          <div class="field"><label>Contraseña temporal</label><input name="password" type="password" minlength="6" placeholder="Mínimo 6 caracteres" required></div>
          <div class="field"><label>Rol</label><select name="rol"><option>SUPERVISORA</option><option>GERENTE_GALERA</option><option>PAGADOR</option><option>OPERATIVO</option><option>ADMIN</option><option>SISTEMA</option><option>ADMIN_TOTAL</option></select></div>
          <div class="field"><label>Galera(s) · Gerente/Admin</label><select name="galeras_scope" multiple>${galeras.map(g=>`<option value="${g}">${g}</option>`).join('')}</select></div>
          <div class="field"><label>Supervisora(s) · rol Supervisora</label><select name="supervisoras" class="multi-sup" multiple>${sups.map(s=>`<option value="${s.id}">${esc(s.nombre)} · ${esc(s.galera||'')}</option>`).join('')}</select></div>
          <label style="display:flex;gap:8px;align-items:center"><input name="must" type="checkbox" checked style="width:auto"> Obligar a cambiar contraseña en el primer inicio</label>
          <button>Crear usuario</button></form><div id="ur"></div></div>
        <div class="card"><div class="table-summary"><div><h2 style="margin:0">Usuarios</h2><span class="muted">${users.length} accesos creados</span></div><button id="usersReload" class="soft-btn">Actualizar</button></div>
          <div class="user-list-row user-list-head"><div>Nombre</div><div>Correo</div><div>Usuario</div><div>Rol</div><div>Supervisora(s)</div><div>Estado</div><div>Acciones</div></div>
          ${users.map(u=>`<div class="user-list-row"><div><b>${esc(u.nombre||'')}</b><br><span class="muted">${u.must_change_password?'Cambio de clave pendiente':''}</span></div><div>${esc(u.email||'')}</div><div><b>${esc(u.usuario||'-')}</b></div><div><span class="pill">${esc(u.rol)}</span></div><div>${(u.supervisoras||[]).map(s=>esc(s.nombre||s.id)).join(', ')||'-'}</div><div><span class="user-status ${u.activo?'on':'off'}">${u.activo?'ACTIVO':'INACTIVO'}</span></div><div class="user-actions"><button class="soft-btn" data-open-user="${u.id}">Administrar</button><button class="danger" data-del-user="${u.id}">Eliminar</button></div></div>`).join('')}
          <div id="userEditPanel"></div>
        </div></div>`;
      document.querySelector('#usersReload').onclick=load;
      document.querySelector('#newName').oninput=e=>document.querySelector('#newUserPreview').value=firstName(e.target.value);
      document.querySelector('#cu').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),ur=document.querySelector('#ur'),supIds=[...e.currentTarget.querySelector('[name=supervisoras]').selectedOptions].map(o=>o.value),gals=[...e.currentTarget.querySelector('[name=galeras_scope]').selectedOptions].map(o=>o.value);ur.innerHTML='<div class="card">Creando usuario...</div>';try{const {data:r}=await req('/functions/v1/admin-users',{method:'POST',body:JSON.stringify({action:'create',nombre:f.get('nombre'),email:f.get('email'),password:f.get('password'),rol:f.get('rol'),supervisora_ids:supIds,galeras_scope:gals,must_change_password:f.get('must')==='on'})});if(!r?.ok)throw Error(r?.error||'No se pudo crear.');ur.innerHTML=`<div class="success">Usuario creado: <b>${esc(r.usuario)}</b>. La contraseña temporal quedó asignada.</div>`;setTimeout(load,650)}catch(x){ur.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
      document.querySelectorAll('[data-open-user]').forEach(b=>b.onclick=()=>openUser(users.find(x=>x.id===b.dataset.openUser)));
      document.querySelectorAll('[data-del-user]').forEach(b=>b.onclick=async()=>{const u=users.find(x=>x.id===b.dataset.delUser);if(!u)return;if(!confirm(`¿Eliminar el usuario ${u.nombre} (${u.usuario})?\n\nSe eliminará su acceso y sus permisos.`))return;try{const {data:r}=await req('/functions/v1/admin-users',{method:'POST',body:JSON.stringify({action:'delete',id:u.id})});if(!r?.ok)throw Error(r?.error||'No se pudo eliminar');await load()}catch(x){alert(x.message)}});
      function openUser(u){if(!u)return;const selected=new Set((u.supervisoras||[]).map(x=>x.id));const base=new Map(rolePerms.filter(x=>x.rol===u.rol).map(x=>[x.modulo_codigo,x]));const ov=new Map(userPerms.filter(x=>x.user_id===u.id).map(x=>[x.modulo_codigo,x]));const effective=(m,k)=>ov.has(m)?!!ov.get(m)[k]:!!base.get(m)?.[k];
        document.querySelector('#userEditPanel').innerHTML=`<div class="user-modal" id="userModal"><div class="user-modal-card"><div class="table-summary"><div><h3 style="margin:0">${esc(u.nombre)}</h3><span class="muted">Usuario: ${esc(u.usuario||'-')}</span></div><button class="soft-btn" id="closeUser">Cerrar</button></div>${u.source_system?`<div class="user-source-grid"><div class="user-source-item"><span>Origen</span><b>LogisticTodo</b></div><div class="user-source-item"><span>Área</span><b>${esc(u.source_area||'-')}</b></div><div class="user-source-item"><span>Función</span><b>${esc(u.source_funcion||'-')}</b></div><div class="user-source-item"><span>Nivel / Terminal</span><b>${esc(u.source_nivel_acceso??'-')} / ${esc(u.source_terminal??'-')}</b></div></div>`:''}<div class="user-card-tabs"><button class="soft-btn" data-ut="datos">Datos</button><button class="soft-btn" data-ut="permisos">Permisos</button><button class="soft-btn" data-ut="seguridad">Seguridad</button></div><div id="userTab"></div></div></div>`;
        const closeModal=()=>document.querySelector('#userEditPanel').innerHTML='';
        document.querySelector('#closeUser').onclick=closeModal;
        document.querySelector('#userModal').onclick=e=>{if(e.target.id==='userModal')closeModal()};
        const tab=document.querySelector('#userTab');
        const datos=()=>{tab.innerHTML=`<form id="ue" class="grid-form"><div class="field"><label>Nombre</label><input name="nombre" value="${esc(u.nombre||'')}" required></div><div class="field"><label>Usuario</label><input class="readonly-user" value="${esc(u.usuario||'')}" readonly></div><div class="field"><label>Correo</label><input name="email" type="email" value="${esc(u.email||'')}" required></div><div class="field"><label>Rol</label><select name="rol">${['SUPERVISORA','GERENTE_GALERA','PAGADOR','OPERATIVO','ADMIN','SISTEMA','ADMIN_TOTAL'].map(r=>`<option ${r===u.rol?'selected':''}>${r}</option>`).join('')}</select></div><label style="display:flex;gap:8px;align-items:center"><input name="activo" type="checkbox" ${u.activo?'checked':''} style="width:auto"> Usuario activo</label><div class="field"><label>Galera(s) · Gerente/Admin</label><select name="galeras_scope" multiple>${galeras.map(g=>`<option value="${g}" ${(u.galeras_scope||[]).includes(g)?'selected':''}>${g}</option>`).join('')}</select></div><div class="field"><label>Supervisora(s) · rol Supervisora</label><select name="supervisoras" class="multi-sup" multiple>${sups.map(s=>`<option value="${s.id}" ${selected.has(s.id)?'selected':''}>${esc(s.nombre)} · ${esc(s.galera||'')}</option>`).join('')}</select></div><button>Guardar datos</button></form><div id="ueMsg"></div>`;document.querySelector('#ue').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),msg=document.querySelector('#ueMsg'),supIds=[...e.currentTarget.querySelector('[name=supervisoras]').selectedOptions].map(o=>o.value),gals=[...e.currentTarget.querySelector('[name=galeras_scope]').selectedOptions].map(o=>o.value);msg.innerHTML='<div class="card">Guardando...</div>';try{const {data:r}=await req('/functions/v1/admin-users',{method:'POST',body:JSON.stringify({action:'update',id:u.id,nombre:f.get('nombre'),email:f.get('email'),rol:f.get('rol'),activo:f.get('activo')==='on',supervisora_ids:supIds,galeras_scope:gals})});if(!r?.ok)throw Error(r?.error||'No se pudo guardar');msg.innerHTML='<div class="success">Datos actualizados.</div>';setTimeout(load,500)}catch(x){msg.innerHTML=`<div class="alert">${esc(x.message)}</div>`}}};
        const permisos=()=>{const rows=mods.map(m=>`<div><b>${esc(m.nombre)}</b></div>${['puede_ver','puede_crear','puede_editar','puede_eliminar'].map(k=>`<div><label><input type="checkbox" data-pm="${m.codigo}" data-pk="${k}" ${effective(m.codigo,k)?'checked':''}></label></div>`).join('')}`).join('');tab.innerHTML=`<p class="muted">Define exactamente qué puede hacer este usuario en cada módulo.</p><div class="perm-grid"><div class="ph">Módulo</div><div class="ph">Ver</div><div class="ph">Crear</div><div class="ph">Editar</div><div class="ph">Eliminar</div>${rows}</div><div style="margin-top:14px"><button id="savePerms">Guardar permisos</button></div><div id="permMsg"></div>`;document.querySelector('#savePerms').onclick=async()=>{const msg=document.querySelector('#permMsg'),perms=mods.map(m=>{const get=k=>!!document.querySelector(`[data-pm="${m.codigo}"][data-pk="${k}"]`)?.checked;return{modulo_codigo:m.codigo,puede_ver:get('puede_ver'),puede_crear:get('puede_crear'),puede_editar:get('puede_editar'),puede_eliminar:get('puede_eliminar')}});msg.innerHTML='<div class="card">Guardando permisos...</div>';try{const {data:r}=await req('/functions/v1/admin-users',{method:'POST',body:JSON.stringify({action:'permissions',id:u.id,permisos:perms})});if(!r?.ok)throw Error(r?.error||'No se pudieron guardar');msg.innerHTML='<div class="success">Permisos actualizados.</div>'}catch(x){msg.innerHTML=`<div class="alert">${esc(x.message)}</div>`}}};
        const seguridad=()=>{tab.innerHTML=`<div class="security-box"><div><b>Estado de contraseña</b><div class="muted">${u.must_change_password?'Debe cambiarla en el próximo inicio':'Sin cambio obligatorio pendiente'}</div></div><div class="field"><label>Nueva contraseña temporal</label><input id="tmpPass" type="password" minlength="6" placeholder="Mínimo 6 caracteres"></div><label style="display:flex;gap:8px;align-items:center"><input id="forcePass" type="checkbox" style="width:auto"> Obligar cambio en el próximo inicio</label><button id="setPass">Asignar contraseña</button><div id="secMsg"></div></div>`;document.querySelector('#setPass').onclick=async()=>{const password=document.querySelector('#tmpPass').value,msg=document.querySelector('#secMsg');if(password.length<6){msg.innerHTML='<div class="alert">La contraseña debe tener al menos 6 caracteres.</div>';return}if(!confirm(`¿Asignar una nueva contraseña temporal a ${u.nombre}?`))return;msg.innerHTML='<div class="card">Actualizando contraseña...</div>';try{const {data:r}=await req('/functions/v1/admin-users',{method:'POST',body:JSON.stringify({action:'set_password',id:u.id,password,must_change_password:document.querySelector('#forcePass').checked})});if(!r?.ok)throw Error(r?.error||'No se pudo actualizar');msg.innerHTML='<div class="success">Contraseña temporal asignada.</div>';setTimeout(load,500)}catch(x){msg.innerHTML=`<div class="alert">${esc(x.message)}</div>`}}};
        document.querySelectorAll('[data-ut]').forEach(x=>x.onclick=()=>({datos,permisos,seguridad}[x.dataset.ut]||datos)());datos();
      }
    }catch(x){root.innerHTML=`<div class="alert">${esc(x.message)}</div>`}
  }
  await load();
}
function tableHtml(rows,cols,extraClass='',panelClass=''){
  const human={
    fecha:'Fecha',status:'Estatus',unidad:'Unidad',placa:'Placa',panapass_numero:'Panapass',empresa:'Empresa',
    neg7:'Neg. 7d',saldo:'Saldo',a_pagar:'A pagar',boleta:'Boleta',pag7:'Pag. 7d',n_op:'N_OP',
    operador:'Operador',cobrador:'Cobrador',tipo:'Tipo',estado_cobra:'Estado Cobra',mes:'Mes',galera:'Galera',
    unidades:'Unidad(es)',supervisoras:'Supervisora',pagos:'Pagos',dias_con_pago:'Días con pago',
    total_pagado:'Total pagado',primera_fecha:'Primera fecha',ultima_fecha:'Última fecha',nivel:'Nivel',tipo_entidad:'Tipo',identificador:'Identificador',nombre:'Nombre',supervisora:'Supervisora',
    n_op_recurrente:'N° Operador',operador_recurrente:'Operador',unidades_recurrente:'Unidad(es)',unidad_recurrente:'Unidad',monto:'Monto',registros:'Registros',administrador:'Administración',estatus_control:'Estatus Control',ultima_lectura:'Última ENA',accion:'Acción',numero_operador:'N_OP',nombre_operador:'Operador'
  };
  const val=(r,c)=>{
    if(c==='neg7'||c==='pag7')return chipNum(r[c]);
    if(c==='estado_cobra')return cobraChip(r[c]);
    if(c==='nivel'){const z=String(r[c]||'');return `<span class="chip ${z==='CRITICO'?'level-critical':z==='RECURRENTE'?'level-recurrent':''}">${esc(z)}</span>`} if(c==='tipo_entidad'){const z=String(r[c]||'');return `<span class="entity-chip ${z==='UNIDAD'?'unit':''}">${esc(z)}</span>`}
    if(['a_pagar','boleta','monto_original','total_pagado'].includes(c))return money(r[c]);
    if(c==='mes' && r[c]) return `<span class="date-badge">${esc(String(r[c]).slice(0,7))}</span>`;
    return esc(r[c]??'');
  };
  return `<div class="panel ${panelClass}"><div class="table-wrap"><table class="${extraClass}"><thead><tr>${cols.map(c=>`<th>${human[c]||c}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${cols.map(c=>`<td data-label="${esc(human[c]||c)}" class="${c==='saldo'?'saldo':(['a_pagar','boleta','monto_original','total_pagado'].includes(c)?'money':'')}">${val(r,c)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${cols.length}" class="empty">Sin datos.</td></tr>`}</tbody></table></div></div>`;
}
loginView();


/* ===== V10 OVERRIDES ===== */
function goModule(m){state.active=m;shell();render()}
function openDataWindow(title,subtitle,body){
  const w=window.open('','_blank'); if(!w){alert('Permite ventanas emergentes para abrir el reporte.');return null}
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><link rel="stylesheet" href="/css/legacy/v174/legacy-007.css?v=174">
<link rel="stylesheet" id="v14-style" href="/css/legacy/v174/v14-style.css?v=174">

<link rel="stylesheet" id="v17-style" href="/css/legacy/v174/v17-style.css?v=174">

<link rel="stylesheet" id="v55-premium-rym" href="/css/legacy/v174/v55-premium-rym.css?v=174">
</head><body><div class="wrap"><div class="head"><h1>${esc(title)}</h1><p>${esc(subtitle||'Portal RYM')}</p></div>${body}</div>


<link rel="stylesheet" id="rym-v62-orange-light-theme" href="/css/legacy/v174/rym-v62-orange-light-theme.css?v=174">



</body></html>`);w.document.close();return w
}
function rowsTable(rows,cols){return `<div class="mail"><table><thead><tr>${cols.map(c=>`<th>${esc(c.replaceAll('_',' '))}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c]??'')}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${cols.length}">Sin datos.</td></tr>`}</tbody></table></div>`}

const _dashboardV9=dashboard;
dashboard=async function(v){await _dashboardV9(v);document.querySelectorAll('#view .kpi.hero').forEach((el,i)=>{el.classList.add('clickable');el.title='Abrir detalle';el.onclick=()=>goModule(['historial','negativos_hoy','pagos_hoy','recurrentes'][i])});const q=document.querySelector('#view .quick-card');if(q){q.classList.add('clickable');q.style.cursor='pointer';q.onclick=()=>goModule('historial')}};

const _negativosV9=negativos;
negativos=async function(v){await _negativosV9(v);const f=document.querySelector('#negFecha');if(f){f.removeAttribute('min');f.title='Puedes seleccionar cualquier fecha histórica disponible'}};

recurrentes=async function(v){
 const minf=state.meta?.min_pago||'2025-01-02',maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10),now=new Date(maxf+'T12:00:00'),monthStart=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`,gals=Array.isArray(state.meta?.galeras)?state.meta.galeras.filter(Boolean):[];
 v.innerHTML=`<div class="source-card"><span class="entity-chip">RECURRENTES</span><div class="source-text"><strong>Frecuencia separada por operador o por unidad</strong><p>Selecciona qué análisis quieres ver. No se mezclan ambas métricas.</p></div></div><div class="section-tools"><div class="recurrent-mode"><button id="rOp" class="active">Frecuencia por operador</button><button id="rUn" class="soft-btn">Frecuencia por unidad</button></div><div class="field"><label>Galera</label><select id="rg"><option value="">Todas las visibles</option>${gals.map(g=>`<option>${esc(g)}</option>`).join('')}</select></div><div class="field"><label>Desde</label><input id="rd" type="date" value="${monthStart}" min="${minf}" max="${maxf}"></div><div class="field"><label>Hasta</label><input id="rh" type="date" value="${maxf}" min="${minf}" max="${maxf}"></div><div class="field"><label>Mínimo pagos</label><input id="rmin" type="number" min="2" max="20" value="5"></div><button id="rb">Analizar</button></div><div id="rout"></div>`;
 let mode='OPERADOR';const setMode=m=>{mode=m;document.querySelector('#rOp').className=m==='OPERADOR'?'active':'soft-btn';document.querySelector('#rUn').className=m==='UNIDAD'?'active':'soft-btn';run()};
 async function run(){const o=document.querySelector('#rout');o.innerHTML='<div class="card">Analizando...</div>';try{const all=await rpc('panapass_recurrentes_entidad',{p_desde:document.querySelector('#rd').value,p_hasta:document.querySelector('#rh').value,p_galera:document.querySelector('#rg').value||null,p_min_pagos:Number(document.querySelector('#rmin').value||5),p_limit:1500});const rows=all.filter(x=>x.tipo_entidad===mode);const cols=mode==='OPERADOR'?['mes','identificador','nombre','galera','unidad','supervisora','pagos','dias_con_pago','total_pagado','nivel']:['mes','identificador','galera','supervisora','pagos','dias_con_pago','total_pagado','nivel'];o.innerHTML=`<div class="kpis"><div class="kpi"><span>${mode==='OPERADOR'?'Operadores':'Unidades'} recurrentes</span><strong>${rows.length}</strong></div><div class="kpi"><span>Críticos 8+</span><strong>${rows.filter(x=>x.nivel==='CRITICO').length}</strong></div></div>${tableHtml(rows,cols,'pretty compact-table','mobile-cards')}`}catch(x){o.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
 document.querySelector('#rOp').onclick=()=>setMode('OPERADOR');document.querySelector('#rUn').onclick=()=>setMode('UNIDAD');document.querySelector('#rb').onclick=run;await run();
};

const _operacionesV9=operaciones;
operaciones=async function(v){await _operacionesV9(v);const root=document.querySelector('#opRoot');if(!root)return;const box=document.createElement('div');box.className='cobra-box';box.style.marginTop='14px';box.innerHTML=`<h3 style="margin-top:0">Carga Cobra</h3><p class="muted">Prepara PRE DIARIO en el formato exacto de Cobra: Unidad, Operador, Monto (Con_boleta) y Fecha de carga. Luego valida el resultado contra Cobra y lo guarda en Supabase.</p><div class="section-tools"><div class="field"><label>Fecha</label><input id="cobraCargaFecha" type="date" value="${state.meta?.max_pago||state.today||new Date().toISOString().slice(0,10)}"></div><button id="cobraPreparar">Preparar carga</button><button id="cobraValidarOp" class="soft-btn">Validar Cobra</button></div><div id="cobraCargaOut"></div>`;root.appendChild(box);
 document.querySelector('#cobraPreparar').onclick=async()=>{const o=document.querySelector('#cobraCargaOut'),f=document.querySelector('#cobraCargaFecha').value;o.innerHTML='<div class="card">Preparando PRE DIARIO...</div>';try{const rows=(await rpc('panapass_pagos_fecha',{p_fecha:f})).filter(x=>String(x.tipo||'').toUpperCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim()==='PRE DIARIO'&&Number(x.boleta||0)>0);const hoyCobra=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Panama',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date());const txt=rows.map(r=>[r.unidad||'',r.n_op||'',Number(r.boleta||0).toFixed(2),hoyCobra].join('\t')).join('\n');o.innerHTML=`<div class="success"><b>${rows.length} registros preparados.</b> Formato Cobra: Unidad · Operador · Monto · Fecha.</div><div class="muted" style="margin-top:6px">El monto corresponde a Con_boleta y la fecha enviada a Cobra es la fecha de carga de hoy (${esc(hoyCobra)}). No se copia encabezado.</div><textarea id="cobraTexto" style="width:100%;height:180px;margin-top:10px">${esc(txt)}</textarea><button id="cobraCopy" style="margin-top:8px">Copiar carga Cobra</button>`;document.querySelector('#cobraCopy').onclick=async()=>{await navigator.clipboard.writeText(txt);document.querySelector('#cobraCopy').textContent='Copiado ✓'}}catch(x){o.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
 document.querySelector('#cobraValidarOp').onclick=async()=>{const o=document.querySelector('#cobraCargaOut'),f=document.querySelector('#cobraCargaFecha').value;o.innerHTML='<div class="card">Validando Cobra...</div>';try{const d=await cobraValidate(f,f,{soloNoValidados:true});o.innerHTML=`<div class="success">${esc(d.mensaje||'Validación completada')} · guardados ${d.guardados||0}</div>`}catch(x){o.innerHTML=`<div class="alert">${esc(x.message)}</div>`}};
};

reportes=async function(v){
 if(!state.modules.includes('reportes')){v.innerHTML='<div class="alert">Sin permiso para Reportes.</div>';return}
 const hoy=state.today||new Date().toISOString().slice(0,10),ini=hoy.slice(0,8)+'01';
 let mail={};try{mail=(await rpc('correo_estado'))?.[0]||{}}catch(_){};
 v.innerHTML=`<div class="source-card"><span class="entity-chip">CENTRO DE REPORTES</span><div class="source-text"><strong>Reportes digitales independientes</strong><p>Cada reporte abre en su propia pantalla, con diseño limpio para revisión, captura y correo.</p></div></div><div class="${mail.enabled?'success':'source-card'}" style="margin-top:10px"><b>Correo: ${mail.enabled?'ACTIVO':'PREPARADO · PENDIENTE RESEND/DNS'}</b><div class="muted">${mail.enabled?('Remitente: '+esc(mail.from_email||'-')):'La biblioteca, cola, plantillas e historial ya están preparados. No se enviará ningún correo hasta habilitar Resend.'}</div></div><div class="section-tools"><div class="field"><label>Desde</label><input id="repDesde" type="date" value="${ini}"></div><div class="field"><label>Hasta</label><input id="repHasta" type="date" value="${hoy}"></div></div><div class="report-grid">
 <div class="report-card"><h3>Negativos AM por Galera</h3><p>Reporte real del corte AM agrupado por galera/supervisora.</p><button id="rNeg">Abrir reporte</button></div>
 <div class="report-card"><h3>Pagos por Galera</h3><p>Pagos reales por rango, galera y supervisora.</p><button id="rPag">Abrir reporte</button></div>
 <div class="report-card"><h3>Pagos · 4 Galeras</h3><p>Consolidado general de VCARS, VCOMP, VIPCO y VINDU.</p><button id="r4">Abrir consolidado</button></div>
 <div class="report-card"><h3>Fondeo Administración</h3><p>Empresa + monto realmente pagado; sin boleta.</p><button id="rFon">Abrir fondeo</button></div>
 <div class="report-card"><h3>PRE NO DIARIO</h3><p>Consulta digital por rango para la ruta especial de Cobra.</p><button id="rNoPre">Abrir PRE NO DIARIO</button></div>
 <div class="report-card"><h3>Bajas Panapass</h3><p>Control de Auto vs último corte ENA para gestionar bajas.</p><button id="rBajas">Abrir bajas</button></div></div>`;
 const range=()=>({p_desde:document.querySelector('#repDesde').value,p_hasta:document.querySelector('#repHasta').value});
 document.querySelector('#rNeg').onclick=async()=>{const f=document.querySelector('#repHasta').value,rows=await rpc('panapass_negativos_fecha',{p_fecha:f});const total=rows.reduce((a,x)=>a+Number(x.saldo||0),0);openDataWindow('Negativos AM por Galera',`Fecha ${f}`,`<div class="outlook"><b>Reporte de Negativos AM</b><div class="muted">Preparado para compartir por galera y supervisora.</div></div><div class="kpis"><div class="k">Unidades<b>${rows.length}</b></div><div class="k">Saldo total<b>${money(total)}</b></div></div>${rowsTable(rows,['supervisora','unidad','placa','panapass_numero','empresa','neg7','saldo'])}`)};
 document.querySelector('#rPag').onclick=async()=>{const r=range(),rows=await rpc('panapass_reporte_pagos_rango',{...r,p_galera:null});openDataWindow('Pagos por Galera',`${r.p_desde} → ${r.p_hasta}`,`<div class="outlook"><b>Reporte de Pagos</b><div class="muted">Detalle por galera, supervisora y unidad.</div></div>${rowsTable(rows,['fecha','galera','supervisora','unidad','empresa','a_pagar','operador','cobrador','tipo'])}`)};
 document.querySelector('#r4').onclick=async()=>{const r=range(),rows=await rpc('panapass_reporte_pagos_rango',{...r,p_galera:null}),sum={};rows.forEach(x=>sum[x.galera]=(sum[x.galera]||0)+Number(x.a_pagar||0));const a=Object.entries(sum).map(([galera,monto])=>({galera,monto:monto.toFixed(2),registros:rows.filter(x=>x.galera===galera).length}));openDataWindow('Pagos · 4 Galeras',`${r.p_desde} → ${r.p_hasta}`,rowsTable(a,['galera','registros','monto']))};
 document.querySelector('#rFon').onclick=async()=>{const r=range(),rows=await rpc('panapass_reporte_fondeo',r),total=rows.reduce((a,x)=>a+Number(x.monto||0),0);openDataWindow('Fondeo Administración',`${r.p_desde} → ${r.p_hasta}`,`<div class="outlook"><b>Resumen para fondeo</b><div class="muted">Importe realmente pagado. No incluye recargo interno de boleta.</div></div><div class="kpis"><div class="k">Total fondeo<b>${money(total)}</b></div><div class="k">Empresas<b>${rows.length}</b></div></div>${rowsTable(rows,['empresa','registros','monto'])}`)};
 document.querySelector('#rNoPre').onclick=async()=>{const r=range(),rows=await rpc('panapass_reporte_no_pre_diario',r);openDataWindow('PRE NO DIARIO',`${r.p_desde} → ${r.p_hasta}`,rowsTable(rows,['fecha','galera','empresa','unidad','placa','panapass_numero','a_pagar','numero_operador','nombre_operador','cobrador','tipo','estado_cobra']))};
 document.querySelector('#rBajas').onclick=async()=>{const rows=await rpc('panapass_reporte_bajas_v2');openDataWindow('Bajas Panapass','Control de Auto vs ENA',`<div class="outlook"><b>Gestión de bajas</b><div class="muted">Unidades no activas en Control de Auto que todavía aparecen en ENA.</div></div>${rowsTable(rows,['galera','administrador','empresa','unidad','placa','panapass_numero','estatus_control','ultima_lectura','saldo','cantidad_tags','tags_ena','accion'])}`)};
};


/* V11 functional refinements */
function v11Status(x){const n=norm(x),ok=['ACTIVO','ACTIVA','ACTIVE'].includes(n);return `<span class="status-v11 ${ok?'ok':'bad'}">${esc(x||'SIN ESTATUS')}</span>`}
function v11Unit(u,c){let bg=c||'#edf2f8';return `<span class="unit-v11" style="background:${esc(bg)}">${esc(u||'')}</span>`}

async function v11UnitList(){
 state.active='dashboard';shell();const v=document.querySelector('#view');v.innerHTML='<div class="card">Cargando unidades...</div>';
 try{const rows=await rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:3000});
 v.innerHTML=`<div class="source-card"><span class="entity-chip">UNIDADES</span><div class="source-text"><strong>Control de Auto</strong><p>Detalle de las unidades bajo tu alcance.</p></div></div><div class="section-tools"><div class="field"><label>Buscar</label><input id="v11q" placeholder="Unidad, placa, Panapass o empresa"></div><button id="v11b">Buscar</button></div><div id="v11o"></div>`;
 const draw=a=>document.querySelector('#v11o').innerHTML=`<div class="table-wrap"><table><thead><tr><th>Estatus</th><th>Unidad</th><th>Placa</th><th>Panapass</th><th>Empresa</th><th>Supervisora</th><th>Galera</th><th>Marca</th><th>Modelo</th><th>Año</th></tr></thead><tbody>${a.map(r=>`<tr><td>${v11Status(r.estatus)}</td><td>${v11Unit(r.unidad,r.color)}</td><td>${esc(r.placa)}</td><td>${esc(r.panapass_numero)}</td><td style="text-align:left">${esc(r.empresa)}</td><td>${esc(r.supervisora)}</td><td>${esc(r.galera)}</td><td>${esc(r.marca)}</td><td>${esc(r.modelo)}</td><td>${esc(r.anio)}</td></tr>`).join('')}</tbody></table></div>`;
 draw(rows);document.querySelector('#v11b').onclick=()=>{let q=norm(document.querySelector('#v11q').value);draw(rows.filter(r=>!q||norm(Object.values(r).join(' ')).includes(q)))};
 }catch(e){v.innerHTML=`<div class="alert">${esc(e.message)}</div>`}
}

const _v11dash=dashboard;
dashboard=async function(v){await _v11dash(v);let k=[...v.querySelectorAll('.kpi')];if(k[0])k[0].onclick=v11UnitList;if(k[1])k[1].onclick=()=>goModule('negativos_hoy');if(k[2])k[2].onclick=()=>goModule('pagos_hoy');if(k[3])k[3].onclick=()=>goModule('recurrentes')}

const _v11neg=negativos;
negativos=async function(v){await _v11neg(v);try{const f=document.querySelector('#negFecha')?.value;if(!f)return;const [rows,units]=await Promise.all([rpc('panapass_negativos_fecha',{p_fecha:f}),rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:3000})]);const mm=new Map(units.map(x=>[norm(x.unidad),x]));let tb=document.querySelector('#negOut tbody');if(tb)tb.innerHTML=rows.map(r=>{let m=mm.get(norm(r.unidad))||{};return `<tr><td>${esc(r.fecha)}</td><td>${v11Status(r.status)}</td><td>${v11Unit(r.unidad,m.color)}</td><td>${esc(r.placa)}</td><td>${esc(r.panapass_numero)}</td><td style="text-align:left">${esc(r.empresa)}</td><td>${chipNum(r.neg7)}</td><td class="neg">${money(r.saldo)}</td></tr>`}).join('')}catch{}}

async function historial(v){
 v.innerHTML=`<div class="source-card"><span class="entity-chip">HISTORIAL / PENDIENTE A COBRA</span><div class="source-text"><strong>Consulta unificada</strong><p>Busca por unidad u operador.</p></div></div><div class="v11-tabs"><button id="v11all">Historial</button><button id="v11cobra" class="soft-btn">Pendiente a Cobra</button></div><div class="section-tools"><div class="field"><label>Unidad</label><input id="v11u"></div><div class="field"><label>Operador</label><input id="v11op"></div><div class="field"><label>Desde</label><input id="v11d" type="date"></div><div class="field"><label>Hasta</label><input id="v11h" type="date"></div><button id="v11go">Consultar</button></div><div id="v11hist"></div>`;
 let mode='ALL';const run=async()=>{let o=document.querySelector('#v11hist');o.innerHTML='<div class="card">Consultando...</div>';try{let rows=await rpc('panapass_historial',{p_unidad:document.querySelector('#v11u').value||null,p_operador:document.querySelector('#v11op').value||null,p_desde:document.querySelector('#v11d').value||null,p_hasta:document.querySelector('#v11h').value||null,p_limit:1500});if(mode==='COBRA')rows=rows.filter(x=>['','PENDIENTE','NO VALIDADO','ERROR'].includes(norm(x.estado_cobra)));o.innerHTML=tableHtml(rows,['fecha','status','unidad','placa','panapass_numero','empresa','a_pagar','boleta','n_op','operador','cobrador','tipo','estado_cobra'],'pretty compact-table','mobile-cards')}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};
 document.querySelector('#v11all').onclick=()=>{mode='ALL';run()};document.querySelector('#v11cobra').onclick=()=>{mode='COBRA';run()};document.querySelector('#v11go').onclick=run;run()
}
pendientesExterno=historial;

async function recurrentes(v){
 const dt=new Date(),mes=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
 v.innerHTML=`<div class="source-card"><span class="entity-chip">RECURRENTES</span><div class="source-text"><strong>Frecuencia mensual</strong><p>Selecciona operador o unidad.</p></div></div><div class="v11-right"><button id="v11rop">Por operador</button><button id="v11run" class="soft-btn">Por unidad</button><div class="field"><label>Mes</label><input id="v11mes" type="month" value="${mes}"></div><div class="field"><label>Mínimo</label><input id="v11min" type="number" value="5" min="2"></div><button id="v11rb">Consultar</button></div><div id="v11rout"></div>`;
 let mode='OPERADOR';const run=async()=>{let [y,m]=document.querySelector('#v11mes').value.split('-').map(Number),desde=`${y}-${String(m).padStart(2,'0')}-01`,hasta=new Date(y,m,0).toISOString().slice(0,10),o=document.querySelector('#v11rout');try{let rows=await rpc('panapass_recurrentes_entidad',{p_desde:desde,p_hasta:hasta,p_galera:null,p_min_pagos:Number(document.querySelector('#v11min').value||5),p_limit:2000});rows=rows.filter(x=>x.tipo_entidad===mode);o.innerHTML=tableHtml(rows,mode==='OPERADOR'?['mes','identificador','nombre','unidad','supervisora','pagos','dias_con_pago','total_pagado','nivel']:['mes','identificador','supervisora','pagos','dias_con_pago','total_pagado','nivel'],'pretty compact-table','mobile-cards')}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};
 document.querySelector('#v11rop').onclick=()=>{mode='OPERADOR';run()};document.querySelector('#v11run').onclick=()=>{mode='UNIDAD';run()};document.querySelector('#v11rb').onclick=run;run()
}

const _v11rank=ranking;
ranking=async function(v){await _v11rank(v);v.querySelectorAll('.source-card').forEach(x=>x.remove());let t=v.querySelector('.section-tools');if(t){t.style.justifyContent='flex-end';t.style.marginBottom='8px'}}


/* ===== V12 CORRECCIONES CONSOLIDADAS ===== */
const _v12Shell=shell;
shell=function(){
  _v12Shell();
  document.querySelectorAll('[data-m="pendientes_externo"]').forEach(x=>x.remove());
  const h=document.querySelector('[data-m="historial"]'); if(h)h.textContent='Historial / Pendiente a Cobra';
  const title=document.querySelector('.top h1'); if(title&&(state.active==='historial'||state.active==='pendientes_externo'))title.textContent='Historial / Pendiente a Cobra';
};
const _v12Render=render;
render=async function(){if(state.active==='pendientes_externo'){state.active='historial';shell();return historial(document.querySelector('#view'))}return _v12Render()};

async function v12UnitMap(){try{const a=await rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:5000});return new Map(a.map(x=>[norm(x.unidad),x]))}catch{return new Map()}}
function v12Status(x){const n=norm(x),ok=['ACTIVO','ACTIVA','ACTIVE'].includes(n),closed=['CERRADO','CERRADA','INACTIVO','INACTIVA','CLOSED'].includes(n);return `<span class="status-v11 ${ok?'ok':closed?'bad':''}">${esc(x||'SIN ESTATUS')}</span>`}
function v12TextColor(bg){let h=String(bg||'').replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');if(!/^[0-9a-f]{6}$/i.test(h))return '#0b2a64';let r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return (r*299+g*587+b*114)/1000>150?'#0b2a64':'#fff'}
function v12Unit(u,c){const bg=c||'#edf2f8';return `<span class="unit-v11" style="background:${esc(bg)};color:${v12TextColor(bg)}">${esc(u||'')}</span>`}
function v12Rows(rows,map,cols){const human={fecha:'Fecha',status:'Estatus',unidad:'Unidad',placa:'Placa',panapass_numero:'Panapass',empresa:'Empresa',neg7:'Neg. 7d',saldo:'Saldo',a_pagar:'A pagar',boleta:'Boleta',pag7:'Pag. 7d',n_op:'N_OP',operador:'Operador',cobrador:'Cobrador',tipo:'Tipo',estado_cobra:'Estado Cobra'};const cell=(r,c)=>{let m=map.get(norm(r.unidad))||{};if(c==='status')return v12Status(r[c]||m.estatus);if(c==='unidad')return v12Unit(r[c],m.color);if(c==='neg7'||c==='pag7')return chipNum(r[c]);if(c==='estado_cobra')return cobraChip(r[c]);if(['a_pagar','boleta'].includes(c))return money(r[c]);return esc(r[c]??'')};return `<div class="panel mobile-cards"><div class="table-wrap"><table class="pretty compact-table"><thead><tr>${cols.map(c=>`<th>${human[c]||c}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${cols.map(c=>`<td data-label="${human[c]||c}" style="${c==='empresa'?'text-align:left':''}">${cell(r,c)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${cols.length}" class="empty">Sin datos.</td></tr>`}</tbody></table></div></div>`}

negativos=async function(v){
 const maxf=state.today||state.meta?.max_snapshot||new Date().toISOString().slice(0,10),minf=state.meta?.min_snapshot||'2025-01-01';
 v.innerHTML=`<div class="section-tools"><div class="field"><label>Fecha</label><input id="negFecha" type="date" min="${minf}" max="${maxf}" value="${maxf}"></div><div class="field"><label>Buscar</label><input id="negQ" placeholder="Unidad, placa o empresa"></div><button id="negBuscar">Consultar</button><button id="negCompact" class="soft-btn">Vista captura</button></div><div id="negOut"></div>`;
 const um=await v12UnitMap(); let all=[];
 const draw=async()=>{const f=document.querySelector('#negFecha').value,o=document.querySelector('#negOut');o.innerHTML='<div class="card">Consultando...</div>';try{all=await rpc('panapass_negativos_fecha',{p_fecha:f});let q=norm(document.querySelector('#negQ').value),rows=q?all.filter(r=>norm([r.unidad,r.placa,r.empresa,r.panapass_numero].join(' ')).includes(q)):all,total=rows.reduce((a,x)=>a+Number(x.saldo||0),0),mx=rows.reduce((a,x)=>Math.max(a,Number(x.neg7||0)),0);o.innerHTML=`<div class="capture-title"><h2>Negativos Panapass · ${esc(f)}</h2><small>Detalle de unidades en negativo</small></div><div class="kpis"><div class="kpi"><span>Unidades</span><strong>${rows.length}</strong></div><div class="kpi"><span>Saldo total</span><strong style="color:var(--red)">${money(total)}</strong></div><div class="kpi"><span>Máx neg 7d</span><strong>${mx}</strong></div><div class="kpi"><span>Riesgo</span><strong>${mx>=3?'ALERTA':mx===2?'CUIDADO':'OK'}</strong></div></div>${v12Rows(rows,um,['fecha','status','unidad','placa','panapass_numero','empresa','neg7','saldo'])}`}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};
 document.querySelector('#negBuscar').onclick=draw;document.querySelector('#negQ').oninput=draw;document.querySelector('#negCompact').onclick=e=>toggleCapture(e.currentTarget,'#negOut');await draw();
};

pagosConsultaHoy=async function(v){
 const hoy=state.today||new Date().toISOString().slice(0,10),minf=state.meta?.min_pago||'2025-01-01';
 v.innerHTML=`<div class="section-tools"><div class="field"><label>Fecha</label><input id="supPayFecha" type="date" min="${minf}" max="${hoy}" value="${hoy}"></div><div class="field"><label>Buscar</label><input id="supPayQ" placeholder="Unidad, operador o empresa"></div><button id="supPayLoad">Consultar</button><button id="supPayCapture" class="soft-btn">Vista captura</button></div><div id="supPayOut"></div>`;
 const um=await v12UnitMap();let all=[];const paint=()=>{let q=norm(document.querySelector('#supPayQ').value),d=q?all.filter(x=>norm([x.unidad,x.operador,x.n_op,x.empresa,x.cobrador].join(' ')).includes(q)):all,total=d.reduce((a,x)=>a+Number(x.a_pagar||0),0);document.querySelector('#supPayOut').innerHTML=`<div class="capture-title"><h2>Pagos Panapass · ${esc(document.querySelector('#supPayFecha').value)}</h2><small>Pagos registrados</small></div><div class="kpis"><div class="kpi"><span>Pagos</span><strong>${d.length}</strong></div><div class="kpi"><span>Total pagado</span><strong style="color:var(--green)">${money(total)}</strong></div></div>${v12Rows(d,um,['fecha','status','unidad','placa','panapass_numero','empresa','a_pagar','boleta','pag7','n_op','operador','tipo','estado_cobra'])}`};const load=async()=>{try{all=await rpc('panapass_pagos_fecha',{p_fecha:document.querySelector('#supPayFecha').value});paint()}catch(e){document.querySelector('#supPayOut').innerHTML=`<div class="alert">${esc(e.message)}</div>`}};document.querySelector('#supPayLoad').onclick=load;document.querySelector('#supPayQ').oninput=paint;document.querySelector('#supPayCapture').onclick=e=>toggleCapture(e.currentTarget,'#supPayOut');await load();
};

const _v12PagosTrabajo=pagosTrabajo;
pagosTrabajo=async function(v){await _v12PagosTrabajo(v);const tools=v.querySelector('.section-tools');if(tools&&!v.querySelector('#adminPayCapture')){const b=document.createElement('button');b.id='adminPayCapture';b.className='soft-btn';b.textContent='Vista captura';b.onclick=e=>toggleCapture(e.currentTarget,'#pmOut');tools.appendChild(b)}};

historial=async function(v){
 const minf=state.meta?.min_pago||'2025-01-01',maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10);v.innerHTML=`<div class="v11-tabs"><button id="histAll">Historial</button><button id="histCobra" class="soft-btn">Pendiente a Cobra</button></div><div class="section-tools"><div class="field"><label>Unidad</label><input id="hu" placeholder="Unidad"></div><div class="field"><label>Operador / N_OP</label><input id="ho" placeholder="Operador o número"></div><div class="field"><label>Desde</label><input id="hd" type="date" value="${minf}"></div><div class="field"><label>Hasta</label><input id="hh" type="date" value="${maxf}"></div><button id="hb">Buscar</button></div><div id="histOut"></div>`;let mode='ALL';const run=async()=>{let o=document.querySelector('#histOut');o.innerHTML='<div class="card">Consultando...</div>';try{let rows=await rpc('panapass_historial',{p_unidad:document.querySelector('#hu').value||null,p_operador:document.querySelector('#ho').value||null,p_desde:document.querySelector('#hd').value||null,p_hasta:document.querySelector('#hh').value||null,p_limit:1500});if(mode==='COBRA')rows=rows.filter(x=>['','PENDIENTE','NO VALIDADO','ERROR'].includes(norm(x.estado_cobra)));o.innerHTML=tableHtml(rows,['fecha','unidad','panapass_numero','a_pagar','boleta','n_op','operador','cobrador','tipo','estado_cobra'],'pretty compact-table','mobile-cards')}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};document.querySelector('#histAll').onclick=()=>{mode='ALL';document.querySelector('#histAll').className='';document.querySelector('#histCobra').className='soft-btn';run()};document.querySelector('#histCobra').onclick=()=>{mode='COBRA';document.querySelector('#histCobra').className='';document.querySelector('#histAll').className='soft-btn';run()};document.querySelector('#hb').onclick=run;await run();
};

recurrentes=async function(v){const base=state.meta?.max_pago||new Date().toISOString().slice(0,10),d=new Date(base+'T12:00:00'),mes=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;v.innerHTML=`<div class="v11-right"><button id="rOp">Por operador</button><button id="rUn" class="soft-btn">Por unidad</button><div class="field"><label>Mes</label><input id="rMes" type="month" value="${mes}"></div><div class="field"><label>Mínimo pagos</label><input id="rMin" type="number" min="2" max="20" value="5"></div><button id="rGo">Consultar</button></div><div id="rout"></div>`;let mode='OPERADOR';const run=async()=>{let [y,m]=document.querySelector('#rMes').value.split('-').map(Number),desde=`${y}-${String(m).padStart(2,'0')}-01`,hasta=new Date(y,m,0).toISOString().slice(0,10),o=document.querySelector('#rout');try{let rows=await rpc('panapass_recurrentes_entidad',{p_desde:desde,p_hasta:hasta,p_galera:null,p_min_pagos:Number(document.querySelector('#rMin').value||5),p_limit:2000});rows=rows.filter(x=>x.tipo_entidad===mode);o.innerHTML=tableHtml(rows,mode==='OPERADOR'?['mes','identificador','nombre','unidad','supervisora','pagos','dias_con_pago','total_pagado','nivel']:['mes','identificador','supervisora','pagos','dias_con_pago','total_pagado','nivel'],'pretty compact-table','mobile-cards')}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};document.querySelector('#rOp').onclick=()=>{mode='OPERADOR';run()};document.querySelector('#rUn').onclick=()=>{mode='UNIDAD';run()};document.querySelector('#rGo').onclick=run;await run()};

const _v12Ranking=ranking;
ranking=async function(v){await _v12Ranking(v);const first=v.querySelector('.source-card');if(first)first.remove();const tools=v.querySelector('.section-tools');if(tools){tools.style.justifyContent='flex-end';tools.style.margin='0 0 8px auto'}};


/* ===== V13 FINAL: perfiles y Pagos Hoy con colores ===== */
async function openSupervisoraProfile(id){
  let modal=document.querySelector('#supProfileModal');
  if(!modal){modal=document.createElement('div');modal.id='supProfileModal';modal.className='modal';document.body.appendChild(modal)}
  modal.style.display='flex';modal.innerHTML='<div class="modal-card" style="max-width:1180px;width:94vw"><div class="table-summary"><h2>Perfil operativo</h2><button class="soft-btn" id="supClose">Cerrar</button></div><div class="card">Cargando información...</div></div>';
  document.querySelector('#supClose').onclick=()=>modal.style.display='none';
  try{
    const d=await rpc('panapass_supervisora_perfil',{p_supervisora_id:id}),s=d.supervisora||{},k=d.kpis||{},rows=d.unidades||[];
    const um=new Map(rows.map(x=>[norm(x.unidad),x]));
    modal.innerHTML=`<div class="modal-card" style="max-width:1180px;width:94vw;max-height:92vh;overflow:auto">
      <div class="table-summary"><div><h2 style="margin:0">${esc(s.nombre||'Supervisora')}</h2><span class="muted">${esc(s.galera||'')} · ${esc(s.email||'')}</span></div><button class="soft-btn" id="supClose">Cerrar</button></div>
      <div class="kpis">
        <div class="kpi"><span>Unidades</span><strong>${k.unidades||0}</strong></div>
        <div class="kpi"><span>Negativas ahora</span><strong>${k.negativas_ahora||0}</strong></div>
        <div class="kpi"><span>Pagadas mes</span><strong>${k.unidades_pagadas_mes||0}</strong></div>
        <div class="kpi"><span>Monto mes</span><strong>${money(k.monto_mes||0)}</strong></div>
      </div>
      ${v12Rows(rows,um,['status','unidad','placa','panapass_numero','empresa','saldo'])}
      <div class="panel mobile-cards" style="margin-top:12px"><div class="rank-table-title"><h3>Comportamiento mensual</h3><span>Recurrencia por unidad</span></div>${tableHtml(rows,['unidad','neg7','pagos_mes','dias_mes','total_mes'],'pretty compact-table','mobile-cards')}</div>
      ${(d.rotaciones||[]).length?`<div class="card"><h3>Rotaciones</h3>${tableHtml(d.rotaciones,['galera_anterior','galera_nueva','cambio_en'],'pretty compact-table','mobile-cards')}</div>`:''}
    </div>`;
    document.querySelector('#supClose').onclick=()=>modal.style.display='none';
  }catch(x){modal.innerHTML=`<div class="modal-card"><div class="alert">${esc(x.message)}</div><button id="supClose">Cerrar</button></div>`;document.querySelector('#supClose').onclick=()=>modal.style.display='none'}
}

const _v13PagosTrabajo=pagosTrabajo;
pagosTrabajo=async function(v){
  const units=await rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:5000}).catch(()=>[]);
  const um=new Map(units.map(x=>[norm(x.unidad),x]));
  await _v13PagosTrabajo(v);
  const paint=()=>{
    v.querySelectorAll('#pmOut tbody tr').forEach(tr=>{
      if(tr.dataset.metaApplied==='1')return;
      const raw=String(tr.dataset.payRowUnit||tr.querySelector('[data-pay-unit]')?.textContent||'').trim();
      if(!raw)return;
      const meta=um.get(norm(raw));
      if(!meta)return;
      const empresa=String(tr.querySelector('[data-pay-company]')?.textContent||'').trim()||meta.empresa_duena||meta.empresa||meta.empresa_operadora||'';
      const placa=meta.placa||meta.placa_unica||meta.placa_comercial||'';
      const panapass=meta.panapass_numero||meta.panapass||'';
      const unitCell=tr.querySelector('[data-pay-unit-cell]');
      if(unitCell)unitCell.innerHTML=`${v17UnitBadge(raw,meta.color)}<small data-pay-company>${esc(empresa)}</small>`;
      const panCell=tr.querySelector('[data-pay-panapass]');if(panCell)panCell.textContent=panapass||'';
      const plateCell=tr.querySelector('[data-pay-plate]');if(plateCell)plateCell.textContent=placa||'';
      tr.dataset.metaApplied='1';
    });
  };
  paint();
  if(window.__v36PagosObserver){try{window.__v36PagosObserver.disconnect()}catch(_){}} const obs=new MutationObserver(paint); window.__v36PagosObserver=obs; const target=v.querySelector('#pmOut'); if(target)obs.observe(target,{childList:true,subtree:true});
}


/* ===== V14 UI + COBRA + SEMANTICA EMPRESA/GALERA ===== */
const _v14Shell=shell;
shell=function(){
  _v14Shell();
  const side=document.querySelector('.sidebar');
  if(side){
    side.classList.add('sidebar-v14');
    const nav=side.querySelector('nav');
    if(nav && !nav.querySelector('.nav-section-v14')){
      const t=document.createElement('div'); t.className='nav-section-v14'; t.textContent='OPERACIÓN';
      nav.prepend(t);
    }
  }
};

const _v14V12Rows=v12Rows;
v12Rows=function(rows,map,cols){
  let html=_v14V12Rows(rows,map,cols);
  html=html.replace(/<th>Empresa<\/th>/g,'<th style="text-align:center">Empresa</th>')
           .replace(/data-label="Empresa" style="text-align:left"/g,'data-label="Empresa" style="text-align:center"');
  return html;
};

historial=async function(v){
 const minf=state.meta?.min_pago||'2025-01-01',maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10);
 v.innerHTML=`<div class="v11-tabs"><button id="histAll">Historial</button><button id="histCobra" class="soft-btn">Pendiente a Cobra</button></div>
 <div class="section-tools"><div class="field"><label>Unidad</label><input id="hu" placeholder="Unidad"></div><div class="field"><label>Operador / N_OP</label><input id="ho" placeholder="Operador o número"></div><div class="field"><label>Desde</label><input id="hd" type="date" value="${minf}"></div><div class="field"><label>Hasta</label><input id="hh" type="date" value="${maxf}"></div><button id="hb">Buscar</button></div><div id="histOut"></div>`;
 let mode='ALL';
 const isPending=x=>{
   const e=norm(x.estado_cobra);
   return !e || e==='NO CARGADO' || e==='NO CARGADO A COBRA' || e.includes('REVISAR COBRA') || e.includes('PENDIENTE') || e.includes('ERROR');
 };
 const run=async()=>{
   let o=document.querySelector('#histOut');o.innerHTML='<div class="card">Consultando...</div>';
   try{
     let rows=await rpc('panapass_historial',{p_unidad:document.querySelector('#hu').value||null,p_operador:document.querySelector('#ho').value||null,p_desde:document.querySelector('#hd').value||null,p_hasta:document.querySelector('#hh').value||null,p_limit:2500});
     if(mode==='COBRA') rows=rows.filter(isPending);
     o.innerHTML=tableHtml(rows,['fecha','unidad','panapass_numero','a_pagar','boleta','n_op','operador','cobrador','tipo','estado_cobra'],'pretty compact-table','mobile-cards');
   }catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}
 };
 const setMode=m=>{
   mode=m;
   document.querySelector('#histAll').className=m==='ALL'?'':'soft-btn';
   document.querySelector('#histCobra').className=m==='COBRA'?'':'soft-btn';
   run();
 };
 document.querySelector('#histAll').onclick=()=>setMode('ALL');
 document.querySelector('#histCobra').onclick=()=>setMode('COBRA');
 document.querySelector('#hb').onclick=run;
 await run();
};

const _v14PagosConsultaHoy=pagosConsultaHoy;
pagosConsultaHoy=async function(v){
 await _v14PagosConsultaHoy(v);
 const wrap=v.querySelector('#supPayOut .table-wrap');
 if(wrap) wrap.classList.add('pay-table-v14');
};

const _v14PagosTrabajo=pagosTrabajo;
pagosTrabajo=async function(v){
 await _v14PagosTrabajo(v);
 const wrap=v.querySelector('#pmOut .table-wrap');
 if(wrap) wrap.classList.add('pay-table-v14');
};


/* ===== V17 FUNCTIONAL FIXES ===== */
function v17ColorPair(c){
 const n=norm(c);const map={AMARILLO:['#FDE047','#3F3500'],ROJO:['#EF4444','#FFFFFF'],BLANCO:['#FFFFFF','#17233D'],NEGRO:['#111827','#FFFFFF'],GRIS:['#9CA3AF','#111827'],PLATA:['#D1D5DB','#111827'],BEIGE:['#E7D3A7','#3F321D'],AZUL:['#3B82F6','#FFFFFF'],VERDE:['#22C55E','#052E16'],'TITAN GREY':['#6B7280','#FFFFFF'],'TITAN GRAY':['#6B7280','#FFFFFF'],'TITANIUM GREY':['#6B7280','#FFFFFF'],NARANJA:['#FB923C','#3F1D0A'],MARRON:['#92400E','#FFFFFF'],'CAFÉ':['#92400E','#FFFFFF'],CAFE:['#92400E','#FFFFFF']};
 if(map[n])return map[n];if(/^#[0-9A-F]{6}$/i.test(String(c||'')))return [String(c),'#17233D'];return ['#E9EEF5','#17233D'];
}
function v17UnitBadge(u,c){const [bg,fg]=v17ColorPair(c);return `<span class="unit-color-badge" title="Color: ${esc(c||'Sin color')}" style="background:${bg};color:${fg}">${esc(u||'')}</span>`}

v11UnitList=async function(){
 state.active='dashboard';shell();const v=document.querySelector('#view');v.innerHTML='<div class="card">Cargando unidades...</div>';
 try{const rows=await rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:5000});v.innerHTML=`<div class="source-card"><span class="entity-chip">UNIDADES</span><div class="source-text"><strong>Control de Auto</strong><p>Detalle operativo de las unidades bajo tu alcance.</p></div></div><div class="section-tools"><div class="field"><label>Buscar</label><input id="v17q" placeholder="Unidad, placa, Panapass, empresa, color o modelo"></div><button id="v17b">Buscar</button></div><div id="v17o"></div>`;const draw=a=>document.querySelector('#v17o').innerHTML=`<div class="panel"><div class="table-wrap"><table class="pretty"><thead><tr><th>Estatus</th><th>Unidad</th><th>Placa</th><th>Panapass</th><th>Empresa</th><th>Supervisora</th><th>Galera</th><th>Color</th><th>Marca</th><th>Modelo</th><th>Año</th></tr></thead><tbody>${a.map(r=>`<tr><td>${v12Status(r.estatus)}</td><td>${v17UnitBadge(r.unidad,r.color)}</td><td>${esc(r.placa)}</td><td>${esc(r.panapass_numero)}</td><td style="text-align:center">${esc(r.empresa)}</td><td>${esc(r.supervisora)}</td><td>${esc(r.galera)}</td><td>${esc(r.color||'')}</td><td>${esc(r.marca)}</td><td>${esc(r.modelo)}</td><td>${esc(r.anio)}</td></tr>`).join('')}</tbody></table></div></div>`;draw(rows);const filter=()=>{const q=norm(document.querySelector('#v17q').value);draw(rows.filter(r=>!q||norm(Object.values(r).join(' ')).includes(q)))};document.querySelector('#v17b').onclick=filter;document.querySelector('#v17q').oninput=filter}catch(e){v.innerHTML=`<div class="alert">${esc(e.message)}</div>`}
};

negativos=async function(v){
 const maxf=state.today||state.meta?.max_snapshot||new Date().toISOString().slice(0,10),minf=state.meta?.min_snapshot||'2025-01-01';v.innerHTML=`<div class="section-tools"><div class="field"><label>Fecha</label><input id="negFecha" type="date" min="${minf}" max="${maxf}" value="${maxf}"></div><div class="field"><label>Buscar</label><input id="negQ" placeholder="Unidad, placa o empresa"></div><button id="negBuscar">Consultar</button><button id="negCompact" class="soft-btn">Vista captura</button></div><div id="negOut"></div>`;const units=await rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:5000}).catch(()=>[]);const um=new Map(units.map(x=>[norm(x.unidad),x]));const draw=async()=>{const f=document.querySelector('#negFecha').value,o=document.querySelector('#negOut');o.innerHTML='<div class="card">Consultando...</div>';try{const all=await rpc('panapass_negativos_fecha',{p_fecha:f});let q=norm(document.querySelector('#negQ').value),rows=q?all.filter(r=>norm([r.unidad,r.placa,r.empresa,r.panapass_numero].join(' ')).includes(q)):all,total=rows.reduce((a,x)=>a+Number(x.saldo||0),0),mx=rows.reduce((a,x)=>Math.max(a,Number(x.neg7||0)),0);o.innerHTML=`<div class="capture-title"><h2>Negativos Panapass · ${esc(f)}</h2><small>Detalle de unidades en negativo</small></div><div class="kpis"><div class="kpi"><span>Unidades</span><strong>${rows.length}</strong></div><div class="kpi"><span>Saldo total</span><strong style="color:var(--red)">${money(total)}</strong></div><div class="kpi"><span>Máx neg 7d</span><strong>${mx}</strong></div><div class="kpi"><span>Riesgo</span><strong>${mx>=3?'ALERTA':mx===2?'CUIDADO':'OK'}</strong></div></div><div class="panel"><div class="table-wrap"><table class="pretty"><thead><tr><th>Fecha</th><th>Estatus</th><th>Unidad</th><th>Placa</th><th>Panapass</th><th>Empresa</th><th>Neg. 7d</th><th>Saldo</th></tr></thead><tbody>${rows.map(r=>{const m=um.get(norm(r.unidad))||{};return `<tr><td>${esc(r.fecha)}</td><td>${v12Status(r.status||m.estatus)}</td><td>${v17UnitBadge(r.unidad,m.color)}</td><td>${esc(r.placa)}</td><td>${esc(r.panapass_numero)}</td><td style="text-align:center">${esc(r.empresa)}</td><td>${chipNum(r.neg7)}</td><td class="saldo">${money(r.saldo)}</td></tr>`}).join('')}</tbody></table></div></div>`}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};document.querySelector('#negBuscar').onclick=draw;document.querySelector('#negQ').oninput=draw;document.querySelector('#negCompact').onclick=e=>toggleCapture(e.currentTarget,'#negOut');await draw();
};

pagosConsultaHoy=async function(v){
 const hoy=state.today||new Date().toISOString().slice(0,10),minf=state.meta?.min_pago||'2025-01-01';v.innerHTML=`<div class="section-tools"><div class="field"><label>Fecha</label><input id="supPayFecha" type="date" min="${minf}" max="${hoy}" value="${hoy}"></div><div class="field"><label>Buscar</label><input id="supPayQ" placeholder="Unidad, operador o empresa"></div><button id="supPayLoad">Consultar</button><button id="supPayCapture" class="soft-btn">Vista captura</button></div><div id="supPayOut"></div>`;const units=await rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:5000}).catch(()=>[]);const um=new Map(units.map(x=>[norm(x.unidad),x]));let all=[];const paint=()=>{let q=norm(document.querySelector('#supPayQ').value),d=q?all.filter(x=>norm([x.unidad,x.operador,x.n_op,x.empresa,x.cobrador].join(' ')).includes(q)):all,total=d.reduce((a,x)=>a+Number(x.a_pagar||0),0);document.querySelector('#supPayOut').innerHTML=`<div class="capture-title"><h2>Pagos Panapass · ${esc(document.querySelector('#supPayFecha').value)}</h2><small>Pagos registrados</small></div><div class="kpis"><div class="kpi"><span>Pagos</span><strong>${d.length}</strong></div><div class="kpi"><span>Total pagado</span><strong style="color:var(--green)">${money(total)}</strong></div></div><div class="panel"><div class="table-wrap pay-table-v17"><table class="pretty"><thead><tr><th>Fecha</th><th>Estatus</th><th>Unidad</th><th>Placa</th><th>Panapass</th><th>Empresa</th><th>A pagar</th><th>Boleta</th><th>Pag. 7d</th><th>N_OP</th><th>Operador</th><th>Tipo</th><th>Estado Cobra</th></tr></thead><tbody>${d.map(r=>{const m=um.get(norm(r.unidad))||{};return `<tr><td>${esc(r.fecha)}</td><td>${v12Status(r.status||m.estatus)}</td><td>${v17UnitBadge(r.unidad,m.color)}</td><td>${esc(r.placa)}</td><td>${esc(r.panapass_numero)}</td><td style="text-align:center">${esc(r.empresa)}</td><td class="money">${money(r.a_pagar)}</td><td class="money">${money(r.boleta)}</td><td>${chipNum(r.pag7)}</td><td>${esc(r.n_op)}</td><td>${esc(r.operador)}</td><td>${esc(r.tipo)}</td><td>${cobraChip(r.estado_cobra)}</td></tr>`}).join('')}</tbody></table></div></div>`};const load=async()=>{const o=document.querySelector('#supPayOut');o.innerHTML='<div class="card">Consultando...</div>';try{all=await rpc('panapass_pagos_fecha',{p_fecha:document.querySelector('#supPayFecha').value});paint()}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};document.querySelector('#supPayLoad').onclick=load;document.querySelector('#supPayQ').oninput=paint;document.querySelector('#supPayFecha').onchange=load;document.querySelector('#supPayCapture').onclick=e=>toggleCapture(e.currentTarget,'#supPayOut');await load();
};

historial=async function(v){
 const minf=state.meta?.min_pago||'2025-01-01',maxf=state.meta?.max_pago||new Date().toISOString().slice(0,10);v.innerHTML=`<div class="v11-tabs"><button id="histAll">Historial</button><button id="histCobra" class="soft-btn">Pendiente a Cobra</button></div><div class="section-tools"><div class="field"><label>Unidad</label><input id="hu" placeholder="Unidad"></div><div class="field"><label>Operador / N_OP</label><input id="ho" placeholder="Operador o número"></div><div class="field"><label>Desde</label><input id="hd" type="date" value="${minf}"></div><div class="field"><label>Hasta</label><input id="hh" type="date" value="${maxf}"></div><button id="hb">Buscar</button></div><div id="histOut"></div>`;let mode='ALL';const isPending=x=>{const e=norm(x.estado_cobra);return !e||e==='NO CARGADO'||e==='NO CARGADO A COBRA'||e.includes('REVISAR COBRA')||e.includes('PENDIENTE')||e.includes('ERROR')};const run=async()=>{const o=document.querySelector('#histOut');o.innerHTML='<div class="card">Consultando...</div>';try{let rows=await rpc('panapass_historial',{p_unidad:document.querySelector('#hu').value||null,p_operador:document.querySelector('#ho').value||null,p_desde:document.querySelector('#hd').value||null,p_hasta:document.querySelector('#hh').value||null,p_limit:2500});if(mode==='COBRA')rows=rows.filter(isPending);const total=rows.reduce((a,x)=>a+Number(x.a_pagar||0),0),boleta=rows.reduce((a,x)=>a+Number(x.boleta||0),0);o.innerHTML=`${mode==='COBRA'?`<div class="kpis pending-kpis-v17"><div class="kpi"><span>Pendientes</span><strong>${rows.length}</strong></div><div class="kpi"><span>Saldo total / A pagar</span><strong style="color:var(--red)">${money(total)}</strong></div><div class="kpi"><span>Total con boleta</span><strong>${money(boleta)}</strong></div></div>`:''}${tableHtml(rows,['fecha','unidad','panapass_numero','a_pagar','boleta','n_op','operador','cobrador','tipo','estado_cobra'],'pretty compact-table','mobile-cards')}`}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}};const setMode=m=>{mode=m;document.querySelector('#histAll').className=m==='ALL'?'':'soft-btn';document.querySelector('#histCobra').className=m==='COBRA'?'':'soft-btn';run()};document.querySelector('#histAll').onclick=()=>setMode('ALL');document.querySelector('#histCobra').onclick=()=>setMode('COBRA');document.querySelector('#hb').onclick=run;await run();
};

