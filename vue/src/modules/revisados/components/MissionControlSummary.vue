<script setup lang="ts">
defineProps<{ total:number; vigentes:number; pendientes:number; cambiosColor:number; incidencias:number }>()
</script>

<template>
  <section class="summary">
    <article class="coverage">
      <div class="coverage-copy">
        <span class="kicker">COBERTURA DEL ALCANCE</span>
        <div class="big"><strong>{{ total }}</strong><div><b>unidades</b><small>{{ vigentes }} vigentes</small></div></div>
      </div>
      <div class="coverage-meter">
        <strong>{{ total ? Math.round((vigentes/total)*100) : 0 }}%</strong>
        <div class="track"><i :style="{width:total ? Math.round((vigentes/total)*100)+'%' : '0%'}"></i></div>
        <span>cobertura filtrada</span>
      </div>
    </article>

    <article class="attention">
      <div class="attention-item pending">
        <span>PENDIENTE DE CICLO</span><strong>{{ pendientes }}</strong><small>gestión operativa</small>
      </div>
      <div class="divider"></div>
      <div class="attention-item color">
        <span>CAMBIO DE COLOR</span><strong>{{ cambiosColor }}</strong><small>nuevo revisado</small>
      </div>
      <div class="divider"></div>
      <div class="attention-item incident">
        <span>INCIDENCIAS REALES</span><strong>{{ incidencias }}</strong><small>bloqueos o alertas</small>
      </div>
    </article>
  </section>
</template>

<style scoped>
.summary{display:grid;grid-template-columns:1.15fr 1.85fr;gap:10px}
.coverage,.attention{border:1px solid #e2e8f0;border-radius:15px;background:#fff}
.coverage{display:grid;grid-template-columns:1fr 150px;gap:18px;align-items:center;padding:18px}
.kicker{font-size:9px;font-weight:900;letter-spacing:.14em;color:#0062ff}.big{display:flex;align-items:end;gap:10px;margin-top:6px}.big>strong{font-size:43px;line-height:.9;letter-spacing:-.06em}.big div{display:grid;padding-bottom:2px}.big b{font-size:12px}.big small{font-size:10px;color:#94a3b8}
.coverage-meter{display:grid;gap:5px}.coverage-meter>strong{font-size:25px;letter-spacing:-.04em;color:#16a34a}.coverage-meter>span{font-size:9px;color:#94a3b8}.track{height:6px;border-radius:999px;background:#e9eef5;overflow:hidden}.track i{display:block;height:100%;border-radius:999px;background:#16a34a}
.attention{display:grid;grid-template-columns:1fr 1px 1fr 1px 1fr;padding:0 16px;align-items:stretch}.attention-item{display:grid;align-content:center;padding:16px 14px}.attention-item span{font-size:9px;font-weight:900;letter-spacing:.08em;color:#64748b}.attention-item strong{margin:3px 0 1px;font-size:30px;letter-spacing:-.05em}.attention-item small{font-size:10px;color:#94a3b8}.pending strong{color:#0062ff}.color strong{color:#ea580c}.incident strong{color:#dc2626}.divider{width:1px;background:#edf2f7;margin:14px 0}
@media(max-width:900px){.summary{grid-template-columns:1fr}.attention{grid-template-columns:1fr 1px 1fr 1px 1fr}}@media(max-width:620px){.coverage{grid-template-columns:1fr}.attention{grid-template-columns:1fr}.divider{display:none}}
</style>
