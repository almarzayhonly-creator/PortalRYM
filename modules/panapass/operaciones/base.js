/* Portal RYM V172 clean - Panapass operaciones */
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
