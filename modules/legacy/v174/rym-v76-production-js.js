
(function(){
  const PAN76=['dashboard','negativos_hoy','ranking','pagos_hoy','cargar_pagos','historial','recurrentes','operaciones','reportes','recorrido'];
  const dISO76=d=>{const z=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`};
  const defaultDates76=()=>{const h=new Date(),d=new Date(h);d.setDate(d.getDate()-7);return{desde:dISO76(d),hasta:dISO76(h)}};
  const sleep76=ms=>new Promise(r=>setTimeout(r,ms));
  const fullMods76=()=>Array.isArray(state.allModules)&&state.allModules.length?state.allModules:(Array.isArray(state.modules)?state.modules:[]);
  const panMods76=()=>PAN76.filter(x=>fullMods76().includes(x));

  /* -------- Navegación: reconstruye permisos completos al volver al Portal -------- */
  const home75=window.v36PortalHome;
  async function refreshFullModules76(){
    if(!state.token)return false;
    try{
      const {data}=await req('/functions/v1/portal-session-modules',{method:'POST',body:'{}'});
      if(data?.ok&&Array.isArray(data.modules)){
        state.allModules=[...new Set(data.modules.map(String))];
        if(data.profile)state.profile={...(state.profile||{}),...data.profile};
        return true;
      }
    }catch(_){ }
    return false;
  }
  window.v36PortalHome=async function(){
    window.__v75ControlMode=false;
    await refreshFullModules76();
    return home75?.apply(this,arguments);
  };
  try{v36PortalHome=window.v36PortalHome}catch(_){}

  const clear75=clearSession;
  clearSession=function(){
    const r=clear75();
    state.profile=null;state.modules=[];state.allModules=[];state.active='dashboard';
    return r;
  };

  /* Unifica todos los botones visibles Volver al Portal con la reconstrucción segura. */
  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('button');if(!b)return;
    const t=String(b.textContent||'').trim().toUpperCase();
    if((t.includes('VOLVER AL PORTAL')||t==='PORTAL RYM')&&!b.dataset.v76PortalBound){
      e.preventDefault();e.stopImmediatePropagation();window.v36PortalHome();
    }
  },true);

  /* V80: el validador masivo V76 fue retirado. Solo existe el Validador eCarCheck protegido por jornadas/selección. */
  /* -------- Recorrido: catálogo completo de credenciales visibles -------- */
  function recTable76(rows){
    if(!rows?.length)return '<div class="v75-rec-empty">ENA no devolvió filas para ese rango.</div>';
    const first=(rows[0]||[]).map(x=>String(x||'')),looks=first.some(x=>/(fecha|saldo|importe|monto|tag|placa|pase|recarga|estaci|carril|descrip|hora)/i.test(x)),n=Math.max(...rows.map(r=>r.length)),headers=looks?first:Array.from({length:n},(_,i)=>`Campo ${i+1}`),body=looks?rows.slice(1):rows;
    return `<div class="table-wrap"><table class="v75-rec-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body.map(r=>`<tr>${headers.map((_,i)=>`<td>${esc(r[i]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function msgENA76(err,data){
    const x=String(err||'');
    if(/controles de fecha/i.test(x))return 'ENA respondió, pero la estructura de los campos de fecha cambió. El intento quedó registrado para ajustar el mapeo sin afectar otras consultas.';
    if(/ena_ocupado/i.test(x))return 'ENA está atendiendo otra consulta del Portal. Espera unos segundos y vuelve a intentar.';
    if(/credencial_no_confirmada/i.test(x))return 'Esta unidad todavía no tiene una credencial ENA confirmada.';
    if(/rango_maximo/i.test(x))return 'El rango máximo permitido es de 62 días.';
    return x||data?.error||'No se pudo completar la consulta ENA.';
  }
  window.v75Recorrido=async function(v,preset=null){
    const dates=defaultDates76();let selected=null,allRows=[];
    v.innerHTML=`<div class="v75-recorrido"><section class="v75-rec-head"><div><h2>Recorrido ENA</h2><p>Consulta en vivo para atender reclamos de operadores. Solo se muestran unidades con credencial ENA confirmada dentro de tu alcance.</p></div><span class="pill">Consulta bajo tu alcance</span></section><section class="v76-rec-catalog"><div class="v76-rec-catalog-head"><h3>Unidades con acceso ENA</h3><span id="v76RecCount" class="v76-rec-count">Cargando...</span></div><div class="v76-rec-filters"><input id="v76RecFilter" placeholder="Buscar unidad, placa, Panapass o supervisora"><select id="v76RecGal"><option value="">Todas las galeras</option></select></div><div id="v76RecList" class="v76-rec-list"><div class="v75-rec-empty">Cargando unidades con credencial confirmada...</div></div><p class="v76-rec-help">Selecciona una unidad y luego indica el rango y el tipo de consulta. El historial consultado no se guarda.</p></section><section class="v75-rec-form"><div class="field v75-rec-search-field"><label>Unidad seleccionada</label><div id="v76RecSelected" class="v76-rec-selected">Ninguna unidad seleccionada.</div></div><div class="field"><label>Desde</label><input id="v75RecFrom" type="date" value="${dates.desde}"></div><div class="field"><label>Hasta</label><input id="v75RecTo" type="date" value="${dates.hasta}"></div><div class="field"><label>Consulta</label><select id="v75RecMode"><option value="PASES">Pases</option><option value="RECARGAS">Recargas</option><option value="SALDOS">Saldos</option></select></div><button id="v75RecGo">Consultar ENA</button></section><section id="v75RecOut" class="v75-rec-out"><div class="v75-rec-empty">Selecciona una unidad para consultar ENA.</div></section></div>`;
    const list=v.querySelector('#v76RecList'),count=v.querySelector('#v76RecCount'),filter=v.querySelector('#v76RecFilter'),gal=v.querySelector('#v76RecGal'),selectedBox=v.querySelector('#v76RecSelected'),out=v.querySelector('#v75RecOut'),go=v.querySelector('#v75RecGo');
    function choose(r){selected=r;selectedBox.innerHTML=`<b>${esc(r.unidad||'')}</b> · ${esc(r.placa||'')} · Panapass ${esc(r.panapass_numero||'')} ${r.galera?`· ${esc(r.galera)}`:''}`;paint()}
    function paint(){
      const q=norm(filter.value||''),g=String(gal.value||'');let rows=allRows.filter(r=>(!g||r.galera===g)&&(!q||norm(`${r.unidad} ${r.placa} ${r.panapass_numero} ${r.supervisora} ${r.empresa}`).includes(q)));
      count.textContent=`${rows.length} de ${allRows.length}`;
      list.innerHTML=rows.length?rows.map((r,i)=>`<button type="button" class="v76-rec-item ${selected&&Number(selected.panapass_numero)===Number(r.panapass_numero)?'active':''}" data-rec76="${i}"><b>${esc(r.unidad||'')}</b><span>${esc(r.placa||'')} · Panapass ${esc(r.panapass_numero||'')}</span><small>${esc([r.galera,r.supervisora].filter(Boolean).join(' · '))}</small></button>`).join(''):'<div class="v75-rec-empty">No hay unidades que coincidan con el filtro.</div>';
      list.querySelectorAll('[data-rec76]').forEach((el,i)=>el.onclick=()=>choose(rows[i]));
    }
    try{
      const {data}=await req('/functions/v1/ena-recorrido',{method:'POST',body:JSON.stringify({action:'LIST'})});if(!data?.ok)throw Error(data?.error||'No se pudo cargar el catálogo ENA.');allRows=data.rows||[];
      const gals=[...new Set(allRows.map(r=>r.galera).filter(Boolean))].sort();gal.innerHTML='<option value="">Todas las galeras</option>'+gals.map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join('');
      if(preset?.panapass_numero){selected=allRows.find(r=>Number(r.panapass_numero)===Number(preset.panapass_numero))||null;if(selected)choose(selected)}
      paint();
    }catch(e){list.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`;count.textContent='No disponible'}
    filter.oninput=paint;gal.onchange=paint;
    go.onclick=async()=>{
      if(!selected?.panapass_numero){out.innerHTML='<div class="alert">Selecciona primero una unidad con acceso ENA.</div>';return}
      const desde=v.querySelector('#v75RecFrom').value,hasta=v.querySelector('#v75RecTo').value,modo=v.querySelector('#v75RecMode').value;if(!desde||!hasta){out.innerHTML='<div class="alert">Indica el rango de fechas.</div>';return}
      go.disabled=true;go.textContent='Consultando ENA...';out.innerHTML=`<div class="v75-rec-empty">Ingresando a ENA con ${esc(selected.unidad||'la unidad')} y consultando ${esc(modo.toLowerCase())}...</div>`;
      try{const {data}=await req('/functions/v1/ena-recorrido',{method:'POST',body:JSON.stringify({action:'QUERY',panapass:Number(selected.panapass_numero),modo,desde,hasta})});if(!data?.ok)throw Error(data?.error||'ENA no devolvió resultado');out.innerHTML=`<div class="v75-rec-summary"><span class="v75-rec-chip">${esc(selected.unidad||'')}</span><span class="v75-rec-chip">${esc(modo)}</span><span class="v75-rec-chip">${esc(desde)} → ${esc(hasta)}</span><span class="v75-rec-chip">${Number(data.total||0)} fila(s)</span></div>${Number(data.total||0)?recTable76(Array.isArray(data.rows)?data.rows:[]):`<div class="v77-rec-empty-note"><b>ENA respondió la consulta.</b><span>${esc(data.empty_message||'No se detectaron registros visibles para ese rango.')}</span><small>Si esperabas movimientos, prueba el mismo rango en Pases o Recargas. Si allí existen datos y aquí no aparecen, el diagnóstico quedará aislado en Recorrido sin afectar Saldo Express.</small></div>`}`}
      catch(e){out.innerHTML=`<div class="alert">${esc(msgENA76(e.message||e))}</div>`}
      finally{go.disabled=false;go.textContent='Consultar ENA'}
    };
  };

  /* -------- WhatsApp: ranking por racha y mensajes individuales -------- */
  const phraseIndex76=name=>[...String(name||'')].reduce((a,c)=>a+c.charCodeAt(0),0);
  function paySort76(a,b){const ca=Number(a.cantidad||0),cb=Number(b.cantidad||0);if(ca!==cb)return ca-cb;if(ca===0){const ra=Number(a.racha_cero||0),rb=Number(b.racha_cero||0);if(ra!==rb)return rb-ra}return Number(a.monto||0)-Number(b.monto||0)||String(a.supervisora).localeCompare(String(b.supervisora),'es')}
  function streakBadge76(n){n=Number(n||0);return n>=5?'🏅 ORO':n>=3?'🥈 RACHA':n>=2?'🥉 RACHA':''}
  window.wa18BuildPay=function(rows,fecha,galera){
    const sorted=[...(rows||[])].sort(paySort76),totalUnits=sorted.reduce((a,x)=>a+Number(x.cantidad||0),0),totalAmount=sorted.reduce((a,x)=>a+Number(x.monto||0),0),lines=[`📅 *${wa18Date(fecha)}*`,`🚘 *${galera} · Cierre de pagos*`,'',`Unidades con pago: *${totalUnits}*`,`Monto pagado: *B/. ${money(totalAmount)}*`,'',`🏆 *RANKING ${galera}*`,''];
    sorted.forEach((x,i)=>{const n=Number(x.cantidad||0),st=Number(x.racha_cero||0),badge=n===0&&st>=2?` · 🔥 ${st} días en 0${st>=5?' · 🏅 ORO':''}`:'';lines.push(`${wa18RankIcon(i+1)} *${String(x.supervisora||'SIN SUPERVISORA').toUpperCase()}* · ${n} ${wa18Plural(n,'pago','pagos')} · B/. ${money(x.monto)}${badge}`)});
    const featured=sorted.filter(x=>Number(x.cantidad||0)<=1);if(featured.length){lines.push('','✨ *DESTACADAS DEL DÍA*','');featured.forEach(x=>{const n=Number(x.cantidad||0),name=String(x.supervisora||'').toUpperCase(),st=Number(x.racha_cero||0),prev=Number(x.cantidad_anterior||0),k=phraseIndex76(name);if(n===0&&st>=5){const a=[`Gran constancia: ya son *${st} días consecutivos en 0 pagos*. Mantienes una racha de oro. 🏅👏`,`Llegaste a *${st} días seguidos en 0 pagos*. Excelente consistencia y muy buen cierre. 🏅✨`,`*${st} días consecutivos en 0 pagos*. Una racha que merece reconocimiento. 🏅🙌`];lines.push(`🏅 *${name}*\n${a[k%a.length]}`)}else if(n===0&&st>=2){const a=[`Ya son *${st} días consecutivos en 0 pagos*. Muy buena racha; a seguir sumando. 🔥`,`Segundo objetivo cumplido: *${st} días seguidos en 0*. Buena constancia. 👏`,`Mantienes *${st} días consecutivos sin pagos*. Excelente avance. ✨`];lines.push(`🔥 *${name}*\n${a[k%a.length]}`)}else if(n===0){const a=['Hoy alcanzaste el objetivo de *0 pagos*. Buen cierre; mañana buscamos darle continuidad. 👏','Cierre de hoy en *0 pagos*. Excelente resultado para comenzar una nueva racha. ✨','Objetivo cumplido hoy: *0 pagos*. Muy buen trabajo. 🙌'];lines.push(`🌟 *${name}*\n${a[k%a.length]}`)}else if(prev>1){lines.push(`📉 *${name}*\nBajaste de *${prev} pagos* en el último día procesado a *1 hoy*. Es una mejora clara; estás muy cerca del objetivo.`)}else{const a=['Terminaste con *1 pago*. Estás muy cerca del 0; mañana vamos por ese objetivo.','Solo *1 pago* hoy. Buen cierre y una oportunidad clara para llegar a 0 mañana.','Hoy quedaste en *1 pago*. El objetivo está cerca; a mantener el enfoque.'];lines.push(`🌟 *${name}*\n${a[k%a.length]}`)}})}return lines.join('\n\n')
  };
  window.wa18BuildNeg=function(rows,fecha,galera){
    const sorted=[...(rows||[])].sort((a,b)=>Number(a.cantidad)-Number(b.cantidad)||Number(a.monto)-Number(b.monto)||String(a.supervisora).localeCompare(String(b.supervisora),'es')),totalUnits=sorted.reduce((a,x)=>a+Number(x.cantidad||0),0),totalAmount=sorted.reduce((a,x)=>a+Number(x.monto||0),0),lines=[`📅 *${wa18Date(fecha)}*`,`🚘 *${galera} · Negativos*`,'',`Unidades negativas: *${totalUnits}*`,`Monto por recuperar: *B/. ${money(totalAmount)}*`,'',`🏆 *RANKING ${galera}*`,''];
    sorted.forEach((x,i)=>lines.push(`${wa18RankIcon(i+1)} *${String(x.supervisora||'SIN SUPERVISORA').toUpperCase()}* · ${Number(x.cantidad||0)} ${wa18Plural(x.cantidad,'unidad','unidades')} · B/. ${money(x.monto)}`));const special=sorted.filter(x=>Number(x.cantidad||0)<=3);if(special.length){lines.push('','✨ *SEGUIMIENTO DEL DÍA*','');special.forEach(x=>{const n=Number(x.cantidad||0),name=String(x.supervisora||'').toUpperCase(),k=phraseIndex76(name);if(n===0){const a=['Hoy no tienes unidades negativas pendientes. Excelente resultado. 👏','Cierre en *0 unidades negativas*. Muy buen control del día. ✨','Objetivo alcanzado: *0 negativos pendientes*. Buen trabajo. 🙌'];lines.push(`🌟 *${name}*\n${a[k%a.length]}`)}else if(n===1){const a=['Te queda *1 unidad* pendiente por recuperar. Estás muy cerca del objetivo.','Solo queda *1 unidad*. Un último seguimiento puede llevarte al 0.','Queda *1 unidad negativa*. Muy cerca de completar el objetivo del día.'];lines.push(`💪 *${name}*\n${a[k%a.length]}`)}else{lines.push(`📌 *${name}*\nQuedan *${n} unidades* por recuperar. El foco está en cerrar esas pendientes.`)}})}return lines.join('\n\n')
  };

  /* Asegura que Panapass incluya Recorrido tras cualquier reconstrucción del menú. */
  const norm75=phase2NormalizeModules;phase2NormalizeModules=function(){const r=norm75?.apply(this,arguments);state.modules=panMods76();if(!state.modules.includes(state.active))state.active=state.modules.includes('dashboard')?'dashboard':(state.modules[0]||'dashboard');return r};
})();
