/* Portal RYM V172 clean - canonical ENA balance consultation service */
(function(w){
  'use strict';
  if(w.RYM_ENA_SALDO)return;
  let base=null;const aroundHooks=[];
  function setBase(fn){if(typeof fn!=='function')throw new Error('ENA saldo base invalida');base=fn;return true}
  function around(fn){if(typeof fn!=='function')throw new Error('ENA saldo hook invalido');aroundHooks.push(fn);return()=>{const i=aroundHooks.indexOf(fn);if(i>=0)aroundHooks.splice(i,1)}}
  async function consultar(...args){
    if(typeof base!=='function')throw new Error('Consulta ENA no disponible');
    let run=(nextArgs=args)=>base.apply(w,nextArgs);
    for(const hook of aroundHooks){const previous=run;run=(nextArgs=args)=>hook(previous,nextArgs,{thisArg:w})}
    return run(args);
  }
  w.RYM_ENA_SALDO=Object.freeze({setBase,around,consultar});
  w.phase6ConsultarSaldoENA=function(...args){return consultar(...args)};
})(window);
