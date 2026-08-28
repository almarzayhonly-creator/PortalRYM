/* Portal RYM V171 - Panapass module boundary */
(function(w,d){'use strict';if(!w.RYM_MODULES)return;w.RYM_MODULES.register('panapass',{open:function(){d.body.dataset.rymModule='panapass';if(typeof w.v70OpenPanapass!=='function')throw new Error('Panapass canonical entrypoint unavailable');return w.v70OpenPanapass();}})})(window,document);
