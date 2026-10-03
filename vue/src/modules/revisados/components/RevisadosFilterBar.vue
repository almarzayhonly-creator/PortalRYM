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
    <div class="filter-head">
      <div>
        <span>FILTROS GLOBALES</span>
        <h3>Explorar flota</h3>
      </div>
      <small>KPIs, galeras y tabla usan el mismo filtro</small>
    </div>

    <div class="top-grid">
      <label class="search">
        <span>Unidad o placa</span>
        <input v-model="model.search" type="search" placeholder="Buscar unidad, placa o supervisora" />
      </label>

      <div class="filter-group">
        <span class="filter-label">Galera</span>
        <div class="chips">
          <button
            v-for="galera in galeras"
            :key="galera"
            type="button"
            :aria-pressed="model.galeras.includes(galera)"
            @click="model.galeras = toggle(model.galeras, galera)"
          >
            {{ galera }}
          </button>
        </div>
      </div>

      <div class="filter-group">
        <span class="filter-label">Estatus</span>
        <div class="chips">
          <button
            v-for="option in estadoOptions"
            :key="option.value"
            type="button"
            :aria-pressed="model.estados.includes(option.value)"
            @click="model.estados = toggle(model.estados, option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.filters{padding:18px;border:1px solid #e2e8f0;border-radius:16px;background:#fff}
.filter-head{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:14px}
.filter-head span{font-size:9px;font-weight:900;letter-spacing:.14em;color:#64748b}
.filter-head h3{margin:3px 0 0;font-size:19px;letter-spacing:-.03em}
.filter-head small{color:#94a3b8}
.top-grid{display:grid;grid-template-columns:1.35fr 1fr 1.6fr;gap:12px}
.search,.filter-group{display:grid;gap:7px;align-content:start}
.search span,.filter-label{font-size:10px;font-weight:850;color:#475569}
.search input{height:42px;border:1px solid #d7dee8;border-radius:10px;padding:0 12px;outline:none;background:#fff;color:#0f172a}
.search input:focus{border-color:#0062ff;box-shadow:0 0 0 3px rgba(0,98,255,.08)}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chips button{min-height:32px;padding:0 10px;border:1px solid #dbe3ec;border-radius:9px;background:#fff;color:#475569;font-size:11px;font-weight:750}
.chips button[aria-pressed="true"]{background:#0062ff;border-color:#0062ff;color:#fff}
@media(max-width:980px){.top-grid{grid-template-columns:1fr}.filter-head{align-items:start;flex-direction:column}}
</style>
