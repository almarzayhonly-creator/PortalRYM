(function(){
  const PAN75=['dashboard','negativos_hoy','ranking','pagos_hoy','cargar_pagos','historial','recurrentes','operaciones','reportes','recorrido'];
  const GLOBAL75=/^(portal\.|revisados\.|control_auto\.|admin\.)/i;
  const getAll=()=>Array.isArray(state.allModules)&&state.allModules.length?state.allModules:(Array.isArray(state.modules)?state.modules:[]);
  const has75=m=>getAll().includes(m);
  const pan75=()=>PAN75.filter(x=>getAll().includes(x));
  labels.recorrido='Recorrido';

  /* Conserva los módulos globales y agrega Recorrido al shell Panapass. */
  phase2NormalizeModules=function(){
    const current=Array.isArray(state.modules)?state.modules:[];
    if(current.some(x=>GLOBAL75.test(String(x)))||current.includes('recorrido')||!Array.isArray(state.allModules)||!state.allModules.length){
      if(current.length)state.allModules=[...new Set(current)];
    }
    state.modules=pan75();
    if(!state.modules.includes(state.active))state.active=state.modules.includes('dashboard')?'dashboard':(state.modules[0]||'dashboard');
  };

  window.v70OpenPanapass=async function(){
    window.__v75ControlMode=false;
    document.body.classList.remove('v70-portal','v70-control','v70-admin');
    state.modules=pan75();
    state.active=state.modules.includes('dashboard')?'dashboard':(state.modules[0]||'dashboard');
    shell();
    try{await render()}catch(e){const v=document.querySelector('#view');if(v)v.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`}
  };

  const oldRender75=render;
  render=async function(){
    if(state.active==='recorrido'){
      const v=document.querySelector('#view');if(v){v.innerHTML='<div class="card">Cargando Recorrido ENA...</div>';return v75Recorrido(v)}
    }
    return oldRender75();
  };

  const dISO=(d)=>{const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`};
  const defaultDates=()=>{const h=new Date(),d=new Date(h);d.setDate(d.getDate()-7);return{desde:dISO(d),hasta:dISO(h)}};
  function recHeaders(rows){
    if(!rows.length)return{headers:[],body:[]};
    const first=rows[0].map(x=>String(x||''));
    const looks=first.some(x=>/(fecha|saldo|importe|monto|tag|placa|pase|recarga|estaci|carril|descrip|hora)/i.test(x));
    const n=Math.max(...rows.map(r=>r.length));
    return{headers:looks?first:Array.from({length:n},(_,i)=>`Campo ${i+1}`),body:looks?rows.slice(1):rows};
  }
  function recTable(rows){
    if(!rows.length)return '<div class="v75-rec-empty">ENA no devolvió filas para ese rango.</div>';
    const {headers,body}=recHeaders(rows);return `<div class="table-wrap"><table class="v75-rec-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body.map(r=>`<tr>${headers.map((_,i)=>`<td>${esc(r[i]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
  }
  window.v75Recorrido=async function(v,preset=null){
    const dates=defaultDates();let selected=preset&&preset.panapass_numero?{unidad:preset.unidad||'',placa:preset.placa_unica||preset.placa||'',panapass_numero:preset.panapass_numero,empresa:preset.empresa_duena||preset.empresa_operadora||'',galera:preset.galera||'',supervisora:preset.supervisora||''}:null,searchTimer=null;
    v.innerHTML=`<div class="v75-recorrido"><section class="v75-rec-head"><div><h2>Recorrido ENA</h2><p>Consulta en vivo desde ENA para atender reclamos de operadores. El detalle de pases/recargas no se guarda; solo se registra quién hizo la consulta, la cuenta, el rango y si fue exitosa.</p></div><span class="pill">Consulta bajo tu alcance</span></section><section class="v75-rec-form"><div class="field v75-rec-search-field"><label>Unidad / placa / Panapass</label><div class="v75-rec-search-wrap"><input id="v75RecQ" autocomplete="off" placeholder="Ej. I010, EG4263 o 1167540"><div id="v75RecResults" class="v75-rec-results"></div></div><div id="v75RecSelected" class="v75-rec-selected"></div></div><div class="field"><label>Desde</label><input id="v75RecFrom" type="date" value="${dates.desde}"></div><div class="field"><label>Hasta</label><input id="v75RecTo" type="date" value="${dates.hasta}"></div><div class="field"><label>Consulta</label><select id="v75RecMode"><option value="PASES">Pases</option><option value="RECARGAS">Recargas</option><option value="SALDOS">Saldos</option></select></div><button id="v75RecGo">Consultar ENA</button></section><section id="v75RecOut" class="v75-rec-out"><div class="v75-rec-empty">Selecciona una unidad con credencial ENA confirmada.</div></section></div>`;
    const q=v.querySelector('#v75RecQ'),res=v.querySelector('#v75RecResults'),sel=v.querySelector('#v75RecSelected'),out=v.querySelector('#v75RecOut'),go=v.querySelector('#v75RecGo');
    const showSelected=()=>{if(!selected){sel.classList.remove('show');sel.innerHTML='';return}sel.classList.add('show');sel.innerHTML=`<b>${esc(selected.unidad||'')}</b> · ${esc(selected.placa||'')} · Panapass ${esc(selected.panapass_numero||'')} ${selected.galera?`· ${esc(selected.galera)}`:''}`;q.value=selected.unidad||String(selected.panapass_numero||'')};
    async function search(){const s=String(q.value||'').trim();selected=null;showSelected();if(s.length<2){res.classList.remove('show');res.innerHTML='';return}res.classList.add('show');res.innerHTML='<div class="v75-rec-empty">Buscando...</div>';try{const {data}=await req('/functions/v1/ena-recorrido',{method:'POST',body:JSON.stringify({action:'SEARCH',buscar:s})});if(!data?.ok)throw Error(data?.error||'No se pudo buscar');const rows=data.rows||[];res.innerHTML=rows.length?rows.map((r,i)=>`<div class="v75-rec-choice" data-rec-choice="${i}"><b>${esc(r.unidad||'')}</b><span>${esc(r.placa||'')} · Panapass ${esc(r.panapass_numero||'')}</span><small>${esc([r.galera,r.supervisora,r.empresa].filter(Boolean).join(' · '))}</small></div>`).join(''):'<div class="v75-rec-empty">No hay unidades con credencial ENA confirmada dentro de tu alcance.</div>';res.querySelectorAll('[data-rec-choice]').forEach(el=>el.onclick=()=>{selected=rows[Number(el.dataset.recChoice)];res.classList.remove('show');showSelected()})}catch(e){res.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`}}
    q.oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(search,300)};q.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();search()}};
    go.onclick=async()=>{if(!selected?.panapass_numero){out.innerHTML='<div class="alert">Selecciona primero una unidad de la lista.</div>';return}const desde=v.querySelector('#v75RecFrom').value,hasta=v.querySelector('#v75RecTo').value,modo=v.querySelector('#v75RecMode').value;if(!desde||!hasta){out.innerHTML='<div class="alert">Indica el rango de fechas.</div>';return}go.disabled=true;go.textContent='Consultando ENA...';out.innerHTML=`<div class="v75-rec-empty">Ingresando a ENA con la credencial confirmada de ${esc(selected.unidad||'la unidad')} y consultando ${esc(modo.toLowerCase())}...</div>`;try{const {data}=await req('/functions/v1/ena-recorrido',{method:'POST',body:JSON.stringify({action:'QUERY',panapass:Number(selected.panapass_numero),modo,desde,hasta})});if(!data?.ok)throw Error(data?.error||'ENA no devolvió resultado');out.innerHTML=`<div class="v75-rec-summary"><span class="v75-rec-chip">${esc(selected.unidad||'')}</span><span class="v75-rec-chip">${esc(modo)}</span><span class="v75-rec-chip">${esc(desde)} → ${esc(hasta)}</span><span class="v75-rec-chip">${Number(data.total||0)} fila(s)</span></div>${recTable(Array.isArray(data.rows)?data.rows:[])}`;}catch(e){out.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`}finally{go.disabled=false;go.textContent='Consultar ENA'}};
    document.addEventListener('click',function closeRec(e){if(!v.contains(e.target)){res.classList.remove('show');document.removeEventListener('click',closeRec)}});
    if(selected)showSelected();
  };

  window.v75OpenRecorridoFor=function(r){
    if(!has75('recorrido'))return;
    window.__v75ControlMode=false;
    state.modules=pan75();state.active='recorrido';shell();const v=document.querySelector('#view');if(v)v75Recorrido(v,r);
  };

  /* Acceso rápido desde la ficha de Control de Auto, solo si la credencial está confirmada. */
  const oldOpen75=phase6OpenUnit;
  phase6OpenUnit=function(r){oldOpen75(r);const m=document.querySelector('#ca6UnitModal'),card=m?.querySelector('.ca6-ena-card');if(!m||!card||!r?.credencial_disponible||!has75('recorrido')||card.querySelector('.v75-rec-unit-btn'))return;let a=card.querySelector('.v75-ena-actions');if(!a){a=document.createElement('div');a.className='v75-ena-actions';card.appendChild(a)}const b=document.createElement('button');b.className='soft-btn v75-rec-unit-btn';b.textContent='Consultar recorrido';b.onclick=()=>{m.style.display='none';window.v75OpenRecorridoFor(r)};a.appendChild(b)};

  /* -------- Control de Auto independiente -------- */
  const oldUnits75=window.v11UnitList||v11UnitList;
  function controlNav(active){
    const nav=document.querySelector('.side .nav');if(!nav)return;
    const isAdmin=String(state.profile?.rol||'').toUpperCase()==='ADMIN_TOTAL';
    const canValidator=isAdmin||(typeof window.rymHasModule==='function'&&window.rymHasModule('control_auto.validar_ecarcheck'));
    nav.innerHTML=`<button data-v75-control="dashboard" class="${active==='dashboard'?'active':''}">Dashboard</button><button data-v75-control="unidades" class="${active==='unidades'?'active':''}">Unidades</button>${isAdmin?`<button data-v75-control="auditoria" class="${active==='auditoria'?'active':''}">Auditoría</button>`:''}${canValidator?`<button data-v80-control="validator" class="${active==='validator'?'active':''}">Validador eCarCheck</button>`:''}`;
    nav.querySelector('[data-v75-control="dashboard"]')?.addEventListener('click',()=>v75ControlDashboard());
    nav.querySelector('[data-v75-control="unidades"]')?.addEventListener('click',()=>v75ControlUnits());
    nav.querySelector('[data-v75-control="auditoria"]')?.addEventListener('click',()=>v75ControlAudit());
    nav.querySelector('[data-v80-control="validator"]')?.addEventListener('click',()=>window.v80OpenEcarValidator?.());
    const top=document.querySelector('.top h1');if(top)top.textContent=active==='dashboard'?'Dashboard':active==='auditoria'?'Auditoría':active==='validator'?'Validador eCarCheck':'Unidades';const kick=document.querySelector('.portal-kicker');if(kick)kick.textContent='Portal RYM · Control de Auto';const outBtn=document.querySelector('#out');if(outBtn){outBtn.textContent='Volver al Portal';outBtn.onclick=()=>window.v36PortalHome()}
  }
  async function addAuditValidator(){document.querySelector('#v75AuditValidate')?.remove();document.querySelector('#v75AuditStatus')?.remove()}
  window.v11UnitList=async function(){await oldUnits75();if(window.__v75ControlMode){controlNav('unidades');/* V80: auditoría completa deshabilitada; usar Validador eCarCheck protegido */}};try{v11UnitList=window.v11UnitList}catch(_){}
  window.v75ControlUnits=async function(){window.__v75ControlMode=true;document.body.classList.remove('v70-portal','v70-admin');document.body.classList.add('v70-control');await window.v11UnitList();controlNav('unidades')};
  window.v75ControlAudit=async function(){window.__v75ControlMode=true;await window.v75ControlUnits();const b=document.querySelector('#ca6Audit');if(b){b.click();controlNav('auditoria');/* V80: auditoría completa deshabilitada; usar Validador eCarCheck protegido */}};
  window.v75ControlDashboard=async function(){
    window.__v75ControlMode=true;document.body.classList.remove('v70-portal','v70-admin');document.body.classList.add('v70-control','v117-control');
    state.modules=['dashboard'];state.active='dashboard';shell();controlNav('dashboard');const v=document.querySelector('#view');if(!v)return;
    const admin=String(state.profile?.rol||'').toUpperCase()==='ADMIN_TOTAL';
    const paint=(z,issues='…')=>{
      const total=Number(z.activas||0)+Number(z.otros||0);v.innerHTML=`<div class="v75-control-dashboard"><section class="v75-control-hero"><div><h2>Control de Auto</h2><p>Maestra operativa de flota. Consulta unidades, cupos y auditoría eCarCheck con identidad propia.</p></div><div class="v75-control-actions"><button id="v75DashUnits">Ver unidades</button>${admin?'<button class="soft-btn" id="v75DashAudit">Abrir auditoría</button>':''}</div></section><div class="v75-control-kpis"><article class="v75-control-kpi"><span>Total flota</span><strong>${total}</strong></article><article class="v75-control-kpi"><span>Activas</span><strong>${Number(z.activas||0)}</strong></article><article class="v75-control-kpi bad"><span>Cerradas</span><strong>${Number(z.cerradas||0)}</strong></article><article class="v75-control-kpi"><span>Canibalizadas</span><strong>${Number(z.canibalizadas||0)}</strong></article><article class="v75-control-kpi" id="v117CtlAudit"><span>Alertas auditoría</span><strong id="v117CtlAuditCount">${admin?issues:'—'}</strong><small id="v117CtlAuditHint">${admin&&issues==='…'?'Actualizando en segundo plano':''}</small></article></div><section class="v75-control-note">Dashboard, Unidades, Cupos ATTT, Auditoría y Validador permanecen dentro de Control de Auto. <b>Volver al Portal</b> es el único acceso externo.</section></div>`;
      v.querySelector('#v75DashUnits').onclick=()=>v75ControlUnits();v.querySelector('#v75DashAudit')?.addEventListener('click',()=>v75ControlAudit());
    };
    try{
      const cache=window.__v117ControlSummary,valid=cache&&(Date.now()-cache.at)<60000;
      let z;
      if(valid){z=cache.data;paint(z,'…')}
      else{v.innerHTML='<div class="card">Cargando Control de Auto...</div>';z=(await rpc('panapass_control_auto_resumen').catch(()=>[]))?.[0]||{};window.__v117ControlSummary={data:z,at:Date.now()};paint(z,'…')}
      if(valid){rpc('panapass_control_auto_resumen').then(r=>{const fresh=r?.[0]||{};window.__v117ControlSummary={data:fresh,at:Date.now()}}).catch(()=>{})}
      if(admin){
        req('/functions/v1/control-auto-auditoria',{method:'POST',body:'{}'}).then(r=>{const ak=r.data?.kpis||{},defs=[['cupos_registrar','Cupos por registrar'],['cupos_corregir','Cupos por corregir'],['cupos_local_sin_ecarcheck','Cupos sin eCarCheck'],['cambios_color','Cambios de color'],['cupo_color_inconsistente','Color de cupo inconsistente'],['amarillo_sin_cupo','Amarillas sin cupo'],['traspasos_detectados','Traspasos detectados'],['validar_traspaso','Traspasos por validar'],['sin_propietario','Sin propietario'],['ecarcheck_sin_control','eCarCheck sin Control'],['terceros_pendientes','Terceros pendientes']],items=defs.map(([key,label])=>({label,count:Number(ak[key]||0)})).filter(x=>x.count>0),issues=items.reduce((a,x)=>a+x.count,0),n=document.querySelector('#v117CtlAuditCount'),h=document.querySelector('#v117CtlAuditHint'),c=document.querySelector('#v117CtlAudit');if(n)n.textContent=String(issues);if(h)h.textContent=issues?`Ver ${issues} hallazgos →`:'Sin hallazgos pendientes';if(c){c.classList.toggle('warn',issues>0);c.classList.add('v126-audit-link');c.setAttribute('role','button');c.tabIndex=0;c.onclick=()=>window.v75ControlAudit?.();c.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')c.click()}}const root=document.querySelector('.v75-control-dashboard');if(root){let box=root.querySelector('#v126AuditSummary');if(!box){box=document.createElement('section');box.id='v126AuditSummary';box.className='v126-audit-summary';root.querySelector('#v123SupervisorPanel,.v75-control-note')?.before(box)}box.innerHTML=issues?`<div><h3>Qué necesita revisión</h3><p>Son hallazgos de calidad de datos; una unidad puede aparecer en más de una categoría.</p><div class="v126-audit-chips">${items.map(x=>`<span><b>${x.count}</b> ${esc(x.label)}</span>`).join('')}</div></div><button id="v126OpenAudit">Revisar hallazgos</button>`:`<div><h3>Auditoría al día</h3><p>No hay hallazgos pendientes en este momento.</p></div>`;box.querySelector('#v126OpenAudit')?.addEventListener('click',()=>window.v75ControlAudit?.())}}).catch(()=>{const h=document.querySelector('#v117CtlAuditHint');if(h)h.textContent='Abrir auditoría para consultar el detalle';});
      }
    }catch(e){v.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`}
  };
  window.v70OpenControl=async function(){if(!(has75('portal.control_auto')||has75('control_auto.unidades')))return;return v75ControlDashboard()};

  /* Si el usuario regresa al Portal, apaga el modo Control para no contaminar navegación. */
  const oldHome75=window.v36PortalHome;window.v36PortalHome=function(){window.__v75ControlMode=false;return oldHome75()};
})();

/* V172 canonical Control Auto application boundary. */
window.RYM_CONTROL_APP=Object.freeze({
  dashboard:()=>window.v75ControlDashboard(),
  unidades:()=>window.v75ControlUnits(),
  auditoria:()=>window.v75ControlAudit(),
  cupos:()=>window.v94ControlCuposATTT(),
  validador:()=>window.v80OpenEcarValidator()
});
