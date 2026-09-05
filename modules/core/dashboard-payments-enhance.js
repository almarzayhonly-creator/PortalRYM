/* Portal RYM Architecture V2 - compatibility shim only */
(function(w,d){'use strict';
  if(w.__RYM_ADMIN_DASH_V12__) return;

  // Architecture V2 owns the dashboard whenever its loader is present.
  // Do not race it with a second request carrying an old fixed cache token.
  if(d.querySelector('#rym-v171-loader')) return;

  const base='/modules/panapass/dashboard/index.js';
  if(d.querySelector(`script[src^="${base}"]`)) return;
  const build=w.RYM_BUILD_VERSION||'173-supervisor';
  const s=d.createElement('script');
  s.src=base+'?v='+encodeURIComponent(build);
  s.async=false;
  (d.head||d.documentElement).appendChild(s);
})(window,document);
