(function(){
  const V141E=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const V141N=v=>String(v??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const V141Fmt=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('es-PA',{timeZone:'America/Panama',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch(_){return String(v)}};
  const role141=()=>V141N(state?.profile?.rol||'');
  function module141(){
    const c=document.body.className||'';
    if(c.includes('v70-admin'))return 'USUARIOS';
    if(c.includes('v66-revisados')||c.includes('v60-revisados'))return 'REVISADOS';
    if(c.includes('v70-control'))return state?.active==='gps'?'GPS':'CONTROL_AUTO';
    if(c.includes('v99-home')||c.includes('v70-portal'))return 'PORTAL';
    const a=V141N(state?.active||'');
    if(a.includes('PAGO'))return 'PANAPASS_PAGOS';
    if(a.includes('GPS'))return 'GPS';
    if(a.includes('REV'))return 'REVISADOS';
    if(a.includes('CONTROL')||a.includes('CUPO'))return 'CONTROL_AUTO';
    return 'PANAPASS';
  }
  let hbBusy=false;
  async function heartbeat141(){
    if(hbBusy||!state?.token||!state?.profile||document.visibilityState==='hidden')return;
    hbBusy=true;try{await req('/functions/v1/portal-presencia',{method:'POST',body:JSON.stringify({action:'HEARTBEAT',modulo:module141(),pagina:String(state?.active||'')})})}catch(_){ }finally{hbBusy=false}
  }
  setTimeout(heartbeat141,3500);setInterval(heartbeat141,60000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')heartbeat141()});window.addEventListener('focus',heartbeat141);

  async function activity141(){
    const main=document.querySelector('.v70-admin-main');if(!main||role141()!=='ADMIN_TOTAL')return;
    document.querySelectorAll('.v70-admin-side>button').forEach(b=>b.classList.remove('active'));document.querySelector('#v141ActivityTab')?.classList.add('active');
    main.innerHTML='<div style="padding:24px">Cargando actividad...</div>';
    try{
      const {data}=await req('/functions/v1/portal-presencia',{method:'POST',body:JSON.stringify({action:'LIST'})});if(!data?.ok)throw Error(data?.error||'No se pudo cargar actividad');
      const rows=data.rows||[],k=data.kpis||{};
      main.innerHTML=`<header class="v70-admin-top"><div><h1>Actividad de usuarios</h1><p>Presencia actual sin historial. En línea = actividad recibida en los últimos 3 minutos.</p></div><span class="badge">ADMIN_TOTAL</span></header><div class="v141-activity-wrap"><div class="v141-activity-kpis"><article class="v141-activity-kpi"><span>En línea ahora</span><strong>${Number(k.online||0)}</strong></article><article class="v141-activity-kpi"><span>Actividad hoy</span><strong>${Number(k.actividad_hoy||0)}</strong></article><article class="v141-activity-kpi"><span>Usuarios activos</span><strong>${Number(k.activos||0)}</strong></article><article class="v141-activity-kpi"><span>Nunca ingresaron</span><strong>${Number(k.nunca||0)}</strong></article></div><div class="v141-activity-toolbar"><input id="v141ActQ" placeholder="Buscar usuario, rol, módulo o galera"><button class="v70-soft" id="v141ActReload">Actualizar</button></div><div class="v141-activity-table" id="v141ActTable"></div></div>`;
      const box=main.querySelector('#v141ActTable'),q=main.querySelector('#v141ActQ');
      const paint=()=>{const term=V141N(q.value),a=rows.filter(r=>!term||V141N([r.nombre,r.email,r.usuario,r.rol,r.modulo,(r.galeras_scope||[]).join(' ')].join(' ')).includes(term));box.innerHTML=`<div class="table-wrap"><table class="pretty"><thead><tr><th>Usuario</th><th>Estado</th><th>Rol</th><th>Módulo actual</th><th>Última actividad</th><th>Último login</th><th>Sesión actual</th><th>Dispositivo</th></tr></thead><tbody>${a.map(r=>`<tr><td><b>${V141E(r.nombre||r.usuario||'—')}</b><div class="v141-device">${V141E(r.email||'')}</div></td><td>${r.online?'<span class="v141-online">EN LÍNEA</span>':'<span class="v141-offline">Fuera de línea</span>'}</td><td>${V141E(r.rol||'—')}</td><td><b>${V141E(r.modulo||'—')}</b><div class="v141-device">${V141E(r.pagina||'')}</div></td><td>${V141E(V141Fmt(r.last_seen))}</td><td>${V141E(V141Fmt(r.last_sign_in_at))}</td><td>${V141E(V141Fmt(r.session_started_at))}</td><td>${V141E(r.device||'—')}</td></tr>`).join('')||'<tr><td colspan="8" class="empty">Sin resultados.</td></tr>'}</tbody></table></div>`};q.oninput=paint;paint();main.querySelector('#v141ActReload').onclick=activity141;
    }catch(e){main.innerHTML=`<div class="alert">${V141E(e.message||e)}</div>`}
  }
  function installActivity141(){
    if(role141()!=='ADMIN_TOTAL')return;const side=document.querySelector('.v70-admin-side');if(!side||side.querySelector('#v141ActivityTab'))return;
    const usersBtn=[...side.children].find(x=>x.tagName==='BUTTON'&&/USUARIOS/i.test(x.textContent||''));if(!usersBtn)return;
    usersBtn.id='v141UsersTab';usersBtn.onclick=()=>window.v70OpenUsers?.();
    const b=document.createElement('button');b.id='v141ActivityTab';b.className='v141-admin-activity-btn';b.textContent='Actividad';b.onclick=activity141;usersBtn.insertAdjacentElement('afterend',b);
  }
  (window.__RYM_USERS_PENDING_AFTER__ ||= []).push(async function(){installActivity141();heartbeat141()});

  function closeMail141(){document.querySelector('#v141CuposMail')?.remove()}
  async function cuposMail141(){
    if(role141()!=='ADMIN_TOTAL')return;
    closeMail141();const modal=document.createElement('div');modal.id='v141CuposMail';modal.className='v141-modal';modal.innerHTML=`<div class="v141-modal-card"><div class="v141-modal-head"><div><h2>Enviar estado de Cupos ATTT</h2><p>Resumen Control de Auto vs eCarCheck + Excel detallado adjunto.</p></div><button class="v141-close" id="v141MailClose">Cerrar</button></div><div id="v141MailBody"><div style="padding:30px;text-align:center">Preparando reporte...</div></div></div>`;document.body.appendChild(modal);modal.querySelector('#v141MailClose').onclick=closeMail141;modal.onclick=e=>{if(e.target===modal)closeMail141()};
    try{
      const [rr,pp]=await Promise.all([req('/functions/v1/control-auto-cupos-attt-email',{method:'POST',body:JSON.stringify({action:'RECIPIENTS'})}),req('/functions/v1/control-auto-cupos-attt-email',{method:'POST',body:JSON.stringify({action:'PREVIEW'})})]);const recs=rr.data?.recipients||[],pre=pp.data||{},s=pre.summary||{};
      const body=modal.querySelector('#v141MailBody');body.innerHTML=`<div class="v141-from">Remitente: <b>${V141E(pre.from||'panapassrym@gmail.com')}</b> · Adjunto: <b>${V141E(pre.attachment_name||'Cupos_ATTT.xlsx')}</b> (${Number(pre.attachment_rows||0)} filas)</div><div class="v141-mail-summary"><article><span>Total cupos</span><b>${Number(s.total||0)}</b></article><article><span>Confirmados</span><b>${Number(s.confirmados||0)}</b></article><article><span>Revisar</span><b>${Number(s.revisar||0)}</b></article><article><span>Difieren</span><b>${Number(s.difieren||0)}</b></article><article><span>Stock</span><b>${Number(s.stock||0)}</b></article><article><span>Retenidos</span><b>${Number(s.retenidos||0)}</b></article><article><span>Externos eCarCheck</span><b>${Number(s.externos||0)}</b></article><article><span>Sin consulta/ficha</span><b>${Number(s.sin_consulta||0)}</b></article></div><div class="v141-from"><b>Última información eCarCheck:</b> ${V141E(V141Fmt(s.ultima_ecarcheck))}</div><div class="v141-rec-tools"><input id="v141RecQ" placeholder="Buscar nombre, correo, rol o galera"><button class="v70-soft" id="v141RecTarget">Pagador + Administración</button><button class="v70-soft" id="v141RecClear">Limpiar</button></div><div class="v141-rec-list" id="v141RecList">${recs.map(r=>`<label class="v141-rec" data-search="${V141E(V141N([r.nombre,r.email,r.tipo,r.galera].join(' ')))}"><input type="checkbox" data-mail="${V141E(r.email)}"><span><b>${V141E(r.nombre||r.email)}</b><small>${V141E(r.email)} · ${V141E(r.tipo||'')} ${r.galera?'· '+V141E(r.galera):''}</small></span></label>`).join('')}</div><div class="v141-rec-tools"><input id="v141Manual" type="email" placeholder="Agregar correo manual"><button class="v70-soft" id="v141ManualAdd">Agregar</button></div><div class="v141-mail-actions"><button class="soft" id="v141MailCancel">Cancelar</button><button class="send" id="v141MailSend">Enviar correo + Excel</button></div><div class="v141-mail-status" id="v141MailStatus">${V141E(pre.subject||'')}</div>`;
      const list=body.querySelector('#v141RecList'),search=body.querySelector('#v141RecQ'),status=body.querySelector('#v141MailStatus');search.oninput=()=>{const t=V141N(search.value);list.querySelectorAll('.v141-rec').forEach(x=>x.style.display=!t||String(x.dataset.search||'').includes(t)?'flex':'none')};body.querySelector('#v141RecClear').onclick=()=>list.querySelectorAll('input[type=checkbox]').forEach(x=>x.checked=false);body.querySelector('#v141RecTarget').onclick=()=>{list.querySelectorAll('.v141-rec').forEach(x=>{const t=V141N(x.textContent);x.querySelector('input').checked=/PAGADOR|ADMIN|GERENTE/.test(t)})};body.querySelector('#v141ManualAdd').onclick=()=>{const input=body.querySelector('#v141Manual'),em=String(input.value||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){status.textContent='Correo manual inválido.';return}const lab=document.createElement('label');lab.className='v141-rec';lab.innerHTML=`<input type="checkbox" data-mail="${V141E(em)}" checked><span><b>${V141E(em)}</b><small>Manual</small></span>`;list.prepend(lab);input.value=''};body.querySelector('#v141MailCancel').onclick=closeMail141;body.querySelector('#v141MailSend').onclick=async()=>{const to=[...list.querySelectorAll('input[type=checkbox]:checked')].map(x=>x.dataset.mail).filter(Boolean);if(!to.length){status.textContent='Selecciona al menos un destinatario.';return}if(!confirm(`Enviar reporte de Cupos ATTT a ${to.length} destinatario(s)?`))return;const btn=body.querySelector('#v141MailSend');btn.disabled=true;status.textContent='Generando Excel y enviando...';try{const r=await req('/functions/v1/control-auto-cupos-attt-email',{method:'POST',body:JSON.stringify({action:'SEND',to})});if(!r.data?.ok)throw Error(r.data?.error||'No se pudo enviar');status.textContent=`Enviado correctamente a ${to.length} destinatario(s).`;btn.textContent='Enviado ✓'}catch(e){status.textContent=e.message||String(e);btn.disabled=false}};
    }catch(e){modal.querySelector('#v141MailBody').innerHTML=`<div class="alert">${V141E(e.message||e)}</div>`}
  }
  (window.__RYM_CONTROL_PENDING_AFTER__ ||= []).push(['cupos',async function(){try{if(role141()==='ADMIN_TOTAL'){const hero=document.querySelector('.v94-cupos-hero');if(hero&&!hero.querySelector('#v141CuposMailBtn')){const b=document.createElement('button');b.id='v141CuposMailBtn';b.className='v141-mail-btn';b.textContent='Enviar reporte';b.onclick=cuposMail141;hero.appendChild(b)}}}catch(_){}heartbeat141()}]);
})();
