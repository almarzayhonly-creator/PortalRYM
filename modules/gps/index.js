/* Portal RYM V171 - GPS module boundary */
(function(w,d){'use strict';if(!w.RYM_MODULES)return;w.RYM_MODULES.register('gps',{open:function(){d.body.dataset.rymModule='gps';if(typeof w.v113OpenGps!=='function')throw new Error('GPS canonical entrypoint unavailable');return w.v113OpenGps();}})})(window,document);
