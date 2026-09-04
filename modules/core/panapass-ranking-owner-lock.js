/* Portal RYM Architecture V2 compatibility shim: ranking owner lock */
(function(d){'use strict';
if(window.__RYM_RANKING_OWNER_LOCK__)return;
const s=d.createElement('script');
s.src='/modules/panapass/ranking/owner-lock.js?v=172-pilot';
s.async=false;
(d.head||d.documentElement).appendChild(s);
})(document);
