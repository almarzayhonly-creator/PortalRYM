/* Presentation adapter for main's Unit Validator.
   Main remains the source of truth; this file only reorganizes existing data and reads existing Portal endpoints. */
(function(w,d){
  'use strict';
  if(new URLSearchParams(location.search).get('validator-host')!=='1'||w.RYM_UNIT_VALIDATOR)return;
  const PERMISSION='control_auto.validador_unidad_app';
  d.documentElement.classList.add('rym-unit-validator-app');

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const text=v=>String(v??'').trim();
  function profile(){try{return state.profile}catch(_){return null}}
  function allowed(){try{return !!profile()&&typeof w.rymHasModule==='function'&&w.rymHasModule(PERMISSION)}catch(_){return false}}
  function session(){const p=profile();return {authenticated:!!p,denied:!!p&&!allowed(),user:p?.nombre||p?.email||''}}
  function notify(){w.parent.postMessage({type:'rym-validator-state'},location.origin)}
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
    body.className='uva-detail-body';
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
    const owner=meta.find(x=>/Dueña/i.test(text(x.textContent)));
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
    const balance=text(card.querySelector('.v117-card-value')?.textContent)||'No disponible';
    const last=map['CONSULTA ENA']||text(ctrl?.ena_ultima_consulta)||'Sin consulta registrada';
    const badge=text(card.querySelector('header strong')?.textContent)||'PANAPASS';
    setPriority(card,{badge,value:balance,note:'Última consulta · '+last});
    card.classList.add('uva-pan-priority');
    card.querySelector('.v117-state-dot')?.setAttribute('title',card.classList.contains('ok')?'Verificado':'Requiere revisión');
    const tags=text(ctrl?.tags_ena)||text(ctrl?.tag);
    const html=sectionHtml('ENA',[
      detailHtml('Número Panapass',ctrl?.panapass_numero||map['PANAPASS']),
      detailHtml('TAG principal',ctrl?.tag),
      detailHtml('TAGs ENA',tags),
      detailHtml('Cantidad TAG ENA',ctrl?.cantidad_tags),
      detailHtml('Estado ENA',ctrl?.ena_estado_acceso),
      detailHtml('Saldo',balance),
      detailHtml('Última consulta ENA',last)
    ]);
    setDetails(card,html);
  }

  function revisadoVisual(modal,ficha,ctrl){
    const card=modal.querySelector('#v117RevCard');if(!card)return;
    const map=detailMap(card);
    const oficial=ficha?.oficial||{};
    const unidad=ficha?.unidad||{};
    const last=oficial?.fecha_revisado||map['ÚLTIMO REVISADO']||'Sin registro';
    const badge=text(card.querySelector('header strong')?.textContent)||map['ESTADO']||'REVISADO';
    setPriority(card,{badge,value:last,note:'Último revisado'});
    card.classList.add('uva-rev-priority');
    const html=sectionHtml('Revisado',[
      detailHtml('Estado',map['ESTADO']||badge),
      detailHtml('Último revisado',last),
      detailHtml('Mes',ctrl?.mes_revisado||unidad?.mes_revisado||map['MES DE LA UNIDAD']),
      detailHtml('Fecha oficial eCarCheck',oficial?.fecha_revisado)
    ]);
    setDetails(card,html);
  }

  function gpsTone(g){
    if(!g?.installed)return 'off';
    return g?.ok?'ok':'bad';
  }
  function gpsLabel(g){
    if(!g?.installed)return 'SIN GPS';
    return g?.ok?'REPORTANDO':text(g?.label)||'SIN REPORTAR';
  }
  async function gpsVisual(modal,unit){
    const card=modal.querySelector('#v117GpsCard');if(!card)return;
    try{
      const r=await reqCall('/functions/v1/gps-rym-validator',{method:'POST',body:JSON.stringify({q:unit})});
      const row=(r?.data?.rows||[]).find(x=>text(x.unidad).toUpperCase()===unit.toUpperCase())||(r?.data?.rows||[])[0];
      if(!r?.data?.ok||!row)throw Error(r?.data?.error||'Sin información GPS');
      const g1=row.gps1||{},g2=row.gps2||{};
      const good=[g1,g2].filter(g=>g?.installed&&g?.ok).length;
      const installed=[g1,g2].filter(g=>g?.installed).length;
      const badge=installed===0?'SIN GPS':good===2?'2 GPS OK':good+' DE '+installed+' GPS OK';
      setPriority(card,{badge,value:badge,note:''});
      card.classList.add('uva-gps-priority');
      let live=card.querySelector('.uva-gps-live');
      if(!live){live=d.createElement('div');live.className='uva-gps-live';card.querySelector('.v117-card-value')?.after(live)}
      live.innerHTML=[
        ['GPS1',g1],['GPS2',g2]
      ].map(([name,g])=>'<span class="uva-gps-pill '+gpsTone(g)+'"><i></i><b>'+name+'</b><em>'+esc(gpsLabel(g))+'</em></span>').join('');
      const html=sectionHtml('GPS',[
        detailHtml('GPS1',gpsLabel(g1)),
        detailHtml('Último reporte GPS1',g1?.last),
        detailHtml('GPS2',gpsLabel(g2)),
        detailHtml('Último reporte GPS2',g2?.last),
        detailHtml('Nivel',row?.nivel),
        detailHtml('Diagnóstico',row?.razon),
        detailHtml('Estado operativo',row?.estado_operativo),
        detailHtml('Última fuente',row?.ultima_fuente)
      ]);
      setDetails(card,html);
    }catch(e){
      setPriority(card,{badge:'GPS SIN CONFIRMAR',value:'No disponible',note:'No fue posible confirmar GPS1/GPS2'});
      setDetails(card,sectionHtml('GPS',[detailHtml('Estado',e.message||'Sin información')]));
    }
  }

  function controlVisual(modal,ctrl,ficha){
    const card=modal.querySelector('#v117CtlCard');if(!card)return;
    const map=detailMap(card);
    const badge=text(card.querySelector('header strong')?.textContent)||map['ESTADO']||'CONTROL DE AUTO';
    const status2=text(ctrl?.estatus2||ctrl?.status2||ficha?.logistica?.status2);
    const active=/^ACTIVA?$/i.test(badge)||/^ACTIVO$/i.test(text(ctrl?.estatus));
    const sub=active?(status2&&status2.toUpperCase()!=='ACTIVO'&&status2.toUpperCase()!=='CONVENIO'?status2:'OPERATIVA'):(status2||text(card.querySelector('.v117-card-value')?.textContent)||'REVISAR');
    setPriority(card,{badge,value:sub.toUpperCase(),note:active?'Unidad activa':'Estatus interno'});
    card.classList.add('uva-control-priority');
    const u=ficha?.unidad||{},o=ficha?.oficial||{};
    const control=sectionHtml('Control de Auto',[
      detailHtml('Estado',ctrl?.estatus||map['ESTADO']||badge),
      detailHtml('Estatus interno',status2),
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
      detailHtml('Estado vehículo',o?.estado_vehiculo)
    ]);
    setDetails(card,control+ecar);
  }

  async function enrichModal(modal){
    if(!modal||!allowed())return;
    const id=getIdentity(modal);if(!id.unit)return;
    const token=id.unit+'|'+id.plate;
    const seq=(modal._uvaSeq||0)+1;modal._uvaSeq=seq;
    try{
      const rows=await rpcCall('panapass_control_auto_v2',{p_grupo:null,p_buscar:id.unit,p_limit:10}).catch(()=>[]);
      const ctrl=(rows||[]).find(r=>text(r.unidad).toUpperCase()===id.unit.toUpperCase())||(rows||[])[0]||{};
      if(modal._uvaSeq!==seq)return;
      const companyOwner=text(ctrl?.empresa_duena)||id.company;
      normalizeHeader(modal,{companyOwner});
      panVisual(modal,ctrl);

      let ficha=null;
      try{
        const r=await reqCall('/functions/v1/revisados-ficha',{method:'POST',body:JSON.stringify({placa:id.plate,unidad:id.unit})});
        if(r?.data?.ok)ficha=r.data;
      }catch(_){}
      if(modal._uvaSeq!==seq)return;
      revisadoVisual(modal,ficha,ctrl);
      controlVisual(modal,ctrl,ficha);
      gpsVisual(modal,id.unit);
      modal.dataset.uvaEnriched=token;
    }catch(e){
      console.warn('Unit validator presentation enrichment',e);
    }
  }

  function logout(){
    d.getElementById('v101CheckModal')?.remove();
    if(typeof clearSession==='function')clearSession();
    if(typeof loginView==='function')loginView();
    refresh();
  }
  w.RYM_UNIT_VALIDATOR=Object.freeze({session,logout});

  function refresh(){
    const p=profile(),ok=allowed();
    d.documentElement.classList.toggle('uva-authorized',ok);
    d.documentElement.classList.toggle('uva-authenticated',!!p);
    if(p&&!ok){
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
