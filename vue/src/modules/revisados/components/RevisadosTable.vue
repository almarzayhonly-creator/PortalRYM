<script setup lang="ts">
import type { RevisadoRecord } from '../types/revisados.types'
import RevisadoStatusBadge from './RevisadoStatusBadge.vue'
defineProps<{ rows: RevisadoRecord[] }>()

function formatDate(value?: string) {
  if (!value) return '—'
  try {
    return new Intl.DateTimeFormat('es-PA', { timeZone:'America/Panama', day:'2-digit', month:'short', year:'numeric' }).format(new Date(value))
  } catch { return value }
}
</script>

<template>
  <section class="table-card">
    <div class="table-head">
      <div><span>DETALLE OPERATIVO</span><h3>Unidades</h3></div>
      <div class="head-actions"><span class="count">{{ rows.length }} registros</span><button type="button">Exportar</button></div>
    </div>

    <div class="table-shell">
      <table v-if="rows.length">
        <thead>
          <tr>
            <th>Unidad</th><th>Placa</th><th>Galera</th><th>Supervisora</th><th>Último revisado</th><th>Prioridad</th><th>Estatus</th><th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td class="strong">{{ row.unidad }}</td>
            <td class="plate">{{ row.placa }}</td>
            <td><span class="galera">{{ row.galera }}</span></td>
            <td>{{ row.supervisora || '—' }}</td>
            <td>{{ formatDate(row.fechaUltimoRevisado) }}</td>
            <td><span class="priority">{{ row.prioridad || '—' }}</span></td>
            <td><RevisadoStatusBadge :estado="row.estado" /></td>
            <td class="detail">{{ row.detalleEstado || '—' }}</td>
          </tr>
        </tbody>
      </table>

      <div v-else class="empty"><strong>No hay registros para mostrar</strong><span>No hay coincidencias con los filtros activos.</span></div>
    </div>
  </section>
</template>

<style scoped>
.table-card{border:1px solid #dfe4eb;border-radius:13px;background:#fff;overflow:hidden;box-shadow:0 2px 10px rgba(16,24,40,.02)}
.table-head{display:flex;justify-content:space-between;align-items:end;padding:15px 16px 12px}.table-head>div:first-child>span{font-size:9px;font-weight:900;letter-spacing:.09em;color:#c15d17}.table-head h3{margin:2px 0 0;font-size:17px;letter-spacing:-.025em}.head-actions{display:flex;align-items:center;gap:8px}.count{padding:5px 8px;border-radius:999px;background:#edf4ff;color:#0062ff;font-size:9px;font-weight:800}.head-actions button{height:30px;padding:0 10px;border:1px solid #dce2ea;border-radius:8px;background:#fff;color:#59677c;font-size:9px;font-weight:800}
.table-shell{overflow:auto}table{width:100%;border-collapse:collapse;min-width:1080px;font-size:11px}th{position:sticky;top:0;z-index:1;text-align:left;padding:10px 12px;background:#eef1f7;color:#6b7890;font-size:8px;letter-spacing:.04em;text-transform:uppercase;border-top:1px solid #e3e7ee;border-bottom:1px solid #dfe4eb}td{padding:11px 12px;border-bottom:1px solid #edf0f4;color:#56647a;vertical-align:middle}tbody tr:hover{background:#fbfcfe}.strong{color:#18263c;font-weight:850}.plate{color:#0062ff;font-weight:750}.galera{font-size:9px;font-weight:850;color:#365b92}.priority{font-size:9px;font-weight:800;color:#6c788a}.detail{min-width:230px;color:#66758b}.empty{min-height:180px;display:grid;place-content:center;gap:5px;padding:24px;text-align:center;color:#94a3b8}.empty strong{color:#334155}
</style>
