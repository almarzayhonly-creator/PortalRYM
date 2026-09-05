/* Portal RYM - Panapass Dashboard V2 Clean Admin/Gerente view. */
(function(w){
  'use strict';
  const V=w.RYM_PANAPASS_CLEAN_VIEWS||(w.RYM_PANAPASS_CLEAN_VIEWS={});
  V.galera=function(vm){const C=w.RYM_PANAPASS_CLEAN_COMPONENTS;return `<main class="rym-pdc rym-pdc-galera-view" data-pdc-role="${C.esc(vm.role)}">${C.header(vm,'Dashboard de galera',`${vm.galera||'Tu galera'} · operacion y comparacion resumida`)}${C.kpiStrip(vm)}<div class="rym-pdc-two-col rym-pdc-priority">${C.pendingPanel(vm)}${C.companyComparison(vm)}</div><div class="rym-pdc-two-col rym-pdc-galera-main"><section class="rym-pdc-card rym-pdc-ranking-section">${C.sectionTitle(`Supervisoras de ${vm.galera||'tu galera'}`,'Ranking local completo.')} ${C.rankTable(vm.ranking.local,{position:'posicion_galera'})}</section>${C.trendPanel(`Tendencia · ${vm.galera||'galera'}`,vm.scopeTrend)}</div>${C.quickActions(vm)}</main>`};
})(window);
