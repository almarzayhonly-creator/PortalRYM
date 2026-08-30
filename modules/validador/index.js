/* Portal RYM V172 — independent validator module boundary. */
(function(w){'use strict';
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
  w.RYM_VALIDATOR=Object.freeze({canAccess,validate,search:q=>w.RYM_VALIDATOR_SERVICES.search(q)});
  w.RYM_MODULES.register('validador',{open:validate});
})(window);
