/* Architecture V2 compatibility shim: Panapass ranking clickfix moved out of core. */
(function(w,d){'use strict';
if(w.__RYM_RANKING_CRITERIA_CLICKFIX__)return;
const s=d.createElement('script');
s.src='/modules/panapass/ranking/criteria-clickfix.js?v=172-pilot';
s.async=false;
(d.head||d.documentElement).appendChild(s);
})(window,document);
