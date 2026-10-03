<script setup lang="ts">
defineProps<{ total:number; vigentes:number; pendientes:number; cambiosColor:number; incidencias:number }>()
</script>

<template>
  <section class="summary">
    <article class="metric-card coverage">
      <div class="metric-top"><span>Unidades en tu alcance</span><span class="icon blue">▣</span></div>
      <strong>{{ total }}</strong>
      <small>{{ vigentes }} al día</small>
      <div class="meter-row"><div class="track"><i :style="{width:total ? Math.round((vigentes/total)*100)+'%' : '0%'}"></i></div><b>{{ total ? Math.round((vigentes/total)*100) : 0 }}%</b></div>
    </article>

    <article class="metric-card">
      <div class="metric-top"><span>Vigentes</span><span class="icon green">✓</span></div>
      <strong>{{ vigentes }}</strong>
      <small>Ciclo cubierto</small>
      <div class="footer-note success">Cobertura actual</div>
    </article>

    <article class="metric-card">
      <div class="metric-top"><span>Pendientes ahora</span><span class="icon orange">!</span></div>
      <strong>{{ pendientes }}</strong>
      <small>Requieren gestión</small>
      <div class="footer-note">Dentro del filtro activo</div>
    </article>

    <article class="metric-card">
      <div class="metric-top"><span>Cambio de color</span><span class="icon amber">↻</span></div>
      <strong>{{ cambiosColor }}</strong>
      <small>Subconjunto de pendientes</small>
      <div class="footer-note warning">Nuevo revisado requerido</div>
    </article>

    <article class="metric-card">
      <div class="metric-top"><span>Alertas reales</span><span class="icon red">⚠</span></div>
      <strong>{{ incidencias }}</strong>
      <small>Bloqueos o alertas</small>
      <div class="footer-note danger">Revisar detalle</div>
    </article>
  </section>
</template>

<style scoped>
.summary{display:grid;grid-template-columns:1.15fr repeat(4,1fr);gap:10px}
.metric-card{min-width:0;padding:17px 18px 14px;border:1px solid #e0e5ec;border-radius:13px;background:#fff;box-shadow:0 2px 10px rgba(16,24,40,.025)}
.metric-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.metric-top>span:first-child{font-size:10px;font-weight:800;color:#5f6d82}.icon{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;font-size:12px;font-weight:900}.icon.blue{background:#edf5ff;color:#0062ff}.icon.green{background:#ebfaf3;color:#13a36e}.icon.orange{background:#fff4ea;color:#d8650c}.icon.amber{background:#fff7e7;color:#d98800}.icon.red{background:#fff0f0;color:#dc2626}
.metric-card>strong{display:block;margin:12px 0 4px;font-size:31px;line-height:1;letter-spacing:-.045em;color:#17243a}.metric-card>small{display:block;color:#98a3b3;font-size:10px}.footer-note{margin-top:14px;padding-top:9px;border-top:1px solid #edf0f4;font-size:9px;color:#69778b}.footer-note.success{color:#15966a}.footer-note.warning{color:#c56e12}.footer-note.danger{color:#c73b3b}
.meter-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-top:14px}.meter-row b{font-size:10px;color:#16a34a}.track{height:5px;border-radius:999px;background:#e9edf3;overflow:hidden}.track i{display:block;height:100%;border-radius:999px;background:#16a34a}
@media(max-width:1150px){.summary{grid-template-columns:repeat(2,minmax(0,1fr))}.coverage{grid-column:span 2}}@media(max-width:650px){.summary{grid-template-columns:1fr}.coverage{grid-column:auto}}
</style>
