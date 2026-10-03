<script setup lang="ts">
defineProps<{
  total: number
  vigentes: number
  pendientes: number
  cambiosColor: number
  incidencias: number
}>()
</script>

<template>
  <section class="summary">
    <div class="summary-main">
      <span class="kicker">FLOTA EN TU ALCANCE</span>
      <div class="total-row">
        <strong>{{ total }}</strong>
        <div>
          <b>unidades</b>
          <span>filtradas actualmente</span>
        </div>
      </div>
      <div class="coverage-line">
        <div>
          <span>Vigentes</span>
          <b>{{ vigentes }}</b>
        </div>
        <div class="track"><i :style="{ width: total ? Math.round((vigentes/total)*100) + '%' : '0%' }"></i></div>
        <strong>{{ total ? Math.round((vigentes/total)*100) : 0 }}%</strong>
      </div>
    </div>

    <div class="summary-grid">
      <article class="metric pending">
        <span>Pendientes</span>
        <strong>{{ pendientes }}</strong>
        <small>gestión del ciclo</small>
      </article>
      <article class="metric color">
        <span>Cambio de color</span>
        <strong>{{ cambiosColor }}</strong>
        <small>nuevo revisado</small>
      </article>
      <article class="metric incident">
        <span>Incidencias reales</span>
        <strong>{{ incidencias }}</strong>
        <small>requieren revisión</small>
      </article>
    </div>
  </section>
</template>

<style scoped>
.summary{display:grid;grid-template-columns:1.2fr 1.8fr;gap:12px}
.summary-main,.metric{background:#fff;border:1px solid #e2e8f0;border-radius:16px}
.summary-main{padding:20px}
.kicker{display:block;font-size:10px;font-weight:900;letter-spacing:.13em;color:#4772b8}
.total-row{display:flex;align-items:end;gap:12px;margin-top:8px}
.total-row>strong{font-size:48px;line-height:.9;letter-spacing:-.06em;color:#0f172a}
.total-row div{display:grid;gap:2px;padding-bottom:3px}.total-row b{font-size:13px}.total-row span{font-size:11px;color:#7b8aa0}
.coverage-line{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;margin-top:18px}.coverage-line>div:first-child{display:grid}.coverage-line span{font-size:10px;color:#7b8aa0}.coverage-line b{font-size:13px}.coverage-line>strong{font-size:13px;color:#16a34a}.track{height:6px;border-radius:999px;background:#edf2f7;overflow:hidden}.track i{display:block;height:100%;background:#16a34a;border-radius:999px}
.summary-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.metric{position:relative;overflow:hidden;padding:18px}.metric:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px}.metric.pending:before{background:#dc2626}.metric.color:before{background:#ea580c}.metric.incident:before{background:#dc2626}.metric span{display:block;font-size:11px;color:#64748b;font-weight:800}.metric strong{display:block;margin:5px 0 3px;font-size:31px;letter-spacing:-.04em}.metric small{color:#94a3b8}
@media(max-width:900px){.summary{grid-template-columns:1fr}.summary-grid{grid-template-columns:1fr 1fr 1fr}}
@media(max-width:650px){.summary-grid{grid-template-columns:1fr}}
</style>
