/* Portal RYM V172 — independent unit validator. */
(function(w,d){'use strict';
  if(!w.RYM_MODULES||w.RYM_MODULES.has('validador'))return;
  const modules=()=>Array.isArray(w.state?.allModules)&&w.state.allModules.length?w.state.allModules:(w.state?.modules||[]);
  const isPreview=()=>/\.workers\.dev$/i.test(location.hostname)&&new URLSearchParams(location.search).has('v172');
  const isAdmin=()=>String(w.state?.profile?.rol||'').trim().toUpperCase()==='ADMIN_TOTAL';
  const canAccess=()=>modules().map(String).includes('portal.validador')||(isPreview()&&isAdmin());
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const unitOf=r=>r?.unidad||r?.details?.row?.unidad||'—';
  const plateOf=r=>r?.placa_unica||r?.placa||r?.placa_comercial||'—';
  const sourceName={control:'Control de Auto',revisado:'Revisados',panapass:'Panapass',gps:'GPS'};
  const icon={control:'CA',revisado:'RV',panapass:'PP',gps:'GPS'};
  const tone=s=>s==='OK'?'ok':s==='BLOQUEADA'?'blocked':s==='ALERTA'?'alert':'incomplete';
  const canControl=()=>modules().some(x=>['portal.control_auto','control_auto.unidades'].includes(String(x)));
  const canHistory=()=>modules().map(String).includes('validador.historial');
  const sourceOrder=['panapass','revisado','gps','control'];
  const val=(v,f='No disponible')=>v===null||v===undefined||v===''?f:String(v);
  const fmtDate=v=>{if(!v)return 'No disponible';const x=new Date(v);return Number.isNaN(x.getTime())?'No disponible':x.toLocaleString('es-PA',{dateStyle:'medium',timeStyle:'short'})};

  async function validate(seed,onSource){
    if(!canAccess())throw Error('No tienes permiso para usar el Validador.');
    const control=await w.RYM_VALIDATOR_SERVICES.validatorControlAutoService(seed);
    onSource?.(control);
    const watch=p=>p.then(x=>(onSource?.(x),x));
    const [revisado,panapass,gps]=await Promise.all([
      watch(w.RYM_VALIDATOR_SERVICES.validatorRevisadosService(control)),
      watch(w.RYM_VALIDATOR_SERVICES.validatorPanapassService(control)),
      watch(w.RYM_VALIDATOR_SERVICES.validatorGpsService(control))
    ]);
    return w.RYM_VALIDATOR_EVALUATOR.evaluateUnitValidation({control,revisado,panapass,gps});
  }

  function detailRows(x){
    const z=x.details||{},r=z.row||{};
    if(x.source==='panapass')return [['Estado',x.summary],['Saldo',Number.isFinite(z.saldo)?'B/. '+Number(z.saldo).toFixed(2):'No disponible'],['TAG / Panapass',val(z.panapass)],['Última consulta ENA',fmtDate(z.consulta)]];
    if(x.source==='revisado')return [['Estado',val(z.estado||r.estado,x.summary)],['Mes / año',[r.mes||r.mes_num,r.anio_requerido||r.ultimo_anio_emitido].filter(Boolean).join(' · ')||'No disponible'],['Último revisado',fmtDate(r.ultimo_revisado||r.fecha_ultimo_revisado)],['Fotos',r.fotos_disponibles===undefined?'No disponible':(r.fotos_disponibles?'Sí':'No')+(r.cantidad_fotos?' · '+r.cantidad_fotos:'')],['Actualización',fmtDate(r.ficha_ecarcheck_at||r.actualizado_at)]];
    if(x.source==='gps'){const g1=z.gps1||r.gps1||{},g2=z.gps2||r.gps2||{};return [['GPS1',val(g1.label,g1.installed?'Sin estado':'No instalado')],['Último GPS1',fmtDate(g1.last)],['GPS2',val(g2.label,g2.installed?'Sin estado':'No instalado')],['Último GPS2',fmtDate(g2.last)],['Diagnóstico',val(r.razon,x.summary)]]}
    return [['Estado',val(z.estado||r.estatus||r.estado)],['Vehículo',[r.color,r.marca,r.modelo,r.anio].filter(Boolean).join(' · ')||'No disponible'],['Empresa',val(r.empresa_operadora||r.empresa)],['Dueña',val(r.empresa_duena)],['Galera',val(r.galera)],['Supervisora',val(r.supervisora)]];
  }

  function itemCard(x){
    const t=tone(String(x.status||'').toUpperCase()),status=String(x.status||'INCOMPLETA').toUpperCase();
    return `<article class="rym-v-card ${x.source} ${t}"><header class="rym-v-cardtop"><span class="rym-v-icon">${esc(icon[x.source]||'•')}</span><div><small>${esc(sourceName[x.source]||x.source)}</small><h3>${esc(x.summary)}</h3></div><span class="rym-v-state">${esc(status)}</span></header><dl>${detailRows(x).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></article>`;
  }

  function loadingCard(source){return `<article class="rym-v-card ${source} loading" id="rym-v-source-${source}"><header class="rym-v-cardtop"><span class="rym-v-icon">${icon[source]}</span><div><small>${sourceName[source]}</small><h3>Consultando fuente…</h3></div></header><div class="rym-v-skeleton"><i></i><i></i><i></i><i></i></div></article>`}
  function renderLoading(out,row){out.className='';out.innerHTML=`<section class="rym-v-result incomplete"><header class="rym-v-verdict"><div><span class="rym-v-eyebrow">Validación en proceso</span><div class="rym-v-unitline"><h2>${esc(unitOf(row))}</h2><span>CONSULTANDO</span></div><p>Cada fuente aparece tan pronto responde.</p></div><div class="rym-v-score rym-v-progress"><b>0<em>/4</em></b><small>completadas</small></div></header><div class="rym-v-grid">${sourceOrder.map(loadingCard).join('')}</div></section>`}
  function renderResult(out,result,row){
    const t=tone(result.status),controlItem=result.items.find(x=>x.source==='control'),control=controlItem?.details?.row||row,ok=result.items.filter(x=>x.status==='ok').length;
    const identity=[['Placa',plateOf(control)],['Galera',val(control.galera)],['Supervisora',val(control.supervisora)],['Empresa',val(control.empresa_operadora||control.empresa)],['Dueña',val(control.empresa_duena)]];
    const ordered=sourceOrder.map(s=>result.items.find(x=>x.source===s)).filter(Boolean);
    out.innerHTML=`<section class="rym-v-result ${t}"><header class="rym-v-verdict"><div><span class="rym-v-eyebrow">Resultado de validación</span><div class="rym-v-unitline"><h2>${esc(unitOf(row))}</h2><span>${esc(result.label)}</span></div><p>${esc(result.summary)} · ${ok} de 4 verificaciones confirmadas.</p><time>${esc(new Date().toLocaleString('es-PA'))}</time></div><div class="rym-v-score"><b>${ok}<em>/4</em></b><small>fuentes OK</small></div></header><section class="rym-v-identity">${identity.map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</section><div class="rym-v-grid">${ordered.map(itemCard).join('')}</div><div class="rym-v-actions"><button type="button" class="rym-v-primary" data-v-action="again">Validar otra unidad</button>${canHistory()?'<button type="button" class="rym-v-secondary" data-v-action="history">Ver historial</button>':''}${canControl()?'<button type="button" class="rym-v-secondary" data-v-action="control">Abrir Control de Auto</button>':''}<button type="button" class="rym-v-quiet" data-v-action="refresh">Actualizar fuentes</button></div><p class="rym-v-stamp">Una fuente desconocida o sin respuesta produce INFORMACIÓN INCOMPLETA; nunca un falso positivo.</p></section>`;
  }
  async function open(seed){
    const host=d.querySelector('#view');if(!host)return validate(seed);
    if(!canAccess()){host.innerHTML='<div class="alert">No tienes permiso para usar el Validador.</div>';return;}
    d.body.classList.add('v172-validator');
    const shellTitle=d.querySelector('.top h1');if(shellTitle)shellTitle.textContent='Validador';
    host.innerHTML=`<section class="rym-validator"><header class="rym-v-header"><button type="button" class="rym-v-back" id="rymValidatorBack">← Portal</button><div><span class="rym-v-kicker">Portal RYM · V172</span><h1>Validador de unidad</h1><p>Una sola consulta. Cuatro fuentes verificadas en paralelo.</p></div><span class="rym-v-live"><i></i> Fuentes en vivo</span></header><section class="rym-v-search"><div><h2>¿Qué unidad deseas validar?</h2><p>Busca por unidad, placa o número Panapass.</p></div><form id="rymValidatorForm"><label for="rymValidatorQuery">Unidad, placa o Panapass</label><div class="rym-v-inputrow"><input id="rymValidatorQuery" required minlength="2" autocomplete="off" placeholder="Ej. P393"><button class="rym-v-primary">Validar ahora</button></div></form></section><div id="rymValidatorResult" class="rym-v-empty"><div class="rym-v-emptyicon">✓</div><h2>Listo para validar</h2><p>El resultado solo será positivo si todas las fuentes responden y coinciden.</p><div class="rym-v-sourcebar"><span>Control de Auto</span><span>Revisados</span><span>Panapass</span><span>GPS</span></div></div></section>`;
    const form=host.querySelector('#rymValidatorForm'),input=host.querySelector('#rymValidatorQuery'),out=host.querySelector('#rymValidatorResult');
    let selected=null;
    const focus=()=>{input.value='';input.focus();out.className='rym-v-empty';out.innerHTML='<div class="rym-v-emptyicon">✓</div><h2>Listo para validar</h2><p>Ingresa una unidad, placa o Panapass.</p>'};
    const run=async value=>{
      out.className='rym-v-loading';out.innerHTML='<div class="rym-v-spinner"></div><h2>Validando fuentes…</h2><p>Control de Auto, Revisados, Panapass y GPS.</p>';
      try{
        const rows=typeof value==='object'?[value]:await w.RYM_VALIDATOR_SERVICES.search(value);
        if(!rows.length){out.className='rym-v-empty error';out.innerHTML='<div class="rym-v-emptyicon">!</div><h2>Unidad no encontrada</h2><p>Revisa la unidad, placa o Panapass e intenta nuevamente.</p>';return;}
        if(rows.length>1){out.className='rym-v-matches';out.innerHTML=`<h2>Selecciona una coincidencia</h2><p>${rows.length} unidades corresponden a tu búsqueda.</p><div class="rym-v-matchlist">${rows.map((r,i)=>`<button type="button" data-v-pick="${i}"><span><b>${esc(unitOf(r))}</b><small>${esc(r.empresa_duena||r.empresa||r.galera||'Sin empresa')}</small></span><strong>${esc(plateOf(r))}</strong></button>`).join('')}</div>`;out.querySelectorAll('[data-v-pick]').forEach(b=>b.onclick=()=>run(rows[Number(b.dataset.vPick)]));return;}
        selected=rows[0];renderLoading(out,selected);let completed=0;const result=await validate(selected,item=>{completed++;const card=out.querySelector('#rym-v-source-'+item.source);if(card)card.outerHTML=itemCard(item);const score=out.querySelector('.rym-v-progress b');if(score)score.innerHTML=completed+'<em>/4</em>'});out.className='';renderResult(out,result,selected);
        out.querySelector('[data-v-action="again"]').onclick=focus;
        out.querySelector('[data-v-action="refresh"]').onclick=()=>run(selected);
        out.querySelector('[data-v-action="control"]')?.addEventListener('click',()=>w.v70OpenControl?.());
      }catch(e){out.className='rym-v-empty error';out.innerHTML=`<div class="rym-v-emptyicon">!</div><h2>No se pudo completar</h2><p>${esc(e.message||e)}</p>`;}
    };
    form.onsubmit=e=>{e.preventDefault();const q=input.value.trim();if(q.length>=2)run(q)};
    host.querySelector('#rymValidatorBack').onclick=()=>{d.body.classList.remove('v172-validator');w.v36PortalHome?.()};
    if(seed){input.value=typeof seed==='string'?seed:unitOf(seed);await run(seed)}else input.focus();
  }
  async function enter(seed){
    if(!canAccess())throw Error('No tienes permiso para usar el Validador.');
    w.state.modules=['portal.validador'];w.state.active='portal.validador';
    if(typeof w.shell==='function')w.shell();
    return open(seed);
  }
  w.RYM_VALIDATOR=Object.freeze({canAccess,validate,open,enter,search:q=>w.RYM_VALIDATOR_SERVICES.search(q)});
  w.RYM_MODULES.register('validador',{open});
})(window,document);
