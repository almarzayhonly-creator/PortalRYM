/* Portal RYM V171 modular runtime */
(function(w){
  'use strict';
  if(w.RYM_MODULES) return;
  const registry=new Map();
  const loaded=new Set();

  function register(name,definition){
    if(!name||!definition) throw new Error('Modulo invalido');
    registry.set(String(name),definition);
  }

  async function open(name,ctx){
    const mod=registry.get(String(name));
    if(!mod) throw new Error('Modulo no registrado: '+name);
    if(!loaded.has(name)&&typeof mod.init==='function'){
      await mod.init(ctx||{});
      loaded.add(name);
    }
    if(typeof mod.open==='function') return mod.open(ctx||{});
  }

  function has(name){return registry.has(String(name))}
  function list(){return Array.from(registry.keys())}

  w.RYM_MODULES=Object.freeze({register,open,has,list});
})(window);
