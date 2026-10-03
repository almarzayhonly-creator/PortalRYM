<script setup lang="ts">
import type { RevisadoRecord } from '../types/revisados.types'
import RevisadoStatusBadge from './RevisadoStatusBadge.vue'

defineProps<{ rows: RevisadoRecord[] }>()
</script>

<template>
  <div class="table-shell">
    <table v-if="rows.length">
      <thead>
        <tr>
          <th>Unidad</th>
          <th>Placa</th>
          <th>Galera</th>
          <th>Supervisora</th>
          <th>Último revisado</th>
          <th>Estatus</th>
          <th>Detalle</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td class="strong">{{ row.unidad }}</td>
          <td>{{ row.placa }}</td>
          <td>{{ row.galera }}</td>
          <td>{{ row.supervisora || '—' }}</td>
          <td>{{ row.fechaUltimoRevisado || '—' }}</td>
          <td><RevisadoStatusBadge :estado="row.estado" /></td>
          <td>{{ row.detalleEstado || '—' }}</td>
        </tr>
      </tbody>
    </table>

    <div v-else class="empty">
      <strong>No hay registros para mostrar</strong>
      <span>La vista Vue todavía no está conectada al origen canónico o los filtros no tienen coincidencias.</span>
    </div>
  </div>
</template>

<style scoped>
.table-shell { overflow: auto; border: 1px solid #e2e7ee; border-radius: 12px; background: #fff; }
table { width: 100%; border-collapse: collapse; min-width: 980px; font-size: 13px; }
th { position: sticky; top: 0; z-index: 1; text-align: left; padding: 12px 14px; background: #f7f9fb; color: #586174; font-size: 11px; letter-spacing: .03em; text-transform: uppercase; border-bottom: 1px solid #e2e7ee; }
td { padding: 13px 14px; border-bottom: 1px solid #edf0f4; color: #374154; vertical-align: middle; }
tbody tr:last-child td { border-bottom: 0; }
.strong { color: #172033; font-weight: 750; }
.empty { min-height: 220px; display: grid; place-content: center; gap: 6px; padding: 28px; text-align: center; color: #667085; }
.empty strong { color: #293247; }
</style>
