/* V172 clean externalized legacy layer: rym-v99-centro-control-js */
(function(){
  const E99=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const N99=v=>String(v??'').trim().toUpperCase();
  const M99=v=>Number(v||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmt99=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('es-PA',{timeZone:'America/Panama',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch(_){return String(v)}};
  const allMods99=()=>Array.isArray(state.allModules)&&state.allModules.length?state.allModules:(Array.isArray(state.modules)?state.modules:[]);
  async function refresh99(){try{const {data}=await req('/functions/v1/portal-session-modules',{method:'POST',body:'{}'});if(data?.ok&&Array.isArray(data.modules)){state.allModules=[...new Set(data.modules.map(String))];if(data.profile)state.profile={...(state.profile||{}),...data.profile};return true}}catch(_){}return false}

  let v106ValidatorTimer=null,v106ValidatorRows=[];window.__v106RevisadosCache=window.__v106RevisadosCache||null;
  function moneyMaybe99(v){return v==null||v===''?'—':`B/. ${M99(v)}`}
  function panDebtMaybe99(v){if(v==null||v==='')return '—';const n=Number(v||0);return n<0?`-B/. ${M99(Math.abs(n))}`:`B/. ${M99(n)}`}
  function stateTone99(t){const n=N99(t);if(['ACTIVO','AL DIA','VIGENTE','OK'].includes(n))return 'ok';if(['CHAPISTERIA','LEGAL','TALLER','PENDIENTE','PENDIENTE_CONFIRMAR','OTROS'].includes(n))return 'warn';return 'warn'}
  function toggleList99(show){const box=document.querySelector('#v101ValidatorList');if(box)box.style.display=show?'block':'none'}
  async function loadRevisados99(){if(window.__v106RevisadosCache)return window.__v106RevisadosCache;try{const r=await req('/functions/v1/revisados-final',{method:'POST',body:'{}'});if(r?.data?.ok){window.__v106RevisadosCache=r.data;return r.data}}catch(e){console.warn('V106 revisados cache',e)}return {rows:[]}}
  function findRevisado99(rows,ctrl){const uu=N99(ctrl?.unidad),p1=N99(ctrl?.placa_unica),p2=N99(ctrl?.placa_comercial);return (rows||[]).find(r=>N99(r.unidad)===uu||(p1&&N99(r.placa)===p1)||(p2&&N99(r.placa)===p2))||null}
  function companyLabel99(ctrl,rev){return rev?.empresa||ctrl?.empresa_duena||ctrl?.empresa_operadora||ctrl?.empresa||'—'}
  function companyOwner99(ctrl,rev){return ctrl?.empresa_duena||rev?.empresa_duena||rev?.empresa||ctrl?.empresa||ctrl?.empresa_operadora||'—'}
  function companyOperator99(ctrl,rev){return ctrl?.empresa_operadora||ctrl?.empresa||rev?.empresa_operadora||rev?.empresa||ctrl?.empresa_duena||'—'}
  function companyDisplay99(ctrl,rev){return companyOwner99(ctrl,rev)||companyOperator99(ctrl,rev)||'—'}
  async function searchValidator99(q){const term=String(q||'').trim();if(term.length<2){v106ValidatorRows=[];renderValidatorList99();return}try{let rows=await rpc('panapass_control_auto_v2',{p_grupo:null,p_buscar:term,p_limit:8}).catch(()=>[]);if(!Array.isArray(rows)||!rows.length)rows=await rpc('panapass_unidades_detalle',{p_buscar:term,p_limit:8}).catch(()=>[]);v106ValidatorRows=Array.isArray(rows)?rows:[];renderValidatorList99()}catch(e){console.warn('V106 search',e);v106ValidatorRows=[];renderValidatorList99()}}
  function renderValidatorList99(){const host=document.querySelector('#v101ValidatorList');if(!host)return;const rows=v106ValidatorRows||[];if(!rows.length){host.innerHTML='<div class="v101-check-empty">Sin coincidencias.</div>';toggleList99(true);return}host.innerHTML=rows.map((r,i)=>{const unit=r.unidad||r.unit||'—',plate=r.placa_unica||r.placa||r.placa_comercial||'—',st=r.estatus||r.estado||'Sin estado',comp=companyDisplay99(r);const cls=stateTone99(st)==='ok'?'ok':'warn';return `<button type="button" class="v101-validator-item" data-v101pick="${i}"><span><b>${E99(unit)}</b><small>${E99(comp)} · ${E99(plate)} · ${E99(r.panapass_numero||'Sin panapass')}</small></span><span class="v101-validator-state ${cls}">${E99(st)}</span></button>`}).join('');host.querySelectorAll('[data-v101pick]').forEach(b=>b.onclick=()=>openValidator99(v106ValidatorRows[Number(b.dataset.v101pick)]));toggleList99(true)}
  function checklistRow99(label,value,tone='gray'){return `<li><span class="v101-check-bullet ${tone}">${tone==='ok'?'✓':tone==='warn'?'!':'•'}</span><div><b>${E99(label)}</b><div>${E99(value||'—')}</div></div></li>`}
  function modalItem99(title,summary,tone,rows){return `<article class="v101-check-item ${tone}"><div class="v101-check-item-head"><h4>${E99(title)}</h4><span class="v101-check-icon ${tone}">${tone==='ok'?'✓':tone==='warn'?'!':'×'}</span></div><p>${E99(summary)}</p><ul class="v101-check-list">${rows.join('')}</ul></article>`}
  function closeValidator99(){document.querySelector('#v101CheckModal')?.remove();document.removeEventListener('click',outsideValidator99)}
  function outsideValidator99(e){const modal=document.querySelector('#v101CheckModal');if(modal&&e.target===modal)closeValidator99()}
  async function refreshPanapassCheck99(ctrl){const box=document.querySelector('#v101PanCheck');if(!box||!ctrl?.panapass_numero)return;try{const {data}=await req('/functions/v1/ena-consulta-saldo',{method:'POST',body:JSON.stringify({panapass:Number(ctrl.panapass_numero)})});const r=data?.results?.[0];if(!data?.ok||!r)throw Error(data?.error||'No disponible');let saldo=ctrl.ena_saldo;if(r.result==='OK'||r.result==='BUSY'){const parsed=Number(String(r?.summary?.saldo_texto||'').replace(/[^\d.-]/g,''));if(Number.isFinite(parsed))saldo=parsed}const ok=Number(saldo||0)>=0;box.innerHTML=modalItem99('Panapass',ok?'Sin saldo pendiente en ENA.':'Hay saldo pendiente por revisar.',ok?'ok':'warn',[checklistRow99('Panapass',ctrl.panapass_numero||'—','gray'),checklistRow99('Saldo actual',panDebtMaybe99(saldo),ok?'ok':'warn'),checklistRow99('Última lectura',r?.ultima_consulta?fmt99(r.ultima_consulta):ctrl?.ena_ultima_consulta?fmt99(ctrl.ena_ultima_consulta):'Consulta reciente','gray')])}catch(e){box.innerHTML=modalItem99('Panapass','No se pudo refrescar ENA en este momento.','warn',[checklistRow99('Panapass',ctrl.panapass_numero||'—','gray'),checklistRow99('Saldo actual',panDebtMaybe99(ctrl?.ena_saldo),Number(ctrl?.ena_saldo||0)<0?'warn':'ok'),checklistRow99('Estado',e.message||'Sin respuesta','warn')])}}
  function isAdminTotal116(){return String(state?.profile?.rol||'').trim().toUpperCase()==='ADMIN_TOTAL'}
  function gpsTone116(g){return g?.ok?'v116-gps-ok':g?.installed?'v116-gps-bad':'v116-gps-warn'}
  function gpsLabel116(g){return g?.label||'SIN GPS'}
  function gpsDate116(v){if(!v)return 'Sin transmisión';try{const raw=String(v);return new Date(raw).toLocaleString('es-PA',{timeZone:'America/Panama',dateStyle:'short',timeStyle:'short'})}catch(_){return String(v)}}
  function gpsCardLoading116(){return `<article class="v116-gps-card" id="v116GpsCheck"><div class="v116-gps-head"><h4>GPS</h4><span class="v116-gps-admin">ADMIN TOTAL</span></div><div class="v101-check-loading" style="padding:20px 8px">Consultando GPS1 y GPS2...</div></article>`}
  async function fillGpsCheck116(unit){if(!isAdminTotal116())return;const host=document.querySelector('#v116GpsCheck');if(!host)return;try{const r=await req('/functions/v1/gps-rym-admin',{method:'POST',body:JSON.stringify({q:String(unit||'').trim(),galera:'TODAS',estado:'TODOS',onlyProblems:false})});if(!r?.data?.ok)throw Error(r?.data?.error||'No disponible');const row=(r.data.rows||[]).find(x=>N99(x.unidad)===N99(unit))||(r.data.rows||[])[0];if(!row){host.innerHTML=`<div class="v116-gps-head"><h4>GPS</h4><span class="v116-gps-admin">ADMIN TOTAL</span></div><div class="v101-check-empty">Sin información GPS para esta unidad.</div>`;return}const box=g=>`<div class="v116-gps-box"><span>${E99(g?.fuente||'GPS')}</span><b class="${gpsTone116(g)}">${E99(gpsLabel116(g))}</b><small>${E99(gpsDate116(g?.last))}</small></div>`;host.innerHTML=`<div class="v116-gps-head"><h4>GPS</h4><span class="v116-gps-admin">ADMIN TOTAL</span></div><div class="v116-gps-rows">${box({...row.gps1,fuente:'GPS1'})}${box({...row.gps2,fuente:'GPS2'})}</div><div class="v116-gps-meta"><b>${E99(row.nivel||'—')}</b> · ${E99(row.razon||'Sin diagnóstico')} · Estado operativo: <b>${E99(row.estado_operativo||'—')}</b>${row.velocidad!=null?` · ${E99(row.velocidad)} km/h`:''}${row.mapa?`<br><a class="v116-gps-map" href="${E99(row.mapa)}" target="_blank">Ver última ubicación · ${E99(row.ultima_fuente||'GPS')}</a>`:''}</div>`}catch(e){host.innerHTML=`<div class="v116-gps-head"><h4>GPS</h4><span class="v116-gps-admin">ADMIN TOTAL</span></div><div class="v101-check-empty">${E99(e.message||e)}</div>`}}
  async function openValidator99(seed){
    toggleList99(false);
    const queryInput=document.querySelector('#v101ValidatorQ');
    if(queryInput)queryInput.value=seed?.unidad||seed?.placa_unica||seed?.placa||queryInput.value;
    closeValidator99();
    const modal=document.createElement('div');
    modal.id='v101CheckModal';modal.className='v101-check-modal v117-check-modal';
    modal.innerHTML='<div class="v101-check-card v117-check-card"><div class="v101-check-loading">Validando unidad...</div></div>';
    document.body.appendChild(modal);document.addEventListener('click',outsideValidator99);
    try{
      let ctrl=seed||{};
      const term=seed?.unidad||seed?.placa_unica||seed?.placa||seed?.placa_comercial||String(queryInput?.value||'').trim();
      if(!ctrl?.estatus||!ctrl?.unidad){
        const rows=await rpc('panapass_control_auto_v2',{p_grupo:null,p_buscar:term,p_limit:10}).catch(()=>[]);
        ctrl=(rows||[])[0]||ctrl;
      }
      if(!ctrl||(!ctrl.unidad&&!term))throw Error('No se encontró la unidad.');

      const revData=await loadRevisados99();
      const rev=findRevisado99(revData?.rows||[],ctrl);
      const baseActive=N99(ctrl?.estatus)==='ACTIVO';
      const status2=N99(rev?.status2||ctrl?.estatus2||ctrl?.status2||ctrl?.estado||ctrl?.estatus||'SIN DETALLE');
      const closed=['CERRADO','CERRADA','CLOSED'].includes(N99(ctrl?.estatus));
      const active=baseActive&&['ACTIVO','CONVENIO'].includes(status2);
      const revisadoVigente=!!rev?.emitido||N99(rev?.estado)==='VIGENTE';
      const revisadoConAlerta=!!rev?.bloqueado;
      const revisadoTone=revisadoVigente?(revisadoConAlerta?'warn':'ok'):'bad';
      const revisadoAlerta=rev?.boleta_empresa?'Boleta de empresa':rev?.boleta_pendiente?'Boleta de unidad':(rev?.incidencias_abiertas?.[0]?.tipo_codigo?String(rev.incidencias_abiertas[0].tipo_codigo).replaceAll('_',' '):(revisadoConAlerta?'Incidencia abierta':'Sin alertas'));
      const plate=ctrl?.placa_unica||ctrl?.placa||ctrl?.placa_comercial||'—';
      const companyOwner=companyOwner99(ctrl,rev),companyOperator=companyOperator99(ctrl,rev);
      const supervisorName=ctrl?.supervisora||rev?.supervisora||'\u2014';
      const galeraName=ctrl?.galera||rev?.galera||'\u2014';
      const unit=ctrl?.unidad||term||'Unidad';
      const pan=String(ctrl?.panapass_numero||'').trim();
      const adminGps=['ADMIN_TOTAL','ADMIN','GERENTE_GALERA','SUPERVISORA'].includes(String(state?.profile?.rol||'').trim().toUpperCase());
      const savedSaldo=(ctrl?.ena_saldo==null||ctrl?.ena_saldo==='')?null:Number(ctrl.ena_saldo);
      const state117={control:active?'ok':'bad',revisado:revisadoVigente?'ok':'bad',panapass:pan?(savedSaldo!=null&&savedSaldo<0?'bad':'pending'):'bad',gps:adminGps?'pending':'skip'};

      const toneIcon=t=>t==='ok'?'✓':t==='bad'?'!':'•';
      const detail=(k,v)=>`<div class="v117-card-detail"><span>${E99(k)}</span><b title="${E99(v||'—')}">${E99(v||'—')}</b></div>`;
      const card=(id,kind,title,tone,badge,value,details,sub='')=>`<article id="${id}" class="v117-status-card ${tone} ${kind}"><header><span class="v117-card-icon">${kind==='pan'?'P':kind==='rev'?'R':kind==='gps'?'⌖':'▣'}</span><div><small>${E99(title)}</small><strong>${E99(badge)}</strong></div><i class="v117-state-dot">${toneIcon(tone)}</i></header><div class="v117-card-value">${E99(value||'—')}</div>${sub?`<div class="v117-card-sub">${E99(sub)}</div>`:''}<div class="v117-card-details">${details.join('')}</div></article>`;
      const controlBadge=closed?'CERRADA':(active?'ACTIVA':'PARADA');
      const controlValue=closed?'CERRADA':(active?(status2&&status2!=='ACTIVO'?String(status2).toUpperCase():'ACTIVA'):String(status2||'PARADA').toUpperCase());
      const revBadge=revisadoVigente?'VIGENTE':String(rev?.estado||'SIN REVISADO').toUpperCase();
      const revMonth=String(ctrl?.mes_revisado||rev?.mes_revisado||'').trim();
      const revValue=revMonth?revMonth.toUpperCase():(rev?.ultimo_revisado?fmt99(rev.ultimo_revisado):(rev?.fecha?fmt99(rev.fecha):'MES NO DEFINIDO'));
      const panBadge=!pan?'SIN PANAPASS':(savedSaldo!=null&&savedSaldo<0?'NEGATIVO':'VALIDANDO ENA');
      const panValue=!pan?'ALERTA':(savedSaldo==null?'Consultando...':panDebtMaybe99(savedSaldo));

      const html=`<div class="v117-check-head"><div class="v117-check-title"><div class="v117-title-row"><h2>${E99(unit)}</h2><span id="v117Overall" class="v117-overall pending">VALIDANDO</span></div><div class="v117-meta"><span>Placa <b>${E99(plate)}</b></span><span>Galera <b>${E99(galeraName)}</b></span><span class="v133-mobile-supervisor">${closed?'Supervisora anterior':'Supervisora'} <b>${E99(supervisorName)}</b></span><span class="v130-mobile-owner">${closed?'Due\u00f1a anterior':'Due\u00f1a'} <b>${E99(companyOwner)}</b></span></div></div><button type="button" class="v117-close" id="v101CloseCheck">×</button></div>
      <div class="v117-identity-line"><span><b>Empresa:</b> ${E99(companyOperator)}</span><span><b>Dueña:</b> ${E99(companyOwner)}</span><span class="${active?'ok':'bad'}"><b>Estado:</b> ${E99(closed?'CERRADA':(active?(status2&&status2!=='ACTIVO'?'ACTIVA · '+status2:'ACTIVA'):'PARADA · '+status2))}</span></div>
      ${closed?`<div class="v133-closed-notice"><b>UNIDAD CERRADA</b><span>Esta unidad ya no pertenece a <strong>${E99(companyOwner)}</strong>. Ultima supervisora asignada: <strong>${E99(supervisorName)}</strong>${galeraName&&galeraName!=='\u2014'?` \u00b7 Galera <strong>${E99(galeraName)}</strong>`:''}. Estos datos se muestran como referencia historica.</span></div>`:''}
      <div class="v117-quick-grid ${adminGps?'with-gps':'no-gps'}">
        ${card('v117PanCard','pan','Panapass',state117.panapass,panBadge,panValue,[detail('Consulta ENA',pan?'Consultando ahora…':'No aplica'),detail('Panapass',pan||'No asignado')],!pan?'Control de Auto no tiene Panapass asignado.':'')}
        ${card('v117RevCard','rev','Revisado',state117.revisado,revBadge,revValue,[detail('Mes de la unidad',revMonth||'No definido'),detail('Último revisado',rev?.ultimo_revisado?fmt99(rev.ultimo_revisado):'Sin registro'),detail('Fotos',rev?(rev.fotos_disponibles?`${Number(rev.cantidad_fotos||0)} foto${Number(rev.cantidad_fotos||0)===1?'':'s'}`:'SIN FOTOS'):'Sin información'),detail('Estado',rev?.estado||(revisadoVigente?'VIGENTE':'PENDIENTE'))],revisadoVigente?'Revisado vigente.':'Requiere un Revisado vigente.')}
        ${adminGps?card('v117GpsCard','gps','GPS','pending','CONSULTANDO','GPS1 + GPS2',[detail('GPS1','...'),detail('GPS2','...')],'Validando transmisión y criticidad.'):''}
        ${card('v117CtlCard','ctl','Control de Auto',state117.control,controlBadge,controlValue,[detail('Estado',closed?'CERRADA':(active?'ACTIVA':'PARADA')),detail('Color / modelo',[ctrl?.color,ctrl?.marca,ctrl?.modelo].filter(Boolean).join(' · ')||'—')],closed?('Unidad cerrada. Ya no pertenece a '+companyOwner+'. Ultima supervisora: '+supervisorName+'.'):(active?(status2&&status2!=='ACTIVO'?'Unidad activa · '+status2+'.':'Unidad activa.'):'Unidad parada · '+status2+'.'))}
      </div>
      <div class="v117-check-actions"><button type="button" class="v117-action secondary" id="v101AgainCheck">Otra unidad</button><button type="button" class="v117-action primary" id="v101OpenModule">Control de Auto</button></div>`;
      modal.querySelector('.v117-check-card').innerHTML=html;

      const setCard=(id,kind,title,tone,badge,value,details,sub='')=>{const el=modal.querySelector('#'+id);if(el)el.outerHTML=card(id,kind,title,tone,badge,value,details,sub)};
      const refreshOverall=()=>{
        const el=modal.querySelector('#v117Overall');if(!el)return;
        if(closed){el.className='v117-overall bad';el.textContent='CERRADA \u00b7 HISTORICO';return}
        if(!active){el.className='v117-overall bad';el.textContent=`PARADA \u00b7 ${String(status2||'').toUpperCase()||'REVISAR'}`;return}
        const vals=Object.values(state117).filter(x=>x!=='skip');
        if(vals.includes('bad')){el.className='v117-overall bad';el.textContent='ACTIVA · ALERTA';return}
        if(vals.includes('warn')||vals.includes('pending')){el.className='v117-overall warn';el.textContent='ACTIVA · REVISAR';return}
        el.className='v117-overall ok';el.textContent='ACTIVA · TODO OK';
      };
      refreshOverall();

      modal.querySelector('#v101CloseCheck').onclick=closeValidator99;
      modal.querySelector('#v101AgainCheck').onclick=()=>{closeValidator99();document.querySelector('#v101ValidatorQ')?.focus()};
      modal.querySelector('#v101OpenModule').onclick=()=>{closeValidator99();window.v70OpenControl?.()};

      // Panapass: ausencia = alerta roja. Negativo = alerta roja. Positivo/cero = verde.
      if(pan){
        (async()=>{
          try{
            const {data}=await req('/functions/v1/ena-consulta-saldo',{method:'POST',body:JSON.stringify({panapass:Number(pan)})});
            const r=data?.results?.[0];if(!data?.ok||!r)throw Error(data?.error||'Sin respuesta ENA');
            let saldo=savedSaldo;
            if(r.result==='OK'||r.result==='BUSY'){
              const parsed=Number(String(r?.summary?.saldo_texto||'').replace(/[^\d.-]/g,''));
              if(Number.isFinite(parsed))saldo=parsed;
            }
            const bad=Number(saldo||0)<0;state117.panapass=bad?'bad':'ok';
            const enaQueryAt=new Date().toISOString();
            setCard('v117PanCard','pan','Panapass',state117.panapass,bad?'NEGATIVO':'AL DÍA',panDebtMaybe99(saldo),[detail('Consulta ENA',fmt99(enaQueryAt)),detail('Panapass',pan)],bad?'Saldo negativo: requiere atención.':'Sin saldo pendiente en ENA.');refreshOverall();
          }catch(e){
            const bad=savedSaldo!=null&&savedSaldo<0;state117.panapass=bad?'bad':'warn';
            setCard('v117PanCard','pan','Panapass',state117.panapass,bad?'NEGATIVO':'SIN RESPUESTA ENA',savedSaldo==null?'No disponible':panDebtMaybe99(savedSaldo),[detail('Consulta ENA',fmt99(new Date().toISOString())),detail('Estado',e.message||'Sin respuesta')],bad?'Saldo guardado negativo.':'Se mantiene el último dato guardado.');refreshOverall();
          }
        })();
      }

      // GPS: respeta la lógica del módulo GPS (OK / ALERTA / CRÍTICO / SIN GPS).
      if(adminGps){
        (async()=>{
          try{
            const r=await req('/functions/v1/gps-rym-validator',{method:'POST',body:JSON.stringify({q:String(unit).trim()})});
            if(!r?.data?.ok)throw Error(r?.data?.error||'GPS no disponible');
            const row=(r.data.rows||[]).find(x=>N99(x.unidad)===N99(unit))||(r.data.rows||[])[0];
            if(!row)throw Error('Sin información GPS');
            const g1=row.gps1||{},g2=row.gps2||{};
            const missing=!g1.installed||!g2.installed;
            const level=N99(row.nivel||'');
            const tone=missing||level==='CRITICO'?'bad':level==='ALERTA'?'warn':(g1.ok&&g2.ok?'ok':'warn');
            const badge=missing?'SIN GPS':level==='CRITICO'?'GPS CRÍTICO':level==='ALERTA'?'GPS ALERTA':'2 GPS OK';
            const glabel=g=>!g?.installed?'SIN GPS':g?.ok?'REPORTANDO':(g?.label||'SIN REPORTAR');
            const g1Label=glabel(g1),g2Label=glabel(g2);
            const gpsSummary=`GPS1: ${g1Label} · GPS2: ${g2Label}`;
            state117.gps=tone;
            setCard('v117GpsCard','gps','GPS',tone,badge,gpsSummary,[detail('GPS1',`${g1Label}${g1.last?' · '+gpsDate116(g1.last):''}`),detail('GPS2',`${g2Label}${g2.last?' · '+gpsDate116(g2.last):''}`)],`${row.estado_operativo||'—'} · ${row.razon||'Sin diagnóstico'}`);refreshOverall();
          }catch(e){state117.gps='bad';setCard('v117GpsCard','gps','GPS','bad','SIN GPS','No disponible',[detail('Estado',e.message||'Sin información'),detail('Unidad',unit)],'No fue posible confirmar GPS1/GPS2.');refreshOverall()}
        })();
      }
    }catch(e){
      modal.querySelector('.v117-check-card').innerHTML=`<div class="v117-check-head"><div class="v117-check-title"><h2>Validador de unidad</h2></div><button type="button" class="v117-close" id="v101CloseCheck">×</button></div><div class="v101-check-empty">${E99(e.message||e)}</div>`;
      modal.querySelector('#v101CloseCheck').onclick=closeValidator99;
    }
  }
  function bindValidator99(){const q=document.querySelector('#v101ValidatorQ'),go=document.querySelector('#v101ValidatorGo');if(!q||!go)return;const run=()=>{const term=String(q.value||'').trim();if(!term)return;const exact=(v106ValidatorRows||[]).find(r=>[r.unidad,r.placa_unica,r.placa,r.placa_comercial,r.panapass_numero].map(x=>N99(x)).includes(N99(term)));if(exact)return openValidator99(exact);searchValidator99(term).then(()=>{if(v106ValidatorRows.length===1)openValidator99(v106ValidatorRows[0]);else toggleList99(true)})};q.oninput=()=>{clearTimeout(v106ValidatorTimer);v106ValidatorTimer=setTimeout(()=>searchValidator99(q.value),220)};q.onfocus=()=>{if((v106ValidatorRows||[]).length)toggleList99(true)};q.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();run()}if(e.key==='Escape')toggleList99(false)};go.onclick=run;document.addEventListener('click',e=>{const wrap=document.querySelector('.v101-validator-box');if(wrap&&!wrap.contains(e.target))toggleList99(false)})}
  function card99(cls,icon,title,desc,buttonId,minis,badge='Disponible'){
    return `<article class="v99-module ${cls}"><div class="v99-module-head"><div class="v99-modicon">${E99(icon)}</div><span class="v99-badge">${E99(badge)}</span></div><h4>${E99(title)}</h4><p>${E99(desc)}</p><div class="v99-mini-kpis">${minis.map(x=>`<div class="v99-mini"><span>${E99(x[0])}</span><b>${E99(x[1])}</b></div>`).join('')}</div><button id="${buttonId}">Entrar al módulo</button></article>`
  }
  async function refreshExecutiveCards99(role){
    const controlCard=document.querySelector('body.v99-home .v99-module.control');
    if(controlCard){
      try{
        const {data}=await req('/functions/v1/control-auto-resumen-supervisoras',{method:'POST',body:'{}'});
        if(data?.ok){
          const t=data.totals||{},minis=controlCard.querySelector('.v99-mini-kpis');
          if(minis){minis.classList.add('v126-three');minis.innerHTML=`<div class="v99-mini"><span>Unidades activas</span><b>${Number(t.activas||0)}</b></div><div class="v99-mini"><span>Unidades paradas</span><b>${Number(t.paradas||0)}</b></div><div class="v99-mini"><span>Abono adicional</span><b>${Number(t.abono_adicional||0)}</b></div>`}
          const badge=controlCard.querySelector('.v103-state-copy small');
          if(badge)badge.textContent=`${Number(t.activas||0)} activas · ${Number(t.paradas||0)} paradas · ${Number(t.abono_adicional||0)} abono adicional`;
        }
      }catch(e){console.warn('Resumen operativo de Control de Auto',e)}
    }
    if(N99(role)!=='ADMIN_TOTAL')return;
    let gpsCard=document.querySelector('body.v99-home .v99-module.gps');
    if(!gpsCard){
      const grid=document.querySelector('body.v99-home .v99-grid');
      if(grid){gpsCard=document.createElement('article');gpsCard.id='v113GpsCard';gpsCard.className='v99-module gps';gpsCard.innerHTML='<div class="v99-module-head"><div class="v99-modicon">⌖</div><span class="v99-badge">ADMIN TOTAL</span></div><h4>GPS</h4><p>Monitoreo GPS1/GPS2, estado operativo, alertas y ubicación de la flota.</p><div class="v99-mini-kpis"><div class="v99-mini"><span>Críticas</span><b>—</b></div><div class="v99-mini"><span>Alertas</span><b>—</b></div><div class="v99-mini"><span>Sin GPS</span><b>—</b></div></div><button id="v113GpsEnter">Monitorear GPS</button>';grid.appendChild(gpsCard);gpsCard.querySelector('button').onclick=()=>window.v113OpenGps?.()}
    }
    if(gpsCard){
      try{
        const {data}=await req('/functions/v1/gps-rym-admin',{method:'POST',body:JSON.stringify({q:'',galera:'TODAS',estado:'TODOS',onlyProblems:false})});
        if(data?.ok){const k=data.kpis||{},minis=gpsCard.querySelector('.v99-mini-kpis');if(minis){minis.classList.add('v126-three');minis.innerHTML=`<div class="v99-mini"><span>Críticas</span><b>${Number(k.criticos||0)}</b></div><div class="v99-mini"><span>Alertas</span><b>${Number(k.alertas||0)}</b></div><div class="v99-mini"><span>Sin GPS</span><b>${Number(k.sin_gps||0)}</b></div>`}}
      }catch(e){console.warn('Resumen ejecutivo GPS',e)}
    }
  }
  function greetingPanama99(){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Panama',hour:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    const h=Number(parts.find(x=>x.type==='hour')?.value||0);
    return h<12?'Buenos días':h<18?'Buenas tardes':'Buenas noches';
  }
  function shellHome99(summary){
    const p=summary?.profile||state.profile||{},mods=summary?.modules||allMods99(),role=N99(p.rol),name=p.nombre||p.email||'Usuario',first=String(name).trim().split(/\s+/)[0]||name,pan=summary?.panapass,rev=summary?.revisados,ctl=summary?.control;
    const greeting99=greetingPanama99();
    const cards=[];const adminUsers=role==='ADMIN_TOTAL';
    if(pan)cards.push(card99('pan','P','PANAPASS','Cobros, negativos, pagos, historial y operación ENA.','v99Pan',[["Negativos hoy",pan.negativos_hoy],["Pagos hoy",pan.pagos_hoy],["Pagado mes",`B/. ${M99(pan.monto_mes)}`]],pan.rank?`#${pan.rank.posicion_galera} en ${pan.rank.galera}`:'Operativo'));
    if(rev)cards.push(card99('rev','R','REVISADOS','Vencimientos, operación ATTT, historial y avance del mes.','v99Rev',[["Pendientes",rev.pendientes],["Críticos",rev.criticos],["Emitidos hoy",`${rev.emitidos_hoy}/${rev.limite_hoy}`]],rev.pendientes?`${rev.pendientes} por gestionar`:'Al día'));
    if(ctl)cards.push(card99('control','C','CONTROL DE AUTO','Maestra de flota, eCarCheck, cupos, auditoría y trazabilidad.','v99Control',[["Total flota",Number(ctl.activas||0)+Number(ctl.otros||0)],["Activas en Control",ctl.activas],["Fuera de operación",ctl.otros]],'Maestra'));
    const kp=[];if(pan){kp.push(['PANAPASS',pan.negativos_hoy,pan.negativos_hoy?'warn':'good',`Negativos hoy · ${pan.pagos_hoy} pagos`]);kp.push(['PAGADO ESTE MES',`B/. ${M99(pan.monto_mes)}`,'',pan.rank?`Posición #${pan.rank.posicion_galera} de ${pan.rank.total_galera}`:'Dentro de tu alcance']);if(pan.bajas)kp.push(['BAJAS PANAPASS',pan.bajas.pendientes,(pan.bajas.alertas||0)?'bad':'',`${pan.bajas.procesadas} procesadas · ${pan.bajas.devoluciones} devolución(es)`])}if(rev)kp.push(['REVISADOS',rev.pendientes,rev.criticos?'warn':'good',`${rev.emitidos_hoy}/${rev.limite_hoy} emitidos hoy`]);if(ctl&&kp.length<4)kp.push(['CONTROL DE AUTO',ctl.activas,'good',`${ctl.cerradas} cerradas`]);
    const alerts=summary?.alerts||[],rank=pan?.rank,galera=rank?.galera||p.galera||'';
    document.body.className='v99-home';
    app.innerHTML=`<div class="v101-shell"><aside class="v101-side"><div class="v101-side-logo"><img src="https://drive.google.com/thumbnail?id=1f65vwdwsAraUrK2h7cb5l_eVOQKuHsL8&sz=w1000"><b>Portal RYM</b></div><nav class="v101-nav v105-nav-clean">${pan?'<button id="v101NavPan" class="active">P &nbsp; Panapass</button>':''}${rev?'<button id="v101NavRev">R &nbsp; Revisados</button>':''}${ctl?'<button id="v101NavCtl">▣ &nbsp; Control de Auto</button>':''}${adminUsers?'<button id="v118NavUsers">U &nbsp; Usuarios</button>':''}</nav><div class="v101-user-side"><b>${E99(name)}</b><span>${E99(role)}${galera?' · '+E99(galera):''}</span><small>● En línea</small><button id="v99Logout">Cerrar sesión</button></div></aside><main class="v101-main"><header class="v101-top"><div class="v101-title"><h1>Centro de Control RYM</h1><p>Visión general personalizada</p></div><div class="v101-top-right"><div class="v101-updated">Última actualización<b>${E99(fmt99(summary?.generated_at||new Date()))}</b></div><div class="v101-avatar">♙</div><div><b>${E99(name)}</b><div style="font-size:9px;color:#66758f;margin-top:3px">${E99(role)}</div></div></div></header><section class="v101-content"><div class="v101-greeting"><div><h2>¡${E99(greeting99)}, ${E99(first)}! 👋</h2><p>Así va tu operación hoy${galera?' en '+E99(galera):''}</p></div>${rank?`<div class="v101-rank"><span class="cup">🏆</span><div><small>Posición en ranking</small><strong>#${E99(rank.posicion_galera)} de ${E99(rank.total_galera)}</strong><small>Este mes</small></div></div>`:''}</div><section class="v101-validator"><div class="v101-validator-head"><div><h3>Validador rápido de unidad</h3><p>Busca por unidad, empresa, placa o Panapass y revisa en un solo modal si está lista.</p></div><span class="v101-validator-badge">Checklist express</span></div><div class="v101-validator-tools"><div class="v101-validator-box"><input id="v101ValidatorQ" class="v101-validator-input" placeholder="Ejemplo: V500, Catalina, Yeguada, placa o Panapass" autocomplete="off"><div id="v101ValidatorList" class="v101-validator-list"></div></div><button id="v101ValidatorGo" class="v101-validator-go">Validar unidad</button></div><div class="v101-validator-note">Muestra empresa, saldo de Panapass, revisado vigente y estatus operativo.</div></section><section class="v99-kpis">${kp.slice(0,4).map(x=>`<article class="v99-kpi ${x[2]||''}"><span>${E99(x[0])}</span><strong>${E99(x[1])}</strong><small>${E99(x[3])}</small></article>`).join('')}</section><div class="v99-section-title"><div><h3>Qué requiere tu atención hoy</h3><p>Prioridades operativas dentro de tu alcance.</p></div><b style="font-size:10px;color:#d33">${alerts.length} prioridades</b></div><section class="v99-alerts">${alerts.length?alerts.slice(0,3).map(a=>`<article class="v99-alert ${E99(a.level||'')}"><span class="dot"></span><div><b>${E99(a.title||a.module||'Atención')}</b><span>${E99(a.text||'')}</span></div></article>`).join(''):'<div class="v99-empty">Sin alertas críticas en este momento.</div>'}</section><div class="v99-section-title"><div><h3>Accesos directos a módulos</h3><p>Entra al sistema que necesitas utilizar.</p></div></div><section class="v99-grid">${cards.join('')||'<div class="v99-empty">No tienes módulos habilitados.</div>'}</section></section></main></div>`;
    document.querySelector('#v99Logout').onclick=()=>{clearSession();loginView()};document.querySelector('#v99Pan')?.addEventListener('click',()=>window.RYM_ROUTER?.open('panapass'));document.querySelector('#v99Control')?.addEventListener('click',()=>window.RYM_ROUTER?.open('control-auto'));document.querySelector('#v99Rev')?.addEventListener('click',()=>window.RYM_ROUTER?.open('revisados'));document.querySelector('#v101NavPan')?.addEventListener('click',()=>window.RYM_ROUTER?.open('panapass'));document.querySelector('#v101NavCtl')?.addEventListener('click',()=>window.RYM_ROUTER?.open('control-auto'));document.querySelector('#v101NavRev')?.addEventListener('click',()=>window.RYM_ROUTER?.open('revisados'));document.querySelector('#v118NavUsers')?.addEventListener('click',()=>window.RYM_ROUTER?.open('usuarios'));document.querySelector('#v101NavBajas')?.addEventListener('click',()=>window.v97OpenBajas?.());bindValidator99();setTimeout(()=>refreshExecutiveCards99(role),60);
    if(mods.includes('portal.revisados')&&window.rymPrefetchRevisados){const warm=()=>window.rymPrefetchRevisados();if('requestIdleCallback' in window)requestIdleCallback(warm,{timeout:1600});else setTimeout(warm,700)}
  }
  const homeFallback99=window.v36PortalHome;
  (window.__RYM_PORTAL_HOME_PENDING_AROUND__ ||= []).push(async function(next,args,ctx){const impl=async function(){
    window.__v75ControlMode=false;
    document.body.classList.remove('capture-mode','v36-admin-total','v37-control-only','v38-revisados-only','v60-revisados','v63-revisados','v66-revisados','v70-control','v70-admin','v70-portal','v117-panapass','v117-revisados','v117-control','v117-gps');
    document.body.classList.add('v99-home','v117-home');

    const cached=window.__v117HomeSummary;
    if(cached?.data&&(Date.now()-cached.at)<90000){
      shellHome99(cached.data);
      Promise.resolve().then(()=>refresh99()).catch(()=>{});
      setTimeout(async()=>{try{const response=await req('/functions/v1/portal-home-resumen',{method:'POST',body:'{}'});const data=response?.data;if(data?.ok){window.__v117HomeSummary={data,at:Date.now()};if(Array.isArray(data.modules))state.allModules=[...new Set(data.modules.map(String))];if(data.profile)state.profile={...(state.profile||{}),...data.profile}}}catch(_){}},120);
      return;
    }

    const mods=allMods99(),has=m=>mods.includes(m),canPan=has('portal.panapass')||['dashboard','negativos_hoy','pagos_hoy','ranking'].some(has),canRev=has('portal.revisados'),canCtl=has('portal.control_auto')||has('control_auto.unidades');
    shellHome99({profile:state.profile,modules:mods,generated_at:new Date(),panapass:canPan?{negativos_hoy:0,pagos_hoy:0,monto_mes:0}:null,revisados:canRev?{pendientes:0,criticos:0,emitidos_hoy:0,limite_hoy:33}:null,control:canCtl?{activas:0,cerradas:0,otros:0}:null,alerts:[]});
    document.body.classList.add('v120-home-loading');
    Promise.resolve().then(()=>refresh99()).catch(e=>console.warn('V117 permisos en segundo plano',e));
    try{
      const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('La consulta del Centro de Control tardó demasiado.')),15000));
      const response=await Promise.race([req('/functions/v1/portal-home-resumen',{method:'POST',body:'{}'}),timeout]);
      const data=response?.data;if(!data?.ok)throw Error(data?.error||'No se pudo cargar el resumen');
      window.__v117HomeSummary={data,at:Date.now()};
      if(Array.isArray(data.modules))state.allModules=[...new Set(data.modules.map(String))];if(data.profile)state.profile={...(state.profile||{}),...data.profile};
      shellHome99(data);
    }catch(e){
      console.warn('Portal home V117',e);
      app.innerHTML=`<div class="v101-loader"><div class="v101-loader-card v103-load-error"><img class="v101-loader-logo" src="https://drive.google.com/thumbnail?id=1f65vwdwsAraUrK2h7cb5l_eVOQKuHsL8&sz=w1000"><h2>No se pudo actualizar el Centro de Control</h2><p>${E99(e.message||e)}</p><button id="v103RetryHome">Reintentar</button><small>La sesión continúa activa.</small></div></div>`;
      document.querySelector('#v103RetryHome')?.addEventListener('click',()=>window.v36PortalHome());
    }
  };return impl.apply(ctx.thisArg,args)});
  try{v36PortalHome=window.v36PortalHome}catch(_){}
  // V144: exponer SOLO el renderer original del Centro de Control para que capas posteriores puedan reutilizarlo sin redisenarlo.
  window.__rymShellHome99=shellHome99;
  window.shellHome99=shellHome99;

  /* Pago extraordinario V2: también permite unidades cerradas por deuda ENA, sin reactivarlas. */
  function extraModal99(onAdded){
    document.querySelector('#v99ExtraModal')?.remove();const m=document.createElement('div');m.id='v99ExtraModal';m.className='v87-modal show';
    m.innerHTML=`<div class="v87-modal-card"><div class="v87-modal-head"><div><h3>Agregar pago extraordinario</h3><p>Incluye unidades activas y cerradas. Una unidad cerrada solo se registra para Historial/Fondeo y nunca se reactiva.</p></div><button class="v87-close" id="v99ExtraClose">×</button></div><div class="v87-extra-form"><div class="field wide v87-extra-search"><label>Unidad</label><input id="v99ExtraUnit" autocomplete="off" placeholder="Busca cualquier unidad, incluso cerrada"><div class="v87-extra-results" id="v99ExtraResults"></div><div class="v87-extra-selected" id="v99ExtraSelected"></div></div><div class="field"><label>Monto</label><input id="v99ExtraAmount" type="number" min="0.01" step="0.01" placeholder="0.00"></div><div class="field"><label>Quién lo solicita</label><input id="v99ExtraRequester" placeholder="Nombre de quien solicita"></div><div class="field wide"><label>Motivo</label><input id="v99ExtraReason" value="LOGISTICA" placeholder="Motivo del pago"></div></div><div id="v99ClosedHelp"></div><div class="v87-extra-help">Todo pago confirmado se archiva en Historial y forma parte del Reporte de Fondeo.</div><div id="v99ExtraMsg"></div><div class="v87-extra-actions"><button class="soft-btn" id="v99ExtraCancel">Cancelar</button><button class="v87-extra-btn" id="v99ExtraSave">Agregar pago</button></div></div>`;document.body.appendChild(m);
    const close=()=>m.remove();m.querySelector('#v99ExtraClose').onclick=close;m.querySelector('#v99ExtraCancel').onclick=close;m.onclick=e=>{if(e.target===m)close()};
    const input=m.querySelector('#v99ExtraUnit'),results=m.querySelector('#v99ExtraResults'),selected=m.querySelector('#v99ExtraSelected'),msg=m.querySelector('#v99ExtraMsg'),save=m.querySelector('#v99ExtraSave'),reason=m.querySelector('#v99ExtraReason'),closedHelp=m.querySelector('#v99ClosedHelp');let picked=null,timer=null,seq=0;
    const choose=r=>{picked=r;input.value=r.unidad||'';selected.classList.add('show');const closed=!!r.unidad_cerrada;selected.innerHTML=`<b>${E99(r.unidad||'')}</b>${closed?'<span class="v99-closed-tag">CERRADA</span>':''} · ${E99(r.placa||'')} · Panapass ${E99(r.panapass_numero||'')}<br><small>${E99([r.empresa,r.galera,r.supervisora,r.estatus].filter(Boolean).join(' · '))}</small>`;closedHelp.innerHTML=closed?'<div class="v99-closed-warning"><b>Pago ENA sobre unidad cerrada.</b> Se agregará a Cargar Pagos para registrar el pago, luego irá a Historial y Fondeo. La unidad permanecerá cerrada.</div>':'';reason.value=closed?'SALDO ENA UNIDAD CERRADA':'LOGISTICA';results.classList.remove('show');results.innerHTML=''};
    async function search(){const q=input.value.trim();picked=null;selected.classList.remove('show');selected.innerHTML='';closedHelp.innerHTML='';if(!q){results.classList.remove('show');return}const current=++seq;try{const rows=await rpc('panapass_pagos_extra_buscar_unidades_v2',{p_buscar:q});if(current!==seq)return;results.innerHTML=(rows||[]).map((r,i)=>`<button type="button" class="v87-extra-result" data-v99-extra="${i}"><b>${E99(r.unidad||'')}${r.unidad_cerrada?' · CERRADA':''}</b><span>${E99(r.placa||'')} · ${E99(r.empresa||'')}</span><small>${E99([r.galera,r.estatus].filter(Boolean).join(' · '))}</small></button>`).join('')||'<div class="empty" style="padding:10px">Sin coincidencias</div>';results.classList.add('show');results.querySelectorAll('[data-v99-extra]').forEach((b,i)=>b.onclick=()=>choose(rows[i]))}catch(e){results.innerHTML=`<div class="alert" style="margin:8px">${E99(e.message||e)}</div>`;results.classList.add('show')}}
    input.oninput=()=>{clearTimeout(timer);timer=setTimeout(search,220)};input.onfocus=()=>{if(input.value.trim())search()};
    save.onclick=async()=>{const amount=Number(m.querySelector('#v99ExtraAmount').value||0),requester=m.querySelector('#v99ExtraRequester').value.trim(),why=reason.value.trim();if(!picked){msg.innerHTML='<div class="alert">Selecciona una unidad del buscador.</div>';return}if(!(amount>0)){msg.innerHTML='<div class="alert">Indica un monto mayor que 0.</div>';return}if(!requester){msg.innerHTML='<div class="alert">Indica quién solicita el pago.</div>';return}if(!why){msg.innerHTML='<div class="alert">Indica el motivo.</div>';return}save.disabled=true;save.textContent='Agregando...';try{await rpc('panapass_pagos_hoy_agregar_extraordinario_v2',{p_unidad:picked.unidad,p_monto:amount,p_solicitado_por:requester,p_motivo:why});msg.innerHTML=`<div class="success">Pago agregado${picked.unidad_cerrada?' · unidad cerrada permanece cerrada':''}.</div>`;setTimeout(async()=>{close();await onAdded?.()},220)}catch(e){msg.innerHTML=`<div class="alert">${E99(e.message||e)}</div>`;save.disabled=false;save.textContent='Agregar pago'}};
  }
  const pagos99=pagosTrabajo;
  pagosTrabajo=async function(v){await pagos99(v);const b=v.querySelector('#v87ExtraPay');if(b)b.onclick=()=>extraModal99(async()=>{await pagosTrabajo(v)})};

  /* Tabla de pagos: respeta el tipo real de extraordinarios cerrados. */
  pagosTrabajoTable=function(rows){
    if(!rows?.length)return '<div class="card empty">No hay pagos cargados.</div>';
    return `<div class="panel pagos-online mobile-cards"><div class="table-wrap"><table class="pretty compact-table pagos-work-fit"><thead><tr><th>Unidad</th><th>Panapass</th><th>Placa</th><th>Saldo PM</th><th>Monto pagado</th><th>Boleta</th><th>N_OP</th><th>Operador</th><th>Tipo</th><th>Cobrador</th><th></th></tr></thead><tbody>${rows.map(r=>{const extra=N99(r.origen_registro)==='EXTRAORDINARIO',closed=N99(r.status)==='EXTRAORDINARIO_CERRADA',lockNop=extra||String(r.numero_operador||'').trim()!=='',lockOp=extra||String(r.nombre_operador||'').trim()!=='',empresa=r.empresa_operadora||r.empresa_duena||r.empresa||'',placa=r.placa||r.placa_unica||r.placa_comercial||'',panapass=r.panapass_numero||r.panapass||'',motive=String(r.motivo_extraordinario||'').trim(),request=String(r.solicitado_por||'').trim(),tipo=N99(r.tipo)||'LOGISTICA',unitExtra=extra?`<span class="v87-extra-badge">Extra · ${E99(motive||tipo)}</span>${closed?'<span class="v99-closed-tag">CERRADA</span>':''}${request?`<small class="v87-extra-request">Solicita: ${E99(request)}</small>`:''}`:'';return `<tr class="${extra?'v87-extra-row':''}" data-pay-origin="${extra?'EXTRAORDINARIO':'PM'}" data-pay-row-unit="${E99(r.unidad||'')}" data-pay-updated="${E99(r.updated_at||'')}" data-pay-saved="${r.guardado_en?'1':'0'}" data-pay-saved-at="${E99(r.guardado_en||'')}"><td data-label="Unidad" data-pay-unit-cell><b data-pay-unit>${E99(r.unidad)}</b><small data-pay-company>${E99(empresa)}</small>${unitExtra}</td><td data-label="Panapass"><b data-pay-panapass>${E99(panapass)}</b></td><td data-label="Placa"><b data-pay-plate>${E99(placa)}</b></td><td data-label="${extra?'Origen':'Saldo PM'}" class="saldo">${extra?`<b>${closed?'Saldo ENA cerrada':'Extraordinario'}</b>`:money(r.monto_original)}</td><td data-label="Monto pagado"><input data-pay type="number" min="0" step="0.01" value="${Number(r.a_pagar||0)}"></td><td data-label="Boleta"><b>${money(r.con_boleta)}</b></td><td data-label="N_OP"><input data-nop value="${E99(r.numero_operador||'')}" ${lockNop?'readonly class="readonly-user"':''}></td><td data-label="Operador"><input data-op value="${E99(r.nombre_operador||'')}" ${lockOp?'readonly class="readonly-user"':''}></td><td data-label="Tipo"><select data-tipo ${extra?'disabled':''}><option ${tipo==='PRE DIARIO'?'selected':''}>PRE DIARIO</option><option ${tipo==='PRE NO DIARIO'?'selected':''}>PRE NO DIARIO</option><option ${tipo==='GASTO'?'selected':''}>GASTO</option><option ${tipo==='LOGISTICA'?'selected':''}>LOGISTICA</option></select></td><td data-label="Cobrador"><input data-cobrador value="${E99(r.cobrador||'')}" readonly class="readonly-user"></td><td data-label="Acción"><button class="soft-btn" data-save-pay="${r.id}">Guardar</button></td></tr>`}).join('')}</tbody></table></div></div>`
  };

  /* Bajas V7: Pendiente -> Procesada por ENA -> devolución / desaparición -> completada. */
  const oldBajas99=window.v87BajasPanapass;
  window.v87BajasPanapass=async function(v){
    v.innerHTML='<div class="card">Conciliando Bajas Panapass con el último corte ENA...</div>';
    try{
      const [d,recs]=await Promise.all([rpc('panapass_bajas_centro_v7'),(async()=>{try{const {data}=await req('/functions/v1/panapass-bajas-email',{method:'POST',body:JSON.stringify({action:'RECIPIENTS'})});return data?.ok?(data.recipients||[]):[]}catch(_){return []}})()]);
      const pending=d?.pendientes||[],processed=d?.procesadas||[],refunds=d?.devoluciones||[],done=d?.completadas||[],alerts=d?.alertas||[],admin=!!d?.admin_total;
      v.innerHTML=`<section class="v87-bajas-hero"><div><h2>Bajas Panapass</h2><p>Marca <b>ENA procesó baja</b> cuando ENA te confirme el trámite aunque el Panapass todavía aparezca. Si conserva saldo positivo, queda visible como gestión de devolución hasta completar el ciclo.</p></div><div class="v87-bajas-actions"><button class="soft-btn" id="v99BReload">Actualizar</button></div></section><div class="v87-bajas-kpis v99-baja-kpis"><div class="v87-bajas-kpi"><span>Bajas pendientes</span><strong>${pending.length}</strong></div><div class="v87-bajas-kpi"><span>Procesadas ENA</span><strong>${processed.length}</strong></div><div class="v87-bajas-kpi warn"><span>Devoluciones</span><strong>${refunds.length}</strong></div><div class="v87-bajas-kpi"><span>Completadas</span><strong>${done.length}</strong></div><div class="v87-bajas-kpi ${alerts.length?'warn':''}"><span>Activas sin ENA</span><strong>${alerts.length}</strong></div></div><div class="v96-import-note">Último corte externo: ${E99(d?.ultimo_corte?.fecha||'—')} · ${E99(d?.ultimo_corte?.tipo||'—')} · ${E99(fmt99(d?.ultimo_corte?.capturado_en))}. Una baja procesada puede seguir presente mientras ENA gestiona un saldo positivo.</div><div class="v97-bajas-layout"><div class="v97-bajas-main"><div class="v96-tabs"><button data-v99bt="pending" class="active">Pendientes</button><button data-v99bt="processed">Procesadas ENA</button><button data-v99bt="refund">Devoluciones</button><button data-v99bt="done">Completadas</button><button data-v99bt="alerts">Alertas activas</button></div><div id="v99BBody"></div><div id="v99BMsg"></div></div><aside class="v92-mailbox v97-bajas-mail"><h3>Enviar por correo</h3><p>Envía únicamente las <b>Bajas pendientes</b>. Las ya procesadas por ENA quedan fuera de este correo.</p><div class="v66-daily-from"><span>Remitente</span><b>panapassrym@gmail.com</b></div><input id="v99RecQ" class="v66-daily-search" placeholder="Buscar nombre, correo, rol o galera"><div class="v92-mail-actions"><button class="soft-btn" id="v99RecAll">Seleccionar visibles</button><button class="soft-btn" id="v99RecNone">Limpiar</button></div><div class="v92-rec-list" id="v99RecList">${recs.map(r=>`<label class="v92-rec" data-v99rs="${E99(N99([r.nombre,r.email,r.tipo,r.galera].join(' ')))}"><input type="checkbox" data-v99to="${E99(r.email)}"><span><b>${E99(r.nombre||r.email)}</b><small>${E99(r.email)} · ${E99(r.tipo||'')}</small></span></label>`).join('')||'<div class="muted">No se pudo cargar el directorio automático.</div>'}</div><div class="v66-manual-mail"><input id="v99ManualEmail" type="email" placeholder="Agregar correo manual"><button id="v99ManualAdd">Agregar</button></div><div class="v97-mail-selected" id="v99Selected"><b>0</b> destinatarios seleccionados</div><div class="v93-mail-actions"><button class="soft-btn" id="v99CopyReport">Copiar reporte</button><button class="soft-btn" id="v99MailOpen">Preparar en Outlook</button><button class="send" id="v99MailSend">Enviar correo</button></div><div class="v97-mail-status" id="v99MailStatus"></div></aside></div>`;
      const body=v.querySelector('#v99BBody'),msg=v.querySelector('#v99BMsg');
      const stateLabel=(r,mode)=>mode==='pending'?'Baja pendiente':mode==='processed'?(r.devolucion_estado==='SOLICITADA'?'Procesada · devolución solicitada':r.devolucion_estado==='PENDIENTE_SOLICITAR'?'Procesada · pedir devolución':'Baja procesada por ENA'):mode==='refund'?({'PENDIENTE_CONFIRMAR':'Baja OK · confirmar devolución','PENDIENTE_SOLICITAR':'Devolución por solicitar','SOLICITADA':'Devolución solicitada'}[r.devolucion_estado]||r.devolucion_estado):'Baja completada';
      const action=(r,mode)=>{if(!admin)return '';if(mode==='pending')return `<button class="v99-process-btn" data-v99ba="MARCAR_PROCESADA_ENA" data-id="${r.id}">ENA procesó baja</button>`;if(mode==='processed'){let a=`<button class="v99-revert-btn" data-v99ba="REVERTIR_PROCESADA_ENA" data-id="${r.id}">Revertir</button>`;if(r.devolucion_estado==='PENDIENTE_SOLICITAR')a+=` <button data-v99ba="MARCAR_SOLICITADA" data-id="${r.id}">Devolución solicitada</button>`;else if(r.devolucion_estado==='SOLICITADA')a+=` <button data-v99ba="MARCAR_RECIBIDA" data-id="${r.id}">Devolución recibida</button>`;return a}if(mode==='refund'){if(r.devolucion_estado==='PENDIENTE_CONFIRMAR')return `<button class="soft-btn" data-v99ba="CONFIRMAR_DEVOLUCION" data-id="${r.id}">Confirmar devolución</button>`;if(r.devolucion_estado==='PENDIENTE_SOLICITAR')return `<button data-v99ba="MARCAR_SOLICITADA" data-id="${r.id}">Marcar solicitada</button>`;if(r.devolucion_estado==='SOLICITADA')return `<button data-v99ba="MARCAR_RECIBIDA" data-id="${r.id}">Marcar recibida</button>`}return ''};
      const table=(rows,mode)=>{if(!rows.length)return '<div class="card empty">Sin registros en esta bandeja.</div>';if(mode==='alerts')return rows.map(r=>`<article class="v96-alert-card"><b>${E99(r.unidad)} · ${E99(r.placa||'')} · Panapass ${E99(r.panapass_numero||'')}</b><div>${E99(r.mensaje||'Panapass no encontrado en ENA externo.')}</div><small>${E99(r.empresa||'')} · ${E99(r.galera||'')} · detectado ${E99(fmt99(r.first_seen_at))}</small></article>`).join('');return `<div class="panel mobile-cards"><div class="table-wrap"><table class="pretty compact-table"><thead><tr><th>Unidad</th><th>Galera</th><th>Empresa</th><th>Panapass</th><th>Saldo</th><th>Estado</th><th>ENA externo</th><th>Acción</th></tr></thead><tbody>${rows.map(r=>{const saldo=r.saldo_ultimo!=null?r.saldo_ultimo:r.saldo_externo_actual,cls=mode==='pending'?'pending':mode==='processed'?'processed':mode==='refund'?'refund':'done';return `<tr><td data-label="Unidad"><b>${E99(r.unidad)}</b><div class="v96-mini">${E99(r.placa||'')}</div></td><td data-label="Galera">${E99(r.galera||'')}</td><td data-label="Empresa">${E99(r.empresa||'')}</td><td data-label="Panapass">${E99(r.panapass_numero||'')}</td><td data-label="Saldo"><b>${saldo==null?'—':'B/. '+M99(saldo)}</b></td><td data-label="Estado"><span class="v96-baja-state ${cls}">${E99(stateLabel(r,mode))}</span>${r.ena_procesada_at?`<div class="v96-mini">${E99(fmt99(r.ena_procesada_at))}</div>`:''}</td><td data-label="ENA externo">${r.aparece_ena_externo?'PRESENTE':'NO APARECE'}<div class="v96-mini">${E99(fmt99(r.ena_desaparecido_at||r.saldo_ultimo_at))}</div></td><td data-label="Acción">${action(r,mode)||'—'}</td></tr>`}).join('')}</tbody></table></div></div>`};
      const setMode=mode=>{v.querySelectorAll('[data-v99bt]').forEach(b=>b.classList.toggle('active',b.dataset.v99bt===mode));const rows=mode==='pending'?pending:mode==='processed'?processed:mode==='refund'?refunds:mode==='done'?done:alerts;body.innerHTML=table(rows,mode);body.querySelectorAll('[data-v99ba]').forEach(b=>b.onclick=async()=>{let note='';if(['MARCAR_PROCESADA_ENA','REVERTIR_PROCESADA_ENA'].includes(b.dataset.v99ba)){note=prompt(b.dataset.v99ba==='MARCAR_PROCESADA_ENA'?'Nota opcional sobre la confirmación de ENA:':'Motivo de reversión (opcional):','');if(note===null)return}else{note=prompt('Nota opcional:','');if(note===null)return}b.disabled=true;try{await rpc('panapass_bajas_accion_v7',{p_id:Number(b.dataset.id),p_accion:b.dataset.v99ba,p_nota:note||null});msg.innerHTML='<div class="success">Gestión actualizada.</div>';setTimeout(()=>window.v87BajasPanapass(v),300)}catch(e){msg.innerHTML=`<div class="alert">${E99(e.message||e)}</div>`;b.disabled=false}})};
      v.querySelectorAll('[data-v99bt]').forEach(b=>b.onclick=()=>setMode(b.dataset.v99bt));v.querySelector('#v99BReload').onclick=()=>window.v87BajasPanapass(v);setMode('pending');
      const updateSelected=()=>{const n=v.querySelectorAll('[data-v99to]:checked').length;v.querySelector('#v99Selected').innerHTML=`<b>${n}</b> destinatario${n===1?'':'s'} seleccionado${n===1?'':'s'}`};const q=v.querySelector('#v99RecQ');q.oninput=()=>{const x=N99(q.value);v.querySelectorAll('[data-v99rs]').forEach(el=>el.style.display=!x||el.dataset.v99rs.includes(x)?'flex':'none')};v.querySelector('#v99RecAll').onclick=()=>{v.querySelectorAll('[data-v99rs]').forEach(el=>{if(el.style.display!=='none')el.querySelector('input').checked=true});updateSelected()};v.querySelector('#v99RecNone').onclick=()=>{v.querySelectorAll('[data-v99to]').forEach(x=>x.checked=false);updateSelected()};v.querySelector('#v99RecList').onchange=e=>{if(e.target.matches('[data-v99to]'))updateSelected()};v.querySelector('#v99ManualAdd').onclick=()=>{const i=v.querySelector('#v99ManualEmail'),email=String(i.value||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){alert('Correo inválido.');return}v.querySelector('#v99RecList').insertAdjacentHTML('afterbegin',`<label class="v92-rec" data-v99rs="${E99(N99(email))}"><input type="checkbox" data-v99to="${E99(email)}" checked><span><b>Correo manual</b><small>${E99(email)}</small></span></label>`);i.value='';updateSelected()};
      const selected=()=>[...v.querySelectorAll('[data-v99to]:checked')].map(x=>x.dataset.v99to),mailText=()=>['BAJAS PANAPASS PENDIENTES',`Unidades pendientes: ${pending.length}`,'',...pending.map(r=>`${r.galera||''} | ${r.unidad||''} | ${r.empresa||''} | Panapass ${r.panapass_numero||''} | B/. ${M99(r.saldo_externo_actual||r.saldo_ultimo||0)}`)].join('\n');v.querySelector('#v99CopyReport').onclick=async e=>{try{await navigator.clipboard.writeText(mailText());const old=e.currentTarget.textContent;e.currentTarget.textContent='Copiado ✓';setTimeout(()=>e.currentTarget.textContent=old,900)}catch(_){alert('No se pudo copiar automáticamente.')}};v.querySelector('#v99MailOpen').onclick=()=>{const to=selected();if(!to.length){alert('Selecciona al menos un destinatario.');return}window.location.href=`mailto:${encodeURIComponent(to.join(','))}?subject=${encodeURIComponent(`Bajas Panapass - ${pending.length} pendientes`)}&body=${encodeURIComponent(mailText())}`};v.querySelector('#v99MailSend').onclick=async e=>{const to=selected(),st=v.querySelector('#v99MailStatus'),btn=e.currentTarget;if(!to.length){st.innerHTML='<span style="color:#d92d20;font-weight:900">Selecciona al menos un destinatario.</span>';return}if(!confirm(`¿Enviar el reporte de Bajas Panapass a ${to.length} destinatario(s)?`))return;btn.disabled=true;btn.textContent='Enviando...';try{const {data}=await req('/functions/v1/panapass-bajas-email',{method:'POST',body:JSON.stringify({action:'SEND',to,filters:{}})});if(!data?.ok)throw Error(data?.error||'No se pudo enviar');st.innerHTML=`<span style="color:#087f5b;font-weight:1000">Correo enviado ✓ · ${E99(data.unidades)} unidades pendientes</span>`}catch(err){st.innerHTML=`<span style="color:#d92d20;font-weight:900">${E99(err.message||err)}</span>`}finally{btn.disabled=false;btn.textContent='Enviar correo'}};updateSelected();
    }catch(e){console.error(e);if(typeof oldBajas99==='function')try{return await oldBajas99(v)}catch(_){}v.innerHTML=`<div class="alert">${E99(e.message||e)}</div>`}
  };
})();
