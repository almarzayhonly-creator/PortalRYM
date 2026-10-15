/* Bound read-only project loads, including stalled responses and their bodies. */
(function(w){
  w.rymProjectRead=function(read,timeoutMs=30000){
    const controller=new AbortController();let timer;
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{
      reject(Error('La consulta tardó demasiado. Intenta actualizar nuevamente.'));
      controller.abort();
    },timeoutMs)});
    return Promise.race([Promise.resolve().then(()=>read(controller.signal)),timeout])
      .finally(()=>clearTimeout(timer));
  };
})(window);
