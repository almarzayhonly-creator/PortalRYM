/* Portal RYM V172 clean - canonical module registry */
(function(w){
  'use strict';
  if(w.RYM_MODULES) return;

  const registry=new Map();
  const initialized=new Set();

  function normalize(name){
    return String(name||'').trim().toLowerCase();
  }

  function register(name,definition){
    const key=normalize(name);
    if(!key||!definition) throw new Error('Modulo invalido');
    if(registry.has(key)) throw new Error('Modulo duplicado: '+key);
    registry.set(key,Object.freeze({...definition,name:key}));
    return key;
  }

  async function open(name,ctx){
    const key=normalize(name);
    const mod=registry.get(key);
    if(!mod) throw new Error('Modulo no registrado: '+key);
    if(!initialized.has(key)&&typeof mod.init==='function'){
      await mod.init(ctx||{});
      initialized.add(key);
    }
    if(typeof mod.open!=='function') throw new Error('Modulo sin open(): '+key);
    return mod.open(ctx||{});
  }

  function has(name){return registry.has(normalize(name))}
  function get(name){return registry.get(normalize(name))||null}
  function list(){return Array.from(registry.keys())}
  function resetForQa(){initialized.clear()}

  w.RYM_MODULES=Object.freeze({register,open,has,get,list,resetForQa});
})(window);
