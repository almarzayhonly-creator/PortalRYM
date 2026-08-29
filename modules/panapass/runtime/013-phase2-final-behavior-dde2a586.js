/* ===== FASE 2 FINAL: matriz dura de módulos + Cargar Pagos separado ===== */
labels.cargar_pagos='Cargar Pagos';

function phase2Allowed(roleName,moduleName){
  const r=String(roleName||'').toUpperCase();
  const m=String(moduleName||'').toLowerCase();
  if(r==='ADMIN_TOTAL'||r==='SISTEMA')return !['operacion_am','operacion_pm','pendientes_externo'].includes(m);
  if(r==='PAGADOR')return ['dashboard','negativos_hoy','pagos_hoy','historial','recurrentes','ranking','operaciones','cargar_pagos'].includes(m);
  if(r==='GERENTE_GALERA')return ['dashboard','negativos_hoy','pagos_hoy','historial','recurrentes','ranking','reportes'].includes(m);
  if(r==='SUPERVISORA')return ['dashboard','negativos_hoy','pagos_hoy','historial','recurrentes','ranking'].includes(m);
  if(r==='ADMIN')return ['dashboard','historial'].includes(m);
  return false;
}
function phase2NormalizeModules(){
  const r=role();
  const seen=new Set();
  state.modules=(state.modules||[]).filter(m=>phase2Allowed(r,m)).filter(m=>!seen.has(m)&&seen.add(m));
  if(!state.modules.includes(state.active)){
    state.active=state.modules.includes('dashboard')?'dashboard':(state.modules[0]||'dashboard');
  }
}

/* Helpers de rol coherentes con la matriz definitiva. */
isFullAdmin=function(){return ['ADMIN_TOTAL','SISTEMA'].includes(role())};
isAdminRole=function(){return ['ADMIN_TOTAL','SISTEMA','PAGADOR'].includes(role())};

/* El filtro se ejecuta también en sesiones restauradas, no solo al iniciar sesión. */
const _phase2Shell=shell;
shell=function(){
  phase2NormalizeModules();
  _phase2Shell();
};

/* Pagos Hoy SIEMPRE consulta. Cargar Pagos es la hoja online editable. */
render=async function(){
  phase2NormalizeModules();
  const v=document.querySelector('#view');
  if(!v)return;
  v.innerHTML='<div class="card">Cargando...</div>';
  try{
    if(!state.modules.includes(state.active)){
      state.active=state.modules.includes('dashboard')?'dashboard':(state.modules[0]||'dashboard');
      shell();
    }
    if(state.active==='dashboard')return dashboard(v);
    if(state.active==='ranking')return ranking(v);
    if(state.active==='negativos_hoy')return negativos(v);
    if(state.active==='pagos_hoy')return pagosConsultaHoy(v);
    if(state.active==='cargar_pagos')return pagosTrabajo(v);
    if(state.active==='historial')return historial(v);
    if(state.active==='recurrentes')return recurrentes(v);
    if(state.active==='operaciones')return operaciones(v);
    if(state.active==='reportes')return reportes(v);
    if(state.active==='usuarios')return usuarios(v);
    v.innerHTML=`<div class="card"><h2>${esc(labels[state.active]||state.active)}</h2><p class="muted">Módulo no disponible.</p></div>`;
  }catch(x){v.innerHTML=`<div class="alert">${esc(x.message||x)}</div>`}
};

/* Renombre visible de la hoja online sin cambiar RPC/tablas ya probadas. */
const _phase2PagosTrabajo=pagosTrabajo;
pagosTrabajo=async function(v){
  await _phase2PagosTrabajo(v);
  const chip=v.querySelector('.source-card .entity-chip');
  if(chip)chip.textContent='CARGAR PAGOS ONLINE';
  const strong=v.querySelector('.source-card .source-text strong');
  if(strong)strong.textContent='Hoja online para preparar y registrar pagos';
  const p=v.querySelector('.source-card .source-text p');
  if(p)p.textContent='Prepara los pendientes PM y registra únicamente lo que realmente se pagó. N_OP y Operador quedan bloqueados cuando vienen asignados; solo se editan si faltan. Cobrador corresponde a la supervisora asignada.';
  const note=v.querySelector('.share-note');
  if(note)note.textContent='Cargar Pagos reemplaza la antigua hoja tipo Excel dentro del portal.';
};

/* En Reportes, un gerente recibe únicamente su galera desde Supabase. Ajusta el texto para no sugerir 4 galeras. */
const _phase2Reportes=reportes;
reportes=async function(v){
  await _phase2Reportes(v);
  if(role()==='GERENTE_GALERA'){
    const b=v.querySelector('#r4');
    const card=b?.closest('.report-card');
    if(card){
      const h=card.querySelector('h3');
      const p=card.querySelector('p');
      if(h)h.textContent='Consolidado de tu galera';
      if(p)p.textContent='Resumen del rango limitado automáticamente a la galera asignada a tu perfil.';
    }
  }
};

/* Mantiene el texto correcto de captura aunque shell/render vuelvan a dibujar. */
const _phase2ToggleCapture=toggleCapture;
toggleCapture=function(btn,selector){
  _phase2ToggleCapture(btn,selector);
  btn.textContent=document.body.classList.contains('capture-mode')?'Salir de captura':'Vista captura';
};
