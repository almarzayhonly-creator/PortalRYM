/* Portal RYM V172 clean - GPS module boundary */
(function(w,d){
  'use strict';
  if(!w.RYM_MODULES)return;
  w.RYM_MODULES.register('gps',{
    open:function(ctx={}){
      d.body.dataset.rymModule='gps';
      if(!w.RYM_GPS_APP||typeof w.RYM_GPS_APP.open!=='function')throw new Error('GPS app unavailable');
      return w.RYM_GPS_APP.open(ctx);
    }
  });
})(window,document);
