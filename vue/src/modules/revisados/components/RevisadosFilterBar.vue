<script setup lang="ts">
import type { RevisadoEstado, RevisadosFilters } from '../types/revisados.types'

const model = defineModel<RevisadosFilters>({ required: true })
defineProps<{ galeras: string[]; supervisoras: string[] }>()

const estadoOptions: { value: RevisadoEstado; label: string }[] = [
  { value: 'vigente', label: 'Vigente' },
  { value: 'pendiente_ciclo', label: 'Pendiente por ciclo' },
  { value: 'pendiente_cambio_color', label: 'Cambio de color' },
  { value: 'incidencia', label: 'Incidencia' },
]
function toggle<T>(values:T[],value:T){return values.includes(value)?values.filter(x=>x!==value):[...values,value]}
</script>

<template>
<section class="filters" aria-label="Filtros globales de revisados">
  <div class="filter-row">
    <label class="search"><span>⌕</span><input v-model="model.search" type="search" placeholder="Filtrar unidad, placa, chasis o supervisora…"><kbd>ESC</kbd></label>
    <div class="selector"><small>GALERA OPERATIVA</small><div class="chips compact"><button v-for="g in galeras" :key="g" type="button" :aria-pressed="model.galeras.includes(g)" @click="model.galeras=toggle(model.galeras,g)">{{g}}</button></div></div>
    <div class="selector"><small>SUPERVISORA TITULAR</small><div class="chips compact scrollable"><button v-for="s in supervisoras" :key="s" type="button" :aria-pressed="model.supervisoras.includes(s)" @click="model.supervisoras=toggle(model.supervisoras,s)">{{s}}</button></div></div>
  </div>
  <div class="status-row">
    <div><span>FILTROS DE ESTADO LEGAL & OPERACIONAL</span><small>Selección múltiple en tiempo real</small></div>
    <div class="chips status-chips"><button v-for="o in estadoOptions" :key="o.value" type="button" :data-status="o.value" :aria-pressed="model.estados.includes(o.value)" @click="model.estados=toggle(model.estados,o.value)"><i></i>{{o.label}}</button></div>
  </div>
</section>
</template>

<style scoped>
.filters{padding:14px 16px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;box-shadow:0 2px 10px rgba(15,23,42,.02)}.filter-row{display:grid;grid-template-columns:minmax(260px,1.25fr) minmax(220px,.8fr) minmax(260px,1fr);gap:10px;align-items:stretch}.search,.selector{min-width:0;display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc}.search>span{font-size:15px;color:#94a3b8}.search input{min-width:0;flex:1;border:0;outline:0;background:transparent;font-size:11px;color:#0f172a}.search kbd{padding:3px 5px;border:1px solid #e2e8f0;border-radius:4px;background:#fff;color:#94a3b8;font:700 8px/1 "JetBrains Mono",monospace}.selector{display:grid;align-content:center;gap:5px}.selector small{font-size:8px;font-weight:900;letter-spacing:.07em;color:#94a3b8}.chips{display:flex;gap:5px;flex-wrap:wrap}.compact{max-height:31px;overflow:auto}.scrollable{padding-right:2px}.chips button{display:inline-flex;align-items:center;gap:5px;min-height:26px;padding:0 8px;border:1px solid #e2e8f0!important;border-radius:6px;background:#fff!important;color:#475569!important;font-size:9px;font-weight:750;box-shadow:none!important}.chips button[aria-pressed="true"]{background:#edf4ff!important;border-color:#93c5fd!important;color:#0062ff!important}.status-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px;padding-top:10px;border-top:1px solid #eef2f7}.status-row>div:first-child{display:grid;gap:2px}.status-row>div:first-child span{font-size:8px;font-weight:900;letter-spacing:.08em;color:#475569}.status-row>div:first-child small{font-size:8px;color:#94a3b8}.status-chips button{border-radius:999px}.status-chips i{width:7px;height:7px;border-radius:50%;background:#94a3b8}.status-chips button[data-status="vigente"] i{background:#16a34a}.status-chips button[data-status="pendiente_ciclo"] i{background:#0ea5e9}.status-chips button[data-status="pendiente_cambio_color"] i{background:#ea580c}.status-chips button[data-status="incidencia"] i{background:#dc2626}
@media(max-width:1100px){.filter-row{grid-template-columns:1fr 1fr}.search{grid-column:1/-1}.status-row{align-items:flex-start;flex-direction:column}}@media(max-width:700px){.filter-row{grid-template-columns:1fr}}
</style>
