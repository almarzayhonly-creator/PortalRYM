/* Portal RYM - prevent legacy Ranking renderer from repainting over split criteria */
(function(w,d){'use strict';if(w.__RYM_RANKING_OWNER_LOCK__)return;w.__RYM_RANKING_OWNER_LOCK__=true;
let busy=false,timer=0;
function active(){try{return state?.active==='ranking'}catch(_){return false}}
function view(){return d.querySelector('#view')}
function addLegacyMarker(root){if(!root||root.querySelector('[data-rym-final="ranking"]'))return;const x=d.createElement('i');x.setAttribute('data-rym-final','ranking');x.hidden=true;root.prepend(x)}
async function enforce(){if(busy||!active())return;const v=view();if(!v)return;const current=v.querySelector('[data-rym-final="ranking-criteria"]');if(current){addLegacyMarker(current);return}if(typeof w.ranking!=='function')return;busy=true;try{await w.ranking(v);const root=v.querySelector('[data-rym-final="ranking-criteria"]');if(root)addLegacyMarker(root)}catch(_){}finally{busy=false}}
function schedule(){clearTimeout(timer);timer=setTimeout(enforce,20)}
new MutationObserver(schedule).observe(d.documentElement,{childList:true,subtree:true});
d.addEventListener('click',e=>{if(e.target?.closest?.('[data-m="ranking"]')){setTimeout(enforce,0);setTimeout(enforce,100)}},true);
setInterval(enforce,700);
schedule();
})(window,document);
