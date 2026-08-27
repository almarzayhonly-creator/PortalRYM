/* Portal RYM V169 SAFE cleanup
   Scope: Portal, Revisados, Control de Auto, Usuarios.
   GPS business logic and GPS runtime are intentionally untouched. */
(function () {
  'use strict';
  if (window.__RYM_V169_SAFE__) return;
  window.__RYM_V169_SAFE__ = true;

  const css = `
  /* V100 supersedes the old V99 priority card. Keep one source on screen. */
  body.v99-home:has(.v100-priority) .v99-hero .v99-priority{display:none!important}

  /* Stop historical layers from creating horizontal overflow. */
  body.v99-home,body.v66-revisados,body.v70-control,body.v70-admin{overflow-x:hidden!important}
  body.v99-home #app,body.v99-home .v101-shell,body.v99-home .v101-main,body.v99-home .v101-content,
  body.v66-revisados .v66-app,body.v66-revisados .v66-main,body.v66-revisados .v66-inner,
  body.v70-control .shell,body.v70-control .main,body.v70-control #view,
  body.v70-admin .v70-admin-app,body.v70-admin .v70-admin-main{min-width:0!important;max-width:100%!important}

  /* Login: historical mobile padding belongs to the authenticated mobile nav, not to login. */
  @media(max-width:820px){
    body:has(.login) {padding-bottom:0!important;background:#061A42!important}
    body:has(.login) #app{min-height:100dvh!important}
    body:has(.login) .login{min-height:100dvh!important;height:auto!important}
  }

  /* Portal */
  body.v99-home .v99-grid{align-items:stretch!important}
  body.v99-home .v99-module{min-width:0!important;display:flex!important;flex-direction:column!important}
  body.v99-home .v99-module>button{margin-top:auto!important}
  body.v99-home .v99-module p,body.v99-home .v99-module small,body.v99-home .v99-alert{overflow-wrap:anywhere}
  body.v99-home .v100-priority{margin-top:14px!important}

  /* Revisados */
  body.v66-revisados .v66-card,body.v66-revisados .v66-kpi,body.v66-revisados .v66-today,
  body.v66-revisados .v66-daily-layout,body.v66-revisados .v66-month-summary{min-width:0!important}
  body.v66-revisados .v66-table,body.v66-revisados .v66-daily-table,body.v66-revisados .v66-history-table,
  body.v66-revisados .v66-ops-table{max-width:100%!important;overflow-x:auto!important}

  /* Control de Auto */
  body.v70-control .v75-control-dashboard,body.v70-control .v75-control-hero,
  body.v70-control .v75-control-kpis,body.v70-control .v154-control-filters,
  body.v70-control .v154-cupos-tools,body.v70-control .v94-cupos,
  body.v70-control .v147-kpis{min-width:0!important;max-width:100%!important}
  body.v70-control .v75-control-kpi,body.v70-control .v147-kpi{min-width:0!important}
  body.v70-control input,body.v70-control select,body.v70-control button{max-width:100%}

  /* Usuarios */
  body.v70-admin .v70-panel,body.v70-admin .v70-panel-body,body.v70-admin #v70AdminDetail,
  body.v70-admin .v141-activity-wrap,body.v70-admin .v141-activity-table{min-width:0!important;max-width:100%!important}
  body.v70-admin .v70-project-block{max-width:100%!important;overflow-x:auto!important}
  body.v70-admin .v70-perm-head,body.v70-admin .v70-perm-row{min-width:520px}
  body.v70-admin .v141-activity-table .table-wrap{max-width:100%!important;overflow:auto!important}

  /* Safe rendering optimization: old off-screen dashboard cards need not be painted until visible. */
  @supports (content-visibility:auto){
    body.v99-home .v99-module,
    body.v66-revisados .v66-card,
    body.v70-control .v75-control-dashboard,
    body.v70-admin .v70-panel{content-visibility:auto;contain-intrinsic-size:auto 420px}
  }

  @media(max-width:1000px){
    body.v99-home .v99-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    body.v70-control .v75-control-kpis,body.v70-control .v147-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    body.v66-revisados .v66-daily-layout{grid-template-columns:minmax(0,1fr)!important}
    body.v66-revisados .v66-daily-sendbox{position:static!important}
  }
  @media(max-width:820px){
    body.v99-home .v99-grid{grid-template-columns:1fr!important}
    body.v99-home .v99-module{min-height:0!important}
    body.v70-control .v75-control-kpis,body.v70-control .v147-kpis{grid-template-columns:1fr 1fr!important}
    body.v70-admin .v70-admin-top{flex-wrap:wrap!important}
    body.v70-admin .v70-admin-top .badge{max-width:100%;white-space:normal!important}
    body.v70-admin .v141-activity-kpis{grid-template-columns:1fr 1fr!important}
  }
  @media(max-width:560px){
    body.v70-control .v75-control-kpis,body.v70-control .v147-kpis,
    body.v70-admin .v141-activity-kpis{grid-template-columns:1fr!important}
    body.v66-revisados .v66-daily-summary,body.v66-revisados .v66-month-summary{grid-template-columns:1fr!important}
  }`;

  function installStyle() {
    if (document.getElementById('rym-v169-safe-css')) return;
    const style = document.createElement('style');
    style.id = 'rym-v169-safe-css';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function removeDuplicatePriority() {
    if (!document.body || !document.body.classList.contains('v99-home')) return;
    if (!document.querySelector('.v100-priority')) return;
    document.querySelectorAll('.v99-hero .v99-priority').forEach((el) => {
      el.hidden = true;
      el.setAttribute('aria-hidden', 'true');
      el.style.display = 'none';
    });
  }

  installStyle();
  document.addEventListener('DOMContentLoaded', removeDuplicatePriority, { once: true });
  window.addEventListener('pageshow', removeDuplicatePriority);

  window.__RYM_V169_DIAGNOSTICS__ = {
    version: 'V169-SAFE',
    gpsUntouched: true,
    globalObserversUntouched: true,
    duplicatePriorityHidden: true,
    responsiveCleanup: true,
    mobileLoginBottomGapFixed: true
  };
})();
