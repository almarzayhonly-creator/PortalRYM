/* Portal RYM V172 — independent validator module boundary. */
(function(w,d){'use strict';
  if(!w.RYM_MODULES||w.RYM_MODULES.has('validador'))return;
  const modules=()=>Array.isArray(w.state?.allModules)&&w.state.allModules.length?w.state.allModules:(w.state?.modules||[]);
  const canAccess=()=>modules().map(String).includes('portal.validador');
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
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const statusClass=s=>s==='OK'?'is-ok':s==='BLOQUEADA'?'is-blocked':s==='ALERTA'?'is-alert':'is-incomplete';
  async function open(seed){
    const host=d.querySelector('#view');if(!host)return validate(seed);
    if(!canAccess()){host.innerHTML='<div class="alert">No tienes permiso para usar el Validador.</div>';return;}
    host.innerHTML='<section class="rym-validator"><h2>Validador de unidad</h2><p class="muted">Consulta Control de Auto, Revisado, Panapass y GPS sin asumir estados positivos.</p><form id="rymValidatorForm" class="section-tools"><div class="field"><label>Unidad, placa o Panapass</label><input id="rymValidatorQuery" required autocomplete="off" placeholder="Ej. P393, placa o Panapass"></div><button>Validar unidad</button></form><div id="rymValidatorResult" class="card">Ingresa una unidad para validar.</div></section>';
    const form=host.querySelector('#rymValidatorForm'),out=host.querySelector('#rymValidatorResult');
    const run=async term=>{out.textContent='Validando fuentes…';try{const rows=await w.RYM_VALIDATOR_SERVICES.search(term);if(!rows.length){out.innerHTML='<div class="alert">Unidad inexistente.</div>';return;}if(rows.length>1){out.innerHTML='<div class="card">Varias coincidencias: '+rows.map((r,i)=>`<button class="soft-btn" data-rym-pick="${i}">${esc(r.unidad||'—')} · ${esc(r.placa_unica||r.placa||'—')}</button>`).join(' ')+'</div>';out.querySelectorAll('[data-rym-pick]').forEach(b=>b.onclick=()=>run(rows[Number(b.dataset.rymPick)]));return;}const result=await validate(rows[0]);out.innerHTML=`<h3 class="${statusClass(result.status)}">${esc(result.label)}</h3><p>${esc(result.summary)}</p><div class="kpis">${result.items.map(x=>`<div class="kpi"><span>${esc(x.source)}</span><strong>${esc(x.summary)}</strong><small>${esc(x.status)}</small></div>`).join('')}</div>`;}catch(e){out.innerHTML=`<div class="alert">${esc(e.message||e)}</div>`;}};
    form.onsubmit=e=>{e.preventDefault();run(host.querySelector('#rymValidatorQuery').value.trim())};
    if(seed)await run(seed);
  }
  w.RYM_VALIDATOR=Object.freeze({canAccess,validate,open,search:q=>w.RYM_VALIDATOR_SERVICES.search(q)});
  w.RYM_MODULES.register('validador',{open});
})(window,document);
