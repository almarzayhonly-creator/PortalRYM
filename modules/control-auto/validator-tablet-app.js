/* Presentation adapter for main's Unit Validator.
   Main remains the source of truth; this file only reorganizes existing data and reads existing Portal endpoints. */
(function(w,d){
  'use strict';
  if(new URLSearchParams(location.search).get('validator-host')!=='1'||w.RYM_UNIT_VALIDATOR)return;
  const PERMISSION='control_auto.validador_unidad_app';
  d.documentElement.classList.add('rym-unit-validator-app');

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const text=v=>String(v??'').trim();
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

  function detailMap(card){
    const out={};
    card?.querySelectorAll('.v117-card-detail').forEach(row=>{
      const k=text(row.querySelector('span')?.textContent).toUpperCase();
      const v=text(row.querySelector('b')?.textContent);
      if(k)out[k]=v;
    });
    return out;
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
        if(e.key==='Enter'||e.key===' '){e.preventDefault();details.open=!details.open}
      });
    }
    return details;
  }
  function setDetails(card,html){
    const details=ensureDetails(card);
    [...details.children].filter(x=>x.tagName!=='SUMMARY').forEach(x=>x.remove());
    const body=d.createElement('div');
    body.className='uva-detail-body v117-card-details';
    body.innerHTML=html||'<div class="uva-detail-empty">Sin información adicional.</div>';
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
    const internal=text(ctrl?.estatus2||ctrl?.status2);
    const rawState=text(ctrl?.estatus);
    const overall=text(modal.querySelector('#v117Overall')?.textContent);
    const stateLabel=/^ACTIV[AO]$/i.test(rawState)?'ACTIVA':rawState||overall||'ESTADO POR VALIDAR';
    let preview=modal.querySelector('.uva-unit-preview');
    if(!preview){
      preview=d.createElement('section');
      preview.className='uva-unit-preview';
      const anchor=modal.querySelector('.v117-quick-grid')||identity;
      if(anchor)anchor.parentNode.insertBefore(preview,anchor);
    }
    if(preview){
      preview.innerHTML=
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
    const map=detailMap(card);
    const balance=text(card.querySelector('.v117-card-value')?.textContent)||text(ctrl?.saldo_ena)||text(ctrl?.saldo)||'No disponible';
    const last=map['CONSULTA ENA']||text(ctrl?.ena_ultima_consulta)||text(ctrl?.ultima_consulta_ena)||'Sin consulta registrada';
    const verified=card.classList.contains('ok')||/OK|VERIFIC/i.test(text(card.querySelector('header strong')?.textContent));
    setPriority(card,{badge:'PANAPASS',value:balance,note:'Última consulta · '+last});
    card.classList.add('uva-pan-priority');
    let flag=card.querySelector('.uva-verified-flag');
    if(!flag){flag=d.createElement('span');flag.className='uva-verified-flag';card.querySelector('header')?.appendChild(flag)}
    flag.className='uva-verified-flag '+(verified?'ok':'warn');
    flag.innerHTML='<i aria-hidden="true">'+(verified?'✓':'!')+'</i><b>'+(verified?'VERIFICADO':'REVISAR')+'</b>';
    const tags=text(ctrl?.tags_ena)||text(ctrl?.tag);
    const html=
      sectionHtml('Cuenta ENA',[
        detailHtml('Número Panapass',ctrl?.panapass_numero||ctrl?.numero_panapass||map['PANAPASS']),
        detailHtml('Cuenta ENA',ctrl?.cuenta_ena||ctrl?.numero_cuenta||ctrl?.panapass_numero),
        detailHtml('TAG principal',ctrl?.tag),
        detailHtml('TAGs ENA',tags),
        detailHtml('Cantidad TAG ENA',ctrl?.cantidad_tags),
        detailHtml('Estado ENA',ctrl?.ena_estado_acceso),
        detailHtml('Saldo',balance),
        detailHtml('Última consulta ENA',last)
      ])+
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
    const last=oficial?.fecha_revisado||map['ÚLTIMO REVISADO']||'Sin registro';
    const raw=[map['ESTADO'],text(card.querySelector('header strong')?.textContent),text(card.querySelector('.v117-card-value')?.textContent)].filter(Boolean).join(' ');
    const expired=/VENCID|PENDIENT|NO VIGENTE|EXPIR/i.test(raw);
    const current=!expired&&/VIGENTE|AL D[IÍ]A|OK|VALIDO|VÁLIDO/i.test(raw);
    const status=expired?'VENCIDO':current?'VIGENTE':(map['ESTADO']||'POR VALIDAR').toUpperCase();
    setPriority(card,{badge:'REVISADO',value:status,note:'Último revisado · '+last});
    card.classList.add('uva-rev-priority');
    card.classList.toggle('uva-rev-current',status==='VIGENTE');
    card.classList.toggle('uva-rev-expired',status==='VENCIDO');
    let flag=card.querySelector('.uva-verified-flag');
    if(!flag){flag=d.createElement('span');flag.className='uva-verified-flag';card.querySelector('header')?.appendChild(flag)}
    flag.className='uva-verified-flag '+(status==='VIGENTE'?'ok':status==='VENCIDO'?'bad':'warn');
    flag.innerHTML='<i aria-hidden="true">'+(status==='VIGENTE'?'✓':status==='VENCIDO'?'×':'!')+'</i><b>'+esc(status)+'</b>';
    const html=sectionHtml('Revisado',[
      detailHtml('Estado',status),
      detailHtml('Último revisado',last),
      detailHtml('Mes',ctrl?.mes_revisado||unidad?.mes_revisado||map['MES DE LA UNIDAD']),
      detailHtml('Fecha oficial eCarCheck',oficial?.fecha_revisado),
      detailHtml('Taller / emisor',oficial?.taller||oficial?.emisor||unidad?.taller_revisado),
      detailHtml('Observación',oficial?.observacion||unidad?.observacion_revisado)
    ]);
    setDetails(card,html);
  }

  function gpsFromDom(modal){
    const card=modal.querySelector('#v117GpsCard');if(!card)return;
    const map=detailMap(card);
    const parse=(key)=>{
      const raw=text(map[key]);
      const installed=!/SIN GPS/i.test(raw)&&!!raw;
      const ok=installed&&/REPORTANDO|\bOK\b|ACTIVO/i.test(raw)&&!/SIN REPORT|NO REPORT|OFFLINE/i.test(raw);
      const last=(raw.match(/·\s*(.+)$/)||[])[1]||'';
      return {raw,installed,ok,last};
    };
    const g1=parse('GPS1'),g2=parse('GPS2');
    if(!g1.raw&&!g2.raw)return;
    const good=[g1,g2].filter(g=>g.installed&&g.ok).length;
    const installed=[g1,g2].filter(g=>g.installed).length;
    const summary=installed===0?'SIN GPS':good===2?'2 DE 2 REPORTANDO':good+' DE '+Math.max(installed,2)+' REPORTANDO';
    setPriority(card,{badge:'GPS',value:summary,note:'Estado de señal'});
    card.classList.add('uva-gps-priority');
    let live=card.querySelector('.uva-gps-live');
    if(!live){live=d.createElement('div');live.className='uva-gps-live';card.querySelector('.v117-card-value')?.after(live)}
    const pill=(name,g)=>{
      const tone=!g.installed?'off':g.ok?'ok':'bad';
      const label=!g.installed?'SIN GPS':g.ok?'REPORTA':'NO REPORTA';
      return '<span class="uva-gps-pill '+tone+'"><i></i><b>'+name.replace('GPS','GPS ')+'</b><em>'+esc(label)+'</em></span>';
    };
    live.innerHTML=pill('GPS1',g1)+pill('GPS2',g2);
    setDetails(card,sectionHtml('Información GPS',[
      detailHtml('GPS 1',g1.raw||'SIN GPS'),
      detailHtml('Último reporte GPS 1',g1.last),
      detailHtml('GPS 2',g2.raw||'SIN GPS'),
      detailHtml('Último reporte GPS 2',g2.last)
    ]));
  }

  function controlVisual(modal,ctrl,ficha){
    const card=modal.querySelector('#v117CtlCard');if(!card)return;
    const map=detailMap(card);
    const rawState=text(ctrl?.estatus||map['ESTADO']||card.querySelector('header strong')?.textContent);
    const status2=text(ctrl?.estatus2||ctrl?.status2||ficha?.logistica?.status2);
    const active=/^ACTIV[AO]$/i.test(rawState);
    const stopped=/PARAD|INACTIV|BAJA|TALLER|CHAPISTER/i.test(rawState)||(!active&&!!status2&&!/ACTIV|OPERATIV|CONVENIO/i.test(status2));
    const state=active?'ACTIVA':stopped?'PARADA':(rawState||'POR VALIDAR').toUpperCase();
    const internal=status2||(active?'OPERATIVA':'REVISAR ESTATUS INTERNO');
    setPriority(card,{badge:'CONTROL DE AUTO',value:state,note:'Estatus interno · '+internal});
    card.classList.add('uva-control-priority');
    card.classList.toggle('uva-control-active',state==='ACTIVA');
    card.classList.toggle('uva-control-stopped',state==='PARADA');
    let flag=card.querySelector('.uva-verified-flag');
    if(!flag){flag=d.createElement('span');flag.className='uva-verified-flag';card.querySelector('header')?.appendChild(flag)}
    flag.className='uva-verified-flag '+(state==='ACTIVA'?'ok':state==='PARADA'?'warn':'off');
    flag.innerHTML='<i aria-hidden="true">'+(state==='ACTIVA'?'✓':state==='PARADA'?'!':'?')+'</i><b>'+esc(state)+'</b>';
    const u=ficha?.unidad||{},o=ficha?.oficial||{};
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
      detailHtml('Estatus Netsuite',ctrl?.estatus_netsuite)
    ]);
    const ecar=sectionHtml('eCarCheck',[
      detailHtml('Última verificación',o?.actualizado_at),
      detailHtml('Propietario oficial',o?.propietario),
      detailHtml('Cupo oficial',o?.cupo),
      detailHtml('Color oficial',o?.color),
      detailHtml('VIN',o?.vin),
      detailHtml('Chasis',o?.chasis),
      detailHtml('Motor',o?.motor),
      detailHtml('Marca',o?.marca),
      detailHtml('Modelo',o?.modelo),
      detailHtml('Año vehículo',o?.anio),
      detailHtml('Fecha revisado',o?.fecha_revisado),
      detailHtml('Tipo de uso',o?.tipo_uso),
      detailHtml('Estado vehículo',o?.estado_vehiculo),
      detailHtml('Restricciones',o?.restricciones||o?.restriccion),
      detailHtml('Observaciones',o?.observacion||o?.observaciones)
    ]);
    setDetails(card,control+ecar);
  }

  async function enrichModal(modal){
    if(!modal||accessMode()!=='allowed')return;
    const id=getIdentity(modal);if(!id.unit)return;
    const token=id.unit+'|'+id.plate;

    // Always reformat what main already rendered. Main owns live ENA/GPS checks.
    const ctrl=modal._uvaCtrl||{};
    const ficha=modal._uvaFicha||null;
    normalizeHeader(modal,{companyOwner:text(ctrl?.empresa_duena)||id.company,ctrl});
    panVisual(modal,ctrl);
    revisadoVisual(modal,ficha,ctrl);
    controlVisual(modal,ctrl,ficha);
    gpsFromDom(modal);

    // Supplemental master/eCarCheck data is fetched once per validated unit.
    if(modal._uvaFetchToken===token)return;
    modal._uvaFetchToken=token;
    const seq=(modal._uvaSeq||0)+1;modal._uvaSeq=seq;
    try{
      const rows=await rpcCall('panapass_control_auto_v2',{p_grupo:null,p_buscar:id.unit,p_limit:10}).catch(()=>[]);
      const freshCtrl=(rows||[]).find(r=>text(r.unidad).toUpperCase()===id.unit.toUpperCase())||(rows||[])[0]||{};
      if(modal._uvaSeq!==seq)return;
      modal._uvaCtrl=freshCtrl;

      let freshFicha=null;
      try{
        const r=await reqCall('/functions/v1/revisados-ficha',{method:'POST',body:JSON.stringify({placa:id.plate,unidad:id.unit})});
        if(r?.data?.ok)freshFicha=r.data;
      }catch(_){}
      if(modal._uvaSeq!==seq)return;
      modal._uvaFicha=freshFicha;

      normalizeHeader(modal,{companyOwner:text(freshCtrl?.empresa_duena)||id.company,ctrl:freshCtrl});
      panVisual(modal,freshCtrl);
      revisadoVisual(modal,freshFicha,freshCtrl);
      controlVisual(modal,freshCtrl,freshFicha);
      gpsFromDom(modal);
      modal.dataset.uvaEnriched=token;
    }catch(e){
      console.warn('Unit validator presentation enrichment',e);
    }
  }

  function logout(){
    accessCheckedFor='';accessProbe=null;
    d.getElementById('v101CheckModal')?.remove();
    if(typeof clearSession==='function')clearSession();
    if(typeof loginView==='function')loginView();
    refresh();
  }
  w.RYM_UNIT_VALIDATOR=Object.freeze({session,logout});

  function refresh(){
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

    const input=d.getElementById('v101ValidatorQ');
    if(ok&&input){
      input.setAttribute('inputmode','search');input.setAttribute('enterkeyhint','search');
      input.setAttribute('autocomplete','off');input.setAttribute('aria-label','Buscar unidad, placa o Panapass');
      input.placeholder='Buscar unidad, placa o Panapass';
      const title=d.querySelector('.v101-validator-head h3'),copy=d.querySelector('.v101-validator-head p');
      if(title)title.textContent='Validador de Unidad';
      if(copy)copy.textContent='Busca una unidad, placa o Panapass';
    }

    const modal=d.getElementById('v101CheckModal');
    if(ok&&modal){
      modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
      modal.setAttribute('aria-label','Resultado de validación de unidad');
      const close=modal.querySelector('#v101CloseCheck');if(close)close.setAttribute('aria-label','Cerrar resultado');
      const overall=modal.querySelector('#v117Overall');if(overall)overall.setAttribute('aria-live','polite');
      normalizeHeader(modal);
      const full=modal.querySelector('#v101OpenModule');if(full){full.hidden=true;full.disabled=true;full.onclick=null}
      modal.querySelectorAll('.v117-status-card').forEach(ensureDetails);
      clearTimeout(modal._uvaTimer);
      modal._uvaTimer=setTimeout(()=>enrichModal(modal),120);
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
  const observer=new MutationObserver(()=>{
    observer.disconnect();refresh();observer.observe(d.body,{childList:true,subtree:true});
  });
  refresh();observer.observe(d.body,{childList:true,subtree:true});
})(window,document);
