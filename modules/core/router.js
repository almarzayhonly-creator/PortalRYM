/* Portal RYM V172 clean - canonical application router */
(function(w,d){
  'use strict';
  if(w.RYM_ROUTER) return;

  let current=null;
  let navigating=false;
  const listeners=new Set();

  function normalize(name){return String(name||'').trim().toLowerCase()}
  function onChange(fn){if(typeof fn!=='function')return()=>{};listeners.add(fn);return()=>listeners.delete(fn)}
  function emit(detail){for(const fn of listeners){try{fn(detail)}catch(_){}}}

  async function open(name,ctx={}){
    const target=normalize(name);
    if(!target) throw new Error('Ruta invalida');
    if(navigating) return false;
    if(!w.RYM_MODULES?.has(target)) throw new Error('Modulo no registrado: '+target);
    navigating=true;
    try{
      const previous=current;
      d.body.dataset.rymModule=target;
      await w.RYM_MODULES.open(target,{...ctx,from:previous,to:target});
      current=target;
      emit(Object.freeze({from:previous,to:target}));
      return true;
    }finally{
      navigating=false;
    }
  }

  async function home(ctx={}){
    if(w.RYM_MODULES?.has('portal')) return open('portal',ctx);
    current='portal';
    d.body.dataset.rymModule='portal';
    emit(Object.freeze({from:null,to:'portal'}));
    return true;
  }

  function active(){return current}
  function busy(){return navigating}

  w.RYM_ROUTER=Object.freeze({open,home,active,busy,onChange});
})(window,document);
