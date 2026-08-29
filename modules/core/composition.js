/* Portal RYM V172 clean - stable Core service composition, no monkey patch chains */
(function(w){
  'use strict';
  if(w.RYM_CORE_COMPOSITION)return;
  const names=['req','rpc','clearSession','login','loadApp','shell'];
  const base=Object.create(null),hooks=new Map();
  for(const name of names){if(typeof w[name]==='function')base[name]=w[name];hooks.set(name,[])}
  function around(name,fn){
    if(!names.includes(name)||typeof fn!=='function')throw new Error('Hook Core invalido: '+name);
    const list=hooks.get(name);list.push(fn);return()=>{const i=list.indexOf(fn);if(i>=0)list.splice(i,1)};
  }
  function ingest(){
    const pending=w.__RYM_CORE_PENDING_AROUND__||[];
    while(pending.length){const [name,fn]=pending.shift();around(name,fn)}
  }
  function invoke(name,thisArg,args){
    ingest();const original=base[name];if(typeof original!=='function')throw new Error('Servicio Core no disponible: '+name);
    let run=(nextArgs=args)=>original.apply(thisArg,nextArgs);
    for(const hook of hooks.get(name)||[]){const previous=run;run=(nextArgs=args)=>hook(previous,nextArgs,{name,thisArg});}
    return run(args);
  }
  function install(name){
    if(typeof base[name]!=='function')return;
    const stable=function(...args){return invoke(name,this,args)};
    Object.defineProperty(stable,'__rymCoreStable',{value:true});
    w[name]=stable;
  }
  names.forEach(install);
  w.RYM_CORE_COMPOSITION=Object.freeze({around,invoke,names:()=>names.slice()});
  ingest();
})(window);
