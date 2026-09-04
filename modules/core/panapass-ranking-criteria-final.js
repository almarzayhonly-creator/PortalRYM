/* Architecture V2 compatibility shim: Panapass ranking criteria moved out of core. */
(function(w,d){'use strict';
if(w.__RYM_RANKING_CRITERIA_FINAL_V3__)return;
const s=d.createElement('script');
s.src='/modules/panapass/ranking/criteria-final.js?v=172-pilot';
s.async=false;
(d.head||d.documentElement).appendChild(s);
})(window,document);
