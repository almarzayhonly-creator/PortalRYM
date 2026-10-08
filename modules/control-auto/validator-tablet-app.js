/* Presentation adapter for main's Unit Validator.
   Main remains the source of truth; this file only reorganizes existing data and reads existing Portal endpoints. */
(function(w,d){
  'use strict';
  if(new URLSearchParams(location.search).get('validator-host')!=='1'||w.RYM_UNIT_VALIDATOR)return;
  const PERMISSION='control_auto.validador_unidad_app';
  d.documentElement.classList.add('rym-unit-validator-app');

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const text=v=>String(v??'').trim();
  const first=(...values)=>values.find(v=>v!=null&&text(v)!==''&&text(v)!=='—');
  let observer=null,renderDepth=0;
  const observed={childList:true,characterData:true,subtree:true};
  const internalSelector='.uva-unit-preview,.uva-details,.uva-priority-note,.uva-gps-live,.uva-verified-flag';
  function mainMutations(records){
    let changed=false;
    for(const record of records){
      const target=record.target.nodeType===1?record.target:record.target.parentElement;
      if(target?.closest(internalSelector))continue;
      changed=true;
      const card=target?.closest('.v117-status-card'),snapshot=card?._uvaMain;
      if(!snapshot)continue;
      // Main usually replaces the article. Also support updates within an existing card.
      if(target.closest('.v117-card-value'))snapshot.value=text(card.querySelector('.v117-card-value')?.textContent);
      else if(target.closest('header'))snapshot.badge=text(card.querySelector('header strong')?.textContent);
      else if(!card.querySelector('.uva-details'))delete card._uvaMain;
    }
    return changed;
  }
  function renderQuietly(render){
    if(renderDepth)return render();
    // Drain pending main changes before pausing; only synchronous adapter writes are excluded.
    if(observer){mainMutations(observer.takeRecords());observer.disconnect()}
    renderDepth++;
    try{return render()}finally{
      renderDepth--;
      if(observer&&d.body)observer.observe(d.body,observed);
    }
  }
  let accessCheckedFor='',accessProbe=null;
  function profile(){try{return state.profile}catch(_){return null}}
  function userKey(){const p=profile();return String(p?.id||p?.email||p?.usuario||p?.nombre||'')}
  function allowed(){try{return !!profile()&&typeof w.rymHasModule==='function'&&w.rymHasModule(PERMISSION)}catch(_){return false}}
  function accessMode(){
    const p=profile();if(!p)return 'guest';
    if(allowed())return 'allowed';
    return accessCheckedFor===userKey()?'denied':'pending';
  }
  function session(){const p=profile(),mode=accessMode();return {authenticated:!!p,pending:mode==='pending',denied:mode==='denied',user:p?.nombre||p?.email||''}}
  function notify(){w.parent.postMessage({type:'rym-validator-state'},location.origin)}
  async function verifyAccess(){
    const key=userKey();if(!key||allowed()||accessCheckedFor===key||accessProbe)return;
    accessProbe=(async()=>{
      try{
        const r=await reqCall('/functions/v1/portal-session-modules',{method:'POST',body:'{}'});
        if(r?.data?.ok&&Array.isArray(r.data.modules)){
          state.allModules=[...new Set(r.data.modules.map(String))];
          if(r.data.profile)state.profile={...(state.profile||{}),...r.data.profile};
        }
      }catch(_){}
      accessCheckedFor=key;
    })().finally(()=>{accessProbe=null;refresh()});
  }
  function rpcCall(name,args){try{return typeof rpc==='function'?rpc(name,args):Promise.reject(Error('RPC no disponible'))}catch(e){return Promise.reject(e)}}
  function reqCall(path,init){try{return typeof req==='function'?req(path,init):Promise.reject(Error('REQ no disponible'))}catch(e){return Promise.reject(e)}}

  // Observe main's existing authenticated requests; preserve results/errors and request count.
  const responses={};
  if(typeof req==='function'){
    const mainReq=req;
    req=async function(path,init){
      const owner=userKey();
      const out=await mainReq(path,init);
      if(!owner||owner!==userKey())return out;
      const url=String(path);let input={};
      try{input=JSON.parse(init?.body||'{}')}catch(_){}
      if(url.includes('/functions/v1/gps-rym-validator'))responses.gps={key:text(input.q),data:out?.data};
      if(url.includes('/functions/v1/ena-consulta-saldo'))responses.ena={key:text(input.panapass),data:out?.data};
      if(url.includes('/functions/v1/revisados-final'))responses.rev=out?.data;
      return out;
    };
  }
  function officialRaw(o){
    let raw=first(o?.ultima_respuesta_exitosa,o?.ultima_respuesta)||{};
    if(typeof raw==='string'){try{raw=JSON.parse(raw)}catch(_){raw={}}}
    return raw;
  }

  function mainCard(card){
    if(!card)return {badge:'',value:'',details:{}};
    if(card._uvaMain)return card._uvaMain;
    const out={};
    card?.querySelectorAll('.v117-card-detail').forEach(row=>{
      const k=text(row.querySelector('span')?.textContent).toUpperCase();
      const v=text(row.querySelector('b')?.textContent);
      if(k)out[k]=v;
    });
    card._uvaMain={badge:text(card.querySelector('header strong')?.textContent),value:text(card.querySelector('.v117-card-value')?.textContent),details:out};
    return card._uvaMain;
  }
  function detailMap(card){return mainCard(card).details}
  function operational(modal,ctrl={},ficha={}){
    const original=mainCard(modal.querySelector('#v117CtlCard'));
    const canonical=v=>/^ACTIV[AO]$/i.test(text(v))?'ACTIVA':/^PARAD[AO]$/i.test(text(v))?'PARADA':/^CERRAD[AO]$/i.test(text(v))?'CERRADA':'';
    // Main has already applied Control de Auto + Revisado's internal status rules.
    const state=canonical(original.badge)||canonical(ctrl.estatus)||'SIN INFORMACIÓN';
    const internal=text(first(
      state==='PARADA'&&!canonical(original.value)&&!/SIN DETALLE|POR VALIDAR/i.test(original.value)?original.value:null,
      ctrl.estatus2,ctrl.status2,ficha?.logistica?.status2));
    return {state,internal,label:state==='PARADA'&&internal?state+' · '+internal:state};
  }
  function detailHtml(label,value){
    if(value==null||text(value)===''||text(value)==='—')return '';
    return '<div class="v117-card-detail"><span>'+esc(label)+'</span><b>'+esc(value)+'</b></div>';
  }
  function sectionHtml(title,rows){
    const body=rows.filter(Boolean).join('');
    return body?'<section class="uva-detail-section"><h4>'+esc(title)+'</h4>'+body+'</section>':'';
  }
  function ensureDetails(card){
    let details=card.querySelector('.uva-details');
    if(!details){
      details=d.createElement('details');
      details.className='uva-details';
      const summary=d.createElement('summary');
      summary.textContent='Ver detalle';
      summary.setAttribute('aria-label','Ver detalle');
      details.appendChild(summary);
      card.querySelectorAll('.v117-card-sub,.v117-card-details').forEach(el=>details.appendChild(el));
      card.appendChild(details);
    }
    if(details.dataset.bound!=='1'){
      details.dataset.bound='1';
      card.dataset.uvaClickable='1';
      card.tabIndex=0;
      card.setAttribute('role','button');
      card.setAttribute('aria-label','Abrir o cerrar detalle de '+(card.querySelector('header small')?.textContent?.trim()||'validación'));
      const toggle=e=>{
        if(e.target.closest('summary,a,button,input,select,textarea'))return;
        details.open=!details.open;
      };
      card.addEventListener('click',toggle);
      card.addEventListener('keydown',e=>{
        if(e.target===card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();details.open=!details.open}
      });
    }
    return details;
  }
  function setDetails(card,html){
    const details=ensureDetails(card);
    html=html||'<div class="uva-detail-empty">Sin información adicional.</div>';
    if(details._uvaHtml===html)return;
    details._uvaHtml=html;
    [...details.children].filter(x=>x.tagName!=='SUMMARY').forEach(x=>x.remove());
    const body=d.createElement('div');
    body.className='uva-detail-body v117-card-details';
    body.innerHTML=html;
    details.appendChild(body);
  }
  function setPriority(card,{badge,value,note}){
    if(!card)return;
    const badgeEl=card.querySelector('header strong');
    const valueEl=card.querySelector('.v117-card-value');
    if(badgeEl&&badge!=null&&badgeEl.textContent!==String(badge))badgeEl.textContent=String(badge);
    if(valueEl&&value!=null&&valueEl.textContent!==String(value))valueEl.textContent=String(value);
    let noteEl=card.querySelector('.uva-priority-note');
    if(note){
      if(!noteEl){
        noteEl=d.createElement('div');noteEl.className='uva-priority-note';
        const details=card.querySelector('.uva-details');
        card.insertBefore(noteEl,details||null);
      }
      if(noteEl.textContent!==String(note))noteEl.textContent=String(note);
    }else noteEl?.remove();
  }

  function normalizeHeader(modal,ctx={}){
    const meta=[...modal.querySelectorAll('.v117-meta>span')];
    const plate=meta.find(x=>/^Placa\b/i.test(text(x.textContent)));
    const galera=meta.find(x=>/^Galera\b/i.test(text(x.textContent)));
    const supervisor=meta.find(x=>/Supervisora/i.test(text(x.textContent)));
    const owner=meta.find(x=>/Dueña|Empresa/i.test(text(x.textContent)));
    if(plate)plate.classList.add('uva-meta-plate');
    if(galera)galera.classList.add('uva-meta-galera');
    if(supervisor)supervisor.classList.add('uva-meta-supervisor');
    if(owner){
      owner.classList.remove('v130-mobile-owner');
      owner.classList.add('uva-meta-company');
      const b=owner.querySelector('b');
      owner.childNodes.forEach(n=>{if(n.nodeType===3&&/Dueña/i.test(n.textContent||''))n.textContent='Empresa '});
      if(b&&ctx.companyOwner&&b.textContent!==ctx.companyOwner)b.textContent=ctx.companyOwner;
    }
    const identity=modal.querySelector('.v117-identity-line');
    if(identity)identity.hidden=true;

    const id=getIdentity(modal);
    const ctrl=ctx.ctrl||{};
    const op=operational(modal,ctrl,ctx.ficha);
    const internal=op.internal,stateLabel=op.label;
    let preview=modal.querySelector('.uva-unit-preview');
    if(!preview){
      preview=d.createElement('section');
      preview.className='uva-unit-preview';
      const anchor=modal.querySelector('.v117-quick-grid')||identity;
      if(anchor)anchor.parentNode.insertBefore(preview,anchor);
    }
    if(preview){
      const html=
        '<div class="uva-unit-preview-main">'+
          '<div><span class="uva-unit-kicker">UNIDAD</span><strong>'+esc(id.unit||'—')+'</strong><em>'+esc(id.plate?'Placa '+id.plate:'Sin placa')+'</em></div>'+
          '<span class="uva-unit-state">'+esc(stateLabel)+'</span>'+
        '</div>'+
        '<div class="uva-unit-preview-chips">'+
          '<span><small>Supervisora</small><b>'+esc(id.supervisor||'Sin asignar')+'</b></span>'+
          '<span><small>Galera</small><b>'+esc(id.galera||'Sin asignar')+'</b></span>'+
          '<span><small>Empresa</small><b>'+esc(ctx.companyOwner||id.company||'Sin asignar')+'</b></span>'+
          (internal?'<span class="uva-unit-internal"><small>Estatus interno</small><b>'+esc(internal)+'</b></span>':'')+
        '</div>';
      if(preview._uvaHtml!==html){
        const close=modal.querySelector('#v101CloseCheck');
        preview._uvaHtml=html;preview.innerHTML=html;
        if(close)preview.querySelector('.uva-unit-preview-main').appendChild(close);
      }
      modal.dataset.uvaIdentity='1';
      preview.querySelector('.uva-unit-state').dataset.state=op.state;
    }
  }

  function getIdentity(modal){
    const unit=text(modal.querySelector('.v117-title-row h2')?.textContent);
    const spans=[...modal.querySelectorAll('.v117-meta>span')];
    const val=label=>{
      const row=spans.find(x=>text(x.textContent).toUpperCase().startsWith(label));
      return text(row?.querySelector('b')?.textContent);
    };
    return {unit,plate:val('PLACA'),galera:val('GALERA'),supervisor:val('SUPERVISORA')||val('SUPERVISORA ANTERIOR'),company:val('DUEÑA')||val('EMPRESA')};
  }

  function panVisual(modal,ctrl){
    const card=modal.querySelector('#v117PanCard');if(!card)return;
    const original=mainCard(card),map=original.details;
    const balance=original.value||text(first(ctrl?.ena_saldo,ctrl?.saldo_ena,ctrl?.saldo))||'No disponible';
    const account=modal._uvaEna||{};
    const last=first(original.badge==='SIN RESPUESTA ENA'?null:/No aplica|Consultando/i.test(map['CONSULTA ENA']||'')?null:map['CONSULTA ENA'],account.ultima_consulta,ctrl?.ena_ultima_consulta,ctrl?.ultima_consulta_ena)||'Sin consulta registrada';
    const verified=card.classList.contains('ok');
    setPriority(card,{badge:'PANAPASS',value:balance,note:'Última consulta · '+last});
    card.classList.add('uva-pan-priority');
    let flag=card.querySelector('.uva-verified-flag');
    if(!flag){flag=d.createElement('span');flag.className='uva-verified-flag';card.querySelector('header')?.appendChild(flag)}
    flag.className='uva-verified-flag '+(verified?'ok':'warn');
    const flagHtml='<i aria-hidden="true">'+(verified?'✓':'!')+'</i><b>'+(verified?'VERIFICADO':'REVISAR')+'</b>';
    if(flag.innerHTML!==flagHtml)flag.innerHTML=flagHtml;
    const tags=Array.isArray(ctrl?.tags_ena)?ctrl.tags_ena.join(' · '):text(ctrl?.tags_ena)||text(ctrl?.tag)||'Sin TAG registrado';
    const ena=responses.ena?.key===text(ctrl?.panapass_numero||map['PANAPASS'])?responses.ena.data?.results?.[0]:null;
    const summary=ena?.summary||{};
    let tagRows=ctrl?.tags_detalle||[];
    if(typeof tagRows==='string'){try{tagRows=JSON.parse(tagRows)}catch(_){tagRows=[]}}
    const tagDetails=Array.isArray(tagRows)?tagRows.map((tag,index)=>sectionHtml('TAG ENA '+(index+1),[
      detailHtml('TAG',first(tag.tag,tag.numero_tag)),detailHtml('Estado del TAG',first(tag.estado_tag,tag.estado)),
      detailHtml('Estado financiero',tag.estado_financiero),detailHtml('Tipo de TAG',first(tag.tipo_tag,tag.tipo)),
      detailHtml('Matrícula',first(tag.matricula,tag.placa)),detailHtml('Saldo',tag.saldo),
      detailHtml('Tipo de vehículo',tag.tipo_vehiculo),detailHtml('Corregimiento',tag.corregimiento),
      detailHtml('Última consulta ENA',tag.consultado_at)
    ])).join(''):'';
    const html=
      sectionHtml('Cuenta ENA',[
        detailHtml('Número Panapass',ctrl?.panapass_numero||ctrl?.numero_panapass||map['PANAPASS']),
        detailHtml('Panapass display',first(account.panapass_display,ctrl?.panapass_display)),
        detailHtml('Cuenta ENA',ctrl?.cuenta_ena||ctrl?.numero_cuenta||ctrl?.panapass_numero),
        detailHtml('TAG principal',ctrl?.tag||'Sin TAG registrado'),
        detailHtml('TAGs ENA',tags),
        detailHtml('Cantidad TAG ENA',ctrl?.cantidad_tags),
        detailHtml('Estado de acceso ENA',first(account.estado_acceso,ctrl?.ena_estado_acceso)),
        detailHtml('Saldo',balance),
        detailHtml('Última consulta ENA',last),
        detailHtml('Último login correcto',first(account.ultimo_login_ok,ctrl?.ena_ultimo_login_ok,summary.ultimo_login_ok)),
        detailHtml('Empresa ENA',first(account.ena_empresa,ctrl?.ena_empresa,summary.empresa)),
        detailHtml('RUC ENA',first(account.ena_ruc,ctrl?.ena_ruc,summary.ruc)),
        detailHtml('Email ENA',first(account.ena_email,ctrl?.ena_email,summary.email)),
        detailHtml('Tipo de credencial',first(account.tipo_credencial,ctrl?.tipo_credencial,summary.tipo_credencial)),
        detailHtml('Último resultado',first(ena?.result,ctrl?.ena_ultimo_resultado)),
        detailHtml('Último error',first(ena?.error,account.ultimo_error,ctrl?.ena_ultimo_error,map['ESTADO'])),
        detailHtml('Fecha de actualización',first(account.updated_at,ctrl?.ena_actualizado_at,summary.actualizado_at))
      ])+
      tagDetails+
      sectionHtml('Referencia',[
        detailHtml('Unidad',ctrl?.unidad),
        detailHtml('Placa',ctrl?.placa_unica),
        detailHtml('Empresa',ctrl?.empresa_duena)
      ]);
    setDetails(card,html);
  }

  function revisadoVisual(modal,ficha,ctrl){
    const card=modal.querySelector('#v117RevCard');if(!card)return;
    const map=detailMap(card);
    const oficial=ficha?.oficial||{};
    const unidad=ficha?.unidad||{};
    const rawOfficial=officialRaw(oficial);
    const rev=(responses.rev?.rows||[]).find(r=>text(r.unidad).toUpperCase()===getIdentity(modal).unit.toUpperCase())||{};
    const last=first(oficial?.fecha_revisado,rawOfficial.fechaRevisado,map['ÚLTIMO REVISADO'])||'Sin registro';
    const original=mainCard(card);
    const raw=[map['ESTADO'],original.badge,original.value].filter(Boolean).join(' ');
    const expired=/VENCID|PENDIENT|NO VIGENTE|EXPIR/i.test(raw);
    const current=!expired&&/VIGENTE|AL D[IÍ]A|OK|VALIDO|VÁLIDO/i.test(raw);
    const status=current?'VIGENTE':'PENDIENTE';
    setPriority(card,{badge:'REVISADO',value:status,note:'Último revisado · '+last});
    card.classList.add('uva-rev-priority');
    card.classList.toggle('uva-rev-current',status==='VIGENTE');
    card.classList.toggle('uva-rev-expired',status==='PENDIENTE');
    let flag=card.querySelector('.uva-verified-flag');
    if(!flag){flag=d.createElement('span');flag.className='uva-verified-flag';card.querySelector('header')?.appendChild(flag)}
    flag.className='uva-verified-flag '+(status==='VIGENTE'?'ok':'warn');
    const flagHtml='<i aria-hidden="true">'+(status==='VIGENTE'?'✓':'!')+'</i><b>'+esc(status)+'</b>';
    if(flag.innerHTML!==flagHtml)flag.innerHTML=flagHtml;
    const html=sectionHtml('Revisado',[
      detailHtml('Estado',status),
      detailHtml('Último revisado',last),
      detailHtml('Mes',ctrl?.mes_revisado||unidad?.mes_revisado||map['MES DE LA UNIDAD']),
      detailHtml('Año revisado',first(oficial?.anio_revisado,rev.anio_revisado)),
      detailHtml('Rev ID',first(rawOfficial.revId,rawOfficial.idRevisados,oficial?.rev_id)),
      detailHtml('Taller / emisor',first(rawOfficial.ultTallerRevisado,oficial?.taller,oficial?.emisor,unidad?.taller_revisado)),
      detailHtml('Situación del revisado',first(rev.estado,map['ESTADO'])),
      detailHtml('Tipo de placa',first(rawOfficial.tipoPlaca,oficial?.tipo_placa)),
      detailHtml('Tipo de uso',first(rawOfficial.tipoUso,oficial?.tipo_uso)),
      detailHtml('Estado oficial del vehículo',first(rawOfficial.estadoVehiculo,oficial?.estado_vehiculo)),
      detailHtml('Emitido',rev.emitido==null?null:rev.emitido?'Sí':'No'),
      detailHtml('Bloqueado',rev.bloqueado==null?null:rev.bloqueado?'Sí':'No'),
      detailHtml('Observación',first(rawOfficial.observaciones,oficial?.observacion,unidad?.observacion_revisado,map['ALERTA']))
    ]);
    setDetails(card,html);
  }

  function gpsFromDom(modal){
    const card=modal.querySelector('#v117GpsCard');if(!card)return;
    const map=detailMap(card);
    const parse=(key)=>{
      const raw=text(map[key]);
      const known=!!raw&&raw!=='...';
      const installed=known&&!/SIN GPS/i.test(raw);
      const ok=installed&&/REPORTANDO|\bOK\b|ACTIVO/i.test(raw)&&!/SIN REPORT|NO REPORT|OFFLINE/i.test(raw);
      const last=(raw.match(/·\s*(.+)$/)||[])[1]||'';
      return {raw,known,installed,ok,last};
    };
    const row=responses.gps?.key.toUpperCase()===getIdentity(modal).unit.toUpperCase()?(responses.gps.data?.rows||[]).find(r=>text(r.unidad).toUpperCase()===getIdentity(modal).unit.toUpperCase())||responses.gps.data?.rows?.[0]:null;
    const g1=parse('GPS1'),g2=parse('GPS2');
    const good=[g1,g2].filter(g=>g.installed&&g.ok).length;
    const installed=[g1,g2].filter(g=>g.installed).length;
    const summary=!g1.known&&!g2.known?'SIN INFORMACIÓN':installed===0?'SIN GPS':good===2?'2 DE 2 REPORTANDO':good+' DE '+Math.max(installed,2)+' REPORTANDO';
    setPriority(card,{badge:'GPS',value:summary,note:'Estado de señal'});
    card.classList.add('uva-gps-priority');
    let live=card.querySelector('.uva-gps-live');
    if(!live){live=d.createElement('div');live.className='uva-gps-live';card.querySelector('.v117-card-value')?.after(live)}
    const pill=(name,g)=>{
      const tone=!g.installed?'off':g.ok?'ok':'bad';
      const label=!g.known?'SIN INFORMACIÓN':!g.installed?'SIN GPS':g.ok?'REPORTANDO':'NO REPORTA';
      return '<span class="uva-gps-pill '+tone+'"><i></i><b>'+name.replace('GPS','GPS ')+'</b><em>'+esc(label)+'</em></span>';
    };
    const liveHtml=pill('GPS1',g1)+pill('GPS2',g2);
    if(live.innerHTML!==liveHtml)live.innerHTML=liveHtml;
    const device=(name,g,source={})=>sectionHtml(name,[
      detailHtml('Estado',g.raw||'Sin información'),detailHtml('Instalado',source.installed!=null?source.installed?'Sí':'No':g.known?g.installed?'Sí':'No':null),
      detailHtml('Reporta',source.ok!=null?source.ok?'Sí':'No':g.known?g.ok?'Sí':'No':null),detailHtml('Último reporte',first(source.last,g.last)),
      detailHtml('Última señal',source.ultima_senal),detailHtml('Estado operativo',row?.estado_operativo),
      detailHtml('Razón / diagnóstico',first(source.razon,row?.razon)),detailHtml('Proveedor',first(source.proveedor,source.fuente)),
      detailHtml('IMEI / ID',first(source.imei,source.id)),
      detailHtml('Metadata',source.metadata?JSON.stringify(source.metadata):null)
    ]);
    setDetails(card,device('GPS 1',g1,row?.gps1)+device('GPS 2',g2,row?.gps2));
  }

  function controlVisual(modal,ctrl,ficha){
    const card=modal.querySelector('#v117CtlCard');if(!card)return;
    const op=operational(modal,ctrl,ficha),state=op.state,internal=op.internal;
    setPriority(card,{badge:'CONTROL DE AUTO',value:op.label,note:internal&&state!=='PARADA'?'Estatus interno · '+internal:null});
    card.classList.add('uva-control-priority');
    card.classList.toggle('uva-control-active',state==='ACTIVA');
    card.classList.toggle('uva-control-stopped',state==='PARADA');
    let flag=card.querySelector('.uva-verified-flag');
    if(!flag){flag=d.createElement('span');flag.className='uva-verified-flag';card.querySelector('header')?.appendChild(flag)}
    flag.className='uva-verified-flag '+(state==='ACTIVA'?'ok':state==='PARADA'?'warn':'off');
    const flagHtml='<i aria-hidden="true">'+(state==='ACTIVA'?'✓':state==='PARADA'?'!':'?')+'</i><b>'+esc(state)+'</b>';
    if(flag.innerHTML!==flagHtml)flag.innerHTML=flagHtml;
    const u=ficha?.unidad||{},o=ficha?.oficial||{};
    const raw=officialRaw(o);
    const control=sectionHtml('Control de Auto',[
      detailHtml('Estado de la unidad',state),
      detailHtml('Estatus interno',internal),
      detailHtml('Empresa',ctrl?.empresa_duena||u?.empresa_duena),
      detailHtml('Galera',ctrl?.galera||u?.galera),
      detailHtml('Supervisora',ctrl?.supervisora||u?.supervisora),
      detailHtml('Placa',ctrl?.placa_unica||u?.placa_unica),
      detailHtml('Cupo / placa comercial',ctrl?.placa_comercial||u?.placa_comercial),
      detailHtml('Marca',ctrl?.marca||u?.marca),
      detailHtml('Modelo',ctrl?.modelo||u?.modelo),
      detailHtml('Color',ctrl?.color||u?.color),
      detailHtml('Año',ctrl?.anio||u?.anio),
      detailHtml('Chasis',ctrl?.chasis||u?.chasis),
      detailHtml('Motor',ctrl?.motor||u?.motor),
      detailHtml('Transmisión',ctrl?.transmision||u?.transmision),
      detailHtml('Estatus Netsuite',first(ctrl?.estatus_netsuite,u?.estatus_netsuite))
    ]);
    const ecar=sectionHtml('Ficha oficial eCarCheck',[
      detailHtml('Última verificación',o?.actualizado_at||ficha?.consulta_at),
      detailHtml('Resultado eCarCheck',ficha?.resultado||raw?.detalleRespuesta||raw?.detalle_respuesta),
      detailHtml('Placa consultada',raw?.nroPlaca||o?.placa),
      detailHtml('Cupo oficial',raw?.cupo||o?.cupo),
      detailHtml('Propietario oficial',raw?.nombrePropietario||o?.propietario),
      detailHtml('Documento propietario',raw?.nroDocumentoPropietario||o?.documento_propietario),
      detailHtml('VIN',raw?.nroVin||o?.vin),
      detailHtml('Chasis',raw?.nroChasis||o?.chasis),
      detailHtml('Motor',raw?.nroMotor||o?.motor),
      detailHtml('Marca',first(raw?.marcaVehiculo,raw?.marcavehiculo,o?.marca)),
      detailHtml('Modelo',raw?.modeloVehiculo||o?.modelo),
      detailHtml('Año vehículo',raw?.anioVehiculo||o?.anio),
      detailHtml('Color oficial',raw?.colorVehiculo||o?.color),
      detailHtml('Tipo de vehículo',first(raw?.tipoVehiculo,o?.tipo_vehiculo)),
      detailHtml('Tipo de placa',raw?.tipoPlaca||o?.tipo_placa),
      detailHtml('Tipo de uso',raw?.tipoUso||o?.tipo_uso),
      detailHtml('Estado vehículo',raw?.estadoVehiculo||o?.estado_vehiculo),
      detailHtml('Transmisión',first(raw?.tipoTransmision,o?.transmision)),
      detailHtml('Combustible',first(raw?.tipoCombustible,o?.combustible)),
      detailHtml('Cilindrada',first(raw?.cilindradaVehiculo,o?.cilindrada)),
      detailHtml('Cilindros',first(raw?.nroCilindros,o?.cilindros)),
      detailHtml('Capacidad',raw?.capacidadVehiculo!=null?text(raw.capacidadVehiculo)+' '+text(raw?.tipoCapacidad):o?.capacidad),
      detailHtml('Puertas',first(raw?.nroPuertas,o?.puertas)),
      detailHtml('Tracción',first(raw?.traccionMotor,o?.traccion)),
      detailHtml('Aire acondicionado',first(raw?.tieneAireAcondicionado,o?.aire_acondicionado)),
      detailHtml('Hipoteca',first(raw?.hipoteca,o?.hipoteca)),
      detailHtml('Pertenencia',first(raw?.tipoPertenencia,o?.pertenencia)),
      detailHtml('Aseguradora',first(raw?.nombreAseguradora,raw?.aseguradora,o?.aseguradora)),
      detailHtml('Póliza',first(raw?.nroPolizaSeguro,raw?.poliza,o?.poliza)),
      detailHtml('Restricción vehicular',first(raw?.restriccionVehiculos,o?.restriccion_vehicular)),
      detailHtml('Último revisado',raw?.fechaRevisado||o?.fecha_revisado),
      detailHtml('Mes revisado',raw?.mesRevisado||o?.mes_revisado),
      detailHtml('Rev ID',first(raw?.revId,raw?.idRevisados,o?.rev_id)),
      detailHtml('Último taller',first(raw?.ultTallerRevisado,o?.ultimo_taller)),
      detailHtml('Observaciones',first(raw?.observaciones,o?.observaciones))
    ]);
    setDetails(card,control+ecar);
  }

  function presentModal(modal){
    // Main owns live ENA/GPS checks; replacements get a fresh mainCard snapshot.
    return renderQuietly(()=>{
      const ctrl=modal._uvaCtrl||{};
      const ficha=modal._uvaFicha||null;
      normalizeHeader(modal,{companyOwner:text(ctrl?.empresa_duena)||getIdentity(modal).company,ctrl,ficha});
      panVisual(modal,ctrl);
      revisadoVisual(modal,ficha,ctrl);
      controlVisual(modal,ctrl,ficha);
      gpsFromDom(modal);
    });
  }

  async function enrichModal(modal){
    if(!modal?.isConnected||accessMode()!=='allowed')return;
    const id=getIdentity(modal);if(!id.unit)return;
    const token=id.unit+'|'+id.plate;
    presentModal(modal);

    // Supplemental master/eCarCheck data is fetched once per validated unit.
    if(modal._uvaFetchToken===token||modal._uvaEnriching===token)return;
    modal._uvaFetchToken=token;
    modal._uvaEnriching=token;
    const seq=(modal._uvaSeq||0)+1;modal._uvaSeq=seq;
    const current=()=>modal.isConnected&&modal._uvaSeq===seq&&accessMode()==='allowed';
    try{
      const rows=await rpcCall('panapass_control_auto_v2',{p_grupo:null,p_buscar:id.unit,p_limit:10}).catch(()=>[]);
      const freshCtrl=(rows||[]).find(r=>text(r.unidad).toUpperCase()===id.unit.toUpperCase())||(rows||[])[0]||{};
      if(!current())return;
      modal._uvaCtrl=freshCtrl;

      // Existing SELECT RLS restricts this account metadata to full admins.
      // Request only display fields, never credentials; denied rows stay absent.
      if(freshCtrl.panapass_numero){
        try{
          const fields='panapass_display,estado_acceso,tipo_credencial,ena_empresa,ena_ruc,ena_email,ultimo_login_ok,ultima_consulta,ultimo_error,updated_at';
          const r=await reqCall('/rest/v1/ena_cuentas?panapass_numero=eq.'+encodeURIComponent(freshCtrl.panapass_numero)+'&select='+fields+'&limit=1',{method:'GET'});
          if(!current())return;
          modal._uvaEna=Array.isArray(r?.data)?r.data[0]:null;
        }catch(_){}
      }

      let freshFicha=null;
      try{
        const r=await reqCall('/functions/v1/revisados-ficha',{method:'POST',body:JSON.stringify({placa:id.plate,unidad:id.unit})});
        if(r?.data?.ok)freshFicha=r.data;
      }catch(_){}
      // The dedicated card needs the real eCarCheck vehicle record, not only the
      // compact fields returned by Control de Auto. Use the authenticated,
      // read-only official vehicle table as a fallback/source of truth.
      try{
        const plate=encodeURIComponent(id.plate);
        const r=await reqCall('/rest/v1/revisados_vehiculo_oficial?placa=eq.'+plate+'&select=*&order=actualizado_at.desc&limit=1',{method:'GET'});
        const rows=Array.isArray(r?.data)?r.data:(Array.isArray(r)?r:[]);
        const official=rows[0];
        if(official){
          freshFicha={...(freshFicha||{}),oficial:{...(freshFicha?.oficial||{}),...official},unidad:freshFicha?.unidad||freshCtrl};
        }
      }catch(_){}
      if(!current())return;
      modal._uvaFicha=freshFicha;

      presentModal(modal);
      modal.dataset.uvaEnriched=token;
    }catch(e){
      console.warn('Unit validator presentation enrichment',e);
    }finally{
      if(modal._uvaEnriching===token)modal._uvaEnriching=null;
    }
  }

  function logout(){
    Object.keys(responses).forEach(k=>delete responses[k]);
    accessCheckedFor='';accessProbe=null;
    d.getElementById('v101CheckModal')?.remove();
    if(typeof clearSession==='function')clearSession();
    if(typeof loginView==='function')loginView();
    refresh();
  }
  w.RYM_UNIT_VALIDATOR=Object.freeze({session,logout});

  function ensureValidatorSurface(){
    const existing=d.getElementById('v101ValidatorQ');
    if(existing){
      const go=d.getElementById('v101ValidatorGo');
      if((typeof existing.oninput!=='function'||typeof go?.onclick!=='function')&&typeof w.bindValidator99==='function'){
        try{w.bindValidator99()}catch(e){console.warn('Unit validator rebind',e)}
      }
      return true;
    }
    const root=d.getElementById('app');if(!root)return false;
    root.innerHTML=
      '<div class="v101-shell uva-dedicated-shell">'+
        '<main class="v101-main">'+
          '<div class="v101-content">'+
            '<section class="v101-validator">'+
              '<div class="v101-validator-head"><h3>Validador de Unidad</h3><p>Busca una unidad, placa o Panapass</p></div>'+
              '<div class="v101-validator-tools">'+
                '<div class="v101-validator-box">'+
                  '<input id="v101ValidatorQ" class="v101-validator-input" autocomplete="off">'+
                  '<div id="v101ValidatorList" class="v101-validator-list" style="display:none"></div>'+
                '</div>'+
                '<button id="v101ValidatorGo" class="v101-validator-go" type="button">Validar</button>'+
              '</div>'+
            '</section>'+
          '</div>'+
        '</main>'+
      '</div>';
    try{
      if(typeof bindValidator99==='function')bindValidator99();
      else if(typeof w.bindValidator99==='function')w.bindValidator99();
    }catch(e){console.warn('Unit validator bind',e)}
    return !!d.getElementById('v101ValidatorQ');
  }

  function refresh(){return renderQuietly(refreshView)}
  function refreshView(){
    const p=profile(),mode=accessMode(),ok=mode==='allowed';
    d.documentElement.classList.toggle('uva-authorized',ok);
    d.documentElement.classList.toggle('uva-authenticated',!!p);
    if(mode==='pending'){verifyAccess();notify();return}
    if(mode==='denied'){
      d.getElementById('v101CheckModal')?.remove();
      const root=d.getElementById('app');
      if(root&&!root.querySelector('.uva-denied'))root.innerHTML='<section class="uva-denied"><span aria-hidden="true">⌑</span><h1>Acceso restringido</h1><p>Tu usuario no tiene habilitado el permiso de App Validador de Unidad.</p></section>';
      notify();return;
    }

    if(ok)ensureValidatorSurface();
    const input=d.getElementById('v101ValidatorQ');
    if(ok&&input){
      input.setAttribute('inputmode','search');input.setAttribute('enterkeyhint','search');
      input.setAttribute('autocomplete','off');input.setAttribute('aria-label','Buscar unidad, placa o Panapass');
      input.placeholder='Buscar unidad, placa o Panapass';
      const title=d.querySelector('.v101-validator-head h3'),copy=d.querySelector('.v101-validator-head p');
      if(title&&title.textContent!=='Validador de Unidad')title.textContent='Validador de Unidad';
      if(copy&&copy.textContent!=='Busca una unidad, placa o Panapass')copy.textContent='Busca una unidad, placa o Panapass';
    }

    const modal=d.getElementById('v101CheckModal');
    if(ok&&modal){
      modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
      modal.setAttribute('aria-label','Resultado de validación de unidad');
      const close=modal.querySelector('#v101CloseCheck');if(close)close.setAttribute('aria-label','Cerrar resultado');
      const overall=modal.querySelector('#v117Overall');if(overall)overall.setAttribute('aria-live','polite');
      const full=modal.querySelector('#v101OpenModule');if(full){full.hidden=true;full.disabled=true;full.onclick=null}
      modal.querySelectorAll('.v117-status-card').forEach(ensureDetails);
      // First presentation happens now, never behind a cancelable mutation debounce.
      void enrichModal(modal);
    }
    notify();
  }

  const base=w.v36PortalHome;
  if(typeof base==='function'){
    const home=async function(){
      if(profile()&&!allowed()){refresh();return}
      const result=await base.apply(this,arguments);refresh();return result;
    };
    w.v36PortalHome=home;try{v36PortalHome=home}catch(_){}
  }
  observer=new MutationObserver(records=>{
    if(mainMutations(records))refresh();
  });
  refresh();
})(window,document);
