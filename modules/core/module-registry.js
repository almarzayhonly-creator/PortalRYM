/* Portal RYM V171 modular runtime */
(function(w,d){
  'use strict';
  if(w.RYM_MODULES) return;
  const registry=new Map();
  const loaded=new Set();
  let active='';

  function register(name,definition){
    if(!name||!definition) throw new Error('Modulo invalido');
    registry.set(String(name),definition);
  }

  async function unmount(name){
    const id=String(name||active||'');
    if(!id)return;
    const mod=registry.get(id);
    if(mod&&typeof mod.unmount==='function') await mod.unmount();
    if(w.RYM_STYLES&&typeof w.RYM_STYLES.deactivate==='function') w.RYM_STYLES.deactivate(id);
    if(d.body?.dataset.rymModule===id) delete d.body.dataset.rymModule;
    if(active===id) active='';
  }

  async function open(name,ctx){
    const id=String(name);
    const mod=registry.get(id);
    if(!mod) throw new Error('Modulo no registrado: '+id);
    if(active&&active!==id) await unmount(active);
    if(w.RYM_STYLES&&typeof w.RYM_STYLES.activate==='function') await w.RYM_STYLES.activate(id);
    if(!loaded.has(id)&&typeof mod.init==='function'){
      await mod.init(ctx||{});
      loaded.add(id);
    }
    const result=typeof mod.open==='function'?await mod.open(ctx||{}):undefined;
    active=id;
    if(d.body) d.body.dataset.rymModule=id;
    return result;
  }

  function has(name){return registry.has(String(name))}
  function list(){return Array.from(registry.keys())}
  function current(){return active}

  w.RYM_MODULES=Object.freeze({register,open,unmount,has,list,current});
})(window,document);
