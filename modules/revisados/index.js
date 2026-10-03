/* Portal RYM V171 - Revisados module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES)return;

  w.RYM_REVISADOS_BRIDGE={
    async load(){
      if(typeof w.v66PrefetchRevisados!=='function'){
        throw new Error('Revisados canonical data loader unavailable');
      }
      const data=await w.v66PrefetchRevisados();
      if(!data?.ok)throw new Error(data?.error||'No se pudo cargar Revisados');
      return data;
    },
    profile(){
      return (typeof w.state!=='undefined'&&w.state?.profile)?w.state.profile:null;
    }
  };

  w.RYM_MODULES.register('revisados',{
    open:function(){
      d.body.dataset.rymModule='revisados';
      if(typeof w.v60OpenRevisados!=='function')throw new Error('Revisados canonical entrypoint unavailable');
      return w.v60OpenRevisados();
    }
  });
})(window,document);
