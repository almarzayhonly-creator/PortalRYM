/* Panapass sandbox V2: preview-only bootstrap. */
(function(w,d){'use strict';
  if(w.__PANAPASS_SANDBOX_V2__)return;
  w.__PANAPASS_SANDBOX_V2__=true;
  w.RYM_PANAPASS_DASHBOARD_V2_ENABLED=true;
  w.PANAPASS_SANDBOX_V2=Object.freeze({version:'v2',modules:['dashboard','galeras','ranking']});
  const mark=()=>{if(d.querySelector('.pps-sandbox-badge'))return;d.body.dataset.panapassSandbox='v2';const badge=d.createElement('div');badge.className='pps-sandbox-badge';badge.textContent='PANAPASS · SANDBOX V2';d.body.appendChild(badge)};
  d.readyState==='loading'?d.addEventListener('DOMContentLoaded',mark,{once:true}):mark();
})(window,document);
