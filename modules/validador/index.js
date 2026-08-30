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

  async function validate(seed){
    if(!canAccess())throw Error('No tienes permiso para usar el Validador.');
    const control=await w.RYM_VALIDATOR_SERVICES.validatorControlAutoService(seed);
    const [revisado,panapass,gps]=await Promise.all([
      w.RYM_VALIDATOR_SERVICES.validatorRevisadosService(control),
      w.RYM_VALIDATOR_SERVICES.validatorPanapassService(control),
      w.RYM_VALIDATOR_SERVICES.validatorGpsService(control)
    ]);
    return w.RYM_VALIDATOR_EVALUATOR.evaluateUnitValidation({control,revisado,panapass,gps});
  }

  function itemCard(x){
    const t=tone(String(x.status||'').toUpperCase());
    const detail=x.source==='gps'?(x.details?.row?.razon||'GPS1 / GPS2 en paralelo'):
      x.source==='panapass'?(x.details?.panapass?`Cuenta ${x.details.panapass}`:'Consulta ENA'):
      x.source==='revisado'?(x.details?.estado||'Vigencia y bloqueos'):(x.details?.estado||'Estado operativo');
    return `<article class="rym-v-card ${t}"><div class="rym-v-cardtop"><span class="rym-v-icon">${esc(icon[x.source]||'•')}</span><span class="rym-v-state">${esc(String(x.status||'INCOMPLETA').toUpperCase())}</span></div><h3>${esc(sourceName[x.source]||x.source)}</h3><strong>${esc(x.summary)}</strong><small>${esc(detail)}</small></article>`;
  }

  function renderResult(out,result,row){
    const t=tone(result.status),unit=unitOf(row),plate=plateOf(row),control=result.items.find(x=>x.source==='control')?.details?.row||row;
    out.innerHTML=`<section class="rym-v-result ${t}"><div class="rym-v-verdict"><div><span class="rym-v-eyebrow">Resultado consolidado</span><h2>${esc(result.label)}</h2><p>${esc(result.summary)}</p></div><div class="rym-v-unit"><span>Unidad</span><b>${esc(unit)}</b><small>${esc(plate)} · ${esc(control.empresa_duena||control.empresa||control.galera||'Sin empresa')}</small></div></div><div class="rym-v-grid">${result.items.map(itemCard).join('')}</div><div class="rym-v-actions"><button type="button" class="rym-v-primary" data-v-action="again">Validar otra unidad</button><button type="button" class="rym-v-secondary" data-v-action="refresh">Actualizar fuentes</button><button type="button" class="rym-v-secondary" data-v-action="print">Imprimir resultado</button></div><p class="rym-v-stamp">Consultado ${esc(new Date().toLocaleString('es-PA'))}. Una fuente sin respuesta nunca se marca como correcta.</p></section>`;
  }

  async function open(seed){
    const host=d.querySelector('#view');if(!host)return validate(seed);
    if(!canAccess()){host.innerHTML='<div class="alert">No tienes permiso para usar el Validador.</div>';return;}
    d.body.classList.add('v172-validator');
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
        selected=rows[0];const result=await validate(selected);out.className='';renderResult(out,result,selected);
        out.querySelector('[data-v-action="again"]').onclick=focus;
        out.querySelector('[data-v-action="refresh"]').onclick=()=>run(selected);
        out.querySelector('[data-v-action="print"]').onclick=()=>w.print();
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
