<script setup lang="ts">
import { ref } from 'vue'
import type { RevisadoRecord } from '../types/revisados.types'
import { useRevisados } from '../composables/useRevisados'
import RevisadosFilterBar from '../components/RevisadosFilterBar.vue'
import RevisadosTable from '../components/RevisadosTable.vue'

const records = ref<RevisadoRecord[]>([])
const { filters, filtered, metrics, options, clearFilters } = useRevisados(records)
</script>

<template>
  <main class="page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Control operativo</p>
        <h1>Revisados</h1>
        <p>Seguimiento de vigencia, pendientes, cambios de color e incidencias.</p>
      </div>
      <button type="button" class="secondary" @click="clearFilters">Limpiar filtros</button>
    </header>

    <section class="metrics" aria-label="Resumen de revisados">
      <article>
        <span>Total filtrado</span>
        <strong>{{ metrics.total }}</strong>
      </article>
      <article>
        <span>Vigentes</span>
        <strong>{{ metrics.vigentes }}</strong>
      </article>
      <article>
        <span>Pendientes</span>
        <strong>{{ metrics.pendientesCiclo }}</strong>
      </article>
      <article>
        <span>Cambio de color</span>
        <strong>{{ metrics.cambiosColor }}</strong>
      </article>
      <article>
        <span>Incidencias</span>
        <strong>{{ metrics.incidencias }}</strong>
      </article>
    </section>

    <RevisadosFilterBar
      v-model="filters"
      :galeras="options.galeras"
      :supervisoras="options.supervisoras"
    />

    <RevisadosTable :rows="filtered" />
  </main>
</template>

<style scoped>
.page { min-height: 100vh; padding: 28px; background: #f6f8fb; color: #172033; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
.page-header { display: flex; justify-content: space-between; gap: 20px; align-items: end; margin-bottom: 20px; }
.eyebrow { margin: 0 0 4px; color: #667085; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
h1 { margin: 0; font-size: clamp(28px, 3vw, 40px); letter-spacing: -.03em; }
.page-header p:last-child { margin: 6px 0 0; color: #667085; }
.secondary { min-height: 40px; padding: 0 14px; border: 1px solid #cfd6df; border-radius: 9px; background: #fff; color: #344054; font-weight: 700; cursor: pointer; }
.metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
.metrics article { display: grid; gap: 5px; padding: 15px 16px; background: #fff; border: 1px solid #e2e7ee; border-radius: 10px; }
.metrics span { color: #667085; font-size: 12px; font-weight: 700; }
.metrics strong { font-size: 24px; letter-spacing: -.03em; }
:deep(.filters) { margin-bottom: 14px; }
@media (max-width: 900px) {
  .page { padding: 18px; }
  .page-header { align-items: start; flex-direction: column; }
  .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
