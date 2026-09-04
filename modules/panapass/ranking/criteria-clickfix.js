/* Portal RYM - apply Ranking criterion immediately on click */
(function(w,d){'use strict';if(w.__RYM_RANKING_CRITERIA_CLICKFIX__)return;w.__RYM_RANKING_CRITERIA_CLICKFIX__=true;
let timer=0;
function trigger(){clearTimeout(timer);timer=setTimeout(()=>{const go=d.querySelector('#rrpGo');if(go&&!go.disabled)go.click()},0)}
d.addEventListener('click',e=>{const b=e.target?.closest?.('#rrpAmount,#rrpCount');if(!b)return;trigger()},true);
})(window,document);
