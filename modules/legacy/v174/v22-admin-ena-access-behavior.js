
(function(){
  function canManage(){return String(role?.()||'').toUpperCase()==='ADMIN_TOTAL'}
  function upper(v){return String(v||'').toUpperCase()}
  const ENA_URL='https://www.enarecargas.com/maxipista/private';
  function stateBox(s,j={}){
    const x=upper(s);
    if(x==='OK'||x==='GENERICA_OK')return `<div class="ca22-good">✅ Acceso ENA validado y datos actualizados.</div>`;
    if(x==='CLAVE_RECIBIDA'||x==='VALIDANDO')return `<div class="ca22-warn">📩 Clave recibida por Gmail. El robot la procesará automáticamente aunque cierres este portal.</div>`;
    if(x==='PENDIENTE_CORREO'||x==='ESPERANDO_CORREO')return `<div class="ca22-warn">📧 Pendiente por correo. Puedes seguir con otros Panapass; Gmail continúa vigilando automáticamente.</div>`;
    if(x==='CAMBIO_PASSWORD_MANUAL')return `<div class="ca22-warn">⚠️ ENA exige cambiar la contraseña. Este paso es manual.</div>`;
    if(x==='VALIDACION_CORREO_MANUAL'||x==='VALIDAR_EMAIL'||x==='PASO_MANUAL')return `<div class="ca22-warn">⚠️ ENA exige validar correo/código. Este paso es manual.</div>`;
    if(x==='REVISION_ENA')return `<div class="ca22-bad">⚠️ Esta cuenta antes funcionaba y ENA volvió a exigir revisión. Motivo: ${esc(j.review_reason||j.last_result||'revisión requerida')}.</div>`;
    if(x==='SIN_CREDENCIAL_ACTIVA')return `<div class="ca22-warn">⚠️ Hay datos históricos de ENA, pero esta cuenta no tiene una credencial activa. Se probará la clave genérica ahora.</div>`;
    if(x==='RECUPERACION_REQUERIDA'||x==='CLAVE_NO_VALIDA')return `<div class="ca22-bad">🔐 La clave no fue aceptada. Debe solicitarse recuperación real en ENA.</div>`;
    if(x==='PROBANDO_GENERICA')return `<div class="ca22-warn">🔄 Probando clave genérica protegida...</div>`;
    if(x==='ERROR_TEMPORAL')return `<div class="ca22-warn">🛡️ ENA no pudo completar la prueba ahora. La credencial se conserva.</div>`;
    return `<div class="ca22-warn">Estado actual: ${esc(s||'SIN GESTIÓN')}</div>`;
  }
  async function call(pan,action){const {data}=await req('/functions/v1/ena-admin-access',{method:'POST',body:JSON.stringify({panapass:Number(pan),action})});if(!data?.ok)throw Error(data?.error||'No se pudo gestionar el acceso ENA.');return data}
  async function requestRecovery(pan){const {data}=await req('/functions/v1/ena-recovery-request',{method:'POST',body:JSON.stringify({panapass:Number(pan)})});if(!data?.ok)throw Error(data?.error||'No se pudo solicitar la recuperación en ENA.');return data}
  async function probeAndContinue(pan,msg){
    msg.innerHTML='<div class="card">Probando clave genérica en ENA...</div>';
    const r=await call(pan,'probe_generic');
    if(['GENERICA_OK','OK'].includes(upper(r.state))){msg.innerHTML='<div class="ca22-good">✅ Clave genérica OK. ENA fue consultado y Supabase quedó actualizado.</div>';return r}
    if(upper(r.state)==='RECUPERACION_REQUERIDA'||upper(r.result)==='CLAVE_NO_VALIDA'){
      msg.innerHTML='<div class="card">La genérica no funcionó. Solicitando recuperación real en ENA...</div>';
      const rr=await requestRecovery(pan);
      msg.innerHTML=rr.duplicate?'<div class="ca22-warn">📧 Ya existe una solicitud reciente. Queda pendiente por correo.</div>':'<div class="ca22-good">📧 Recuperación solicitada en ENA. Puedes continuar con otra unidad; el robot seguirá Gmail.</div>';
      return rr;
    }
    if(['CAMBIO_PASSWORD_MANUAL','VALIDACION_CORREO_MANUAL','VALIDAR_EMAIL','PASO_MANUAL'].includes(upper(r.state))){msg.innerHTML='<div class="ca22-warn">⚠️ ENA aceptó la credencial pero exige un paso manual.</div>';return r}
    msg.innerHTML='<div class="ca22-warn">🛡️ La prueba quedó diferida. Revisa el estado en unos minutos.</div>';return r
  }
  async function openAccess(pan,unidad){
    if(!canManage()||!pan)return;let m=document.querySelector('#ca22Modal');if(!m){m=document.createElement('div');m.id='ca22Modal';m.className='user-modal';document.body.appendChild(m)}
    const close=()=>{m.style.display='none';m.innerHTML=''};m.style.display='flex';m.innerHTML=`<div class="user-modal-card" style="max-width:780px;width:95vw;max-height:92vh;overflow:auto"><div class="table-summary"><div><h2 style="margin:0">Gestión acceso ENA${unidad?` · ${esc(unidad)}`:''}</h2><span class="muted">Panapass ${esc(String(pan))} · exclusivo ADMIN_TOTAL</span></div><button class="soft-btn" data-ca22-close>Cerrar</button></div><div data-ca22-body><div class="card">Consultando estado...</div></div></div>`;m.querySelector('[data-ca22-close]').onclick=close;m.onclick=e=>{if(e.target===m)close()};
    let autoStarted=false;
    async function paint(){
      const body=m.querySelector('[data-ca22-body]');if(!body)return;body.innerHTML='<div class="card">Consultando estado...</div>';
      try{
        const d=await call(pan,'status'),a=d.account||{},c=d.credential||{},j=d.job||{};const js=upper(j.estado),cr=upper(c.ultimo_resultado),co=upper(c.origen),as=upper(a.estado_acceso);
        const hasCred=!!c.credencial_id;
        const ok=hasCred&&(js==='OK'||js==='GENERICA_OK'||cr==='OK');
        const staleOk=as==='OK'&&!hasCred;
        const waiting=['PENDIENTE_CORREO','ESPERANDO_CORREO'].includes(js);
        const received=['CLAVE_RECIBIDA','VALIDANDO'].includes(js)||(co==='GMAIL'&&!ok&&!waiting);
        const manualChange=js==='CAMBIO_PASSWORD_MANUAL';
        const manualEmail=['VALIDACION_CORREO_MANUAL','VALIDAR_EMAIL','PASO_MANUAL'].includes(js);
        const review=js==='REVISION_ENA';
        const recovery=['RECUPERACION_REQUERIDA','CLAVE_NO_VALIDA'].includes(js)||cr==='CLAVE_NO_VALIDA';
        const display=staleOk?'SIN_CREDENCIAL_ACTIVA':review?'REVISION_ENA':manualChange?'CAMBIO_PASSWORD_MANUAL':manualEmail?'VALIDACION_CORREO_MANUAL':received?'CLAVE_RECIBIDA':waiting?'PENDIENTE_CORREO':js||cr||as||'SIN GESTIÓN';
        const age=j.recovery_requested_at?Date.now()-new Date(j.recovery_requested_at).getTime():Infinity;const canRetryRecovery=waiting&&age>=600000;
        const shouldAuto=!autoStarted&&!ok&&!waiting&&!received&&!manualChange&&!manualEmail&&!review&&!recovery&&!['PROBANDO_GENERICA','ERROR_TEMPORAL'].includes(js);
        body.innerHTML=`<div class="ca22-access-card">${stateBox(display,j)}<div class="ca22-access-grid"><div><span>Unidad</span><b>${esc(unidad||'—')}</b></div><div><span>Panapass</span><b>${esc(String(pan))}</b></div><div><span>Estado ENA</span><b>${esc(a.estado_acceso||'—')}</b></div><div><span>Resultado credencial</span><b>${esc(c.ultimo_resultado||'—')}</b></div><div><span>Flujo</span><b>${esc(display)}</b></div><div><span>Última consulta</span><b>${a.ultima_consulta?esc(fmtDT(a.ultima_consulta)):'—'}</b></div></div><div class="ca22-actions">${recovery?'<button data-ca22-recover>📧 Solicitar recuperación ENA</button>':''}${canRetryRecovery?'<button data-ca22-recover>📧 Segundo intento de recuperación</button>':''}${waiting&&!canRetryRecovery?'<button class="soft-btn" disabled>Correo pendiente</button>':''}${received?'<button class="soft-btn" data-ca22-refresh>Actualizar estado</button>':''}${manualChange||manualEmail?'<button class="soft-btn" data-ca22-manualaccess>Ver Panapass y clave</button><button class="soft-btn" data-ca22-openena>Abrir ENA</button>':''}${manualChange?'<button data-ca22-manualgeneric>Ya cambié la contraseña a la genérica</button>':''}${manualEmail?'<button data-ca22-retry>Ya validé el correo · Reintentar</button>':''}${review?'<button class="soft-btn" data-ca22-openena>Abrir ENA para revisar</button><button data-ca22-retry>Probar nuevamente</button>':''}${!received?'<button class="soft-btn" data-ca22-refresh>Actualizar estado</button>':''}</div><div class="ca22-step">${waiting?'No necesitas dejar esta ventana abierta. Si el correo llega hoy, mañana o en varios días, el robot lo procesará automáticamente.':received?'La clave recibida queda en backend y el worker la probará automáticamente.':manualChange||manualEmail?'Completa el paso manual en ENA y vuelve aquí para continuar.':review?'El Saldo Express puede seguir con las demás unidades; esta queda señalada para revisión.':'Al abrir un Panapass nuevo se prueba una sola vez la clave genérica; si falla, se inicia recuperación.'}</div><div class="ca22-msg" data-ca22-msg></div></div>`;
        const msg=body.querySelector('[data-ca22-msg]');body.querySelectorAll('[data-ca22-refresh]').forEach(b=>b.onclick=paint);body.querySelectorAll('[data-ca22-openena]').forEach(b=>b.onclick=()=>window.open(ENA_URL,'_blank','noopener,noreferrer'));
        body.querySelectorAll('[data-ca22-recover]').forEach(b=>b.onclick=async()=>{b.disabled=true;msg.innerHTML='<div class="card">Solicitando recuperación directamente en ENA...</div>';try{const r=await requestRecovery(pan);msg.innerHTML=r.duplicate?'<div class="ca22-warn">📧 Hay una solicitud reciente; continúa pendiente por correo.</div>':'<div class="ca22-good">📧 ENA confirmó la solicitud. El robot seguirá Gmail automáticamente.</div>';setTimeout(paint,800)}catch(e){msg.innerHTML=`<div class="ca22-bad">${esc(e.message||e)}</div>`;b.disabled=false}});
        const ma=body.querySelector('[data-ca22-manualaccess]');if(ma)ma.onclick=async()=>{ma.disabled=true;msg.innerHTML='<div class="card">Leyendo credencial activa...</div>';try{const {data:r}=await req('/functions/v1/ena-credencial-visible',{method:'POST',body:JSON.stringify({panapass:Number(pan)})});if(!r?.ok||!r.password)throw Error(r?.error||'No se pudo obtener la credencial.');const pu=String(r.panapass_numero||pan),pw=String(r.password);msg.innerHTML=`<div class="ca22-manual-box"><div class="ca22-manual-title">Acceso manual ENA</div><div class="ca22-manual-row"><span>Panapass</span><div class="ca22-secret">${esc(pu)}</div><button class="soft-btn" data-cp1>Copiar</button></div><div class="ca22-manual-row"><span>Clave recibida</span><div class="ca22-secret">${esc(pw)}</div><button class="soft-btn" data-cp2>Copiar</button></div><div class="ca22-actions"><button data-cpb>Copiar ambos</button><button class="soft-btn" data-go>Abrir ENA</button></div></div>`;const cp=async(t,b)=>{try{await navigator.clipboard.writeText(t);b.textContent='Copiado ✓'}catch{prompt('Copia este valor:',t)}};msg.querySelector('[data-cp1]').onclick=e=>cp(pu,e.currentTarget);msg.querySelector('[data-cp2]').onclick=e=>cp(pw,e.currentTarget);msg.querySelector('[data-cpb]').onclick=e=>cp(`Panapass: ${pu}\nClave: ${pw}`,e.currentTarget);msg.querySelector('[data-go]').onclick=()=>window.open(ENA_URL,'_blank','noopener,noreferrer')}catch(e){msg.innerHTML=`<div class="ca22-bad">${esc(e.message||e)}</div>`}finally{ma.disabled=false}};
        const mg=body.querySelector('[data-ca22-manualgeneric]');if(mg)mg.onclick=async()=>{if(!confirm('Confirma que ya cambiaste manualmente en ENA la contraseña a la genérica de la empresa.'))return;mg.disabled=true;msg.innerHTML='<div class="card">Validando la genérica...</div>';try{const {data:x}=await req('/rest/v1/rpc/panapass_ena_prepare_manual_generic',{method:'POST',body:JSON.stringify({p_panapass:Number(pan)})});if(x?.ok===false)throw Error(x?.error||'No se pudo preparar la genérica.');const r=await call(pan,'retry');msg.innerHTML=upper(r.state)==='OK'?'<div class="ca22-good">✅ Genérica confirmada, datos ENA capturados y Supabase actualizado.</div>':'<div class="ca22-warn">ENA todavía requiere revisión.</div>';setTimeout(paint,900)}catch(e){msg.innerHTML=`<div class="ca22-bad">${esc(e.message||e)}</div>`;mg.disabled=false}};
        const retry=body.querySelector('[data-ca22-retry]');if(retry)retry.onclick=async()=>{retry.disabled=true;msg.innerHTML='<div class="card">Reintentando acceso...</div>';try{const r=await call(pan,'retry');if(upper(r.state)==='RECUPERACION_REQUERIDA'){await requestRecovery(pan);msg.innerHTML='<div class="ca22-good">📧 Sigue sin entrar; se solicitó recuperación y queda pendiente por correo.</div>'}else msg.innerHTML=upper(r.state)==='OK'?'<div class="ca22-good">✅ Acceso OK y Supabase actualizado.</div>':'<div class="ca22-warn">Estado actualizado; revisa el paso indicado.</div>';setTimeout(paint,900)}catch(e){msg.innerHTML=`<div class="ca22-bad">${esc(e.message||e)}</div>`;retry.disabled=false}};
        if(shouldAuto){autoStarted=true;await probeAndContinue(pan,msg);setTimeout(paint,900)}
      }catch(e){body.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`}
    }
    await paint();
  }
  window.ca22OpenAccess=openAccess;const oldOpen=window.phase6OpenUnit;if(typeof oldOpen==='function')window.phase6OpenUnit=function(r){oldOpen(r);if(!canManage())return;const m=document.querySelector('#ca6UnitModal'),card=m?.querySelector('.ca6-ena-card');if(card&&!card.querySelector('[data-ca22-manage]')){const w=document.createElement('div');w.style.marginTop='10px';w.innerHTML='<button data-ca22-manage>Gestionar acceso ENA</button>';card.appendChild(w);w.querySelector('[data-ca22-manage]').onclick=()=>openAccess(r.panapass_numero,r.unidad)}};
  document.addEventListener('click',e=>{if(!canManage())return;const td=e.target?.closest?.('#ca6Out td[data-label="Panapass"]');if(!td)return;const pan=String(td.textContent||'').replace(/\D/g,'');if(!pan)return;const tr=td.closest('tr'),unidad=tr?.querySelector('td[data-label="Unidad"]')?.textContent?.trim()||'';e.preventDefault();openAccess(pan,unidad)},true);
  /* V36: se elimina el observer global del documento. El estilo clickable de Panapass se aplica por clase de rol desde el shell. */
})();
