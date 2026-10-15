/* Bounded, coalesced reads for the online payments screen. No result cache. */
(function(w){
  w.rymPagosRead=function(read,timeoutMs=20000){
    let pending=null;
    return function(){
      if(pending)return pending;
      const controller=new AbortController();
      let timer;
      const timeout=new Promise((_,reject)=>{
        timer=setTimeout(()=>{
          reject(Error('La lectura tardó demasiado. Pulsa Recargar para reintentar.'));
          controller.abort();
        },timeoutMs);
      });
      pending=Promise.race([Promise.resolve().then(()=>read(controller.signal)),timeout])
        .finally(()=>{clearTimeout(timer);pending=null});
      return pending;
    };
  };
})(window);
