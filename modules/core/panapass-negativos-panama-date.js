/* Portal RYM Architecture V2 - compatibility shim only */
(function(w,d){'use strict';
  if(w.__RYM_NEGATIVOS_PANAMA_DATE_V2__) return;
  const src='/modules/panapass/negativos/panama-date.js?v=172-pilot';
  if(d.querySelector(`script[src^="${src.split('?')[0]}"]`)) return;
  const s=d.createElement('script');
  s.src=src;
  s.async=false;
  (d.head||d.documentElement).appendChild(s);
})(window,document);
