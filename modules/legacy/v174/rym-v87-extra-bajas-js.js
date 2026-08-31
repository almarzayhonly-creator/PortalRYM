
(function(){
  const V87_MOD='bajas_panapass';
  labels[V87_MOD]='Bajas Panapass';
  const role87=()=>String(state?.profile?.rol||'').trim().toUpperCase();
  const canBajas87=()=>Array.isArray(state.modules)&&state.modules.includes('dashboard');
  const ensureBajasModule87=()=>{if(canBajas87()&&!state.modules.includes(V87_MOD))state.modules.push(V87_MOD)};

  /* Conserva V86 y añade Bajas Panapass como vista derivada del mismo alcance del Dashboard. */
  const norm86=phase2NormalizeModules;
  phase2NormalizeModules=function(){const wanted=state.active;const r=norm86?.apply(this,arguments);ensureBajasModule87();if(wanted===V87_MOD&&canBajas87())state.active=V87_MOD;return r};

  const shell86=shell;
  shell=function(){ensureBajasModule87();return shell86.apply(this,arguments)};

  const openPan86=window.v70OpenPanapass;
  if(typeof openPan86==='function'){
    window.v70OpenPanapass=async function(){const r=await openPan86.apply(this,arguments);ensureBajasModule87();if(!document.querySelector('.nav [data-m="bajas_panapass"]')){shell();await render()}return r};
  }

  /* ---------- CARGAR PAGOS: pago extraordinario ---------- */
  const table86=pagosTrabajoTable;
  pagosTrabajoTable=function(rows){
    if(!rows?.length)return table86(rows);
    return `<div class="panel pagos-online mobile-cards"><div class="table-wrap"><table class="pretty compact-table pagos-work-fit"><thead><tr><th>Unidad</th><th>Panapass</th><th>Placa</th><th>Saldo PM</th><th>Monto pagado</th><th>Boleta</th><th>N_OP</th><th>Operador</th><th>Tipo</th><th>Cobrador</th><th></th></tr></thead><tbody>${rows.map(r=>{
      const extra=String(r.origen_registro||'').toUpperCase()==='EXTRAORDINARIO';
      const lockNop=extra||String(r.numero_operador||'').trim()!=='';
      const lockOp=extra||String(r.nombre_operador||'').trim()!=='';
      const empresa=r.empresa_operadora||r.empresa_duena||r.empresa||'';
      const placa=r.placa||r.placa_unica||r.placa_comercial||'';
      const panapass=r.panapass_numero||r.panapass||'';
      const motive=String(r.motivo_extraordinario||'LOGISTICA').trim()||'LOGISTICA';
      const request=String(r.solicitado_por||'').trim();
      const unitExtra=extra?`<span class="v87-extra-badge">Extra · ${esc(motive)}</span>${request?`<small class="v87-extra-request">Solicita: ${esc(request)}</small>`:''}`:'';
      const tipo=extra?`<select data-tipo disabled title="Pago extraordinario"><option selected>LOGISTICA</option></select>`:`<select data-tipo><option ${r.tipo==='PRE DIARIO'?'selected':''}>PRE DIARIO</option><option ${r.tipo==='PRE NO DIARIO'?'selected':''}>PRE NO DIARIO</option><option ${r.tipo==='GASTO'?'selected':''}>GASTO</option><option ${r.tipo==='LOGISTICA'?'selected':''}>LOGISTICA</option></select>`;
      return `<tr class="${extra?'v87-extra-row':''}" data-pay-origin="${extra?'EXTRAORDINARIO':'PM'}" data-pay-row-unit="${esc(r.unidad||'')}" data-pay-updated="${esc(r.updated_at||'')}" data-pay-saved="${r.guardado_en?'1':'0'}" data-pay-saved-at="${esc(r.guardado_en||'')}"><td data-label="Unidad" data-pay-unit-cell><b data-pay-unit>${esc(r.unidad)}</b><small data-pay-company>${esc(empresa)}</small>${unitExtra}</td><td data-label="Panapass"><b data-pay-panapass>${esc(panapass)}</b></td><td data-label="Placa"><b data-pay-plate>${esc(placa)}</b></td><td data-label="${extra?'Origen':'Saldo PM'}" class="saldo">${extra?'<b>Extraordinario</b>':money(r.monto_original)}</td><td data-label="Monto pagado"><input data-pay type="number" min="0" step="0.01" value="${Number(r.a_pagar||0)}"></td><td data-label="Boleta"><b>${money(r.con_boleta)}</b></td><td data-label="N_OP"><input data-nop value="${esc(r.numero_operador||'')}" ${lockNop?'readonly class="readonly-user" title="Dato bloqueado para este registro"':''}></td><td data-label="Operador"><input data-op value="${esc(r.nombre_operador||'')}" ${lockOp?'readonly class="readonly-user" title="Dato bloqueado para este registro"':''}></td><td data-label="Tipo">${tipo}</td><td data-label="Cobrador"><input data-cobrador value="${esc(r.cobrador||'')}" readonly class="readonly-user" title="Supervisora asignada a la unidad"></td><td data-label="Acción"><button class="soft-btn" data-save-pay="${r.id}">Guardar</button></td></tr>`;
    }).join('')}</tbody></table></div></div>`;
  };

  function extraModal87(onAdded){
    document.querySelector('#v87ExtraModal')?.remove();
    const m=document.createElement('div');m.id='v87ExtraModal';m.className='v87-modal show';
    m.innerHTML=`<div class="v87-modal-card"><div class="v87-modal-head"><div><h3>Agregar pago extraordinario</h3><p>Se agrega a Cargar Pagos sin modificar el corte PM.</p></div><button class="v87-close" id="v87ExtraClose">×</button></div><div class="v87-extra-form"><div class="field wide v87-extra-search"><label>Unidad</label><input id="v87ExtraUnit" autocomplete="off" placeholder="Busca CVAL, TOY, STA o cualquier unidad"><div class="v87-extra-results" id="v87ExtraResults"></div><div class="v87-extra-selected" id="v87ExtraSelected"></div></div><div class="field"><label>Monto</label><input id="v87ExtraAmount" type="number" min="0.01" step="0.01" placeholder="0.00"></div><div class="field"><label>Quién lo solicita</label><input id="v87ExtraRequester" placeholder="Nombre de quien solicita"></div><div class="field wide"><label>Motivo</label><input id="v87ExtraReason" value="LOGISTICA" placeholder="LOGISTICA"></div></div><div class="v87-extra-help">La fecha no se solicita aquí: Supabase registra automáticamente la fecha de Panamá y la fecha/hora de creación.</div><div id="v87ExtraMsg"></div><div class="v87-extra-actions"><button class="soft-btn" id="v87ExtraCancel">Cancelar</button><button class="v87-extra-btn" id="v87ExtraSave">Agregar pago</button></div></div>`;
    document.body.appendChild(m);
    const close=()=>m.remove();m.querySelector('#v87ExtraClose').onclick=close;m.querySelector('#v87ExtraCancel').onclick=close;m.onclick=e=>{if(e.target===m)close()};
    const input=m.querySelector('#v87ExtraUnit'),results=m.querySelector('#v87ExtraResults'),selected=m.querySelector('#v87ExtraSelected'),msg=m.querySelector('#v87ExtraMsg'),save=m.querySelector('#v87ExtraSave');let picked=null,timer=null,seq=0;
    const choose=r=>{picked=r;input.value=r.unidad||'';selected.classList.add('show');selected.innerHTML=`<b>${esc(r.unidad||'')}</b> · ${esc(r.placa||'')} · Panapass ${esc(r.panapass_numero||'')}<br><small>${esc([r.empresa,r.galera,r.supervisora].filter(Boolean).join(' · '))}</small>`;results.classList.remove('show');results.innerHTML=''};
    async function search(){const q=input.value.trim();picked=null;selected.classList.remove('show');selected.innerHTML='';if(!q){results.classList.remove('show');return}const current=++seq;try{const rows=await rpc('panapass_pagos_extra_buscar_unidades',{p_buscar:q});if(current!==seq)return;results.innerHTML=(rows||[]).map((r,i)=>`<button type="button" class="v87-extra-result" data-v87-extra="${i}"><b>${esc(r.unidad||'')}</b><span>${esc(r.placa||'')} · ${esc(r.empresa||'')}</span><small>${esc(r.galera||'')}</small></button>`).join('')||'<div class="empty" style="padding:10px">Sin coincidencias</div>';results.classList.add('show');results.querySelectorAll('[data-v87-extra]').forEach((b,i)=>b.onclick=()=>choose(rows[i]))}catch(e){results.innerHTML=`<div class="alert" style="margin:8px">${esc(e.message||e)}</div>`;results.classList.add('show')}}
    input.oninput=()=>{clearTimeout(timer);timer=setTimeout(search,220)};input.onfocus=()=>{if(input.value.trim())search()};
    save.onclick=async()=>{const amount=Number(m.querySelector('#v87ExtraAmount').value||0),requester=m.querySelector('#v87ExtraRequester').value.trim(),reason=m.querySelector('#v87ExtraReason').value.trim();if(!picked){msg.innerHTML='<div class="alert">Selecciona una unidad del buscador.</div>';return}if(!(amount>0)){msg.innerHTML='<div class="alert">Indica un monto mayor que 0.</div>';return}if(!requester){msg.innerHTML='<div class="alert">Indica quién solicita el pago.</div>';return}if(!reason){msg.innerHTML='<div class="alert">Indica el motivo.</div>';return}save.disabled=true;save.textContent='Agregando...';try{await rpc('panapass_pagos_hoy_agregar_extraordinario',{p_unidad:picked.unidad,p_monto:amount,p_solicitado_por:requester,p_motivo:reason});msg.innerHTML='<div class="success">Pago extraordinario agregado.</div>';setTimeout(async()=>{close();await onAdded?.()},180)}catch(e){msg.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`;save.disabled=false;save.textContent='Agregar pago'}};
  }

  const pagos86=pagosTrabajo;
  pagosTrabajo=async function(v){
    await pagos86(v);
    const tools=v.querySelector('.section-tools');if(!tools||v.querySelector('#v87ExtraPay'))return;
    const b=document.createElement('button');b.id='v87ExtraPay';b.className='v87-extra-btn';b.textContent='+ Pago extraordinario';
    const first=tools.querySelector('#pmFromPM');if(first)first.insertAdjacentElement('afterend',b);else tools.prepend(b);
    b.onclick=()=>extraModal87(async()=>{await pagosTrabajo(v)});
  };

  /* ---------- BAJAS PANAPASS ---------- */
  function tags87(r){return String(r.tags_ena||'').split(',').map(x=>x.trim()).filter(Boolean)}
  function status87(r){const ok=r.ena_estado==='TAG_ENA_VALIDADO';return ok?'<span class="v87-ena-ok">TAG ENA validado</span>':`<span class="v87-ena-warn">${esc(String(r.ena_estado||'REVISAR').replaceAll('_',' '))}</span>`}
  async function copy87(text,btn){try{await navigator.clipboard.writeText(text);const old=btn.textContent;btn.textContent='Copiado ✓';setTimeout(()=>btn.textContent=old,1100)}catch(_){const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}}

  window.v87BajasPanapass=async function(v){
    v.innerHTML='<div class="card">Cargando bajas Panapass...</div>';
    try{
      const rows=await rpc('panapass_bajas_listar_v3');const actionable=(rows||[]).filter(r=>r.ena_estado==='TAG_ENA_VALIDADO'&&Number(r.cantidad_tags||0)>0),alerts=(rows||[]).filter(r=>r.alerta_admin),admin=role87()==='ADMIN_TOTAL';
      v.innerHTML=`<section class="v87-bajas-hero"><div><h2>Bajas Panapass</h2><p>Toda unidad Cerrada en Control de Auto con ENA validado y al menos un TAG activo debe gestionarse para baja. Los casos sin TAG activo quedan solo para revisión de ADMIN_TOTAL.</p></div><div class="v87-bajas-actions"><button class="soft-btn" id="v87BajasReload">Actualizar</button><button id="v87CopyAll" ${actionable.length?'':'disabled'}>Copiar TAG visibles</button></div></section><div class="v87-bajas-kpis"><div class="v87-bajas-kpi"><span>Unidades a dar de baja</span><strong>${actionable.length}</strong></div><div class="v87-bajas-kpi"><span>TAG a gestionar</span><strong>${actionable.reduce((a,r)=>a+Number(r.cantidad_tags||0),0)}</strong></div>${admin?`<div class="v87-bajas-kpi warn"><span>Revisión ADMIN_TOTAL</span><strong>${alerts.length}</strong></div>`:'<div class="v87-bajas-kpi"><span>Fuente</span><strong style="font-size:16px">ENA validado</strong></div>'}</div><div id="v87BajasMsg"></div><div class="panel v87-bajas-table mobile-cards"><div class="table-wrap"><table class="pretty compact-table"><thead><tr><th>Unidad</th><th>Galera</th><th>Empresa</th><th>Placa</th><th>Panapass</th><th>TAG ENA</th><th>Validación</th><th>Detectado</th><th>Acción</th></tr></thead><tbody>${(rows||[]).map(r=>{const ts=tags87(r),ok=r.ena_estado==='TAG_ENA_VALIDADO',buttons=ok?`${ts.map(t=>`<button class="tag-btn" data-copy-tag="${esc(t)}">Copiar ${esc(t)}</button>`).join(' ')}${admin&&Number(r.cantidad_tags||0)===0?` <button class="resolve-btn" data-baja-ok="${r.id}">Confirmar baja ENA</button>`:''}`:(admin?`<button class="review-btn" data-baja-review="${r.id}">Revisar manual</button>`:'');return `<tr><td data-label="Unidad"><b>${esc(r.unidad)}</b></td><td data-label="Galera">${esc(r.galera||'')}</td><td data-label="Empresa">${esc(r.empresa||'')}</td><td data-label="Placa">${esc(r.placa||'')}</td><td data-label="Panapass">${esc(r.panapass_numero||'')}</td><td data-label="TAG ENA"><b>${ok?esc(r.tags_ena||''):'—'}</b></td><td data-label="Validación">${status87(r)}<small style="display:block;margin-top:3px">${r.ena_consultado_at?esc(fmtDT(r.ena_consultado_at)):''}</small></td><td data-label="Detectado">${esc(fmtDT(r.detectado_at))}</td><td data-label="Acción">${buttons}</td></tr>`}).join('')||'<tr><td colspan="9"><div class="empty">No hay bajas Panapass pendientes dentro de tu alcance.</div></td></tr>'}</tbody></table></div></div>`;
      v.querySelector('#v87BajasReload').onclick=()=>v87BajasPanapass(v);const all=v.querySelector('#v87CopyAll');if(all)all.onclick=()=>copy87([...new Set(actionable.flatMap(tags87))].join('\n'),all);v.querySelectorAll('[data-copy-tag]').forEach(b=>b.onclick=()=>copy87(b.dataset.copyTag,b));
      const resolve=async(id,estado)=>{const note=admin?prompt(estado==='BAJA_CONFIRMADA'?'Nota opcional de confirmación:':'Nota de revisión manual:',''):'';if(note===null)return;const msg=v.querySelector('#v87BajasMsg');try{await rpc('panapass_bajas_resolver_v3',{p_id:Number(id),p_estado:estado,p_nota:note||null});msg.innerHTML='<div class="success">Caso actualizado.</div>';await v87BajasPanapass(v)}catch(e){msg.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`}};
      v.querySelectorAll('[data-baja-ok]').forEach(b=>b.onclick=()=>{if(confirm('¿Confirmar que ENA ya no reporta TAG activos para esta unidad?'))resolve(b.dataset.bajaOk,'BAJA_CONFIRMADA')});v.querySelectorAll('[data-baja-review]').forEach(b=>b.onclick=()=>resolve(b.dataset.bajaReview,'REQUIERE_REVISION'));
    }catch(e){v.innerHTML=`<div class="alert">Bajas Panapass: ${esc(e.message||e)}</div>`}
  };

  const render86=render;
  render=async function(){if(state.active===V87_MOD){const v=document.querySelector('#view');if(v)return v87BajasPanapass(v)}return render86()};

  const dash86=dashboard;
  dashboard=async function(v){
    await dash86(v);if(!v||!canBajas87())return;
    try{const rows=await rpc('panapass_bajas_listar_v3'),actionable=(rows||[]).filter(r=>r.ena_estado==='TAG_ENA_VALIDADO'&&Number(r.cantidad_tags||0)>0),alerts=(rows||[]).filter(r=>r.alerta_admin),grid=v.querySelector('.kpis');if(!grid)return;const k=document.createElement('div');k.className='kpi v87-dash-kpi';k.innerHTML=`<span>Bajas Panapass pendientes</span><strong>${actionable.length}</strong><small>${actionable.reduce((a,r)=>a+Number(r.cantidad_tags||0),0)} TAG ENA por gestionar${role87()==='ADMIN_TOTAL'&&alerts.length?` · <b class="v87-dash-alert">${alerts.length} revisar</b>`:''}</small>`;k.onclick=()=>{ensureBajasModule87();state.active=V87_MOD;shell();render()};grid.appendChild(k)}catch(e){console.warn('KPI Bajas Panapass:',e)}
  };

  ensureBajasModule87();
})();
