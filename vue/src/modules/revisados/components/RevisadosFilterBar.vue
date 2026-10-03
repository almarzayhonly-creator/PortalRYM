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
      <div><span>FILTROS GLOBALES</span><h3>Explorar flota</h3></div>
      <small>Resumen, galeras y tabla usan el mismo filtro</small>
    </div>

    <div class="search-row">
      <label class="search">
        <span>Unidad, placa o supervisora</span>
        <input v-model="model.search" type="search" placeholder="Buscar unidad, placa o supervisora" />
      </label>
    </div>

    <div class="groups">
      <div class="filter-group">
        <span class="filter-label">Galera <b v-if="model.galeras.length">{{ model.galeras.length }}</b></span>
        <div class="chips">
          <button v-for="galera in galeras" :key="galera" type="button"
            :aria-pressed="model.galeras.includes(galera)"
            @click="model.galeras = toggle(model.galeras, galera)">
            {{ galera }}
          </button>
        </div>
      </div>

      <div class="filter-group">
        <span class="filter-label">Supervisora <b v-if="model.supervisoras.length">{{ model.supervisoras.length }}</b></span>
        <div class="chips">
          <button v-for="supervisora in supervisoras" :key="supervisora" type="button"
            :aria-pressed="model.supervisoras.includes(supervisora)"
            @click="model.supervisoras = toggle(model.supervisoras, supervisora)">
            {{ supervisora }}
          </button>
        </div>
      </div>

      <div class="filter-group">
        <span class="filter-label">Estatus <b v-if="model.estados.length">{{ model.estados.length }}</b></span>
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
.filters{padding:17px;border:1px solid #e2e8f0;border-radius:15px;background:#fff}
.filter-head{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:12px}
.filter-head span{font-size:9px;font-weight:900;letter-spacing:.14em;color:#64748b}
.filter-head h3{margin:3px 0 0;font-size:18px;letter-spacing:-.03em}
.filter-head small{color:#94a3b8;font-size:10px}
.search-row{max-width:520px;margin-bottom:13px}.search{display:grid;gap:6px}
.search span,.filter-label{font-size:10px;font-weight:850;color:#475569}
.search input{height:40px;border:1px solid #d7dee8;border-radius:9px;padding:0 12px;outline:none;background:#fff;color:#0f172a}
.search input:focus{border-color:#0062ff;box-shadow:0 0 0 3px rgba(0,98,255,.08)}
.groups{display:grid;grid-template-columns:.8fr 1.15fr 1.2fr;gap:14px}
.filter-group{display:grid;gap:7px;align-content:start;min-width:0}
.filter-label{display:flex;gap:6px;align-items:center}.filter-label b{display:grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#eaf2ff;color:#0062ff;font-size:9px}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chips button{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:0 9px;border:1px solid #dbe3ec;border-radius:8px;background:#fff;color:#475569;font-size:10px;font-weight:750}
.chips button[aria-pressed="true"]{background:#eaf2ff;border-color:#8eb8ff;color:#0054db;box-shadow:inset 0 0 0 1px #8eb8ff}
.status-chips i{width:6px;height:6px;border-radius:50%;background:#94a3b8}
.status-chips button[data-status="vigente"] i{background:#16a34a}.status-chips button[data-status="pendiente_ciclo"] i{background:#0062ff}.status-chips button[data-status="pendiente_cambio_color"] i{background:#ea580c}.status-chips button[data-status="incidencia"] i{background:#dc2626}
@media(max-width:1050px){.groups{grid-template-columns:1fr 1fr}}@media(max-width:760px){.groups{grid-template-columns:1fr}.filter-head{align-items:start;flex-direction:column}}
</style>
