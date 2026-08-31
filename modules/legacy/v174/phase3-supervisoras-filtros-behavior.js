
/* ===== FASE 3: backend v2 + filtros + alta de supervisora detectada ===== */
phase2Allowed=function(roleName,moduleName){
  const r=String(roleName||'').toUpperCase(),m=String(moduleName||'').toLowerCase();
  if(r==='ADMIN_TOTAL'||r==='SISTEMA')return !['operacion_am','operacion_pm','pendientes_externo'].includes(m);
  if(r==='PAGADOR')return ['dashboard','negativos_hoy','pagos_hoy','historial','recurrentes','ranking','operaciones','cargar_pagos'].includes(m);
  if(r==='GERENTE_GALERA')return ['dashboard','negativos_hoy','pagos_hoy','historial','recurrentes','ranking'].includes(m);
  if(r==='SUPERVISORA')return ['dashboard','negativos_hoy','pagos_hoy','historial','recurrentes','ranking'].includes(m);
  if(r==='ADMIN')return ['dashboard','historial','negativos_hoy','pagos_hoy'].includes(m);
  return false;
};

function phase3CanScopeFilter(){return ['ADMIN_TOTAL','SISTEMA','ADMIN','PAGADOR','GERENTE_GALERA'].includes(role())}
async function phase3ScopeData(){
  if(!phase3CanScopeFilter())return {sups:[],gals:[]};
  const rows=await rpc('panapass_mis_supervisoras').catch(()=>[]);
  const sups=(rows||[]).filter(x=>x&&x.id&&x.nombre);
  const gals=[...new Set(sups.map(x=>String(x.galera||'').trim().toUpperCase()).filter(Boolean))].sort();
  return {sups,gals};
}
function phase3ScopeMarkup(prefix,scope){
  if(!phase3CanScopeFilter())return '';
  const onlyManager=role()==='GERENTE_GALERA'&&scope.gals.length===1;
  return `<div class="field"><label>Galera</label><select id="${prefix}Galera"><option value="">Todas las visibles</option>${scope.gals.map(g=>`<option value="${esc(g)}" ${onlyManager?'selected':''}>${esc(g)}</option>`).join('')}</select></div><div class="field"><label>Supervisora</label><select id="${prefix}Supervisora"><option value="">Todas las visibles</option></select></div>`;
}
function phase3BindScope(prefix,scope,onChange){
  const g=document.querySelector(`#${prefix}Galera`),s=document.querySelector(`#${prefix}Supervisora`);
  if(!g||!s)return;
  const refill=()=>{
    const keep=s.value,gal=String(g.value||'').toUpperCase();
    const list=scope.sups.filter(x=>!gal||String(x.galera||'').toUpperCase()===gal);
    s.innerHTML='<option value="">Todas las visibles</option>'+list.map(x=>`<option value="${esc(x.id)}">${esc(x.nombre)}${x.galera?' · '+esc(x.galera):''}</option>`).join('');
    if(list.some(x=>x.id===keep))s.value=keep;
  };
  refill();
  g.onchange=()=>{refill();onChange?.()};
  s.onchange=()=>onChange?.();
}
function phase3ScopeBody(prefix){
  return {
    p_galera:document.querySelector(`#${prefix}Galera`)?.value||null,
    p_supervisora_id:document.querySelector(`#${prefix}Supervisora`)?.value||null
  };
}

negativos=async function(v){
  const maxf=state.today||state.meta?.max_snapshot||new Date().toISOString().slice(0,10),minf=state.meta?.min_snapshot||'2025-01-01';
  const [scope,units]=await Promise.all([phase3ScopeData(),rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:5000}).catch(()=>[])]);
  const um=new Map((units||[]).map(x=>[norm(x.unidad),x]));
  v.innerHTML=`<div class="section-tools phase3-filterbar"><div class="field"><label>Fecha</label><input id="p3NegFecha" type="date" min="${minf}" max="${maxf}" value="${maxf}"></div>${phase3ScopeMarkup('p3Neg',scope)}<div class="field"><label>Buscar</label><input id="p3NegQ" placeholder="Unidad, Panapass, empresa o supervisora"></div><button id="p3NegGo">Consultar</button><button id="p3NegCapture" class="soft-btn">Vista captura</button></div><div id="p3NegOut"></div>`;
  let last=[];
  const paint=()=>{
    const q=norm(document.querySelector('#p3NegQ')?.value||'');
    const rows=q?last.filter(r=>norm([r.unidad,r.placa,r.panapass_numero,r.empresa,r.galera,r.supervisora].join(' ')).includes(q)):last;
    const total=rows.reduce((a,x)=>a+Number(x.saldo||0),0),mx=rows.reduce((a,x)=>Math.max(a,Number(x.neg7||0)),0);
    const body=rows.length?rows.map(r=>{const m=um.get(norm(r.unidad))||{};return `<tr><td data-label="Estatus">${v12Status(r.status||m.estatus)}</td><td data-label="Unidad">${v17UnitBadge(r.unidad,m.color)}</td><td data-label="Placa">${esc(r.placa||'')}</td><td data-label="Panapass">${esc(r.panapass_numero||'')}</td><td data-label="Galera">${esc(r.galera||'')}</td><td data-label="Supervisora"><b>${esc(r.supervisora||'SIN SUPERVISORA')}</b></td><td data-label="Empresa">${esc(r.empresa||'')}</td><td data-label="Neg. 7d">${chipNum(r.neg7)}</td><td data-label="Saldo" class="saldo">${money(r.saldo)}</td></tr>`}).join(''):`<tr><td colspan="9" class="empty">Sin datos.</td></tr>`;
    document.querySelector('#p3NegOut').innerHTML=`<div class="capture-title"><h2>Negativos Panapass · ${esc(document.querySelector('#p3NegFecha').value)}</h2><small>Galera y supervisora según asignación actual</small></div><div class="kpis"><div class="kpi"><span>Unidades</span><strong>${rows.length}</strong></div><div class="kpi"><span>Saldo total</span><strong style="color:var(--red)">${money(total)}</strong></div><div class="kpi"><span>Máx neg 7d</span><strong>${mx}</strong></div><div class="kpi"><span>Riesgo</span><strong>${mx>=3?'ALERTA':mx===2?'CUIDADO':'OK'}</strong></div></div><div class="panel phase3-panel mobile-cards"><div class="table-wrap"><table class="pretty phase3-fit-table phase3-neg-table"><thead><tr><th>Estatus</th><th>Unidad</th><th>Placa</th><th>Panapass</th><th>Galera</th><th>Supervisora</th><th>Empresa</th><th>Neg. 7d</th><th>Saldo</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
  };
  const load=async()=>{
    const o=document.querySelector('#p3NegOut');o.innerHTML='<div class="card">Consultando...</div>';
    try{last=await rpc('panapass_negativos_fecha_v2',{p_fecha:document.querySelector('#p3NegFecha').value||null,...phase3ScopeBody('p3Neg')});paint()}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}
  };
  phase3BindScope('p3Neg',scope,load);
  document.querySelector('#p3NegGo').onclick=load;
  document.querySelector('#p3NegFecha').onchange=load;
  document.querySelector('#p3NegQ').oninput=paint;
  document.querySelector('#p3NegCapture').onclick=e=>toggleCapture(e.currentTarget,'#p3NegOut');
  await load();
};

pagosConsultaHoy=async function(v){
  const hoy=state.today||state.meta?.max_pago||new Date().toISOString().slice(0,10),minf=state.meta?.min_pago||'2025-01-01';
  const [scope,units]=await Promise.all([phase3ScopeData(),rpc('panapass_unidades_detalle',{p_buscar:null,p_limit:5000}).catch(()=>[])]);
  const um=new Map((units||[]).map(x=>[norm(x.unidad),x]));
  v.innerHTML=`<div class="section-tools phase3-filterbar"><div class="field"><label>Fecha</label><input id="p3PayFecha" type="date" min="${minf}" max="${hoy}" value="${hoy}"></div>${phase3ScopeMarkup('p3Pay',scope)}<div class="field"><label>Buscar</label><input id="p3PayQ" placeholder="Unidad, operador, N_OP o supervisora"></div><button id="p3PayGo">Consultar</button><button id="p3PayCapture" class="soft-btn">Vista captura</button></div><div id="p3PayOut"></div>`;
  let last=[];
  const paint=()=>{
    const q=norm(document.querySelector('#p3PayQ')?.value||'');
    const rows=q?last.filter(r=>norm([r.unidad,r.panapass_numero,r.empresa,r.galera,r.supervisora,r.operador,r.n_op,r.tipo,r.estado_cobra].join(' ')).includes(q)):last;
    const total=rows.reduce((a,x)=>a+Number(x.a_pagar||0),0),boleta=rows.reduce((a,x)=>a+Number(x.boleta||0),0),mx=rows.reduce((a,x)=>Math.max(a,Number(x.pag7||0)),0);
    const body=rows.length?rows.map(r=>{const m=um.get(norm(r.unidad))||{};return `<tr><td data-label="Unidad">${v17UnitBadge(r.unidad,m.color)}</td><td data-label="Panapass">${esc(r.panapass_numero||'')}</td><td data-label="Galera">${esc(r.galera||'')}</td><td data-label="Supervisora"><b>${esc(r.supervisora||'SIN SUPERVISORA')}</b></td><td data-label="Empresa">${esc(r.empresa||'')}</td><td data-label="A pagar" class="money">${money(r.a_pagar)}</td><td data-label="Boleta" class="money">${money(r.boleta)}</td><td data-label="Pag. 7d">${chipNum(r.pag7)}</td><td data-label="N_OP">${esc(r.n_op||'')}</td><td data-label="Operador">${esc(r.operador||'')}</td><td data-label="Tipo">${esc(r.tipo||'')}</td><td data-label="Estado Cobra">${cobraChip(r.estado_cobra)}</td></tr>`}).join(''):`<tr><td colspan="12" class="empty">Sin datos.</td></tr>`;
    document.querySelector('#p3PayOut').innerHTML=`<div class="capture-title"><h2>Pagos Panapass · ${esc(document.querySelector('#p3PayFecha').value)}</h2><small>Galera y supervisora según asignación actual</small></div><div class="kpis"><div class="kpi"><span>Pagos</span><strong>${rows.length}</strong></div><div class="kpi"><span>Total pagado</span><strong style="color:var(--green)">${money(total)}</strong></div><div class="kpi"><span>Total boleta</span><strong>${money(boleta)}</strong></div><div class="kpi"><span>Máx pag 7d</span><strong>${mx}</strong></div></div><div class="panel phase3-panel mobile-cards"><div class="table-wrap"><table class="pretty phase3-fit-table phase3-pay-table"><thead><tr><th>Unidad</th><th>Panapass</th><th>Galera</th><th>Supervisora</th><th>Empresa</th><th>A pagar</th><th>Boleta</th><th>Pag. 7d</th><th>N_OP</th><th>Operador</th><th>Tipo</th><th>Estado Cobra</th></tr></thead><tbody>${body}</tbody></table></div></div>`;
  };
  const load=async()=>{
    const o=document.querySelector('#p3PayOut');o.innerHTML='<div class="card">Consultando...</div>';
    try{last=await rpc('panapass_pagos_fecha_v2',{p_fecha:document.querySelector('#p3PayFecha').value||null,...phase3ScopeBody('p3Pay')});paint()}catch(e){o.innerHTML=`<div class="alert">${esc(e.message)}</div>`}
  };
  phase3BindScope('p3Pay',scope,load);
  document.querySelector('#p3PayGo').onclick=load;
  document.querySelector('#p3PayFecha').onchange=load;
  document.querySelector('#p3PayQ').oninput=paint;
  document.querySelector('#p3PayCapture').onclick=e=>toggleCapture(e.currentTarget,'#p3PayOut');
  await load();
};

const _phase3UsuariosBase=usuarios;
usuarios=async function(v){
  await _phase3UsuariosBase(v);
  const host=v.querySelector('#usersRoot');if(!host)return;
  try{
    const {data}=await req('/functions/v1/admin-users',{method:'POST',body:JSON.stringify({action:'list'})});
    if(!data?.ok)throw Error(data?.error||'No se pudieron revisar supervisoras detectadas.');
    const pending=data.supervisoras_detectadas||[],galeras=data.galeras||['VCARS','VCOMP','VIPCO','VINDU'];
    const panel=document.createElement('div');panel.id='phase3Detected';panel.className='card';
    panel.innerHTML=`<div class="table-summary"><div><h2 style="margin:0">Nuevas supervisoras detectadas</h2><span class="muted">Consulta Panapass es la fuente de asignación de unidades.</span></div><span class="pill">${pending.length} pendiente${pending.length===1?'':'s'}</span></div>${pending.length?`<div class="phase3-detected-list">${pending.map(d=>{const units=Array.isArray(d.unidades)?d.unidades:[];return `<div class="phase3-detected-card" data-detection-card="${esc(d.id)}"><div class="phase3-detected-head"><div><strong>${esc(d.nombre_detectado)}</strong><div class="muted">${Number(d.total_unidades||0)} unidades detectadas · Galera sugerida: ${esc(d.galera_sugerida||'POR CONFIRMAR')}</div></div><span class="chip warn">PENDIENTE DE REGISTRO</span></div><div class="phase3-detected-form"><div class="field"><label>Nombre</label><input data-det-name value="${esc(d.nombre_detectado)}"></div><div class="field"><label>Galera</label><select data-det-gal>${galeras.map(g=>`<option value="${esc(g)}" ${String(g)===String(d.galera_sugerida||'')?'selected':''}>${esc(g)}</option>`).join('')}</select></div><div class="field"><label>Correo</label><input data-det-email type="email" placeholder="correo@empresa.com"></div><div class="field"><label>WhatsApp</label><input data-det-wa placeholder="Opcional"></div><div class="field"><label>Clave temporal</label><input data-det-pass type="password" minlength="6" placeholder="Mín. 6"></div><button data-det-confirm>Registrar</button></div><label style="display:flex;gap:7px;align-items:center;margin-top:8px;font-size:12px;font-weight:800"><input data-det-must type="checkbox" checked style="width:auto"> Obligar cambio de clave en primer ingreso</label><div class="phase3-unit-preview">Unidades detectadas: ${esc(units.slice(0,16).join(', '))}${units.length>16?' …':''}</div><div data-det-msg></div></div>`}).join('')}</div>`:`<div class="phase3-empty-ok">No hay supervisoras nuevas pendientes de registrar.</div>`}`;
    host.prepend(panel);
    panel.querySelectorAll('[data-det-confirm]').forEach(btn=>btn.onclick=async()=>{
      const card=btn.closest('[data-detection-card]'),msg=card.querySelector('[data-det-msg]'),payload={action:'register_detected_supervisor',detection_id:card.dataset.detectionCard,nombre:card.querySelector('[data-det-name]').value.trim(),galera:card.querySelector('[data-det-gal]').value,email:card.querySelector('[data-det-email]').value.trim(),whatsapp:card.querySelector('[data-det-wa]').value.trim(),password:card.querySelector('[data-det-pass]').value,must_change_password:card.querySelector('[data-det-must]').checked};
      if(!payload.nombre||!payload.galera||!payload.email||String(payload.password||'').length<6){msg.innerHTML='<div class="alert">Completa nombre, galera, correo y una clave temporal de al menos 6 caracteres.</div>';return}
      if(!confirm(`¿Registrar a ${payload.nombre} como supervisora de ${payload.galera} y asignarle las unidades detectadas?`))return;
      btn.disabled=true;msg.innerHTML='<div class="card">Registrando supervisora, usuario y unidades...</div>';
      try{const {data:r}=await req('/functions/v1/admin-users',{method:'POST',body:JSON.stringify(payload)});if(!r?.ok)throw Error(r?.error||'No se pudo registrar.');msg.innerHTML=`<div class="success">Supervisora registrada. Usuario creado: <b>${esc(r.usuario||'')}</b>.</div>`;setTimeout(()=>usuarios(v),700)}catch(e){btn.disabled=false;msg.innerHTML=`<div class="alert">${esc(e.message)}</div>`}
    });
  }catch(e){const warn=document.createElement('div');warn.className='alert';warn.textContent='No se pudo cargar detección de supervisoras: '+e.message;host.prepend(warn)}
};

const _phase3ReportesBase=reportes;
reportes=async function(v){
  if(role()==='GERENTE_GALERA'){v.innerHTML='<div class="alert">Este perfil no tiene acceso al módulo Reportes.</div>';return}
  await _phase3ReportesBase(v);
  const b=v.querySelector('#rNeg');
  if(b)b.onclick=async()=>{try{const f=document.querySelector('#repHasta').value,rows=await rpc('panapass_negativos_fecha_v2',{p_fecha:f,p_galera:null,p_supervisora_id:null}),total=rows.reduce((a,x)=>a+Number(x.saldo||0),0);openDataWindow('Negativos AM por Galera',`Fecha ${f}`,`<div class="outlook"><b>Reporte de Negativos AM</b><div class="muted">Supervisora según la asignación actual de cada unidad.</div></div><div class="kpis"><div class="k">Unidades<b>${rows.length}</b></div><div class="k">Saldo total<b>${money(total)}</b></div></div>${rowsTable(rows,['galera','supervisora','unidad','placa','panapass_numero','empresa','neg7','saldo'])}`)}catch(e){alert(e.message)}};
};
