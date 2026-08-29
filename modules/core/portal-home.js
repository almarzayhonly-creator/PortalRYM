/* Portal RYM V172 clean - canonical Portal Home owner */
(function(w){
  'use strict';
  if(w.RYM_PORTAL_HOME)return;
  let base=null;
  const aroundHooks=[];
  function setBase(fn){if(typeof fn!=='function')throw new Error('Portal Home base invalido');base=fn;return true}
  function around(fn){if(typeof fn!=='function')throw new Error('Portal Home hook invalido');aroundHooks.push(fn);return()=>{const i=aroundHooks.indexOf(fn);if(i>=0)aroundHooks.splice(i,1)}}
  function ingest(){
    if(typeof w.__RYM_PORTAL_HOME_BASE__==='function'){setBase(w.__RYM_PORTAL_HOME_BASE__);delete w.__RYM_PORTAL_HOME_BASE__}
    const pending=w.__RYM_PORTAL_HOME_PENDING_AROUND__||[];while(pending.length)around(pending.shift());
  }
  async function open(...args){
    ingest();if(typeof base!=='function')throw new Error('Portal Home renderer unavailable');
    let run=(nextArgs=args)=>base.apply(w,nextArgs);
    for(const hook of aroundHooks){const previous=run;run=(nextArgs=args)=>hook(previous,nextArgs,{thisArg:w});}
    return run(args);
  }
  w.RYM_PORTAL_HOME=Object.freeze({setBase,around,open});
  w.v36PortalHome=function(...args){return open(...args)};
  ingest();
})(window);
