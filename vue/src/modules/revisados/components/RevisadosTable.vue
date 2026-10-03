<script setup lang="ts">
import type { RevisadoRecord } from '../types/revisados.types'
import RevisadoStatusBadge from './RevisadoStatusBadge.vue'

defineProps<{ rows: RevisadoRecord[] }>()

function formatDate(value?: string) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('es-PA', {
      timeZone: 'America/Panama',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}
</script>

<template>
  <section class="table-card">
    <div class="table-head">
      <div>
        <span>PRIORIDAD OPERATIVA</span>
        <h3>Unidades</h3>
      </div>
      <small>{{ rows.length }} resultados</small>
    </div>

    <div class="table-shell">
      <table v-if="rows.length">
        <thead>
          <tr>
            <th>Unidad</th>
            <th>Placa</th>
            <th>Galera</th>
            <th>Supervisora</th>
            <th>Último revisado</th>
            <th>Prioridad</th>
            <th>Estatus</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td class="strong">{{ row.unidad }}</td>
            <td class="plate">{{ row.placa }}</td>
            <td><span class="galera">{{ row.galera }}</span></td>
            <td>{{ row.supervisora || '—' }}</td>
            <td>{{ formatDate(row.fechaUltimoRevisado) }}</td>
            <td>{{ row.prioridad || '—' }}</td>
            <td><RevisadoStatusBadge :estado="row.estado" /></td>
            <td class="detail">{{ row.detalleEstado || '—' }}</td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty">
        <strong>No hay registros para mostrar</strong>
        <span>No hay coincidencias con los filtros activos.</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.table-card{border:1px solid #e2e8f0;border-radius:16px;background:#fff;overflow:hidden}
.table-head{display:flex;justify-content:space-between;align-items:end;padding:16px 18px 13px}
.table-head span{font-size:9px;font-weight:900;letter-spacing:.14em;color:#64748b}
.table-head h3{margin:3px 0 0;font-size:19px;letter-spacing:-.03em}
.table-head small{color:#94a3b8}
.table-shell{overflow:auto}
table{width:100%;border-collapse:collapse;min-width:1080px;font-size:12px}
th{position:sticky;top:0;z-index:1;text-align:left;padding:11px 13px;background:#f8fafc;color:#64748b;font-size:9px;letter-spacing:.05em;text-transform:uppercase;border-top:1px solid #edf2f7;border-bottom:1px solid #e2e8f0}
td{padding:12px 13px;border-bottom:1px solid #eef2f6;color:#475569;vertical-align:middle}
tbody tr:hover{background:#fbfdff}
.strong{color:#0f172a;font-weight:850}
.plate{color:#0062ff;font-weight:750}
.galera{font-size:10px;font-weight:850;color:#365b92}
.detail{min-width:230px}
.empty{min-height:190px;display:grid;place-content:center;gap:5px;padding:24px;text-align:center;color:#94a3b8}.empty strong{color:#334155}
</style>
