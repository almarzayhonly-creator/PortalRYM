/* Portal RYM V172 clean - canonical portal module */
(function(w,d){
 'use strict';
 if(!w.RYM_MODULES||w.RYM_MODULES.has('portal'))return;
 w.RYM_MODULES.register('portal',{
   open:async function(){
     d.body.dataset.rymModule='portal';
     if(typeof w.v36PortalHome!=='function')throw new Error('Portal home renderer unavailable');
     const out=await w.v36PortalHome();
     setTimeout(()=>w.RYM_HOME_V154?.decorate?.(),50);
     return out;
   }
 });
})(window,document);
