<script setup lang="ts">
import type { RevisadoEstado, RevisadosFilters } from '../types/revisados.types'

const model = defineModel<RevisadosFilters>({ required: true })
defineProps<{ galeras: string[]; supervisoras: string[] }>()

const estadoOptions: { value: RevisadoEstado; label: string }[] = [
  { value: 'vigente', label: 'Vigente' },
  { value: 'pendiente_ciclo', label: 'Pendiente' },
  { value: 'pendiente_cambio_color', label: 'Cambio de color' },
  { value: 'incidencia', label: 'Incidencia' },
]

function toggle<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}
</script>

<template>
  <section class="filters" aria-label="Filtros globales de revisados">
    <div class="toolbar">
      <label class="search">
        <span>⌕</span>
        <input v-model="model.search" type="search" placeholder="Buscar unidad, placa o supervisora..." />
      </label>

      <div class="toolbar-group">
        <span class="group-label">Galera</span>
        <div class="chips">
          <button v-for="galera in galeras" :key="galera" type="button"
            :aria-pressed="model.galeras.includes(galera)"
            @click="model.galeras = toggle(model.galeras, galera)">
            {{ galera }}
          </button>
        </div>
      </div>

      <div class="toolbar-group supervisors">
        <span class="group-label">Supervisora</span>
        <div class="chips scrollable">
          <button v-for="supervisora in supervisoras" :key="supervisora" type="button"
            :aria-pressed="model.supervisoras.includes(supervisora)"
            @click="model.supervisoras = toggle(model.supervisoras, supervisora)">
            {{ supervisora }}
          </button>
        </div>
      </div>

      <div class="toolbar-group">
        <span class="group-label">Estatus</span>
        <div class="chips status-chips">
          <button v-for="option in estadoOptions" :key="option.value" type="button"
            :data-status="option.value"
            :aria-pressed="model.estados.includes(option.value)"
            @click="model.estados = toggle(model.estados, option.value)">
            <i></i>{{ option.label }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.filters{padding:13px;border:1px solid #e0e5ec;border-radius:13px;background:#fff;box-shadow:0 2px 10px rgba(16,24,40,.02)}
.toolbar{display:grid;grid-template-columns:1.35fr auto minmax(260px,1fr) auto;gap:12px;align-items:end}
.search{height:40px;display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid #dbe1e9;border-radius:9px;background:#fff}.search>span{color:#7a879a;font-size:14px}.search input{width:100%;border:0;outline:0;color:#26344a;background:transparent;font-size:11px}.search input::placeholder{color:#9aa5b5}
.toolbar-group{display:grid;gap:5px;min-width:0}.group-label{font-size:9px;font-weight:850;color:#66758a}.chips{display:flex;gap:5px;flex-wrap:wrap}.scrollable{max-height:64px;overflow:auto;padding-right:2px}
.chips button{display:inline-flex;align-items:center;gap:5px;min-height:28px;padding:0 9px;border:1px solid #dde5ee!important;border-radius:999px;background:#f8fafc!important;color:#5a6b80!important;font-size:9px;font-weight:750;box-shadow:none!important}.chips button:hover{background:#f1f6fb!important;color:#274766!important}.chips button[aria-pressed="true"]{background:#0b63f6!important;border-color:#0b63f6!important;color:#fff!important}
.status-chips i{width:6px;height:6px;border-radius:50%;background:#94a3b8}.status-chips button[data-status="vigente"] i{background:#16a34a}.status-chips button[data-status="pendiente_ciclo"] i{background:#0b63f6}.status-chips button[data-status="pendiente_cambio_color"] i{background:#d89514}.status-chips button[data-status="incidencia"] i{background:#d94843}
@media(max-width:1200px){.toolbar{grid-template-columns:1fr 1fr}.supervisors{grid-column:span 2}}@media(max-width:700px){.toolbar{grid-template-columns:1fr}.supervisors{grid-column:auto}}
</style>
