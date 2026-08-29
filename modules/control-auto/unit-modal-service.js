/* Portal RYM V172 clean - canonical Control unit modal composition */
(function(w){
  'use strict';
  if(w.RYM_CONTROL_UNIT_MODAL)return;
  const base=typeof w.phase6OpenUnit==='function'?w.phase6OpenUnit:null;
  const aroundHooks=[];
  function around(fn){if(typeof fn!=='function')throw new Error('Control unit modal hook invalido');aroundHooks.push(fn);return()=>{const i=aroundHooks.indexOf(fn);if(i>=0)aroundHooks.splice(i,1)}}
  function open(...args){
    if(typeof base!=='function')throw new Error('Control unit modal base unavailable');
    let run=(nextArgs=args)=>base.apply(w,nextArgs);
    for(const hook of aroundHooks){const previous=run;run=(nextArgs=args)=>hook(previous,nextArgs,{thisArg:w})}
    return run(args);
  }
  w.RYM_CONTROL_UNIT_MODAL=Object.freeze({around,open});
  w.phase6OpenUnit=function(...args){return open(...args)};
})(window);
