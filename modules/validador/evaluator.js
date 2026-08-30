/* Portal RYM V172 — deterministic unit-validation outcome. */
(function(w){'use strict';
  const normal=v=>String(v||'').trim().toUpperCase();
  const isControlBlocked=s=>['CERRADA','CERRADO','CANIBALIZADA'].includes(normal(s));
  const item=(source,status,summary,details={})=>({source,status,summary,details});
  function evaluateUnitValidation(sources={}){
    const control=sources.control||item('control','incompleta','Pendiente de validación');
    const revisado=sources.revisado||item('revisado','incompleta','Pendiente de validación');
    const panapass=sources.panapass||item('panapass','incompleta','Pendiente de validación');
    const gps=sources.gps||item('gps','incompleta','Pendiente de validación');
    const all=[control,revisado,panapass,gps];
    if(isControlBlocked(control.details?.estado)||control.status==='bloqueada')return {status:'BLOQUEADA',label:'NO VALIDADA',summary:'Control de Auto bloquea la operación.',items:all};
    if(all.some(x=>x.status==='incompleta'||x.status==='no_disponible'))return {status:'INCOMPLETA',label:'INFORMACIÓN INCOMPLETA',summary:'Falta confirmar una o más fuentes.',items:all};
    if(all.some(x=>x.status==='alerta'))return {status:'ALERTA',label:'VALIDADA CON ALERTAS',summary:'La unidad requiere atención antes o durante la operación.',items:all};
    if(all.every(x=>x.status==='ok'))return {status:'OK',label:'UNIDAD VALIDADA',summary:'Lista para operar.',items:all};
    return {status:'INCOMPLETA',label:'INFORMACIÓN INCOMPLETA',summary:'No se pudo concluir la validación.',items:all};
  }
  w.RYM_VALIDATOR_EVALUATOR=Object.freeze({evaluateUnitValidation,item,normal,isControlBlocked});
})(window);
