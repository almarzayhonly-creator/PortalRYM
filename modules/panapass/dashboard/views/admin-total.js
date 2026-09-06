/* Portal RYM - Panapass Dashboard V2 Clean Admin Total view. */
(function(w){
  'use strict';
  const V=w.RYM_PANAPASS_DASHBOARD_V2_VIEWS||(w.RYM_PANAPASS_DASHBOARD_V2_VIEWS={});
  V['admin-total']=function(vm){const C=w.RYM_PANAPASS_CLEAN_COMPONENTS;return `<main class="rym-pdc rym-pdc-admin-total" data-pdc-role="ADMIN_TOTAL">${C.header(vm,'Dashboard Panapass','Empresa completa · control ejecutivo y operativo')}${C.kpiStrip(vm)}<div class="rym-pdc-two-col rym-pdc-priority">${C.performancePanel(vm)}${C.pendingPanel(vm)}</div>${C.galeraGrid(vm)}<section class="rym-pdc-card rym-pdc-ranking-section">${C.sectionTitle('Ranking de supervisoras · empresa','Posicion global y resultado del dia.')} ${C.rankTable(vm.ranking.global,{position:'posicion_global'})}</section><div class="rym-pdc-two-col rym-pdc-bottom">${C.trendPanel('Tendencia empresa',vm.scopeTrend)}${C.quickActions(vm)}</div></main>`};
})(window);
