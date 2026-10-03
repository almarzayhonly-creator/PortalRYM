<script setup lang="ts">
import type { RevisadoEstado, RevisadosFilters } from '../types/revisados.types'

const model = defineModel<RevisadosFilters>({ required: true })
defineProps<{ galeras: string[]; supervisoras: string[] }>()

const estadoOptions: { value: RevisadoEstado; label: string }[] = [
  { value: 'vigente', label: 'Vigente' },
  { value: 'pendiente_ciclo', label: 'Pendiente' },
  { value: 'pendiente_cambio_color', label: 'Cambio de color' },
  { value: 'incidencia', label: 'Incidencia' },
  { value: 'no_aplica', label: 'No aplica' },
]

function toggle<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}
</script>

<template>
  <section class="filters" aria-label="Filtros de revisados">
    <label class="search">
      <span>Buscar</span>
      <input v-model="model.search" type="search" placeholder="Unidad o placa" />
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
  </section>
</template>

<style scoped>
.filters {
  display: grid;
  gap: 16px;
  padding: 18px;
  background: #fff;
  border: 1px solid #e2e7ee;
  border-radius: 12px;
}
.search { display: grid; gap: 6px; max-width: 360px; font-size: 12px; font-weight: 700; color: #5c6678; }
.search input { min-height: 40px; border: 1px solid #cfd6df; border-radius: 9px; padding: 0 12px; font: inherit; font-size: 14px; }
.filter-group { display: grid; gap: 8px; }
.filter-label { font-size: 12px; font-weight: 700; color: #5c6678; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chips button { min-height: 34px; padding: 0 11px; border: 1px solid #d7dde5; border-radius: 999px; background: #fff; color: #394356; cursor: pointer; }
.chips button[aria-pressed="true"] { background: #172033; border-color: #172033; color: #fff; }
</style>
